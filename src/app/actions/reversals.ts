"use server"

import { auth } from "../../auth";
import { db } from "../../lib/db";
import { TransactionType, Prisma } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function reverseTransaction(transactionId: string, reason: string) {
    const session = await auth();
    if (!session || session.user?.role === "Member") {
        throw new Error("Unauthorized: Only Admins can reverse transactions.");
    }

    try {
        await db.$transaction(async (tx) => {
            // 1. Fetch the original transaction with its session
            const orig = await tx.transaction.findUnique({
                where: { id: transactionId },
                include: { session: true }
            });

            if (!orig) throw new Error("Transaction not found.");

            // FIXED: Guard clause checking if session is null or undefined
            if (!orig.session) {
                throw new Error("Transaction is not linked to a valid accounting session.");
            }

            // Verify that the session is OPEN
            if (orig.session.status !== "OPEN") {
                throw new Error("Cannot reverse a transaction in a closed or closing session.");
            }

            // 2. Fetch current balance for this session
            if (!orig.sessionId) {
                throw new Error("Transaction missing session ID reference.");
            }

            const currentBalanceRow = await tx.userBalance.findUnique({
                where: {
                    sessionId_userId_currency: {
                        sessionId: orig.sessionId,
                        userId: orig.userId,
                        currency: orig.currency
                    }
                }
            });

            if (!currentBalanceRow) throw new Error("User balance record not found.");

            const oldBalance = currentBalanceRow.balance;
            let newBalance = new Prisma.Decimal(oldBalance);

            // 3. Apply OPPOSITE math to reverse the original action
            if (orig.type === TransactionType.debit) {
                newBalance = oldBalance.add(orig.amount); // Undo debit
            } else if (orig.type === TransactionType.credit) {
                newBalance = oldBalance.sub(orig.amount); // Undo credit
            }

            // 4. Update the user's balance in this session
            await tx.userBalance.update({
                where: {
                    sessionId_userId_currency: {
                        sessionId: orig.sessionId,
                        userId: orig.userId,
                        currency: orig.currency
                    }
                },
                data: { balance: newBalance }
            });

            // 5. Delete original transaction record
            await tx.transaction.delete({
                where: { id: transactionId }
            });

            // 6. Log it in the Audit Trail
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "REVERSE_TRANSACTION",
                    tableName: "transactions",
                    recordId: orig.id,
                    oldValue: { balance: oldBalance.toNumber() } as Prisma.InputJsonValue,
                    newValue: { resultingBalance: newBalance.toNumber(), reason } as Prisma.InputJsonValue,
                }
            });
        });

        revalidatePath("/dashboard");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Reversal failed." };
    }
}