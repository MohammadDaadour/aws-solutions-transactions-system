"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTransferSocket } from "./useTransferSocket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TransferOrder = {
  id: string;
  name: string;
  amount: string | number;
  number: string;
  currency: string;
  status: "PENDING" | "TAKEN" | "DONE" | "CANCELLED";
  receiverId: string;
  senderId: string | null;
  createdAt: string;
  receiver?: { id: string; username: string };
  sender?: { id: string; username: string };
};

// Arabic display labels for TransferCurrency enum values
export const CURRENCY_LABELS: Record<string, string> = {
  VODAFONE_CASH: "تحويل فودافون كاش",
  BANK_TRANSFER: "تحويل بنكى",
  CASH_EGP: "تحويل جنيه نقدى",
  AED: "درهم اماراتى",
  KWD: "دينار كويتى",
  SWIFT_CHINA: "سويفت الصين",
  SWIFT_KOREA: "سويفت كوريا",
  SWIFT_AUSTRALIA: "سويفت استراليا",
};

// ---------------------------------------------------------------------------
// Toast helper
// ---------------------------------------------------------------------------
type Toast = { id: number; message: string; type: "success" | "error" | "info" };

let toastId = 0;

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`px-5 py-3 rounded-xl text-sm shadow-lg shadow-black/20 cursor-pointer max-w-[320px] transition-all transform hover:-translate-y-0.5 ${
            t.type === "error"
              ? "bg-red-900 text-red-50 border border-red-800"
              : t.type === "success"
              ? "bg-green-900 text-green-50 border border-green-800"
              : "bg-hw-sidebar text-white border border-hw-sidebar-border"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SenderQueue component
// ---------------------------------------------------------------------------
export default function SenderQueue() {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch (used on mount and on WS reconnect)
  // ---------------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders");
      if (!res.ok) return;
      const data: TransferOrder[] = await res.json();
      setOrders(data);
    } catch {
      // Network error — ignore, polling will retry
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // 30-second polling fallback — backstop for missed WS broadcasts
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ---------------------------------------------------------------------------
  // WebSocket event handlers
  // ---------------------------------------------------------------------------
  const handleOrderNew = useCallback((order: unknown) => {
    const o = order as TransferOrder;
    setOrders((prev) => {
      // Prevent duplicates (poll + socket race)
      if (prev.find((x) => x.id === o.id)) return prev;
      return [o, ...prev];
    });
  }, []);

  const handleOrderTaken = useCallback((order: unknown) => {
    const o = order as TransferOrder;
    setOrders((prev) => prev.filter((x) => x.id !== o.id));
  }, []);

  const handleOrderClaimFailed = useCallback(
    (data: unknown) => {
      addToast("تم أخذ هذا الطلب بالفعل", "error");
      // Re-fetch to get the real current state
      fetchOrders();
    },
    [addToast, fetchOrders]
  );

  useTransferSocket({
    onOrderNew: handleOrderNew,
    onOrderTaken: handleOrderTaken,
    // onOrderDone not relevant for sender queue
    onOrderClaimFailed: handleOrderClaimFailed,
    onReconnect: () => {
      // Re-sync after reconnect so we don't show stale orders
      fetchOrders();
    },
  });

  // ---------------------------------------------------------------------------
  // Claim handler with optimistic update + rollback
  // ---------------------------------------------------------------------------
  const handleClaim = useCallback(
    async (order: TransferOrder) => {
      if (claimingIds.has(order.id)) return;

      // Optimistically remove from list
      setOrders((prev) => prev.filter((x) => x.id !== order.id));
      setClaimingIds((prev) => new Set(prev).add(order.id));

      try {
        const res = await fetch(`/api/transfer-orders/${order.id}/claim`, {
          method: "POST",
        });

        if (res.status === 409) {
          // Lost the race — roll back the optimistic removal
          setOrders((prev) => {
            if (prev.find((x) => x.id === order.id)) return prev;
            return [order, ...prev].sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
          addToast("تم أخذ هذا الطلب بالفعل", "error");
        } else if (!res.ok) {
          setOrders((prev) => {
            if (prev.find((x) => x.id === order.id)) return prev;
            return [order, ...prev];
          });
          addToast("حدث خطأ أثناء محاولة الحجز", "error");
        } else {
          addToast("تم حجز الطلب بنجاح ✓", "success");
        }
      } catch {
        // Network error — roll back
        setOrders((prev) => {
          if (prev.find((x) => x.id === order.id)) return prev;
          return [order, ...prev];
        });
        addToast("خطأ في الاتصال، حاول مرة أخرى", "error");
      } finally {
        setClaimingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [claimingIds, addToast]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      <ToastContainer toasts={toasts} remove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-hw-text m-0">قائمة طلبات التحويل</h2>
          <p className="text-sm text-hw-text-secondary mt-1">الطلبات المتاحة للحجز — تتحدث تلقائيًا</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hw-success-muted border border-hw-success-border text-xs font-semibold text-green-700">
          <span className="w-2 h-2 rounded-full bg-hw-success animate-pulse" />
          مباشر
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-hw-text-muted">
          <div className="w-10 h-10 border-4 border-hw-border border-t-hw-accent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 px-8 text-hw-text bg-hw-surface rounded-2xl border border-dashed border-hw-border">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-lg font-medium">لا توجد طلبات تحويل متاحة حاليًا</p>
          <p className="text-sm text-hw-text-secondary mt-2">ستظهر الطلبات الجديدة هنا فور إرسالها</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              claiming={claimingIds.has(order.id)}
              onClaim={handleClaim}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderCard
// ---------------------------------------------------------------------------
function OrderCard({
  order,
  claiming,
  onClaim,
}: {
  order: TransferOrder;
  claiming: boolean;
  onClaim: (o: TransferOrder) => void;
}) {
  const amount =
    typeof order.amount === "string"
      ? parseFloat(order.amount)
      : order.amount;

  return (
    <div className="bg-hw-surface border border-hw-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-base text-hw-text m-0">{order.name}</p>
          <p className="text-xs text-hw-text-secondary mt-1">{order.receiver?.username ?? "—"}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          قيد الانتظار
        </span>
      </div>

      {/* Amount + Currency */}
      <div className="bg-hw-bg rounded-xl px-4 py-3 flex justify-between items-center border border-hw-border/50">
        <span className="text-2xl font-bold text-hw-accent font-mono">{amount.toLocaleString("en-US")}</span>
        <span className="text-xs font-semibold text-hw-text-secondary bg-hw-surface px-2 py-1 rounded border border-hw-border">
          {CURRENCY_LABELS[order.currency] ?? order.currency}
        </span>
      </div>

      {/* Phone number */}
      <div className="text-sm text-hw-text-secondary flex justify-between items-center bg-hw-surface-alt px-3 py-2 rounded-lg">
        <span className="text-xs font-semibold">رقم الهاتف</span>
        <span className="font-mono font-bold text-hw-text" dir="ltr">{order.number}</span>
      </div>

      {/* Timestamp */}
      <p className="text-[11px] font-mono text-hw-text-muted m-0 text-center">
        {new Date(order.createdAt).toLocaleString("ar-EG")}
      </p>

      {/* Claim button */}
      <button
        id={`claim-${order.id}`}
        disabled={claiming}
        onClick={() => onClaim(order)}
        className={`mt-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
          claiming 
            ? "bg-hw-disabled-bg text-hw-disabled-text cursor-not-allowed shadow-none" 
            : "bg-hw-accent text-white hover:bg-hw-accent-hover active:scale-[0.98] shadow-sm shadow-blue-500/20"
        }`}
      >
        {claiming ? "جارى الحجز..." : "حجز الطلب"}
      </button>
    </div>
  );
}
