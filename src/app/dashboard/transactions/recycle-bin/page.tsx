"use client";

import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";

interface DeletedRow {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: string;
    notes: string | null;
    createdAt: string;
    deletedAt: string;
    purgeAt: string;
    sessionId: string | null;
    userName: string;
    createdByName: string;
    deletedByName: string;
}

function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const TYPE_LABEL: Record<string, string> = {
    debit: "مدين لنا",
    credit: "دائن علينا",
    opening_balance: "رصيد افتتاحي",
};

export default function RecycleBinPage() {
    const [rows, setRows] = useState<DeletedRow[]>([]);
    const [total, setTotal] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    // Fetch current user role from session info endpoint
    useEffect(() => {
        fetch("/api/auth/session")
            .then((r) => r.json())
            .then((data) => {
                setUserRole(data?.user?.role ?? null);
            })
            .catch(() => {});
    }, []);

    const fetchRows = useCallback(async (p: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/transactions/recycle-bin?page=${p}`);
            if (!res.ok) return;
            const data = await res.json();
            setRows(data.items);
            setTotal(data.total);
            setPageCount(data.pageCount);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRows(page); }, [page, fetchRows]);

    async function handleRestore(id: string, userName: string) {
        const result = await Swal.fire({
            title: "استعادة العملية",
            text: `هل تريد استعادة هذه العملية لـ ${userName}؟ سيتم إعادة تطبيق أثرها على الرصيد.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "نعم، استعادة",
            cancelButtonText: "إلغاء",
            confirmButtonColor: "#059669",
            cancelButtonColor: "#1e293b",
        });
        if (!result.isConfirmed) return;

        const res = await fetch(`/api/transactions/recycle-bin/${id}`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
            await Swal.fire({ title: "خطأ", text: data.error ?? "حدث خطأ", icon: "error", confirmButtonText: "موافق" });
        } else {
            await Swal.fire({ title: "تمت الاستعادة", text: "تمت استعادة العملية بنجاح.", icon: "success", confirmButtonText: "موافق" });
            fetchRows(page);
        }
    }

    async function handlePurge(id: string) {
        const result = await Swal.fire({
            title: "حذف نهائي",
            text: "هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد؟",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "نعم، احذف نهائياً",
            cancelButtonText: "إلغاء",
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#1e293b",
        });
        if (!result.isConfirmed) return;

        const res = await fetch(`/api/transactions/recycle-bin/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
            await Swal.fire({ title: "خطأ", text: data.error ?? "حدث خطأ", icon: "error", confirmButtonText: "موافق" });
        } else {
            await Swal.fire({ title: "تم الحذف", text: "تم حذف العملية نهائياً.", icon: "success", confirmButtonText: "موافق" });
            fetchRows(page);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col justify-between gap-4 border-b border-hw-border pb-5 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">سلة المحذوفات</h2>
                    <p className="text-sm text-hw-text-secondary">
                        العمليات المحذوفة محفوظة لمدة ١٥ يوماً قبل الحذف النهائي. ({total} إجمالي)
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-hw-bg px-3 py-1.5 border border-hw-border self-start">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-xs font-mono font-semibold text-hw-text-secondary">سلة المحذوفات</span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-hw-border bg-hw-surface">
                <table className="w-full text-right text-sm text-hw-text-secondary">
                    <thead className="bg-hw-bg text-xs font-semibold uppercase tracking-wider text-hw-text-secondary border-b border-hw-border">
                        <tr>
                            <th className="px-4 py-3">الحساب</th>
                            <th className="px-4 py-3">النوع</th>
                            <th className="px-4 py-3 text-right">المبلغ</th>
                            <th className="px-4 py-3">ملاحظات</th>
                            <th className="px-4 py-3">المسؤول</th>
                            <th className="px-4 py-3">تاريخ الحذف</th>
                            <th className="px-4 py-3">انتهاء الاسترداد</th>
                            <th className="px-4 py-3 text-center">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hw-border font-normal">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-hw-text-muted italic">جارٍ التحميل…</td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="text-center py-10 text-hw-text-muted italic">سلة المحذوفات فارغة.</td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const days = daysUntil(row.purgeAt);
                                const urgent = days <= 2;
                                return (
                                    <tr key={row.id} className="hover:bg-hw-bg/50 transition">
                                        <td className="px-4 py-3 font-medium text-hw-text">{row.userName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-mono uppercase ${
                                                row.type === "debit" ? "bg-hw-accent-muted text-gray-100" :
                                                row.type === "credit" ? "bg-hw-danger-muted text-hw-danger" :
                                                "bg-hw-info-muted text-hw-info"
                                            }`}>
                                                {TYPE_LABEL[row.type] ?? row.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">
                                            {row.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                                            <span className="text-xs text-hw-text-muted font-normal">{row.currency}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate text-xs" title={row.notes ?? ""}>{row.notes || "—"}</td>
                                        <td className="px-4 py-3 text-xs text-hw-text-secondary">{row.deletedByName}</td>
                                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                                            {new Date(row.deletedAt).toLocaleDateString("ar-EG")}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`text-sm font-bold ${urgent ? "text-red-700" : "text-brown-500"}`}>
                                                {days === 0 ? "انتهت المدة" : `${days} يوم`}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {days > 0 && (
                                                    <button
                                                        id={`restore-${row.id}`}
                                                        onClick={() => handleRestore(row.id, row.userName)}
                                                        className="p-2 rounded text-xs font-semibold bg-hw-accent-solid text-white hover:bg-hw-accent-solid-hover transition"
                                                    >
                                                        استعادة
                                                    </button>
                                                )}
                                                {userRole === "Admin" && (
                                                    <button
                                                        id={`purge-${row.id}`}
                                                        onClick={() => handlePurge(row.id)}
                                                        className="p-2 rounded text-xs font-semibold border border-red-800 text-white bg-red-800 hover:bg-red-800/20 transition"
                                                    >
                                                        حذف نهائي
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
                <div className="flex justify-center gap-2">
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded text-sm font-mono font-medium transition ${
                                p === page ? "bg-hw-accent-solid text-white" : "border border-hw-border text-hw-text-secondary hover:bg-hw-bg"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
