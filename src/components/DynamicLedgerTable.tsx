"use client";

import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import EditTransactionModal from "./EditTransactionModal";

interface TransactionRow {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: Date;
    notes: string | null;
    user: { username: string };
    creator: { username: string };
    sessionId?: string | null;
    sessionStatus?: string | null;
}

interface TableProps {
    transactions: TransactionRow[];
    showReversalControl: boolean;
    userRole?: string;
}

export default function DynamicLedgerTable({ transactions, showReversalControl, userRole }: TableProps) {
    const [editTarget, setEditTarget] = useState<TransactionRow | null>(null);
    const [localRows, setLocalRows] = useState(transactions);
    const [searchQuery, setSearchQuery] = useState("");

    // Keep localRows in sync when parent re-fetches (e.g. after navigation or filter changes)
    useEffect(() => {
        setLocalRows(transactions);
    }, [transactions]);

    const filteredRows = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return localRows;

        return localRows.filter((tx) => {
            const idMatch = tx.id.toLowerCase().includes(query);
            const userMatch = tx.user?.username?.toLowerCase().includes(query) ?? false;
            const creatorMatch = tx.creator?.username?.toLowerCase().includes(query) ?? false;
            const notesMatch = tx.notes ? tx.notes.toLowerCase().includes(query) : false;
            const amountMatch = tx.amount.toString().includes(query);
            const currencyMatch = tx.currency.toLowerCase().includes(query);
            const dateStr = new Date(tx.date).toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
            const dateIso = new Date(tx.date).toISOString().slice(0, 10);
            const dateMatch = dateStr.includes(query) || dateIso.includes(query);
            const typeLabel =
                tx.type === "debit"
                    ? "مدين لنا"
                    : tx.type === "credit"
                    ? "دائن علينا"
                    : tx.type === "opening_balance"
                    ? "رصيد افتتاحي"
                    : tx.type;
            const typeMatch = typeLabel.toLowerCase().includes(query) || tx.type.toLowerCase().includes(query);

            return idMatch || userMatch || creatorMatch || notesMatch || amountMatch || currencyMatch || dateMatch || typeMatch;
        });
    }, [localRows, searchQuery]);

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
            // Remove row from local state without full page reload
            setLocalRows((prev) => prev.filter((r) => r.id !== tx.id));
        }
    }

    function handleEditSuccess() {
        setEditTarget(null);
        // Trigger page-level revalidation by refreshing
        window.location.reload();
    }

    const showActions = showReversalControl;
    // Column count: base 7 + 1 if actions shown
    const colSpan = showActions ? 8 : 7;

    return (
        <>
            {editTarget && (
                <EditTransactionModal
                    transaction={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSuccess={handleEditSuccess}
                />
            )}

            <div className="space-y-3">
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-hw-text-muted">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="بحث في العمليات (الرقم المرجعي، الحساب، المبلغ، الملاحظات...)"
                            className="w-full rounded-lg border border-hw-border bg-hw-bg text-hw-text text-sm pr-9 pl-9 py-2 focus:outline-none focus:ring-1 focus:ring-hw-accent transition placeholder:text-hw-text-muted"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 left-0 flex items-center pl-3 text-hw-text-muted hover:text-hw-text transition text-sm"
                                title="مسح البحث"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {searchQuery.trim() && (
                        <div className="flex items-center gap-2 text-xs font-mono text-hw-text-secondary">
                            <span>النتائج:</span>
                            <span className="font-bold text-hw-accent">{filteredRows.length}</span>
                            <span>من أصل {localRows.length}</span>
                            <button
                                onClick={() => setSearchQuery("")}
                                className="mr-2 text-xs text-hw-accent hover:underline font-medium font-sans"
                            >
                                إلغاء التصفية
                            </button>
                        </div>
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
                                <th className="px-4 py-3">ملاحظات</th>
                                <th className="px-4 py-3">المسؤول</th>
                                {showActions && <th className="px-4 py-3 text-center">الإجراء</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hw-border font-normal">
                            {localRows.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="text-center py-8 text-hw-text-muted italic">لا يوجد قيود محاسبية.</td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="text-center py-10 text-hw-text-muted">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <svg className="h-8 w-8 text-hw-text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="text-sm">لا توجد عمليات مطابقة للبحث <span className="font-semibold text-hw-text">"{searchQuery}"</span></p>
                                            <button
                                                onClick={() => setSearchQuery("")}
                                                className="mt-1 text-xs text-hw-accent hover:underline font-medium"
                                            >
                                                إعادة ضبط البحث
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((tx) => {
                                const isReversal = tx.notes?.includes("REVERSAL");
                                const isOpeningBalance = tx.type === "opening_balance";
                                const sessionOpen = tx.sessionStatus === "OPEN" || tx.sessionStatus == null;

                                return (
                                    <tr key={tx.id} className={`hover:bg-hw-bg/50 transition ${isReversal ? "bg-hw-warning-bg text-hw-text-secondary" : ""}`}>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{new Date(tx.date).toLocaleString("ar-EG", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">{tx.id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 font-medium text-hw-text">{tx.user.username}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${tx.type === "debit" ? "bg-hw-accent-muted text-green-800" :
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
                                        <td className="px-4 py-3 max-w-xs truncate text-xs" title={tx.notes || ""}>{tx.notes || "—"}</td>
                                        <td className="px-4 py-3 text-hw-text-secondary text-xs">{tx.creator.username}</td>
                                        {showActions && (
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
            </div>
        </>
    );
}