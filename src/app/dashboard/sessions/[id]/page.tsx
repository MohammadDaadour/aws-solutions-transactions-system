import { auth } from "../../../../auth";
import { db } from "../../../../lib/db";
import { redirect, notFound } from "next/navigation";
import { SessionDetailClient } from "./SessionDetailClient";
import { Metadata } from "next";

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `تفاصيل الجلسة ${id.substring(0, 8).toUpperCase()} | نظام الحوالة`,
        description: "تفاصيل الجلسة المحاسبية وقيودها وأرصدتها الختامية",
    };
}

export default async function SessionDetailPage(
    { params }: { params: Promise<{ id: string }> }
) {
    const authSession = await auth();
    if (!authSession || authSession.user?.role !== "Admin") redirect("/dashboard");

    const { id } = await params;

    const raw = await db.session.findUnique({
        where: { id },
        include: {
            openedByUser: { select: { username: true } },
            closedByUser: { select: { username: true } },
            snapshots: {
                include: { user: { select: { username: true } } },
                orderBy: { currency: "asc" },
            },
            _count: { select: { transactions: true } },
        },
    });

    if (!raw) notFound();

    const transactionCount =
        typeof raw._count?.transactions === "bigint"
            ? Number(raw._count.transactions)
            : raw._count?.transactions || 0;

    const session = {
        ...raw,
        openedAt:
            raw.openedAt instanceof Date
                ? raw.openedAt.toISOString()
                : new Date(raw.openedAt).toISOString(),
        closedAt: raw.closedAt
            ? raw.closedAt instanceof Date
                ? raw.closedAt.toISOString()
                : new Date(raw.closedAt).toISOString()
            : null,
        _count: { transactions: transactionCount },
        snapshots: raw.snapshots.map((snap) => ({
            ...snap,
            balance:
                typeof snap.balance?.toNumber === "function"
                    ? snap.balance.toNumber()
                    : Number(snap.balance || 0),
        })),
    };

    return <SessionDetailClient session={session as any} />;
}
