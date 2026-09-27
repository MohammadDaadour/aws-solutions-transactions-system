"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Session } from "./components/types";
import { PriceInput } from "./components/PriceInput";
import { Pagination } from "./components/Pagination";
import { SessionCard } from "./components/SessionCard";

const STORAGE_KEY = "hw_exchange_rates";
const SESSIONS_PER_PAGE = 8;

type AccountBalance = { username: string; currency: string; balance: number };

const CURRENCY_LABELS: Record<string, string> = {
    EGP: "جنيه",
    USD: "دولار",
    AED: "درهم",
    VOD: "فودافون",
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

export default function SessionsHistoryClient({
    sessions,
    accountBalances,
}: {
    sessions: Session[];
    accountBalances: AccountBalance[];
}) {
    const [usdPrice, setUsdPrice] = useState("");
    const [aedPrice, setAedPrice] = useState("");
    const [vodPrice, setVodPrice] = useState("");
    const [hydrated, setHydrated]   = useState(false);
    const [sessionPage, setSessionPage] = useState(1);

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

    // Grand total across ALL sessions (existing)
    const grandTotal = useMemo(() =>
        sessions.reduce((acc, s) =>
            acc + s.snapshots.reduce((sacc, snap) => {
                const bal = snap.balance;
                switch (snap.currency.toUpperCase()) {
                    case "AED": return sacc + bal * rates.aed;
                    case "USD": return sacc + bal * rates.usd;
                    case "EGP": return sacc + bal;
                    case "VOD": return sacc - bal * rates.vod;
                    default:    return sacc;
                }
            }, 0), 0),
    [sessions, rates]);

    // ── Account totals matrix (from userBalance — same as user profile pages) ──
    // Derive distinct sorted currencies present in balances
    const allCurrencies = useMemo(() => {
        const set = new Set<string>();
        for (const b of accountBalances) set.add(b.currency.toUpperCase());
        return [...set].sort();
    }, [accountBalances]);

    // Derive distinct sorted accounts
    const allAccounts = useMemo(() => {
        const set = new Set<string>();
        for (const b of accountBalances) set.add(b.username);
        return [...set].sort();
    }, [accountBalances]);

    // matrix[username][currency] = native balance
    const balanceMatrix = useMemo(() => {
        const map: Record<string, Record<string, number>> = {};
        for (const b of accountBalances) {
            const user = b.username;
            const cur  = b.currency.toUpperCase();
            if (!map[user]) map[user] = {};
            map[user][cur] = (map[user][cur] ?? 0) + b.balance;
        }
        return map;
    }, [accountBalances]);

    // Column totals (per currency, all accounts)
    const colTotals = useMemo(() => {
        const map: Record<string, number> = {};
        for (const cur of allCurrencies) {
            map[cur] = allAccounts.reduce((sum, u) => sum + (balanceMatrix[u]?.[cur] ?? 0), 0);
        }
        return map;
    }, [allCurrencies, allAccounts, balanceMatrix]);

    // EGP row totals per account
    const accountEgpTotals = useMemo(() => {
        const map: Record<string, number> = {};
        for (const b of accountBalances) {
            map[b.username] = (map[b.username] ?? 0) + toEgp(b.balance, b.currency, rates);
        }
        return map;
    }, [accountBalances, rates]);

    // Grand EGP total across all accounts
    const balanceGrandTotal = useMemo(() =>
        accountBalances.reduce((sum, b) => sum + toEgp(b.balance, b.currency, rates), 0),
    [accountBalances, rates]);

    // Session-level pagination
    const sessionPageCount = Math.ceil(sessions.length / SESSIONS_PER_PAGE);
    const pagedSessions = sessions.slice(
        (sessionPage - 1) * SESSIONS_PER_PAGE,
        sessionPage * SESSIONS_PER_PAGE
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="border-b border-hw-border pb-5">
                <h2 className="text-2xl font-bold tracking-tight">سجل الجلسات المحاسبية</h2>
                <p className="text-sm text-hw-text-secondary mt-1">
                    عرض جميع الفترات المحاسبية وأرصدتها الختامية المحفوظة.
                </p>
            </div>

            {/* Exchange rate inputs */}
            <div className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-hw-text">أسعار الصرف</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <PriceInput label="سعر الفودافون (VOD → جنيه)" value={vodPrice} onChange={setVodPrice} />
                    <PriceInput label="سعر الدولار (USD → جنيه)"   value={usdPrice} onChange={setUsdPrice} />
                    <PriceInput label="سعر الدرهم (AED → جنيه)"    value={aedPrice} onChange={setAedPrice} />
                </div>
            </div>

            {/* Grand total banner (sessions) */}
            {/* <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition
                ${ratesReady ? "border-hw-accent/40 bg-hw-accent/5" : "border-hw-border bg-hw-surface opacity-60"}`}>
                <div>
                    <p className="text-sm font-semibold text-hw-text">الإجمالي الكلي بالجنيه المصري</p>
                </div>
                <div className="text-left">
                    {ratesReady ? (
                        <p className={`text-3xl font-bold font-mono ${grandTotal >= 0 ? "text-hw-accent" : "text-red-500"}`}>
                            {grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-sm font-normal text-hw-text-muted mr-2">جنيه</span>
                        </p>
                    ) : (
                        <p className="text-sm text-hw-text-muted italic">أدخل الأسعار أولاً لحساب الإجمالي</p>
                    )}
                </div>
            </div> */}

            {/* Summary stats */}
            {/* <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "إجمالي الجلسات", value: sessions.length },
                    { label: "جلسات مغلقة",    value: sessions.filter(s => s.status === "CLOSED").length },
                    { label: "جلسة نشطة",      value: sessions.filter(s => s.status === "OPEN").length },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-hw-border bg-hw-surface p-4 text-center">
                        <p className="text-3xl font-bold font-mono text-hw-text">{stat.value}</p>
                        <p className="text-xs text-hw-text-secondary mt-1">{stat.label}</p>
                    </div>
                ))}
            </div> */}

            {/* ── Account balances matrix (cumulative across all sessions) ── */}
            {allAccounts.length > 0 && allCurrencies.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-hw-text-secondary uppercase tracking-wider">
                            إجمالي أرصدة الحسابات (جميع الجلسات)
                        </h2>
                        {ratesReady && (
                            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border
                                ${balanceGrandTotal >= 0
                                    ? "text-hw-accent border-hw-accent/30 bg-hw-accent/5"
                                    : "text-red-800 border-red-800 bg-red-900/10"}`}>
                                {balanceGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه
                            </span>
                        )}
                    </div>
                    <div className="rounded-xl border border-hw-border bg-hw-surface overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-hw-border bg-hw-bg/60 text-xs uppercase tracking-wider text-black">
                                        <th className="px-4 py-3 font-medium text-right sticky right-0 z-10 min-w-[120px]">
                                            الحساب
                                        </th>
                                        {allCurrencies.map((cur) => (
                                            <th key={cur} className="px-4 py-3 font-medium text-center min-w-[140px]">
                                                <span className="inline-flex flex-col items-center gap-0.5">
                                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-hw-bg border border-hw-border text-hw-text-secondary">
                                                        {cur}
                                                    </span>
                                                    <span className="text-xs text-black">{CURRENCY_LABELS[cur] ?? cur}</span>
                                                </span>
                                            </th>
                                        ))}
                                        {ratesReady && (
                                            <th className="px-4 py-3 font-medium text-left min-w-[140px]">
                                                الإجمالي (جنيه)
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hw-border/50">
                                    {allAccounts.map((username) => {
                                        const egpTotal = accountEgpTotals[username] ?? 0;
                                        return (
                                            <tr key={username} className="hover:bg-hw-bg/30 transition group">
                                                <td className="px-4 py-3 font-semibold text-hw-text text-right sticky right-0 bg-hw-surface group-hover:bg-hw-bg/30 transition">
                                                    <Link
                                                        href={`/dashboard/users`}
                                                        className=" transition"
                                                    >
                                                        {username}
                                                    </Link>
                                                </td>
                                                {allCurrencies.map((cur) => {
                                                    const bal = balanceMatrix[username]?.[cur];
                                                    return (
                                                        <td key={cur} className="px-4 py-3 text-center">
                                                            {bal !== undefined ? (
                                                                <span className={`font-mono font-bold
                                                                    ${bal > 0 ? "text-hw-accent" : bal < 0 ? "text-red-800" : "text-hw-text-muted"}`}>
                                                                    {bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    <span className="text-xs font-normal text-black mx-2 mr-1">{cur}</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-hw-text-muted/40 text-xs">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                {ratesReady && (
                                                    <td className={`px-4 py-3 font-mono font-bold text-left
                                                        ${egpTotal > 0 ? "text-hw-accent" : egpTotal < 0 ? "text-red-800" : "text-black"}`}>
                                                        {egpTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        <span className="text-xs font-normal text-black mr-1">ج</span>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-hw-border bg-hw-bg/60 font-semibold">
                                        <td className="px-4 py-3 text-xs uppercase tracking-wider text-hw-text-muted text-right sticky right-0">
                                            الإجمالي
                                        </td>
                                        {allCurrencies.map((cur) => {
                                            const total = colTotals[cur] ?? 0;
                                            return (
                                                <td key={cur} className="px-4 py-3 text-center">
                                                    <span className={`font-mono font-bold
                                                        ${total > 0 ? "text-hw-accent" : total < 0 ? "text-red-800" : "text-black"}`}>
                                                        {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        <span className="text-xs font-normal text-black mx-2 mr-1">{cur}</span>
                                                    </span>
                                                </td>
                                            );
                                        })}
                                        {ratesReady && (
                                            <td className={`px-4 py-3 font-mono font-bold text-left
                                                ${balanceGrandTotal > 0 ? "text-hw-accent" : balanceGrandTotal < 0 ? "text-red-800" : "text-hw-text-muted"}`}>
                                                {balanceGrandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-xs font-normal text-hw-text-muted mr-1">ج</span>
                                            </td>
                                        )}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <p className="text-xs text-hw-text-muted mt-2 text-right">
                        * الأرصدة مطابقة لما يظهر في صفحة كل حساب على حدة
                    </p>
                </div>
            )}

            {/* Sessions list */}
            <div className="space-y-3">
                {pagedSessions.map((s) => (
                    <SessionCard key={s.id} s={s} rates={rates} ratesReady={ratesReady} />
                ))}

                {sessions.length === 0 && (
                    <div className="text-center py-16 text-hw-text-muted italic">
                        لا توجد جلسات محاسبية بعد.
                    </div>
                )}
            </div>

            {/* Session pagination */}
            <Pagination
                page={sessionPage}
                pageCount={sessionPageCount}
                onChange={(p) => { setSessionPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            />
        </div>
    );
}