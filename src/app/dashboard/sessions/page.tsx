import { auth } from "../../../auth";
import { db } from "../../../lib/db";
import { redirect } from "next/navigation";
import SessionsHistoryClient from "./SessionsHistoryClient";

export const metadata = {
    title: "سجل الجلسات المحاسبية | نظام الحوالة",
    description: "عرض تاريخ الجلسات المحاسبية المغلقة وأرصدتها الختامية",
};

const STATUS_ORDER: Record<string, number> = { OPEN: 0, CLOSING: 1, CLOSED: 2 };

export default async function SessionsHistoryPage() {
    const session = await auth();
    if (!session || session.user?.role !== "Admin") redirect("/dashboard");

    const [rawSessions, rawBalances] = await Promise.all([
        db.session.findMany({
            orderBy: { openedAt: "desc" },
            include: {
                openedByUser: { select: { username: true } },
                closedByUser: { select: { username: true } },
                snapshots: {
                    include: { user: { select: { username: true } } },
                    orderBy: { currency: "asc" },
                },
                _count: { select: { transactions: true } },
            },
        }),
        // All userBalance rows — same source as user profile pages
        db.userBalance.findMany({
            include: { user: { select: { username: true } } },
            orderBy: [{ user: { username: "asc" } }, { currency: "asc" }],
        }),
    ]);

    // Fix ordering: OPEN → CLOSING → CLOSED, then newest-first within each group
    const sessions = [...rawSessions].sort((a, b) => {
        const statusDiff = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
        if (statusDiff !== 0) return statusDiff;

        const timeA = a.openedAt instanceof Date ? a.openedAt.getTime() : new Date(a.openedAt).getTime();
        const timeB = b.openedAt instanceof Date ? b.openedAt.getTime() : new Date(b.openedAt).getTime();
        return timeB - timeA;
    });

    const serialized = sessions.map((s) => {
        const transactionCount =
            typeof s._count?.transactions === "bigint"
                ? Number(s._count.transactions)
                : s._count?.transactions || 0;

        return {
            ...s,
            openedAt: s.openedAt instanceof Date ? s.openedAt.toISOString() : new Date(s.openedAt).toISOString(),
            closedAt: s.closedAt instanceof Date ? s.closedAt.toISOString() : s.closedAt ? new Date(s.closedAt).toISOString() : null,
            _count: { transactions: transactionCount },
            snapshots: s.snapshots.map((snap) => ({
                ...snap,
                balance:
                    typeof snap.balance?.toNumber === "function"
                        ? snap.balance.toNumber()
                        : Number(snap.balance || 0),
            })),
        };
    });

    // Serialize balances — same data as each user's profile page
    const accountBalances = rawBalances.map((b) => ({
        username: b.user.username,
        currency: b.currency as string,
        balance:
            typeof b.balance?.toNumber === "function"
                ? b.balance.toNumber()
                : Number(b.balance || 0),
    }));

    return <SessionsHistoryClient sessions={serialized as any} accountBalances={accountBalances} />;
}