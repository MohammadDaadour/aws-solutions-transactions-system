"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Session, Snapshot } from "../components/types";
import { PriceInput } from "../components/PriceInput";
import { TransactionPanel } from "../components/TransactionPanel";

const STORAGE_KEY = "hw_exchange_rates";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    OPEN:    { label: "نشطة",        color: "bg-green-900/40 text-green-400 border-green-800",     dot: "bg-green-500 animate-pulse" },
    CLOSING: { label: "جار الإغلاق", color: "bg-yellow-900/40 text-yellow-400 border-yellow-800",  dot: "bg-yellow-500 animate-pulse" },
    CLOSED:  { label: "مغلقة",       color: "bg-hw-bg text-hw-text-secondary border-hw-border",    dot: "bg-hw-text-muted" },
};

const CURRENCY_LABELS: Record<string, string> = {
    EGP: "جنيه مصري",
    USD: "دولار أمريكي",
    AED: "درهم إماراتي",
    VOD: "فودافون كاش",
};

const CURRENCY_ICONS: Record<string, string> = {
    EGP: "ج",
    USD: "$",
    AED: "د",
    VOD: "V",
};

function toEgp(balance: number, currency: string, rates: { usd: number; aed: number; vod: number }): number {
    switch (currency.toUpperCase()) {
        case "USD": return balance * rates.usd;
        case "AED": return balance * rates.aed;
        case "EGP": return balance;
        case "VOD": return balance - balance * rates.vod;
        default:    return 0;
    }
}

export function SessionDetailClient({ session: s }: { session: Session }) {
    const [usdPrice, setUsdPrice] = useState("");
    const [aedPrice, setAedPrice] = useState("");
    const [vodPrice, setVodPrice] = useState("");
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage (shared with the list page)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.aed) setAedPrice(parsed.aed);
                if (parsed.usd) setUsdPrice(parsed.usd);
                if (parsed.vod) setVodPrice(parsed.vod);
            }
        } catch {}
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ usd: usdPrice, aed: aedPrice, vod: vodPrice }));
    }, [usdPrice, aedPrice, vodPrice, hydrated]);

    const rates = useMemo(() => ({
        aed: parseFloat(aedPrice) || 0,
        usd: parseFloat(usdPrice) || 0,
        vod: parseFloat(vodPrice) || 0,
    }), [usdPrice, aedPrice, vodPrice]);

    const ratesReady = rates.usd > 0 && rates.aed > 0 && rates.vod > 0;

    const cfg = statusConfig[s.status];

    // Duration
    const duration = s.closedAt
        ? (() => {
            const diffMs = new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime();
            const hrs = Math.floor(diffMs / 3_600_000);
            const mins = Math.floor((diffMs % 3_600_000) / 60_000);
            return `${hrs}س ${mins}د`;
        })()
        : "جارية";

    // ── Per-currency native totals ─────────────────────────────────────────────
    const currencyTotals = useMemo(() => {
        const map: Record<string, number> = {};
        for (const snap of s.snapshots) {
            const cur = snap.currency.toUpperCase();
            map[cur] = (map[cur] ?? 0) + snap.balance;
        }
        return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
    }, [s.snapshots]);

    // ── Per-account EGP totals ─────────────────────────────────────────────────
    const accountTotals = useMemo(() => {
        const map: Record<string, number> = {};
        for (const snap of s.snapshots) {
            const key = snap.user.username;
            map[key] = (map[key] ?? 0) + toEgp(snap.balance, snap.currency, rates);
        }
        return Object.entries(map)
            .map(([username, total]) => ({ username, total }))
            .sort((a, b) => b.total - a.total);
    }, [s.snapshots, rates]);

    // ── Per-account, per-currency breakdown ───────────────────────────────────
    const accountCurrencyBreakdown = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        for (const snap of s.snapshots) {
            const user = snap.user.username;
            const cur = snap.currency.toUpperCase();
            if (!map[user]) map[user] = {};
            map[user][cur] = (map[user][cur] ?? 0) + snap.balance;
        }
        return map;
    }, [s.snapshots]);

    // ── Session grand total ────────────────────────────────────────────────────
    const sessionTotal = useMemo(() =>
        s.snapshots.reduce((acc, snap) =>
            acc + toEgp(snap.balance, snap.currency, rates), 0),
    [s.snapshots, rates]);

    return (
        <div className="space-y-8">

            {/* ── Back navigation ── */}
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard/sessions"
                    className="flex items-center gap-2 text-sm text-hw-text-secondary hover:text-hw-text transition group"
                >
                    <span className="inline-block group-hover:-translate-x-1 transition-transform duration-150">→</span>
                    العودة إلى سجل الجلسات
                </Link>
            </div>

            {/* ── Session header ── */}
            <div className="rounded-xl border border-hw-border bg-hw-surface overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-hw-border bg-hw-bg/40">
                    <div className="flex items-center gap-4">
                        <span className={`h-3 w-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div>
                            <p className="text-xs font-mono text-hw-text-muted tracking-widest">
                                {s.id.substring(0, 8).toUpperCase()}
                            </p>
                            <h1 className="text-lg font-bold text-hw-text mt-0.5">
                                جلسة{" "}
                                {new Date(s.openedAt).toLocaleString('en-US', {
                                    dateStyle: "full",
                                    timeStyle: "short",
                                })}
                            </h1>
                        </div>
                    </div>
                    <span className={`self-start sm:self-auto px-3 py-1.5 rounded-full border text-sm font-semibold ${cfg.color}`}>
                        {cfg.label}
                    </span>
                </div>

                {/* <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-hw-border/60 text-center">
                    {[
                        { label: "فُتحت بواسطة",  value: s.openedByUser.username },
                        { label: "أُغلقت بواسطة", value: s.closedByUser?.username ?? "—" },
                        { label: "المدة",          value: duration },
                        { label: "عدد القيود",    value: s._count.transactions.toLocaleString('en-US') },
                    ].map(({ label, value }) => (
                        <div key={label} className="py-4 px-3">
                            <p className="text-xs text-hw-text-muted">{label}</p>
                            <p className="text-sm font-semibold text-hw-text mt-1">{value}</p>
                        </div>
                    ))}
                </div>

                {s.notes && (
                    <p className="px-6 py-3 text-sm italic text-hw-text-secondary border-t border-hw-border/50 bg-hw-bg/20">
                        {s.notes}
                    </p>
                )} */}
            </div>

            {/* ── Per-currency native balance cards ── */}
            {currencyTotals.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-hw-text-secondary uppercase tracking-wider mb-3">
                        الأرصدة الختامية بالعملة الأصلية
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {currencyTotals.map(([cur, total]) => (
                            <div
                                key={cur}
                                className="rounded-xl border border-hw-border bg-hw-surface p-4 flex flex-col gap-2"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-hw-text-muted font-medium">
                                        {CURRENCY_LABELS[cur] ?? cur}
                                    </span>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-hw-bg border border-hw-border text-hw-text-secondary">
                                        {CURRENCY_ICONS[cur] ?? cur}
                                    </span>
                                </div>
                                <p className={`text-2xl font-bold font-mono ${total >= 0 ? "text-hw-accent" : "text-red-800"}`}>
                                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-black">{cur}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Exchange rates + EGP totals ── */}
            <div className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-5">
                <h2 className="text-sm font-semibold text-hw-text-secondary uppercase tracking-wider">
                    أسعار الصرف والإجمالي بالجنيه
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <PriceInput label="سعر الفودافون (VOD → جنيه)" value={vodPrice} onChange={setVodPrice} />
                    <PriceInput label="سعر الدولار (USD → جنيه)"   value={usdPrice} onChange={setUsdPrice} />
                    <PriceInput label="سعر الدرهم (AED → جنيه)"    value={aedPrice} onChange={setAedPrice} />
                </div>

                {/* Grand total banner */}
                <div className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition
                    ${ratesReady ? "border-hw-accent/40 bg-hw-accent/5" : "border-hw-border bg-hw-bg/30 opacity-60"}`}>
                    <p className="text-sm font-semibold text-hw-text">إجمالي الجلسة بالجنيه المصري</p>
                    <div className="text-left">
                        {ratesReady ? (
                            <p className={`text-3xl font-bold font-mono ${sessionTotal >= 0 ? "text-hw-accent" : "text-red-800"}`}>
                                {sessionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <span className="text-sm font-normal text-hw-text-muted mr-2">جنيه</span>
                            </p>
                        ) : (
                            <p className="text-sm text-hw-text-muted italic">أدخل الأسعار أولاً لحساب الإجمالي</p>
                        )}
                    </div>
                </div>

                {/* Per-account EGP breakdown */}
                {ratesReady && accountTotals.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-hw-border">
                        <table className="w-full text-sm text-right">
                            <thead>
                                <tr className="text-xs uppercase tracking-wider text-hw-text-muted border-b border-hw-border bg-hw-bg/40">
                                    <th className="px-4 py-3 font-medium">الحساب</th>
                                    <th className="px-4 py-3 font-medium">التفاصيل (عملة أصلية)</th>
                                    <th className="px-4 py-3 font-medium text-left">الإجمالي بالجنيه</th>
                                    <th className="px-4 py-3 font-medium text-center">الوضع</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hw-border/50">
                                {accountTotals.map((u) => {
                                    const breakdown = accountCurrencyBreakdown[u.username] ?? {};
                                    return (
                                        <tr key={u.username} className="hover:bg-hw-bg/30 transition">
                                            <td className="px-4 py-3 font-semibold text-hw-text">{u.username}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {Object.entries(breakdown).map(([cur, bal]) => (
                                                        <span
                                                            key={cur}
                                                            className="text-xs font-mono px-2 py-0.5 rounded border border-hw-border bg-hw-bg text-hw-text-secondary whitespace-nowrap"
                                                        >
                                                            {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {cur}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-3 font-mono font-bold text-left
                                                ${u.total > 0 ? "text-hw-accent" : u.total < 0 ? "text-red-800" : "text-hw-text-muted"}`}>
                                                {u.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs font-semibold
                                                    ${u.total > 0 ? "text-hw-accent" : u.total < 0 ? "text-red-800" : "text-hw-text-muted"}`}>
                                                    {u.total > 0 ? "▲ دائن" : u.total < 0 ? "▼ مدين" : "— متعادل"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {!ratesReady && s.snapshots.length > 0 && (
                    <p className="text-sm text-hw-text-muted italic text-center py-2">
                        أدخل أسعار الصرف لعرض التفصيل بالجنيه لكل حساب.
                    </p>
                )}
            </div>

            {/* ── Transactions ── */}
            {/* <div className="space-y-3">
                <h2 className="text-sm font-semibold text-hw-text-secondary uppercase tracking-wider">
                    القيود ({s._count.transactions.toLocaleString('en-US')})
                </h2>
                <div className="rounded-xl border border-hw-border bg-hw-surface p-5">
                    {s._count.transactions === 0 ? (
                        <p className="text-sm text-hw-text-muted italic text-center py-6">
                            لا توجد قيود في هذه الجلسة.
                        </p>
                    ) : (
                        <TransactionPanel sessionId={s.id} totalCount={s._count.transactions} />
                    )}
                </div>
            </div> */}

        </div>
    );
}
