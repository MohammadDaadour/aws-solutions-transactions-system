"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTransferSocket } from "./useTransferSocket";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";
import { TransferCurrency } from "../../generated/prisma/client";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  PENDING: {
    label: "قيد الانتظار",
    bg: "rgba(251,191,36,0.12)",
    color: "#513606ff",
    border: "#774d07ff",
  },
  TAKEN: {
    label: "تم الحجز",
    bg: "rgba(56,189,248,0.12)",
    color: "#124054ff",
    border: "#124054ff",
  },
  DONE: {
    label: "تم التحويل ✓",
    bg: "rgba(34,197,94,0.12)",
    color: "#0f5629ff",
    border: "#0f5629ff",
  },
  CANCELLED: {
    label: "ملغى",
    bg: "rgba(100,116,139,0.12)",
    color: "#94a3b8",
    border: "rgba(100,116,139,0.3)",
  },
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------
type FormValues = {
  name: string;
  amount: string;
  number: string;
  currency: TransferCurrency | "";
};

const INITIAL_FORM: FormValues = {
  name: "",
  amount: "",
  number: "",
  currency: "",
};

// ---------------------------------------------------------------------------
// ReceiverTracker
// ---------------------------------------------------------------------------
export default function ReceiverTracker({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch own orders
  // ---------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders/mine");
      if (!res.ok) return;
      const data: TransferOrder[] = await res.json();
      setOrders(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // WebSocket — listen on receiver:{userId} room (joined server-side)
  // ---------------------------------------------------------------------------
  useTransferSocket({
    onOrderTaken: (raw) => {
      const updated = raw as TransferOrder;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
    },
    onOrderDone: (raw) => {
      const updated = raw as TransferOrder;
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
    },
    onReconnect: fetchOrders,
  });

  // ---------------------------------------------------------------------------
  // Form submission — create new order
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.amount || !form.number.trim() || !form.currency) {
      setFormError("جميع الحقول مطلوبة");
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("أدخل مبلغًا صحيحًا");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfer-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          amount,
          number: form.number.trim(),
          currency: form.currency,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "خطأ غير متوقع" }));
        setFormError(err.error ?? "خطأ أثناء إرسال الطلب");
        return;
      }

      const newOrder: TransferOrder = await res.json();
      setOrders((prev) => [newOrder, ...prev]);
      setForm(INITIAL_FORM);
    } catch {
      setFormError("خطأ في الاتصال، حاول مرة أخرى");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-8">
      {/* ── Create order form ── */}
      <section className="bg-hw-surface border border-hw-border rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-bold text-hw-text mb-6">
          إرسال طلب تحويل جديد
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recv-name" className="text-xs font-semibold text-hw-text-secondary">الاسم</label>
            <input
              id="recv-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="اسم المستلم"
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            />
          </div>

          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recv-amount" className="text-xs font-semibold text-hw-text-secondary">المبلغ</label>
            <input
              id="recv-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            />
          </div>

          {/* Phone number */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recv-number" className="text-xs font-semibold text-hw-text-secondary">رقم الهاتف / الحساب</label>
            <input
              id="recv-number"
              type="text"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              placeholder="01xxxxxxxxx"
              dir="ltr"
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text text-left font-mono focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            />
          </div>

          {/* Currency */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="recv-currency" className="text-xs font-semibold text-hw-text-secondary">نوع التحويل</label>
            <select
              id="recv-currency"
              value={form.currency}
              onChange={(e) =>
                setForm((f) => ({ ...f, currency: e.target.value as TransferCurrency }))
              }
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text cursor-pointer focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            >
              <option value="">-- اختر نوع التحويل --</option>
              {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Error */}
          {formError && (
            <div className="md:col-span-2 px-4 py-2.5 bg-hw-danger-muted border border-hw-danger-border rounded-xl text-sm font-medium text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {formError}
            </div>
          )}

          {/* Submit */}
          <button
            id="recv-submit"
            type="submit"
            disabled={submitting}
            className={`md:col-span-2 py-3 px-4 rounded-xl font-bold text-sm transition-all mt-2 ${
              submitting 
                ? "bg-hw-disabled-bg text-hw-disabled-text cursor-not-allowed shadow-none" 
                : "bg-hw-accent text-white hover:bg-hw-accent-hover active:scale-[0.99] shadow-sm shadow-blue-500/20"
            }`}
          >
            {submitting ? "جارى الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      </section>

      {/* ── Orders list ── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-hw-text m-0">طلباتي</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hw-success-muted border border-hw-success-border text-xs font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-hw-success animate-pulse" />
            يتحدث تلقائيًا
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-hw-text-muted">
            <div className="w-10 h-10 border-4 border-hw-border border-t-hw-accent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 px-8 text-hw-text-muted bg-hw-surface rounded-2xl border border-dashed border-hw-border">
            <p className="text-lg font-medium">لا توجد طلبات بعد. أرسل طلبك الأول أعلاه.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <ReceiverOrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component for a single receiver order
// ---------------------------------------------------------------------------
function ReceiverOrderRow({ order }: { order: TransferOrder }) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const amount =
    typeof order.amount === "string" ? parseFloat(order.amount) : order.amount;

  return (
    <div className="bg-hw-surface border border-hw-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Status badge */}
      <span
        style={{
          background: status.bg,
          color: status.color,
          borderColor: status.border,
        }}
        className="shrink-0 px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap w-fit"
      >
        {status.label}
      </span>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-hw-text text-base m-0 mb-1">{order.name}</p>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-hw-text-secondary">
          <span className="bg-hw-bg px-2 py-0.5 rounded border border-hw-border">
            {CURRENCY_LABELS[order.currency] ?? order.currency}
          </span>
          <span className="font-mono bg-hw-bg px-2 py-0.5 rounded border border-hw-border" dir="ltr">
            {order.number}
          </span>
          {order.sender && (
            <span className="text-hw-accent bg-hw-accent-muted px-2 py-0.5 rounded border border-hw-accent/20">
              المحوِّل: {order.sender.username}
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className="font-bold text-xl text-hw-text m-0 font-mono">
          {amount.toLocaleString("ar-EG")}
        </p>
        <p className="text-[11px] font-mono text-hw-text-muted mt-1 m-0">
          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
        </p>
      </div>
    </div>
  );
}

