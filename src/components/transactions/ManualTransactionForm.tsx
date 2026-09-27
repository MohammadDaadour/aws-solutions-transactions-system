"use client";

import { useState } from "react";
import { createHawalaTransaction } from "../../app/actions/transactions";
import { Currency, TransactionType } from "../../generated/prisma/enums";

interface UserOption {
    id: string;
    username: string;
}

interface FormProps {
    users: UserOption[];
    allowOpeningBalance: boolean;
    preselectedUserId?: string;
    lockUserSelect?: boolean;
}

export default function ManualTransactionForm({ users, allowOpeningBalance, preselectedUserId, lockUserSelect }: FormProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(event.currentTarget);

        const payload = {
            userId: formData.get("userId") as string,
            type: formData.get("type") as TransactionType,
            amount: parseFloat(formData.get("amount") as string),
            currency: formData.get("currency") as Currency,
            date: formData.get("date") as string,
            notes: formData.get("notes") as string,
        };

        const response = await createHawalaTransaction(payload);
        setLoading(false);

        if (response.success) {
            setMessage({ success: true, text: "Transaction journaled successfully!" });
            event.currentTarget?.reset();
        } else {
            setMessage({ success: false, text: response.error || "An error occurred." });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {lockUserSelect && preselectedUserId ? (
                <input type="hidden" name="userId" value={preselectedUserId} />
            ) : (
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">الحساب المستهدف</label>
                    <select name="userId" required defaultValue={preselectedUserId} className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all">
                        <option value="">-- اختر الحساب --</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.username}</option>
                        ))}
                    </select>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">نوع المعاملة</label>
                    <select name="type" required className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all">
                        <option value="debit">Debit (مدين لنا)</option>
                        <option value="credit">Credit (دائن علينا)</option>
                        {allowOpeningBalance && <option value="opening_balance">Opening Balance (رصيد افتتاحي)</option>}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">العملة</label>
                    <select name="currency" required className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all">
                        <option value="USD">USD</option>
                        <option value="AED">AED</option>
                        <option value="EGP">EGP</option>
                        <option value="VOD">VOD (Vodafone)</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">المبلغ الخام</label>
                    <input name="amount" type="number" step="0.0001" min="0.0001" required placeholder="0.00" className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text font-mono focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">تاريخ التنفيذ</label>
                    <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-medium text-hw-text-secondary mb-1">ملاحظات الدفتر / المراجع</label>
                <textarea name="notes" rows={2} placeholder="..." className="w-full bg-hw-bg border border-hw-border rounded-xl p-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all resize-none"></textarea>
            </div>

            {message && (
                <div className={`p-3 rounded text-xs font-medium ${message.success ? "bg-hw-accent-muted text-hw-accent border border-hw-accent-muted" : "bg-hw-danger-bg text-hw-danger border border-hw-danger-border"}`}>
                    {message.text}
                </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all text-white bg-hw-accent hover:bg-hw-accent-hover shadow-sm shadow-blue-500/20 disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text disabled:shadow-none disabled:cursor-not-allowed">
                {loading ? "جار تسجيل المعالجة..." : "سجل المعاملة"}
            </button>
        </form>
    );
}
