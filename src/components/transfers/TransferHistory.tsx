"use client";

/**
 * TransferHistory
 *
 * Shows paginated, filterable history of completed / cancelled transfer orders
 * for the currently logged-in user.
 *
 * - Senders  : sees DONE orders they executed.
 * - Receivers: sees DONE + CANCELLED orders they created, with status filter.
 */

import { useCallback, useEffect, useState } from "react";
import { CURRENCY_LABELS, TransferOrder } from "./SenderQueue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type HistoryResponse = {
  data: TransferOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Filters = {
  search: string;
  status: "ALL" | "DONE" | "CANCELLED";
  currency: string;
  from: string;
  to: string;
};

const INITIAL_FILTERS: Filters = {
  search: "",
  status: "ALL",
  currency: "",
  from: "",
  to: "",
};

// ---------------------------------------------------------------------------
// Status badge config (matches ReceiverTracker)
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> =
  {
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
// Main component
// ---------------------------------------------------------------------------
export default function TransferHistory({ userType }: { userType: "sender" | "receiver" }) {
  const [response, setResponse] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  // Staged filters — applied only when user hits "بحث" or clears
  const [applied, setApplied] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------
  const fetchHistory = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("pageSize", "15");
      if (f.status !== "ALL") params.set("status", f.status);
      if (f.currency) params.set("currency", f.currency);
      if (f.search) params.set("search", f.search);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);

      const res = await fetch(`/api/transfer-orders/history?${params.toString()}`);
      if (!res.ok) return;
      const data: HistoryResponse = await res.json();
      setResponse(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(applied, page);
  }, [fetchHistory, applied, page]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleApply = () => {
    setPage(1);
    setApplied({ ...filters });
  };

  const handleClear = () => {
    const reset = { ...INITIAL_FILTERS };
    setFilters(reset);
    setApplied(reset);
    setPage(1);
  };

  const hasActiveFilters =
    applied.search || applied.status !== "ALL" || applied.currency || applied.from || applied.to;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      {/* ── Filter bar ── */}
      <section className="bg-hw-surface border border-hw-border rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-hw-text-secondary mb-4 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          تصفية النتائج
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-end">
          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-hw-text-secondary">الاسم / رقم الهاتف</label>
            <input
              id="history-search"
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleApply()}
              placeholder="ابحث..."
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            />
          </div>

          {/* Status — receivers only */}
          {userType === "receiver" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-hw-text-secondary">الحالة</label>
              <select
                id="history-status"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))
                }
                className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text cursor-pointer focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
              >
                <option value="ALL">الكل</option>
                <option value="DONE">تم التحويل</option>
                <option value="CANCELLED">ملغى</option>
              </select>
            </div>
          )}

          {/* Currency */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-hw-text-secondary">نوع التحويل</label>
            <select
              id="history-currency"
              value={filters.currency}
              onChange={(e) => setFilters((f) => ({ ...f, currency: e.target.value }))}
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text cursor-pointer focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
            >
              <option value="">الكل</option>
              {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-hw-text-secondary">من تاريخ</label>
            <input
              id="history-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
              dir="ltr"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-hw-text-secondary">إلى تاريخ</label>
            <input
              id="history-to"
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-2.5 text-sm text-hw-text focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all"
              dir="ltr"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 items-center xl:col-span-1">
            <button
              id="history-apply"
              onClick={handleApply}
              className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm bg-hw-accent text-white hover:bg-hw-accent-hover shadow-sm shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              بحث
            </button>
            {hasActiveFilters && (
              <button
                id="history-clear"
                onClick={handleClear}
                className="py-2.5 px-3 rounded-xl font-semibold text-sm bg-hw-surface-alt text-hw-text hover:bg-hw-border border border-hw-border transition-colors whitespace-nowrap"
              >
                مسح ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      <section>
        {/* Summary header */}
        {response && !loading && (
          <div className="flex justify-between items-center mb-4 text-sm text-hw-text-secondary font-medium">
            <p className="m-0">
              {response.total === 0
                ? "لا توجد نتائج"
                : `عرض ${(response.page - 1) * response.pageSize + 1}–${Math.min(
                    response.page * response.pageSize,
                    response.total
                  )} من أصل ${response.total.toLocaleString("ar-EG")} طلب`}
            </p>
            {response.totalPages > 1 && (
              <p className="m-0">
                صفحة {response.page} من {response.totalPages}
              </p>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-16 text-hw-text-muted">
            <div className="w-10 h-10 border-4 border-hw-border border-t-hw-accent rounded-full animate-spin" />
          </div>
        ) : !response || response.data.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 px-8 text-hw-text-muted bg-hw-surface rounded-2xl border border-dashed border-hw-border">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-bold text-hw-text m-0 mb-2">
              لا توجد طلبات في السجل
            </p>
            <p className="text-sm m-0">
              {hasActiveFilters
                ? "حاول تغيير معايير البحث أو امسح الفلاتر"
                : "ستظهر الطلبات المكتملة والملغاة هنا"}
            </p>
          </div>
        ) : (
          /* Orders list */
          <div className="flex flex-col gap-3">
            {response.data.map((order) => (
              <HistoryRow key={order.id} order={order} userType={userType} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {response && response.totalPages > 1 && !loading && (
          <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
            <button
              id="history-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                page === 1
                  ? "bg-transparent text-hw-text-muted cursor-not-allowed opacity-50"
                  : "bg-hw-surface border border-hw-border text-hw-text hover:bg-hw-surface-alt"
              }`}
            >
              &rarr; السابق
            </button>

            {/* Page number pills */}
            {Array.from({ length: response.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === response.totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="text-hw-text-secondary text-sm px-1"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    id={`history-page-${item}`}
                    onClick={() => setPage(item as number)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      item === page
                        ? "bg-hw-accent text-white shadow-sm shadow-blue-500/20 border border-hw-accent"
                        : "bg-hw-surface border border-hw-border text-hw-text hover:bg-hw-surface-alt"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              id="history-next"
              onClick={() => setPage((p) => Math.min(response.totalPages, p + 1))}
              disabled={page === response.totalPages}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                page === response.totalPages
                  ? "bg-transparent text-hw-text-muted cursor-not-allowed opacity-50"
                  : "bg-hw-surface border border-hw-border text-hw-text hover:bg-hw-surface-alt"
              }`}
            >
              التالي &larr;
            </button>
          </div>
        )}
      </section>
    </div>
  );
// ---------------------------------------------------------------------------
// Single history row
// ---------------------------------------------------------------------------
function HistoryRow({
  order,
  userType,
}: {
  order: TransferOrder;
  userType: "sender" | "receiver";
}) {
  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.DONE;
  const amount = typeof order.amount === "string" ? parseFloat(order.amount) : order.amount;

  return (
    <div className="bg-hw-surface border border-hw-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Status badge */}
      <span
        style={{
          background: status.bg,
          color: status.color,
          borderColor: status.border,
        }}
        className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap w-fit"
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
          {userType === "sender" && order.receiver && (
            <span className="text-hw-accent bg-hw-accent-muted px-2 py-0.5 rounded border border-hw-accent/20">
              المستورد: {order.receiver.username}
            </span>
          )}
          {userType === "receiver" && order.sender && (
            <span className="text-hw-accent bg-hw-accent-muted px-2 py-0.5 rounded border border-hw-accent/20">
              المورد: {order.sender.username}
            </span>
          )}
          {userType === "receiver" && !order.sender && order.status === "CANCELLED" && (
            <span className="text-hw-text-muted bg-hw-surface-alt px-2 py-0.5 rounded border border-hw-border">
              لم يُحجز
            </span>
          )}
        </div>
      </div>

      {/* Amount + date */}
      <div className="text-left shrink-0">
        <p className="font-bold text-xl text-hw-accent m-0 font-mono">
          {amount.toLocaleString("en-US")}
        </p>
        <p className="text-[11px] font-mono text-hw-text-muted mt-1 m-0 text-right">
          {new Date(order.createdAt).toLocaleDateString("ar-EG")}
        </p>
      </div>
    </div>
  );
}}
