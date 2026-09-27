// app/api/sessions/[sessionId]/transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "../../../../../lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionsId: string }> }
) {
  const session = await auth();
  const { sessionsId } = await params;
    if (!session || session.user?.role !== "Admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
    const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "10"));

    const where = { sessionId: sessionsId };

    const [transactions, total] = await Promise.all([
        db.transaction.findMany({
            where,
            take: pageSize,
            skip: (page - 1) * pageSize,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                amount: true,
                type: true,
                currency: true,
                createdAt: true,
                date: true,
                notes: true,
                user:    { select: { id: true, username: true } },
                creator: { select: { id: true, username: true } },
            },
        }),
        db.transaction.count({ where }),
    ]);

    return NextResponse.json({
        transactions: transactions.map(tx => ({
            id:        tx.id,
            amount:    tx.amount.toNumber(),
            type:      tx.type,
            currency:  tx.currency,
            createdAt: tx.createdAt.toISOString(),
            date:      tx.date.toISOString(),
            notes:     tx.notes ?? "",
            user:    { id: tx.user.id,    username: tx.user.username    ?? "" },
            creator: { id: tx.creator.id, username: tx.creator.username ?? "" },
        })),
        total,
        pageCount: Math.ceil(total / pageSize),
    });
}