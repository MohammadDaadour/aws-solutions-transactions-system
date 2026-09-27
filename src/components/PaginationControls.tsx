"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
    currentPage: number;
    pageCount: number;
    total: number;
    pageSize: number;
}

export default function PaginationControls({ currentPage, pageCount, total, pageSize }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const go = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("page", String(page));
        router.push(`${pathname}?${params.toString()}`);
    };

    const from = Math.min((currentPage - 1) * pageSize + 1, total);
    const to = Math.min(currentPage * pageSize, total);

    if (pageCount <= 1) return null;

    return (
        <div className="flex items-center justify-between text-sm text-hw-text-secondary mt-2" dir="rtl">
            <span className="font-mono text-xs">
                {from}–{to} من {total} قيد
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => go(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border border-hw-border bg-hw-surface hover:bg-hw-bg disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs"
                >
                    «
                </button>
                <button
                    onClick={() => go(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border border-hw-border bg-hw-surface hover:bg-hw-bg disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs"
                >
                    ‹
                </button>

                {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - currentPage) <= 2)
                    .map(p => (
                        <button
                            key={p}
                            onClick={() => go(p)}
                            className={`px-2.5 py-1 rounded border font-mono text-xs transition ${
                                p === currentPage
                                    ? "border-hw-accent bg-hw-accent text-hw-bg font-bold"
                                    : "border-hw-border bg-hw-surface hover:bg-hw-bg"
                            }`}
                        >
                            {p}
                        </button>
                    ))}

                <button
                    onClick={() => go(currentPage + 1)}
                    disabled={currentPage === pageCount}
                    className="px-2 py-1 rounded border border-hw-border bg-hw-surface hover:bg-hw-bg disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs"
                >
                    ›
                </button>
                <button
                    onClick={() => go(pageCount)}
                    disabled={currentPage === pageCount}
                    className="px-2 py-1 rounded border border-hw-border bg-hw-surface hover:bg-hw-bg disabled:opacity-30 disabled:cursor-not-allowed font-mono text-xs"
                >
                    »
                </button>
            </div>
        </div>
    );
}