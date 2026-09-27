"use server"

import { auth } from "../../auth";
import { db } from "../../lib/db";
import { SessionStatus, BalanceStatus } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function closeActiveSession(notes?: string) {
    const session = await auth();
    if (!session || !session.user?.id) {
        throw new Error("Unauthorized: You must be logged in to manage sessions.");
    }

    if (session.user.role !== "Admin") {
        return { success: false, error: "Unauthorized: Only Admins can close accounting sessions." };
    }

    const currentUserId = session.user.id;

    try {
        await db.$transaction(async (tx) => {
            // 1. Fetch and lock the current OPEN session
            const openSession = await tx.session.findFirst({
                where: { status: SessionStatus.OPEN }
            });

            if (!openSession) {
                throw new Error("Critical Error: No open accounting session found.");
            }

            // 2. Change its status to CLOSING to block concurrency
            const closingSession = await tx.session.update({
                where: { id: openSession.id },
                data: { status: SessionStatus.CLOSING }
            });

            // 3. Read every UserBalance belonging to this session
            const userBalances = await tx.userBalance.findMany({
                where: { sessionId: closingSession.id }
            });

            // 4. Copy them into SessionBalance snapshots
            if (userBalances.length > 0) {
                await tx.sessionBalance.createMany({
                    data: userBalances.map((ub) => {
                        const balNum = ub.balance.toNumber();
                        let balStatus: BalanceStatus = BalanceStatus.ZERO;
                        if (balNum > 0) {
                            balStatus = BalanceStatus.POSITIVE;
                        } else if (balNum < 0) {
                            balStatus = BalanceStatus.NEGATIVE;
                        }

                        return {
                            sessionId: closingSession.id,
                            userId: ub.userId,
                            currency: ub.currency,
                            balance: ub.balance,
                            balanceStatus: balStatus,
                        };
                    })
                });
            }

            // 5. Mark the session as CLOSED
            await tx.session.update({
                where: { id: closingSession.id },
                data: {
                    status: SessionStatus.CLOSED,
                    closedAt: new Date(),
                    closedBy: currentUserId,
                    notes: notes || undefined
                }
            });

            // 6. Purge any soft-deleted transactions belonging to this session
            await tx.deletedTransaction.deleteMany({
                where: { sessionId: closingSession.id }
            });

            // 7. Create a new OPEN session for future work
            await tx.session.create({
                data: {
                    status: SessionStatus.OPEN,
                    openedBy: currentUserId,
                    notes: `Opened automatically after closing session ${closingSession.id.substring(0, 8)}`
                }
            });

            // 7. Create an audit log record
            await tx.auditLog.create({
                data: {
                    userId: currentUserId,
                    action: "CLOSE_SESSION",
                    tableName: "sessions",
                    recordId: closingSession.id,
                    newValue: {
                        closedSessionId: closingSession.id,
                        snapshotCount: userBalances.length,
                    }
                }
            });
        });

        revalidatePath("/dashboard");
        revalidatePath("/dashboard/transactions");

        return { success: true };
    } catch (error: any) {
        console.error("Session closing failed:", error);
        return { success: false, error: error.message || "Session closing failed." };
    }
}
