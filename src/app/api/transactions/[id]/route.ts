import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "../../../../lib/db";
import { Prisma, TransactionType, Currency } from "../../../../generated/prisma/client";
import { applyTransactionDelta, reverseTransactionDelta } from "../../../../lib/transaction-balance";
import { revalidatePath } from "next/cache";

async function requireAdminOrMod() {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };
    }
    if (session.user.role === "Member") {
        return { error: NextResponse.json({ error: "غير مصرح: هذه الميزة للمشرفين فقط" }, { status: 403 }) };
    }
    return { session };
}

// PATCH /api/transactions/[id] — Edit a transaction
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth_ = await requireAdminOrMod();
    if (auth_.error) return auth_.error;
    const { session } = auth_;
    const { id } = await params;

    let body: { type?: string; amount?: number; currency?: string; date?: string; notes?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    try {
        await db.$transaction(async (tx) => {
            const orig = await tx.transaction.findUnique({
                where: { id },
                include: { session: true },
            });
            if (!orig) throw Object.assign(new Error("العملية غير موجودة"), { status: 404 });
            if (!orig.session) throw Object.assign(new Error("العملية غير مرتبطة بجلسة"), { status: 409 });

            // Block opening_balance — it is a hard reset; reversing it safely is impossible
            if (orig.type === TransactionType.opening_balance) {
                throw Object.assign(
                    new Error("لا يمكن تعديل رصيد افتتاحي — يحدد رصيداً مطلقاً ولا يمكن عكسه بأمان"),
                    { status: 405 }
                );
            }

            if (orig.session.status !== "OPEN") {
                throw Object.assign(new Error("لا يمكن تعديل عملية في جلسة مغلقة"), { status: 409 });
            }

            const newType = (body.type as TransactionType | undefined) ?? orig.type;
            if (newType === TransactionType.opening_balance) {
                throw Object.assign(new Error("لا يمكن تعيين نوع العملية إلى رصيد افتتاحي"), { status: 405 });
            }

            const newAmount = body.amount !== undefined ? new Prisma.Decimal(body.amount) : orig.amount;
            const newCurrency = (body.currency as Currency | undefined) ?? orig.currency;
            const newDate = body.date !== undefined ? new Date(body.date) : orig.date;
            const newNotes = body.notes !== undefined ? body.notes : orig.notes;

            if (!orig.sessionId) throw Object.assign(new Error("معرف الجلسة مفقود"), { status: 409 });

            // Reverse old effect, apply new effect
            await reverseTransactionDelta(tx, orig.userId, orig.sessionId, orig.currency, orig.type, orig.amount);
            await applyTransactionDelta(tx, orig.userId, orig.sessionId, newCurrency, newType, newAmount);

            await tx.transaction.update({
                where: { id },
                data: { type: newType, amount: newAmount, currency: newCurrency, date: newDate, notes: newNotes },
            });

            await tx.auditLog.create({
                data: {
                    userId: session!.user.id,
                    action: "EDIT_TRANSACTION",
                    tableName: "transactions",
                    recordId: id,
                    oldValue: { type: orig.type, amount: orig.amount.toNumber(), currency: orig.currency, date: orig.date, notes: orig.notes } as Prisma.InputJsonValue,
                    newValue: { type: newType, amount: newAmount.toNumber(), currency: newCurrency, date: newDate, notes: newNotes } as Prisma.InputJsonValue,
                },
            });
        });

        revalidatePath("/dashboard/transactions");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: err?.status ?? 500 });
    }
}

// DELETE /api/transactions/[id] — Soft-delete (move to recycle bin)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth_ = await requireAdminOrMod();
    if (auth_.error) return auth_.error;
    const { session } = auth_;
    const { id } = await params;

    try {
        await db.$transaction(async (tx) => {
            const orig = await tx.transaction.findUnique({
                where: { id },
                include: { session: true },
            });
            if (!orig) throw Object.assign(new Error("العملية غير موجودة"), { status: 404 });
            if (!orig.session) throw Object.assign(new Error("العملية غير مرتبطة بجلسة"), { status: 409 });

            // Block opening_balance — deleting one and reversing its amount is equally corrupt
            if (orig.type === TransactionType.opening_balance) {
                throw Object.assign(
                    new Error("لا يمكن حذف رصيد افتتاحي — يحدد رصيداً مطلقاً ولا يمكن عكسه بأمان"),
                    { status: 405 }
                );
            }

            if (orig.session.status !== "OPEN") {
                throw Object.assign(new Error("لا يمكن حذف عملية في جلسة مغلقة"), { status: 409 });
            }

            if (!orig.sessionId) throw Object.assign(new Error("معرف الجلسة مفقود"), { status: 409 });

            // Reverse balance effect
            await reverseTransactionDelta(tx, orig.userId, orig.sessionId, orig.currency, orig.type, orig.amount);

            // Insert into recycle bin
            const now = new Date();
            const purgeAt = new Date(now);
            purgeAt.setDate(purgeAt.getDate() + 15);

            await tx.deletedTransaction.create({
                data: {
                    id: orig.id,
                    userId: orig.userId,
                    sessionId: orig.sessionId,
                    type: orig.type,
                    amount: orig.amount,
                    currency: orig.currency,
                    date: orig.date,
                    notes: orig.notes,
                    createdBy: orig.createdBy,
                    createdAt: orig.createdAt,
                    deletedBy: session!.user.id,
                    deletedAt: now,
                    purgeAt,
                },
            });

            await tx.transaction.delete({ where: { id } });

            await tx.auditLog.create({
                data: {
                    userId: session!.user.id,
                    action: "DELETE_TRANSACTION",
                    tableName: "transactions",
                    recordId: id,
                    oldValue: { type: orig.type, amount: orig.amount.toNumber(), currency: orig.currency } as Prisma.InputJsonValue,
                    newValue: { movedToRecycleBin: true, purgeAt } as Prisma.InputJsonValue,
                },
            });
        });

        revalidatePath("/dashboard/transactions");
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "حدث خطأ غير متوقع" }, { status: err?.status ?? 500 });
    }
}
