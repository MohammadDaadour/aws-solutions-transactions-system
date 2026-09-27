"use client";

/**
 * SenderClaimedOrders
 *
 * Shows the currently-authenticated sender's own TAKEN (claimed) orders,
 * with a "Mark Done" button for each. Updates in real time when order:taken
 * arrives (a new order was claimed by this sender) or order:done fires.
 *
 * This component reuses the GET /api/transfer-orders/mine equivalent by
 * fetching all sender-specific TAKEN orders from a dedicated endpoint.
 */

import { useEffect, useState, useCallback } from "react";
import { useTransferSocket } from "./useTransferSocket";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";

export default function SenderClaimedOrders() {
  const [orders, setOrders] = useState<TransferOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());

  const fetchClaimed = useCallback(async () => {
    try {
      const res = await fetch("/api/transfer-orders/claimed");
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
    fetchClaimed();
  }, [fetchClaimed]);

  useTransferSocket({
    // When this sender claims an order, add it to the claimed list
    onOrderTaken: (raw) => {
      const o = raw as TransferOrder;
      // Only add if this sender claimed it (senderId check happens server-side;
      // the event is broadcast to all senders so we check locally)
      fetchClaimed();
    },
    onReconnect: fetchClaimed,
  });

  const handleMarkDone = useCallback(
    async (order: TransferOrder) => {
      if (markingIds.has(order.id)) return;
      setMarkingIds((prev) => new Set(prev).add(order.id));

      try {
        const res = await fetch(`/api/transfer-orders/${order.id}/done`, {
          method: "POST",
        });

        if (res.ok) {
          // Remove from the claimed list immediately
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
      } finally {
        setMarkingIds((prev) => {
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
      }
    },
    [markingIds]
  );

  if (loading) return null;
  if (orders.length === 0) return null;

  return (
    <section>
      <h2 className="text-xl font-bold text-hw-text mb-4">
        طلباتك المحجوزة
      </h2>

      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const amount =
            typeof order.amount === "string"
              ? parseFloat(order.amount)
              : order.amount;
          const marking = markingIds.has(order.id);

          return (
            <div
              key={order.id}
              className="bg-hw-surface border border-sky-300/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-200 whitespace-nowrap w-fit">
                محجوز
              </span>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-base text-hw-text m-0 mb-1">
                  {order.name}
                </p>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-hw-text-secondary">
                  <span className="bg-hw-bg px-2 py-0.5 rounded border border-hw-border">
                    {CURRENCY_LABELS[order.currency] ?? order.currency}
                  </span>
                  <span className="font-mono bg-hw-bg px-2 py-0.5 rounded border border-hw-border" dir="ltr">
                    {order.number}
                  </span>
                  {order.receiver && (
                    <span className="text-hw-accent bg-hw-accent-muted px-2 py-0.5 rounded border border-hw-accent/20">
                      المرسِل: {order.receiver.username}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left shrink-0">
                <p className="font-bold text-xl text-hw-accent m-0 mb-2 font-mono">
                  {amount.toLocaleString("en-US")}
                </p>

                <button
                  id={`done-${order.id}`}
                  disabled={marking}
                  onClick={() => handleMarkDone(order)}
                  className={`py-2 px-3.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                    marking
                      ? "bg-hw-disabled-bg text-hw-disabled-text cursor-not-allowed shadow-none"
                      : "bg-hw-accent text-white hover:bg-hw-accent-hover active:scale-[0.98] shadow-sm shadow-blue-500/20"
                  }`}
                >
                  {marking ? "..." : "تم التحويل ✓"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
