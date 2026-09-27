"use client";

export function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-hw-text-secondary uppercase tracking-wider">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*\.?\d*$/.test(v)) onChange(v);
                    }}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-hw-border bg-hw-bg text-hw-text font-mono text-sm px-3 py-2 pr-12
                               focus:outline-none focus:ring-2 focus:ring-hw-accent/50 focus:border-hw-accent transition placeholder-hw-text-muted"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-hw-text-muted font-mono">جنيه</span>
            </div>
        </div>
    );
}
