"use client";

import Link from "next/link";
import { Session } from "./types";

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    OPEN:    { label: "نشطة",        color: "bg-green-900/40 text-green-400 border-green-800",    dot: "bg-green-500 animate-pulse" },
    CLOSING: { label: "جار الإغلاق", color: "bg-yellow-900/40 text-yellow-400 border-yellow-800", dot: "bg-yellow-500 animate-pulse" },
    CLOSED:  { label: "مغلقة",       color: "bg-hw-bg text-hw-text-secondary border-hw-border",   dot: "bg-hw-text-muted" },
};

const CURRENCY_LABELS: Record<string, string> = {
    EGP: "جنيه",
    USD: "دولار",
    AED: "درهم",
    VOD: "فودافون",
};

export function SessionCard({
    s,
    rates,
    ratesReady,
}: {
    s: Session;
    rates: { usd: number; aed: number; vod: number };
    ratesReady: boolean;
}) {
    const cfg = statusConfig[s.status];

    const duration = s.closedAt
        ? (() => {
            const diffMs = new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime();
            const hrs = Math.floor(diffMs / 3_600_000);
            const mins = Math.floor((diffMs % 3_600_000) / 60_000);
            return `${hrs}س ${mins}د`;
        })()
        : "جارية";

    // EGP-converted total for the summary chip
    const sessionTotal = s.snapshots.reduce((acc, snap) => {
        const bal = snap.balance;
        switch (snap.currency.toUpperCase()) {
            case "USD": return acc + bal * rates.usd;
            case "AED": return acc + bal * rates.aed;
            case "EGP": return acc + bal;
            case "VOD": return acc + (bal - bal * rates.vod);
            default:    return acc;
        }
    }, 0);

    // Per-currency native totals for the balance chips
    const currencyTotals: Record<string, number> = {};
    for (const snap of s.snapshots) {
        const cur = snap.currency.toUpperCase();
        currencyTotals[cur] = (currencyTotals[cur] ?? 0) + snap.balance;
    }

    return (
        <Link
            href={`/dashboard/sessions/${s.id}`}
            className={`group block rounded-xl border overflow-hidden transition-all hover:border-hw-accent/40 hover:shadow-sm hover:shadow-hw-accent/10
                ${s.status === "OPEN" ? "border-hw-accent/30" : "border-hw-border"}
                bg-hw-surface`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4
                            border-b border-hw-border bg-hw-bg/40 group-hover:bg-hw-bg/60 transition text-right">

                {/* Left: status dot + id + date */}
                <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div>
                        <p className="text-xs font-mono text-hw-text-muted">{s.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-sm font-medium text-hw-text">
                            {new Date(s.openedAt).toLocaleString('en-US', { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                    </div>
                </div>

                {/* Right: badges + arrow */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2.5 py-1 rounded-full border font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-hw-text-secondary">
                        المدة: <span className="font-mono text-hw-text">{duration}</span>
                    </span>
                    <span className="text-hw-text-secondary">
                        بواسطة <span className="text-hw-text">{s.openedByUser.username}</span>
                    </span>
                    {s.closedByUser && (
                        <span className="text-hw-text-secondary">
                            أغلق: <span className="text-hw-text">{s.closedByUser.username}</span>
                        </span>
                    )}
                    {ratesReady && s.snapshots.length > 0 && (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded border text-xs
                            ${sessionTotal >= 0
                                ? "text-hw-accent border-hw-accent/30 bg-hw-accent/5"
                                : "text-red-800 border-red-800 bg-red-900/10"}`}>
                            {sessionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه
                        </span>
                    )}
                    {/* Arrow */}
                    <span className="text-hw-text-muted group-hover:text-hw-accent group-hover:translate-x-[-4px] transition-all duration-150 text-base mr-1">
                        ←
                    </span>
                </div>
            </div>

            {/* Currency balance chips */}
            {Object.keys(currencyTotals).length > 0 && (
                <div className="px-5 py-3 flex flex-wrap gap-2">
                    {Object.entries(currencyTotals)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([cur, total]) => (
                            <span
                                key={cur}
                                className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full
                                           border border-hw-border bg-hw-bg text-hw-text-secondary"
                            >
                                <span className={`${total >= 0 ? "text-hw-accent" : "text-red-800"} font-bold`}>
                                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-hw-text-muted">{CURRENCY_LABELS[cur] ?? cur}</span>
                            </span>
                        ))}
                    {/* <span className="inline-flex items-center text-xs text-hw-text-muted italic mr-auto">
                        {s._count.transactions} قيد
                    </span> */}
                </div>
            )}
        </Link>
    );
}
