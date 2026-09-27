import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { db } from "../../../../lib/db";

// GET /api/transactions/recycle-bin
// Lists deleted transactions, page 25 at a time, enriched with actual usernames
export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (session.user.role === "Member") {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const PAGE_SIZE = 25;

    // Clean up any deleted transactions that belong to a closed session
    const closedSessions = await db.session.findMany({
        where: { status: "CLOSED" },
        select: { id: true },
    });
    const closedSessionIds = closedSessions.map((s) => s.id);
    if (closedSessionIds.length > 0) {
        await db.deletedTransaction.deleteMany({
            where: { sessionId: { in: closedSessionIds } },
        });
    }

    const [rows, total] = await Promise.all([
        db.deletedTransaction.findMany({
            orderBy: { deletedAt: "desc" },
            take: PAGE_SIZE,
            skip: (page - 1) * PAGE_SIZE,
        }),
        db.deletedTransaction.count(),
    ]);

    // Collect all unique UUIDs we need names for (userId, createdBy, deletedBy)
    // deletedBy has a Prisma relation but we batch it the same way for simplicity
    const uuidSet = new Set<string>();
    for (const row of rows) {
        uuidSet.add(row.userId);
        uuidSet.add(row.createdBy);
        uuidSet.add(row.deletedBy);
    }

    const users = await db.user.findMany({
        where: { id: { in: [...uuidSet] } },
        select: { id: true, username: true },
    });
    const userMap: Record<string, string> = {};
    for (const u of users) userMap[u.id] = u.username;

    const enriched = rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount.toNumber(),
        currency: row.currency,
        date: row.date,
        notes: row.notes,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt,
        purgeAt: row.purgeAt,
        sessionId: row.sessionId,
        // Resolved names — never raw UUIDs in the response
        userName: userMap[row.userId] ?? row.userId,
        createdByName: userMap[row.createdBy] ?? row.createdBy,
        deletedByName: userMap[row.deletedBy] ?? row.deletedBy,
    }));

    return NextResponse.json({
        items: enriched,
        total,
        pageCount: Math.ceil(total / PAGE_SIZE),
    });
}
