"use client";

export function Pagination({ page, pageCount, onChange }: { page: number; pageCount: number; onChange: (p: number) => void }) {
    if (pageCount <= 1) return null;
    const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
    // Show max 7 page buttons with ellipsis
    const getVisiblePages = () => {
        if (pageCount <= 7) return pages;
        if (page <= 4) return [...pages.slice(0, 5), -1, pageCount];
        if (page >= pageCount - 3) return [1, -1, ...pages.slice(pageCount - 5)];
        return [1, -1, page - 1, page, page + 1, -1, pageCount];
    };
    return (
        <div className="flex items-center justify-center gap-1 mt-4" dir="ltr">
            <button
                onClick={() => onChange(page - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-hw-border text-xs text-hw-text-secondary
                           hover:bg-hw-surface disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                ‹
            </button>
            {getVisiblePages().map((p, i) =>
                p === -1 ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-hw-text-muted text-xs">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onChange(p)}
                        className={`min-w-[32px] px-2 py-1.5 rounded-lg border text-xs font-mono transition
                            ${p === page
                                ? "border-hw-accent bg-hw-accent/10 text-hw-accent font-bold"
                                : "border-hw-border text-hw-text-secondary hover:bg-hw-surface"}`}
                    >
                        {p}
                    </button>
                )
            )}
            <button
                onClick={() => onChange(page + 1)}
                disabled={page === pageCount}
                className="px-3 py-1.5 rounded-lg border border-hw-border text-xs text-hw-text-secondary
                           hover:bg-hw-surface disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                ›
            </button>
        </div>
    );
}
