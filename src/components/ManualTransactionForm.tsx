"use client";

import { useState } from "react";
import { createHawalaTransaction } from "../app/actions/transactions";
import { Currency, TransactionType } from "../generated/prisma/enums";

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

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
    { value: "USD" as Currency, label: "USD" },
    { value: "AED" as Currency, label: "AED" },
    { value: "EGP" as Currency, label: "EGP" },
    { value: "VOD" as Currency, label: "VOD" },
];

// Same SVG icon assets used on the main dashboard — rescaled to 18px for inline use
const CURRENCY_ICONS: Record<string, React.ReactNode> = {
    USD: (
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" fill="#6cde07" r="16" />
            <path d="M22.5 19.154c0 2.57-2.086 4.276-5.166 4.533V26h-2.11v-2.336A11.495 11.495 0 019.5 21.35l1.552-2.126c1.383 1.075 2.692 1.776 4.269 2.01v-4.58c-3.541-.888-5.19-2.173-5.19-4.813 0-2.523 2.061-4.252 5.093-4.486V6h2.11v1.402a9.49 9.49 0 014.56 1.776l-1.359 2.196c-1.067-.771-2.158-1.262-3.298-1.495v4.439c3.687.888 5.263 2.313 5.263 4.836zm-7.18-5.327V9.715c-1.527.117-2.327.935-2.327 1.963 0 .98.46 1.612 2.328 2.15zm4.318 5.49c0-1.05-.51-1.681-2.401-2.219v4.23c1.528-.118 2.401-.889 2.401-2.01z" fill="#ffffff" />
        </svg>
    ),
    AED: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 32 32" fill="none" stroke="#004f0dff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 19h-3.5" /><path d="M8.599 16.479a1.5 1.5 0 1 0 -1.099 2.521" /><path d="M7 4v9" /><path d="M15 13h1.888a1.5 1.5 0 0 0 1.296 -2.256l-2.184 -3.744" /><path d="M11 13.01v-.01" />
        </svg>
    ),
    EGP: (
        <svg fill="#735117" height="18" width="18" viewBox="0 0 470 470" xmlns="http://www.w3.org/2000/svg">
            <path d="M401.17,68.83C356.784,24.444,297.771,0,235,0C172.229,0,113.215,24.444,68.83,68.83C24.444,113.216,0,172.229,0,235 s24.444,121.784,68.83,166.17C113.215,445.556,172.229,470,235,470c62.771,0,121.784-24.444,166.17-68.83S470,297.771,470,235 S445.556,113.216,401.17,68.83z M235,455c-121.309,0-220-98.691-220-220S113.691,15,235,15s220,98.691,220,220S356.309,455,235,455z" />
            <path d="M235,54c-45.617,0-89.191,17.025-122.695,47.939C78.999,132.671,58.534,174.372,54.68,219.36 c-0.354,4.127,2.706,7.759,6.833,8.112c4.135,0.354,7.76-2.706,8.113-6.833C76.909,135.608,149.55,69,235,69 c91.533,0,166,74.468,166,166s-74.467,166-166,166c-85.45,0-158.091-66.608-165.375-151.64c-0.354-4.128-3.987-7.196-8.113-6.833 c-4.127,0.354-7.186,3.985-6.833,8.112c3.854,44.988,24.318,86.689,57.625,117.421C145.809,398.975,189.383,416,235,416 c99.804,0,181-81.196,181-181S334.804,54,235,54z" />
        </svg>
    ),
    VOD: (
        <svg fill="#E60000" width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0A12 12 0 0 0 0 12A12 12 0 0 0 12 24A12 12 0 0 0 24 12A12 12 0 0 0 12 0M16.25 1.12C16.57 1.12 16.9 1.15 17.11 1.22C14.94 1.67 13.21 3.69 13.22 6C13.22 6.05 13.22 6.11 13.23 6.17C16.87 7.06 18.5 9.25 18.5 12.28C18.54 15.31 16.14 18.64 12.09 18.65C8.82 18.66 5.41 15.86 5.39 11.37C5.38 8.4 7 5.54 9.04 3.85C11.04 2.19 13.77 1.13 16.25 1.12Z" />
        </svg>
    ),
};

function evaluateExpression(expr: string): number | null {
    if (!expr || !expr.trim()) return null;
    if (!/^[\d\s\(\)\.\+\-\*\/]+$/.test(expr)) {
        return null;
    }
    try {
        // "use strict" must be INSIDE the function body string, not a separate arg
        const result = new Function(`"use strict"; return (${expr});`)();
        if (typeof result === "number" && isFinite(result)) {
            return result;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default function ManualTransactionForm({ users, allowOpeningBalance, preselectedUserId, lockUserSelect }: FormProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

    // Currency conversion state
    const [fromCurrency, setFromCurrency] = useState<Currency>("USD" as Currency);
    const [toCurrency, setToCurrency] = useState<Currency>("USD" as Currency);
    const [amountRaw, setAmountRaw] = useState("");
    const [rateRaw, setRateRaw] = useState("");
    const [userNotes, setUserNotes] = useState("");

    // Swap button animation state
    const [swapSpinning, setSwapSpinning] = useState(false);

    const isSameCurrency = fromCurrency === toCurrency;
    const parsedAmount = evaluateExpression(amountRaw);
    const parsedRate = evaluateExpression(rateRaw);
    const effectiveRate = isSameCurrency ? 1 : parsedRate;

    const convertedAmount =
        parsedAmount !== null && parsedAmount > 0 && effectiveRate !== null && effectiveRate > 0
            ? parsedAmount / effectiveRate
            : null;

    const isSubmittable = convertedAmount !== null && isFinite(convertedAmount);

    function handleSwap() {
        const prevFrom = fromCurrency;
        const prevTo = toCurrency;
        setFromCurrency(prevTo);
        setToCurrency(prevFrom);
        // Invert the rate: 1/rate
        if (!isSameCurrency && parsedRate !== null && parsedRate > 0) {
            setRateRaw((1 / parsedRate).toFixed(6).replace(/\.?0+$/, ""));
        }
        // Trigger spin animation briefly
        setSwapSpinning(true);
        setTimeout(() => setSwapSpinning(false), 420);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isSubmittable || convertedAmount === null) return;

        setLoading(true);
        setMessage(null);

        const formData = new FormData(event.currentTarget);
        const roundedConverted = parseFloat(convertedAmount.toFixed(4));

        // Build audit note
        const auditNote = isSameCurrency
            ? `[auto-converted: ${parsedAmount} ${fromCurrency} ÷ 1 = ${roundedConverted.toFixed(4)} ${toCurrency}]`
            : `[auto-converted: ${parsedAmount} ${fromCurrency} ÷ ${effectiveRate} = ${roundedConverted.toFixed(4)} ${toCurrency}]`;

        const combinedNotes = userNotes.trim()
            ? `${auditNote}\n${userNotes.trim()}`
            : auditNote;

        const payload = {
            userId: formData.get("userId") as string,
            type: formData.get("type") as TransactionType,
            amount: roundedConverted,
            currency: toCurrency,
            date: formData.get("date") as string,
            notes: combinedNotes,
        };

        const response = await createHawalaTransaction(payload);
        setLoading(false);

        if (response.success) {
            setMessage({ success: true, text: "Transaction journaled successfully!" });
            // Reset conversion state
            setFromCurrency("USD" as Currency);
            setToCurrency("USD" as Currency);
            setAmountRaw("");
            setRateRaw("");
            setUserNotes("");
            event.currentTarget?.reset();
            window.dispatchEvent(new Event("transaction-added"));
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
                    <div className="relative">
                        <select
                            name="userId"
                            required
                            defaultValue={preselectedUserId}
                            className="w-full appearance-none bg-hw-bg border border-hw-border rounded-xl pl-3 pr-9 py-2.5 text-sm text-hw-text cursor-pointer hover:border-hw-accent/60 focus:border-hw-accent focus:outline-none focus:ring-2 focus:ring-hw-accent/20 transition-all duration-150"
                        >
                            <option value="">-- اختر الحساب --</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-hw-text-muted">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                            </svg>
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">نوع المعاملة</label>
                    <div className="relative">
                        <select
                            name="type"
                            required
                            className="w-full appearance-none bg-hw-bg border border-hw-border rounded-xl pl-3 pr-9 py-2.5 text-sm text-hw-text cursor-pointer hover:border-hw-accent/60 focus:border-hw-accent focus:outline-none focus:ring-2 focus:ring-hw-accent/20 transition-all duration-150"
                        >
                            <option value="debit">Debit (مدين لنا)</option>
                            <option value="credit">Credit (دائن علينا)</option>
                            {allowOpeningBalance && <option value="opening_balance">Opening Balance (رصيد افتتاحي)</option>}
                        </select>
                        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-hw-text-muted">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                            </svg>
                        </span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-hw-text-secondary mb-1">تاريخ التنفيذ</label>
                    <input
                        name="date"
                        type="datetime-local"
                        required
                        defaultValue={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        className="w-full bg-hw-bg border border-hw-border rounded-xl px-3 py-2.5 text-sm text-hw-text hover:border-hw-accent/60 focus:border-hw-accent focus:outline-none focus:ring-2 focus:ring-hw-accent/20 transition-all duration-150"
                    />
                </div>
            </div>

            {/* ── Currency Conversion Card ─────────────────────────────── */}
            <div className="rounded-xl border border-hw-border bg-hw-surface shadow-sm overflow-hidden">

                {/* Card header strip */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-hw-surface-alt border-b border-hw-border">
                    {/* Arrows-swap icon */}
                    <svg className="w-3.5 h-3.5 text-hw-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                    <span className="text-xs font-semibold text-hw-text-secondary tracking-wide">تحويل العملة</span>
                </div>

                <div className="p-4 space-y-4">

                    {/* ── From / Swap / To selectors ───────── */}
                    <div className="flex items-start gap-2">

                        {/* FROM pills */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-hw-text-secondary uppercase tracking-widest mb-1.5">من</p>
                            <div className="flex flex-wrap gap-1">
                                {CURRENCY_OPTIONS.map((c) => {
                                    const isActive = fromCurrency === c.value;
                                    return (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFromCurrency(c.value)}
                                            className={[
                                                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-150 select-none",
                                                isActive
                                                    ? "border-hw-accent bg-hw-accent-muted text-hw-accent shadow-sm"
                                                    : "border-hw-border bg-hw-bg text-hw-text-secondary hover:border-hw-accent/50 hover:text-hw-text",
                                            ].join(" ")}
                                        >
                                            <span className="shrink-0">{CURRENCY_ICONS[c.value]}</span>
                                            <span>{c.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Swap button — animated spin on click */}
                        <button
                            type="button"
                            onClick={handleSwap}
                            title="تبديل العملتين وعكس السعر"
                            className="flex-none mt-5 w-7 h-7 flex items-center justify-center rounded-full border border-hw-border bg-hw-bg text-hw-text-secondary hover:text-hw-accent hover:border-hw-accent hover:bg-hw-accent-muted shadow-sm transition-colors duration-150"
                            style={{
                                transform: swapSpinning ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.38s cubic-bezier(0.34,1.56,0.64,1), color 0.15s, border-color 0.15s, background-color 0.15s",
                            }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                            </svg>
                        </button>

                        {/* TO pills */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-hw-text-secondary uppercase tracking-widest mb-1.5">إلى</p>
                            <div className="flex flex-wrap gap-1">
                                {CURRENCY_OPTIONS.map((c) => {
                                    const isActive = toCurrency === c.value;
                                    return (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setToCurrency(c.value)}
                                            className={[
                                                "flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-150 select-none",
                                                isActive
                                                    ? "border-hw-accent bg-hw-accent-muted text-hw-accent shadow-sm"
                                                    : "border-hw-border bg-hw-bg text-hw-text-secondary hover:border-hw-accent/50 hover:text-hw-text",
                                            ].join(" ")}
                                        >
                                            <span className="shrink-0">{CURRENCY_ICONS[c.value]}</span>
                                            <span>{c.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Flow connector — shown only for cross-currency */}
                    {!isSameCurrency && (
                        <div className="flex items-center gap-2 px-1">
                            <div className="flex-1 h-px bg-hw-border" />
                            <span className="text-[10px] font-mono text-hw-text-muted whitespace-nowrap">
                                1 {fromCurrency}
                                {" → "}
                                ? {toCurrency}
                            </span>
                            <div className="flex-1 h-px bg-hw-border" />
                        </div>
                    )}

                    {/* ── Amount + Rate inputs ─────────────── */}
                    <div className="grid grid-cols-2 gap-3">

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-medium text-hw-text-secondary mb-1">المبلغ الخام</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                required
                                placeholder="0.00"
                                value={amountRaw}
                                onChange={(e) => setAmountRaw(e.target.value)}
                                className="w-full bg-hw-bg border border-hw-border rounded-lg px-2 py-2 text-sm text-hw-text font-mono focus:border-hw-accent focus:outline-none focus:ring-1 focus:ring-hw-accent/20 transition-colors"
                            />
                            {/* Inline currency badge + expression feedback */}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-hw-surface-alt border border-hw-border text-[10px] font-bold text-hw-text-secondary select-none shrink-0">
                                    <span className="opacity-80">{CURRENCY_ICONS[fromCurrency]}</span>
                                    {fromCurrency}
                                </span>
                                {amountRaw.trim() !== "" && (
                                    <span className={[
                                        "text-[10px] font-mono flex items-center gap-0.5 transition-colors duration-200",
                                        parsedAmount !== null ? "text-hw-success" : "text-hw-danger",
                                    ].join(" ")}>
                                        {parsedAmount !== null ? (
                                            <>
                                                {/* Checkmark icon */}
                                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                                = {parsedAmount}
                                            </>
                                        ) : (
                                            <>
                                                {/* X icon */}
                                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                                غير صالح
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Rate */}
                        <div>
                            <label className="block text-xs font-medium text-hw-text-secondary mb-1">
                                {isSameCurrency
                                    ? <span className="opacity-60">السعر (1:1 — نفس العملة)</span>
                                    : <>السعر <span className="opacity-60">(1 {fromCurrency} = ? {toCurrency})</span></>
                                }
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder={isSameCurrency ? "1" : "0.00"}
                                value={isSameCurrency ? "1" : rateRaw}
                                onChange={(e) => { if (!isSameCurrency) setRateRaw(e.target.value); }}
                                disabled={isSameCurrency}
                                className={[
                                    "w-full bg-hw-bg border border-hw-border rounded-lg px-2 py-2 text-sm text-hw-text font-mono focus:border-hw-accent focus:outline-none focus:ring-1 focus:ring-hw-accent/20 transition-colors",
                                    isSameCurrency ? "opacity-40 cursor-not-allowed" : "",
                                ].join(" ")}
                            />
                            {/* Inline currency badge + expression feedback */}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                                {!isSameCurrency ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-hw-surface-alt border border-hw-border text-[10px] font-bold text-hw-text-secondary select-none shrink-0">
                                        <span className="opacity-80">{CURRENCY_ICONS[toCurrency]}</span>
                                        {toCurrency}
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-hw-text-muted">نفس العملة</span>
                                )}
                                {!isSameCurrency && rateRaw.trim() !== "" && (
                                    <span className={[
                                        "text-[10px] font-mono flex items-center gap-0.5 transition-colors duration-200",
                                        parsedRate !== null ? "text-hw-success" : "text-hw-danger",
                                    ].join(" ")}>
                                        {parsedRate !== null ? (
                                            <>
                                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                </svg>
                                                = {parsedRate}
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                </svg>
                                                غير صالح
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Converted amount result card ─────── */}
                    <div className={[
                        "rounded-xl border px-4 py-3 transition-all duration-300",
                        isSubmittable
                            ? "border-hw-accent/40 bg-hw-accent-muted shadow-sm"
                            : "border-hw-border bg-hw-surface-alt",
                    ].join(" ")}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-hw-text-secondary mb-2">المبلغ المحوَّل</p>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Source */}
                            <div className="flex items-baseline gap-1.5">
                                <span className={[
                                    "text-base font-mono font-bold transition-colors duration-300",
                                    isSubmittable ? "text-hw-text" : "text-hw-text-muted",
                                ].join(" ")}>
                                    {parsedAmount !== null && parsedAmount > 0 ? parsedAmount : "—"}
                                </span>
                                <span className={[
                                    "text-[11px] font-semibold transition-colors duration-300",
                                    isSubmittable ? "text-hw-text-secondary" : "text-hw-text-muted",
                                ].join(" ")}>
                                    {fromCurrency}
                                </span>
                            </div>

                            {/* Arrow */}
                            <svg className={[
                                "w-4 h-4 shrink-0 transition-colors duration-300",
                                isSubmittable ? "text-hw-accent" : "text-hw-text-muted",
                            ].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                            </svg>

                            {/* Result */}
                            <div className="flex items-baseline gap-1.5">
                                <span className={[
                                    "text-xl font-mono font-bold transition-colors duration-300",
                                    isSubmittable ? "text-hw-accent" : "text-hw-text-muted",
                                ].join(" ")}>
                                    {isSubmittable && convertedAmount !== null ? convertedAmount.toFixed(4) : "—"}
                                </span>
                                <span className={[
                                    "text-[11px] font-semibold transition-colors duration-300",
                                    isSubmittable ? "text-hw-accent" : "text-hw-text-muted",
                                ].join(" ")}>
                                    {toCurrency}
                                </span>
                            </div>
                        </div>

                        {/* Breakdown line */}
                        {isSubmittable && !isSameCurrency && parsedAmount !== null && effectiveRate !== null && convertedAmount !== null && (
                            <p className="mt-1.5 text-[10px] font-mono text-hw-text-secondary opacity-70">
                                {parsedAmount} ÷ {effectiveRate} = {convertedAmount.toFixed(4)}
                            </p>
                        )}
                    </div>

                </div>
            </div>
            {/* ── End Currency Conversion Card ──────────────────────────── */}

            <div>
                <label className="block text-xs font-medium text-hw-text-secondary mb-1">ملاحظات الدفتر / المراجع</label>
                <textarea
                    rows={2}
                    placeholder="..."
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    className="w-full bg-hw-bg border border-hw-border rounded-md p-2 text-sm text-hw-text focus:border-hw-accent focus:outline-none resize-none"
                />
            </div>

            {message && (
                <div className={`p-3 rounded text-xs font-medium ${message.success ? "bg-hw-accent-muted text-hw-accent border border-hw-accent-muted" : "bg-hw-danger-bg text-hw-danger border border-hw-danger-border"}`}>
                    {message.text}
                </div>
            )}

            <button
                type="submit"
                disabled={loading || !isSubmittable}
                className="w-full py-2 px-4 rounded-md font-medium text-sm transition text-hw-surface bg-hw-accent hover:bg-hw-accent-hover disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text"
            >
                {loading ? "جار تسجيل المعالجة..." : "سجل المعاملة"}
            </button>
        </form>
    );
}
