import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "../../../../../lib/db";
import { Prisma, TransactionType } from "../../../../../generated/prisma/client";
import { applyTransactionDelta } from "../../../../../lib/transaction-balance";
import { revalidatePath } from "next/cache";

async function requireAdminOrMod() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
    }
    if (session.user.role === "Member") {
        return { error: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
    }
    return { session };
}

// POST /api/transactions/recycle-bin/[id] — Restore from bin
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth_ = await requireAdminOrMod();
    if (auth_.error) return auth_.error;
    const { session } = auth_;
    const { id } = await params;

    try {
        await db.$transaction(async (tx) => {
            const deleted = await tx.deletedTransaction.findUnique({ where: { id } });
            if (!deleted) throw Object.assign(new Error("العملية غير موجودة في سلة المحذوفات"), { status: 404 });

            // Defensive: opening_balance can never have been placed here under the new rules,
            // but guard anyway in case of legacy data
            if (deleted.type === TransactionType.opening_balance) {
                throw Object.assign(
                    new Error("لا يمكن استعادة رصيد افتتاحي"),
                    { status: 405 }
                );
            }

            // Check purge deadline
            if (new Date() > deleted.purgeAt) {
                throw Object.assign(new Error("انتهت مدة الاسترداد — تم حذف العملية نهائياً"), { status: 410 });
            }

            // Verify session is still OPEN
            if (deleted.sessionId) {
                const linkedSession = await tx.session.findUnique({ where: { id: deleted.sessionId } });
                if (!linkedSession || linkedSession.status !== "OPEN") {
                    throw Object.assign(new Error("لا يمكن استعادة عملية في جلسة مغلقة"), { status: 409 });
                }
            }

            // Re-insert into transactions
            await tx.transaction.create({
                data: {
                    id: deleted.id,
                    userId: deleted.userId,
                    sessionId: deleted.sessionId,
                    type: deleted.type,
                    amount: deleted.amount,
                    currency: deleted.currency,
                    date: deleted.date,
                    notes: deleted.notes,
                    createdBy: deleted.createdBy,
                    createdAt: deleted.createdAt,
                },
            });

            // Re-apply balance effect
            if (deleted.sessionId) {
                await applyTransactionDelta(tx, deleted.userId, deleted.sessionId, deleted.currency, deleted.type, deleted.amount);
            }

            // Remove from recycle bin
            await tx.deletedTransaction.delete({ where: { id } });

            // Audit log
            await tx.auditLog.create({
                data: {
                    userId: session!.user.id,
                    action: "RESTORE_TRANSACTION",
                    tableName: "deleted_transactions",
                    recordId: id,
                    newValue: { restoredFrom: "recycle_bin", type: deleted.type, amount: deleted.amount.toNumber() } as Prisma.InputJsonValue,
                },
            });
        });

        revalidatePath("/dashboard/transactions");
        revalidatePath("/dashboard/transactions/recycle-bin");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: err?.status ?? 500 });
    }
}

// DELETE /api/transactions/recycle-bin/[id] — Permanent purge (Admin only)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (session.user.role !== "Admin") {
        return NextResponse.json({ error: "هذه الميزة للمسؤولين فقط" }, { status: 403 });
    }

    const { id } = await params;

    try {
        const deleted = await db.deletedTransaction.findUnique({ where: { id } });
        if (!deleted) {
            return NextResponse.json({ error: "already_handled" }, { status: 409 });
        }

        await db.$transaction([
            db.deletedTransaction.delete({ where: { id } }),
            db.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "PURGE_TRANSACTION",
                    tableName: "deleted_transactions",
                    recordId: id,
                    oldValue: { type: deleted.type, amount: deleted.amount.toNumber(), currency: deleted.currency } as Prisma.InputJsonValue,
                },
            }),
        ]);

        revalidatePath("/dashboard/transactions/recycle-bin");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: 500 });
    }
}
