"use client";

import { useState } from "react";
import Swal from "sweetalert2";

interface TransactionRow {
    id: string;
    type: string;
    amount: number;
    currency: string;
    date: Date;
    notes: string | null;
}

interface Props {
    transaction: TransactionRow;
    onClose: () => void;
    onSuccess: () => void;
}

const CURRENCY_OPTIONS = ["USD", "AED", "EGP", "VOD"];
const TYPE_OPTIONS = [
    { value: "debit", label: "مدين لنا" },
    { value: "credit", label: "دائن علينا" },
];

export default function EditTransactionModal({ transaction, onClose, onSuccess }: Props) {
    const [type, setType] = useState(transaction.type);
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [currency, setCurrency] = useState(transaction.currency);
    const [date, setDate] = useState(transaction.date.toISOString().slice(0, 10));
    const [notes, setNotes] = useState(transaction.notes ?? "");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            await Swal.fire({ title: "خطأ", text: "المبلغ يجب أن يكون أكبر من صفر", icon: "error", confirmButtonText: "موافق" });
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/transactions/${transaction.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, amount: parsedAmount, currency, date, notes }),
            });
            const data = await res.json();
            if (!res.ok) {
                await Swal.fire({ title: "خطأ", text: data.error ?? "حدث خطأ", icon: "error", confirmButtonText: "موافق" });
                return;
            }
            await Swal.fire({ title: "تم بنجاح", text: "تم تحديث العملية بنجاح وتعديل الرصيد.", icon: "success", confirmButtonText: "موافق" });
            onSuccess();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-hw-border bg-hw-surface shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-hw-border px-6 py-4">
                    <h2 className="text-lg font-bold text-hw-text">تعديل العملية</h2>
                    <button
                        onClick={onClose}
                        className="text-hw-text-muted hover:text-hw-text transition text-xl leading-none"
                        aria-label="إغلاق"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Transaction ID */}
                    <p className="text-xs text-hw-text-muted font-mono">
                        رقم العملية: <span className="text-hw-text">{transaction.id.slice(0, 12)}…</span>
                    </p>

                    {/* Type */}
                    <div>
                        <label className="block text-xs font-semibold text-hw-text-secondary mb-1">نوع العملية</label>
                        {transaction.type === "opening_balance" ? (
                            <div className="rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text-muted">
                                رصيد افتتاحي — لا يمكن تعديل هذا النوع
                            </div>
                        ) : (
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="w-full rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text focus:outline-none"
                            >
                                {TYPE_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-semibold text-hw-text-secondary mb-1">المبلغ</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text focus:outline-none"
                            required
                        />
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-xs font-semibold text-hw-text-secondary mb-1">العملة</label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="w-full rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text focus:outline-none"
                        >
                            {CURRENCY_OPTIONS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-semibold text-hw-text-secondary mb-1">التاريخ</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text focus:outline-none"
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-hw-text-secondary mb-1">ملاحظات</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-hw-border bg-hw-bg px-3 py-2 text-sm text-hw-text focus:outline-none resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-hw-text-secondary border border-hw-border hover:bg-hw-bg transition"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading || transaction.type === "opening_balance"}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-hw-accent-solid text-white hover:bg-hw-accent-solid-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
