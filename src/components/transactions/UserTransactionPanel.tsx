"use client";

import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import EditTransactionModal from "./EditTransactionModal";
import { Pagination } from "../../app/dashboard/sessions/components/Pagination";

interface TransactionRow {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: Date | string;
    notes: string | null;
    user: { username: string };
    creator: { username: string };
    sessionId?: string | null;
    sessionStatus?: string | null;
    runningBalance?: number | null;
}

interface Props {
    userId: string;
    showReversalControl: boolean;
}

const TX_PER_PAGE = 10;

export function UserTransactionPanel({ userId, showReversalControl }: Props) {
    const [txPage, setTxPage] = useState(1);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [pageCount, setPageCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [editTarget, setEditTarget] = useState<TransactionRow | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search input by 400ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setTxPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchTx = useCallback(async (p: number, q: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(p),
                pageSize: String(TX_PER_PAGE),
            });
            if (q) params.set("search", q);
            const res = await fetch(`/api/users/${userId}/transactions?${params.toString()}`);
            const data = await res.json();
            setTransactions(data.transactions ?? []);
            setPageCount(data.pageCount ?? 0);
        } finally {
            setLoading(false);
            setFetched(true);
        }
    }, [userId]);

    useEffect(() => { fetchTx(txPage, debouncedSearch); }, [txPage, debouncedSearch, fetchTx]);

    async function handleDelete(tx: TransactionRow) {
        const result = await Swal.fire({
            title: "حذف العملية",
            html: `سيتم حذف هذه العملية وعكس أثرها على الرصيد.<br/><br/>
                   <span class="text-sm text-amber-500 font-semibold">⚠ يمكن الاسترداد خلال ١٥ يوماً من سلة المحذوفات</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "نعم، احذف",
            cancelButtonText: "إلغاء",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#1e293b",
        });

        if (!result.isConfirmed) return;

        const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
            await Swal.fire({
                title: "خطأ",
                text: data.error ?? "حدث خطأ أثناء الحذف",
                icon: "error",
                confirmButtonText: "موافق",
            });
        } else {
            await Swal.fire({
                title: "تم الحذف",
                text: "تم حذف العملية ونقلها إلى سلة المحذوفات.",
                icon: "success",
                confirmButtonText: "موافق",
            });
            fetchTx(txPage, debouncedSearch);
        }
    }

    function handleEditSuccess() {
        setEditTarget(null);
        fetchTx(txPage, debouncedSearch);
    }

    if (!fetched && loading) {
        return (
            <div className="flex items-center justify-center py-8 text-hw-text-muted text-sm gap-2">
                <span className="inline-block w-4 h-4 border-2 border-hw-accent border-t-transparent rounded-full animate-spin" />
                جار التحميل…
            </div>
        );
    }

    const colSpan = showReversalControl ? 9 : 8;

    return (
        <div className="space-y-4">
            {editTarget && (
                <EditTransactionModal
                    transaction={{
                        ...editTarget,
                        date: new Date(editTarget.date),
                    }}
                    onClose={() => setEditTarget(null)}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Search Bar */}
            <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-hw-text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                </span>
                <input
                    id="user-tx-search"
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="بحث بالاسم، الرقم المرجعي، المبلغ، التاريخ، الملاحظات…"
                    className="w-full bg-hw-surface border border-hw-border rounded-lg py-2 pr-9 pl-4 text-sm text-hw-text placeholder:text-hw-text-muted focus:outline-none focus:ring-2 focus:ring-hw-accent/40 transition"
                    dir="rtl"
                />
                {search && (
                    <button
                        onClick={() => setSearch("")}
                        className="absolute inset-y-0 left-3 flex items-center text-hw-text-muted hover:text-hw-text transition"
                        aria-label="مسح البحث"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-hw-border bg-hw-surface">
                <table className="w-full text-right text-sm text-hw-text-secondary">
                    <thead className="bg-hw-bg text-xs font-semibold uppercase tracking-wider text-hw-text-secondary border-b border-hw-border">
                        <tr>
                            <th className="px-4 py-3">التاريخ</th>
                            <th className="px-4 py-3">الرقم المرجعي</th>
                            <th className="px-4 py-3">اسم الحساب</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3 text-right">المبلغ</th>
                            <th className="px-4 py-3 text-right">الرصيد بعد العملية</th>
                            <th className="px-4 py-3">ملاحظات</th>
                            <th className="px-4 py-3">المسؤول</th>
                            {showReversalControl && <th className="px-4 py-3 text-center">الإجراء</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border font-normal">
                        {loading && fetched ? (
                            Array.from({ length: TX_PER_PAGE }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={colSpan} className="px-4 py-3">
                                        <div className="h-4 rounded bg-hw-border/40 w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={colSpan} className="text-center py-8 text-hw-text-muted italic">
                                    {debouncedSearch ? "لا توجد نتائج مطابقة للبحث." : "لا يوجد قيود محاسبية."}
                                </td>
                            </tr>
                        ) : (
                            transactions.map((tx) => {
                                const isReversal = tx.notes?.includes("REVERSAL");
                                const isOpeningBalance = tx.type === "opening_balance";
                                const sessionOpen = tx.sessionStatus === "OPEN" || tx.sessionStatus == null;
                                const balance = tx.runningBalance ?? null;
                                const balancePositive = balance !== null && balance >= 0;

                                return (
                                    <tr key={tx.id} className={`hover:bg-hw-bg/50 transition ${isReversal ? "bg-hw-warning-bg text-hw-text-secondary" : ""}`}>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{new Date(tx.date).toLocaleDateString("ar-EG")}</td>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{tx.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 font-medium text-hw-text">{tx.user.username}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${tx.type === "debit" ? "bg-hw-accent-muted text-gray-100" :
                                                tx.type === "credit" ? "bg-hw-danger-muted text-hw-danger" : "bg-hw-info-muted text-hw-info"
                                                }`}>
                                                {tx.type === "debit" ? "مدين لنا" : tx.type === "credit" ? "دائن علينا" : tx.type === "opening_balance" ? "رصيد افتتاحي" : tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                            {tx.amount.toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} <span className="text-xs text-hw-text-muted font-normal">{tx.currency}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                            {balance === null ? (
                                                <span className="text-hw-text-muted text-xs">—</span>
                                            ) : (
                                                <span className={balancePositive ? "text-hw-accent" : "text-red-500"}>
                                                    {balance.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                    {" "}<span className="text-xs font-normal opacity-70">{tx.currency}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate text-xs" title={tx.notes || ""}>{tx.notes || "—"}</td>
                                        <td className="px-4 py-3 text-hw-text-secondary text-xs">{tx.creator.username}</td>
                                        {showReversalControl && (
                                            <td className="px-4 py-3 text-center">
                                                {isOpeningBalance ? (
                                                    <span className="text-xs text-hw-text-muted font-mono" title="لا يمكن تعديل أو حذف رصيد افتتاحي">—</span>
                                                ) : !sessionOpen ? (
                                                    <span className="text-xs text-hw-text-muted font-mono" title="الجلسة مغلقة">مغلقة</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            id={`edit-${tx.id}`}
                                                            onClick={() => setEditTarget(tx)}
                                                            className="px-2 py-1 text-xs rounded border border-hw-border text-hw-text-secondary hover:bg-hw-bg hover:text-hw-text transition font-medium"
                                                        >
                                                            تعديل
                                                        </button>
                                                        <button
                                                            id={`delete-${tx.id}`}
                                                            onClick={() => handleDelete(tx)}
                                                            className="px-2 py-1 text-xs rounded border border-red-800 text-red-800 hover:bg-red-800/20 transition font-medium"
                                                        >
                                                            حذف
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            {pageCount > 1 && (
                <Pagination page={txPage} pageCount={pageCount} onChange={(p) => setTxPage(p)} />
            )}
        </div>
    );
}
