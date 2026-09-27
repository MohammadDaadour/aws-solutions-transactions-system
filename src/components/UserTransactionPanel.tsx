"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Swal from "sweetalert2";
import EditTransactionModal from "./EditTransactionModal";
import { Pagination } from "../app/dashboard/sessions/components/Pagination";

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
    balanceAfter?: number | null;
}

interface Props {
    userId: string;
    showReversalControl: boolean;
}

const TX_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 350;

export function UserTransactionPanel({ userId, showReversalControl }: Props) {
    const [txPage, setTxPage] = useState(1);
    const [transactions, setTransactions] = useState<TransactionRow[]>([]);
    const [pageCount, setPageCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [editTarget, setEditTarget] = useState<TransactionRow | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce: commit search + reset page after user stops typing
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput);
            setTxPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchInput]);

    const fetchTx = useCallback(async (p: number, q: string, from: string, to: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(p),
                pageSize: String(TX_PER_PAGE),
            });
            if (q) params.set("search", q);
            if (from) params.set("dateFrom", from);
            if (to) params.set("dateTo", to);
            const res = await fetch(`/api/users/${userId}/transactions?${params.toString()}`);
            const data = await res.json();
            setTransactions(data.transactions ?? []);
            setPageCount(data.pageCount ?? 0);
            setTotal(data.total ?? 0);
        } finally {
            setLoading(false);
            setFetched(true);
        }
    }, [userId]);

    useEffect(() => { fetchTx(txPage, searchQuery, dateFrom, dateTo); }, [txPage, searchQuery, dateFrom, dateTo, fetchTx]);

    useEffect(() => {
        const onTransactionAdded = () => fetchTx(txPage, searchQuery, dateFrom, dateTo);
        window.addEventListener("transaction-added", onTransactionAdded);
        return () => window.removeEventListener("transaction-added", onTransactionAdded);
    }, [fetchTx, txPage, searchQuery, dateFrom, dateTo]);

    function handleClearSearch() {
        setSearchInput("");
        setSearchQuery("");
        setTxPage(1);
    }

    function handleClearDates() {
        setDateFrom("");
        setDateTo("");
        setTxPage(1);
    }

    async function handleDelete(tx: TransactionRow) {
        const result = await Swal.fire({
            title: "\u062d\u0630\u0641 \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
            html: `\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0648\u0639\u0643\u0633 \u0623\u062b\u0631\u0647\u0627 \u0639\u0644\u0649 \u0627\u0644\u0631\u0635\u064a\u062f.<br/><br/>
                   <span class="text-sm text-amber-500 font-semibold">\u26a0 \u064a\u0645\u0643\u0646 \u0627\u0644\u0627\u0633\u062a\u0631\u062f\u0627\u062f \u062e\u0644\u0627\u0644 \u0661\u0665 \u064a\u0648\u0645\u0627\u064b \u0645\u0646 \u0633\u0644\u0629 \u0627\u0644\u0645\u062d\u0630\u0648\u0641\u0627\u062a</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "\u0646\u0639\u0645\u060c \u0627\u062d\u0630\u0641",
            cancelButtonText: "\u0625\u0644\u063a\u0627\u0621",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#1e293b",
        });

        if (!result.isConfirmed) return;

        const res = await fetch(`/api/transactions/${tx.id}`, { method: "DELETE" });
        const data = await res.json();

        if (!res.ok) {
            await Swal.fire({
                title: "\u062e\u0637\u0623",
                text: data.error ?? "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062d\u0630\u0641",
                icon: "error",
                confirmButtonText: "\u0645\u0648\u0627\u0641\u0642",
            });
        } else {
            await Swal.fire({
                title: "\u062a\u0645 \u0627\u0644\u062d\u0630\u0641",
                text: "\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0639\u0645\u0644\u064a\u0629 \u0648\u0646\u0642\u0644\u0647\u0627 \u0625\u0644\u0649 \u0633\u0644\u0629 \u0627\u0644\u0645\u062d\u0630\u0648\u0641\u0627\u062a.",
                icon: "success",
                confirmButtonText: "\u0645\u0648\u0627\u0641\u0642",
            });
            fetchTx(txPage, searchQuery, dateFrom, dateTo);
        }
    }

    function handleEditSuccess() {
        setEditTarget(null);
        fetchTx(txPage, searchQuery, dateFrom, dateTo);
    }

    if (!fetched && loading) {
        return (
            <div className="flex items-center justify-center py-8 text-hw-text-muted text-sm gap-2">
                <span className="inline-block w-4 h-4 border-2 border-hw-accent border-t-transparent rounded-full animate-spin" />
                {"\u062c\u0627\u0631 \u0627\u0644\u062a\u062d\u0645\u064a\u0644\u2026"}
            </div>
        );
    }

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

            {/* Filter Bar */}
            <div className="flex flex-col gap-3">
                {/* Row 1: search + date pickers */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Search input */}
                    <div className="relative flex-1">
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-hw-text-muted">
                            {loading && fetched ? (
                                <span className="inline-block w-3.5 h-3.5 border-2 border-hw-accent border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            )}
                        </div>
                        <input
                            id="user-tx-search"
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder=""
                            className="w-full rounded-lg border border-hw-border bg-hw-bg text-hw-text text-sm pr-9 pl-9 py-2 focus:outline-none focus:ring-1 focus:ring-hw-accent transition placeholder:text-hw-text-muted"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="absolute inset-y-0 left-0 flex items-center pl-3 text-hw-text-muted hover:text-hw-text transition text-sm"
                            >
                                &#x2715;
                            </button>
                        )}
                    </div>

                    {/* Date range inputs */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                            <input
                                id="user-tx-date-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setTxPage(1); }}
                                className="rounded-lg border border-hw-border bg-hw-bg text-hw-text text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-hw-accent transition"
                            />
                        </div>
                        <span className="text-hw-text-muted text-xs select-none">→</span>
                        <div className="relative">
                            <input
                                id="user-tx-date-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setTxPage(1); }}
                                min={dateFrom || undefined}
                                className="rounded-lg border border-hw-border bg-hw-bg text-hw-text text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-hw-accent transition"
                            />
                        </div>
                        {(dateFrom || dateTo) && (
                            <button
                                type="button"
                                onClick={handleClearDates}
                                className="text-xs text-hw-text-muted hover:text-hw-text transition px-1"
                                title="&#x2715;"
                            >
                                &#x2715;
                            </button>
                        )}
                    </div>
                </div>

                {/* Row 2: active-filter badges */}
                {(searchQuery.trim() || dateFrom || dateTo) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-hw-text-secondary">
                        {searchQuery.trim() && (
                            <span className="flex items-center gap-1 rounded-md bg-hw-accent/10 text-hw-accent px-2 py-0.5 border border-hw-accent/20">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                {searchQuery}
                                <button onClick={handleClearSearch} className="ml-1 opacity-60 hover:opacity-100">&#x2715;</button>
                            </span>
                        )}
                        {dateFrom && (
                            <span className="flex items-center gap-1 rounded-md bg-hw-accent/10 text-hw-accent px-2 py-0.5 border border-hw-accent/20">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {dateFrom}
                                <button onClick={() => { setDateFrom(""); setTxPage(1); }} className="ml-1 opacity-60 hover:opacity-100">&#x2715;</button>
                            </span>
                        )}
                        {dateTo && (
                            <span className="flex items-center gap-1 rounded-md bg-hw-accent/10 text-hw-accent px-2 py-0.5 border border-hw-accent/20">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {dateTo}
                                <button onClick={() => { setDateTo(""); setTxPage(1); }} className="ml-1 opacity-60 hover:opacity-100">&#x2715;</button>
                            </span>
                        )}
                        <span className="text-hw-text-muted font-sans">{total} نتيجة</span>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-hw-border bg-hw-surface">
                <table className="w-full text-right text-sm text-hw-text-secondary">
                    <thead className="bg-hw-bg text-xs font-semibold uppercase tracking-wider text-hw-text-secondary border-b border-hw-border">
                        <tr>
                            <th className="px-4 py-3">{"\u0627\u0644\u062a\u0627\u0631\u064a\u062e"}</th>
                            <th className="px-4 py-3">{"\u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0645\u0631\u062c\u0639\u064a"}</th>
                            <th className="px-4 py-3">{"\u0627\u0633\u0645 \u0627\u0644\u062d\u0633\u0627\u0628"}</th>
                            <th className="px-4 py-3">{"\u0627\u0644\u0646\u0648\u0639"}</th>
                            <th className="px-4 py-3 text-right">{"\u0627\u0644\u0645\u0628\u0644\u063a"}</th>
                            <th className="px-4 py-3 text-right">{"\u0627\u0644\u0631\u0635\u064a\u062f \u0628\u0639\u062f"}</th>
                            <th className="px-4 py-3">{"\u0645\u0644\u0627\u062d\u0638\u0627\u062a"}</th>
                            <th className="px-4 py-3">{"\u0627\u0644\u0645\u0633\u0624\u0648\u0644"}</th>
                            {showReversalControl && <th className="px-4 py-3 text-center">{"\u0627\u0644\u0625\u062c\u0631\u0627\u0621"}</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border font-normal">
                        {loading && fetched ? (
                            Array.from({ length: TX_PER_PAGE }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={showReversalControl ? 9 : 8} className="px-4 py-3">
                                        <div className="h-4 rounded bg-hw-border/40 w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : transactions.length === 0 ? (
                            <tr>
                                <td colSpan={showReversalControl ? 9 : 8} className="text-center py-10 text-hw-text-muted">
                                    {searchQuery.trim() ? (
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <svg className="h-8 w-8 text-hw-text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-sm">
                                                {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0645\u0644\u064a\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0628\u062d\u062b "}<span className="font-semibold text-hw-text">&ldquo;{searchQuery}&rdquo;</span>
                                            </p>
                                            <button onClick={handleClearSearch} className="mt-1 text-xs text-hw-accent hover:underline font-medium">
                                                {"\u0625\u0639\u0627\u062f\u0629 \u0636\u0628\u0637 \u0627\u0644\u0628\u062d\u062b"}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="italic">{"\u0644\u0627 \u064a\u0648\u062c\u062f \u0642\u064a\u0648\u062f \u0645\u062d\u0627\u0633\u0628\u064a\u0629."}</span>
                                    )}
                                </td>
                            </tr>
                        ) : (
                            transactions.map((tx) => {
                                const isReversal = tx.notes?.includes("REVERSAL");
                                const isOpeningBalance = tx.type === "opening_balance";
                                const sessionOpen = tx.sessionStatus === "OPEN" || tx.sessionStatus == null;

                                // Round to 2dp to avoid floating-point dust producing -0.00
                                const roundedBalance = tx.balanceAfter != null
                                    ? (Math.round(tx.balanceAfter * 100) / 100) || 0
                                    : null;

                                return (
                                    <tr key={tx.id} className={`hover:bg-hw-bg/50 transition ${isReversal ? "bg-hw-warning-bg text-hw-text-secondary" : ""}`}>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{new Date(tx.date).toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{tx.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 font-medium text-hw-text">{tx.user.username}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${tx.type === "debit" ? "bg-hw-accent-muted text-green-700" :
                                                tx.type === "credit" ? "bg-hw-danger-muted text-hw-danger" : "bg-hw-info-muted text-hw-info"
                                                }`}>
                                                {tx.type === "debit" ? "\u0645\u062f\u064a\u0646 \u0644\u0646\u0627" : tx.type === "credit" ? "\u062f\u0627\u0626\u0646 \u0639\u0644\u064a\u0646\u0627" : tx.type === "opening_balance" ? "\u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a" : tx.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                            {tx.amount.toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })} <span className="text-xs text-hw-text-muted font-normal">{tx.currency}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold whitespace-nowrap">
                                            {roundedBalance != null ? (
                                                <span className={roundedBalance >= 0 ? "text-hw-accent" : "text-red-800"}>
                                                    {roundedBalance.toLocaleString('en-US', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })} <span className="text-xs font-normal opacity-60">{tx.currency}</span>
                                                </span>
                                            ) : (
                                                <span className="text-hw-text-muted text-xs">&mdash;</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate text-xs" title={tx.notes || ""}>{tx.notes || "\u2014"}</td>
                                        <td className="px-4 py-3 text-hw-text-secondary text-xs">{tx.creator.username}</td>
                                        {showReversalControl && (
                                            <td className="px-4 py-3 text-center">
                                                {isOpeningBalance ? (
                                                    <span className="text-xs text-hw-text-muted font-mono" title="\u0644\u0627 \u064a\u0645\u0643\u0646 \u062a\u0639\u062f\u064a\u0644 \u0623\u0648 \u062d\u0630\u0641 \u0631\u0635\u064a\u062f \u0627\u0641\u062a\u062a\u0627\u062d\u064a">&mdash;</span>
                                                ) : !sessionOpen ? (
                                                    <span className="text-xs text-hw-text-muted font-mono" title="\u0627\u0644\u062c\u0644\u0633\u0629 \u0645\u063a\u0644\u0642\u0629">{"\u0645\u063a\u0644\u0642\u0629"}</span>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            id={`edit-${tx.id}`}
                                                            onClick={() => setEditTarget(tx)}
                                                            className="px-2 py-1 text-xs rounded border border-hw-border text-hw-text-secondary hover:bg-hw-bg hover:text-hw-text transition font-medium"
                                                        >
                                                            {"\u062a\u0639\u062f\u064a\u0644"}
                                                        </button>
                                                        <button
                                                            id={`delete-${tx.id}`}
                                                            onClick={() => handleDelete(tx)}
                                                            className="px-2 py-1 text-xs rounded border border-red-800 text-red-800 hover:bg-red-800/20 transition font-medium"
                                                        >
                                                            {"\u062d\u0630\u0641"}
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
