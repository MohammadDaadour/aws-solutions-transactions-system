import { Currency, TransactionType } from "../generated/prisma/client";
import { db } from "../lib/db";

export interface TransactionFilters {
    userId?: string;
    type?: TransactionType;
    currency?: Currency;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
    search?: string;
}

// Add the missing fields to match the 'TransactionRow' shape
const ledgerTransactionSelect = {
    id: true,
    amount: true,
    type: true,
    currency: true,
    createdAt: true,
    date: true,
    notes: true, // <-- Added because TransactionRow requires it
    user: {
        select: {
            id: true,
            name: true, // Will naturally map as string | null
        }
    },
    creator: {
        select: {
            id: true,
            name: true,
        }
    }
};

export async function getPaginatedTransactions(
    filters: TransactionFilters,
    page: number,
    pageSize: number
) {
    let targetSessionId = filters.sessionId;
    if (targetSessionId === undefined) {
        const active = await db.session.findFirst({ where: { status: "OPEN" } });
        targetSessionId = active?.id;
    }

    const searchTerm = filters.search?.trim();

    // Build extended OR conditions that cover: notes, username, amount, type, and id substring
    let searchOrConditions: object[] = [];
    if (searchTerm) {
        // 1. Notes & usernames (string contains, case-insensitive)
        searchOrConditions.push(
            { notes: { contains: searchTerm, mode: "insensitive" as const } },
            { user: { is: { username: { contains: searchTerm, mode: "insensitive" as const } } } },
            { creator: { is: { username: { contains: searchTerm, mode: "insensitive" as const } } } },
        );

        // 2. Amount — try parsing as a decimal number
        const parsedAmount = parseFloat(searchTerm.replace(/,/g, ""));
        if (!isNaN(parsedAmount) && parsedAmount >= 0) {
            searchOrConditions.push({ amount: { equals: parsedAmount } });
        }

        // 3. Type — map Arabic display labels and enum names to enum values
        const typeLabelMap: Record<string, TransactionType> = {
            "debit": TransactionType.debit,
            "credit": TransactionType.credit,
            "opening_balance": TransactionType.opening_balance,
            "\u0645\u062f\u064a\u0646": TransactionType.debit,       // مدين
            "\u0645\u062f\u064a\u0646 \u0644\u0646\u0627": TransactionType.debit,   // مدين لنا
            "\u062f\u0627\u0626\u0646": TransactionType.credit,      // دائن
            "\u062f\u0627\u0626\u0646 \u0639\u0644\u064a\u0646\u0627": TransactionType.credit, // دائن علينا
            "\u0631\u0635\u064a\u062f": TransactionType.opening_balance,    // رصيد
            "\u0627\u0641\u062a\u062a\u0627\u062d\u064a": TransactionType.opening_balance, // افتتاحي
            "\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a": TransactionType.opening_balance, // رصيد افتتاحي
        };
        const q = searchTerm.toLowerCase();
        const matchedTypes = new Set<TransactionType>();
        for (const [label, enumVal] of Object.entries(typeLabelMap)) {
            if (label.toLowerCase().includes(q) || q.includes(label.toLowerCase())) {
                matchedTypes.add(enumVal);
            }
        }
        for (const t of matchedTypes) {
            searchOrConditions.push({ type: { equals: t } });
        }

        // 4. ID — UuidFilter has no contains, so do a raw SQL substring match then use id: { in: [...] }
        const idMatches = await db.$queryRaw<{ id: string }[]>`
            SELECT id FROM "transactions" WHERE id::text ILIKE ${"%" + searchTerm + "%"}
        `;
        if (idMatches.length > 0) {
            searchOrConditions.push({ id: { in: idMatches.map((r) => r.id) } });
        }
    }

    const where = {
        ...(targetSessionId && targetSessionId !== "ALL" && { sessionId: targetSessionId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.type && { type: filters.type }),
        ...(filters.currency && { currency: filters.currency }),
        ...(filters.dateFrom || filters.dateTo ? {
            date: {
                ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
                ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
            }
        } : {}),
        ...(searchOrConditions.length > 0 ? { OR: searchOrConditions } : {}),
    };

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
                notes: true, // Included for structural table stability
                sessionId: true,
                session: {
                    select: { status: true }
                },
                user: {
                    select: {
                        id: true,
                        username: true,
                    }
                },
                creator: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            },
        }),
        db.transaction.count({ where }),
    ]);

    // ---------- Running balance computation ----------
    // We walk the page in chronological order (oldest → newest).
    // First we need the cumulative balance *before* the oldest tx on this page.
    const balanceAfterMap: Record<string, number> = {};

    if (transactions.length > 0) {
        // Page is sorted DESC so last item is the oldest on this page.
        const oldestCreatedAt = transactions[transactions.length - 1].createdAt;

        // Fetch all transactions older than the oldest tx on this page to compute
        // the signed cumulative balance anchor per currency.
        const olderTxs = await db.transaction.findMany({
            where: {
                ...(filters.userId && { userId: filters.userId }),
                createdAt: { lt: oldestCreatedAt },
            },
            select: { amount: true, type: true, currency: true },
        });

        // Build anchor balances per currency (signed)
        const anchorBalance: Record<string, number> = {};
        for (const t of olderTxs) {
            const key = t.currency;
            const signed = t.type === "credit" ? t.amount.toNumber() : -t.amount.toNumber();
            anchorBalance[key] = (anchorBalance[key] ?? 0) + signed;
        }

        // Walk page in chronological order (reverse of the desc array)
        const runningBalance: Record<string, number> = { ...anchorBalance };
        const chronological = [...transactions].reverse();
        for (const tx of chronological) {
            const key = tx.currency;
            const signed = tx.type === "credit" ? tx.amount.toNumber() : -tx.amount.toNumber();
            runningBalance[key] = (runningBalance[key] ?? 0) + signed;
            balanceAfterMap[tx.id] = runningBalance[key];
        }
    }
    // -------------------------------------------------

    return {
        transactions: transactions.map(tx => ({
            id: tx.id,
            amount: tx.amount.toNumber(),
            type: tx.type,
            currency: tx.currency,
            createdAt: tx.createdAt,
            date: tx.date,
            notes: tx.notes ?? "",
            sessionId: tx.sessionId ?? null,
            sessionStatus: tx.session?.status ?? null,
            balanceAfter: balanceAfterMap[tx.id] ?? null,
            user: {
                id: tx.user.id,
                username: tx.user.username ?? "",
            },
            creator: {
                id: tx.creator.id,
                username: tx.creator.username ?? "",
            }
        })),
        total,
        pageCount: Math.ceil(total / pageSize),
    };
}

export async function getRecentLedger(userId?: string) {
    const activeSession = await db.session.findFirst({ where: { status: "OPEN" } });
    if (!activeSession) return [];

    const transactions = await db.transaction.findMany({
        where: {
            sessionId: activeSession.id,
            ...(userId && { userId })
        },
        take: 50,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            amount: true,
            type: true,
            currency: true,
            createdAt: true,
            date: true,
            notes: true,
            user: {
                select: {
                    id: true,
                    username: true, 
                }
            },
            creator: {
                select: {
                    id: true,
                    username: true, 
                }
            }
        },
    });

    return transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount.toNumber(),
        type: tx.type,
        currency: tx.currency,
        createdAt: tx.createdAt,
        date: tx.date,
        notes: tx.notes ?? "",
        user: {
            id: tx.user.id,
            username: tx.user.username ?? "",
        },
        creator: {
            id: tx.creator.id,
            username: tx.creator.username ?? "",
        }
    }));
}

export async function getGlobalSystemBalances() {
    const activeSession = await db.session.findFirst({ where: { status: "OPEN" } });
    if (!activeSession) return [];

    const aggregates = await db.userBalance.groupBy({
        by: ['currency'],
        where: {
            sessionId: activeSession.id
        },
        _sum: {
            balance: true,
        },
    });

    return aggregates.map((item) => ({
        currency: item.currency,
        netPosition: item._sum.balance ? item._sum.balance.toNumber() : 0,
    }));
}

export async function getAllSessionsBalances() {
    const aggregates = await db.userBalance.groupBy({
        by: ['currency'],
        _sum: {
            balance: true,
        },
    });

    return aggregates.map((item) => ({
        currency: item.currency,
        netPosition: item._sum.balance ? item._sum.balance.toNumber() : 0,
    }));
}