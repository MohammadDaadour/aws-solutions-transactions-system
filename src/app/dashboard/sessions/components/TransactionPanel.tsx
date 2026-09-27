"use client";

import { useEffect, useState, useCallback } from "react";
import { Pagination } from "./Pagination";
import { Transaction } from "./types";

const TX_PER_PAGE = 10;

export function TransactionPanel({ sessionId, totalCount }: { sessionId: string; totalCount: number }) {
    const [txPage, setTxPage] = useState(1);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const pageCount = Math.ceil(totalCount / TX_PER_PAGE);

    const fetchTx = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/sessions/${sessionId}/transactions?page=${p}&pageSize=${TX_PER_PAGE}`);
            const data = await res.json();
            setTransactions(data.transactions ?? []);
        } finally {
            setLoading(false);
            setFetched(true);
        }
    }, [sessionId]);

    useEffect(() => { fetchTx(txPage); }, [txPage, fetchTx]);

    if (!fetched && loading) {
        return (
            <div className="flex items-center justify-center py-8 text-hw-text-muted text-sm gap-2">
                <span className="inline-block w-4 h-4 border-2 border-hw-accent border-t-transparent rounded-full animate-spin" />
                جار التحميل…
            </div>
        );
    }

    if (fetched && transactions.length === 0) {
        return <p className="text-sm text-hw-text-muted italic py-4 text-center">لا توجد قيود في هذه الجلسة.</p>;
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                    <thead>
                        <tr className="text-xs uppercase tracking-wider text-hw-text-muted border-b border-hw-border">
                            <th className="pb-2 font-medium">التاريخ</th>
                            <th className="pb-2 font-medium">الحساب</th>
                            <th className="pb-2 font-medium">النوع</th>
                            <th className="pb-2 font-medium text-left">المبلغ</th>
                            <th className="pb-2 font-medium">العملة</th>
                            <th className="pb-2 font-medium">بواسطة</th>
                            <th className="pb-2 font-medium">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border/50">
                        {loading
                            ? Array.from({ length: TX_PER_PAGE }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className="py-2.5">
                                            <div className="h-3 rounded bg-hw-border/40 w-3/4" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                            : transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-hw-bg/30 transition">
                                    <td className="py-2.5 font-mono text-xs text-hw-text-muted whitespace-nowrap">
                                        {new Date(tx.date).toLocaleDateString("ar-EG")}
                                    </td>
                                    <td className="py-2.5 font-medium text-hw-text">{tx.user.username}</td>
                                    <td className="py-2.5">
                                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border
                                            ${tx.type === "CREDIT"
                                                ? "text-hw-accent border-hw-accent/30 bg-hw-accent/5"
                                                : "text-red-400 border-red-800 bg-red-900/10"}`}>
                                            {tx.type === "CREDIT" ? "دائن" : "مدين"}
                                        </span>
                                    </td>
                                    <td className={`py-2.5 font-mono font-bold text-left
                                        ${tx.type === "CREDIT" ? "text-hw-accent" : "text-red-400"}`}>
                                        {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-2.5">
                                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-hw-bg border border-hw-border">
                                            {tx.currency}
                                        </span>
                                    </td>
                                    <td className="py-2.5 text-xs text-hw-text-secondary">{tx.creator.username}</td>
                                    <td className="py-2.5 text-xs text-hw-text-muted max-w-[150px] truncate">{tx.notes || "—"}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>
            <Pagination page={txPage} pageCount={pageCount} onChange={(p) => { setTxPage(p); }} />
        </div>
    );
}
