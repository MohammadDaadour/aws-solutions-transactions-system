"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Currency, TransactionType } from "../generated/prisma/enums";

interface User { id: string; username: string; }

interface Props {
    users: User[];
    showUserFilter: boolean;
    userId?: string;
    agent?: boolean;
    sessions?: { id: string; openedAt: Date; status: string; }[];
}

export default function TransactionFilterBar({ users, showUserFilter, userId, agent, sessions }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const update = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
    }, [searchParams, pathname, router]);

    if (agent) {
        useEffect(() => {
            update("userId", userId ?? "");
        }, []);
    }
    const selectClass = "w-full rounded-lg border border-hw-border bg-hw-bg text-hw-text text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-hw-accent";

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {sessions && (
                <select
                    className={selectClass}
                    defaultValue={searchParams.get("sessionId") ?? ""}
                    onChange={e => update("sessionId", e.target.value)}
                >
                    <option value="">الجلسة النشطة (تلقائي)</option>
                    {sessions.map(s => {
                        const dateStr = new Date(s.openedAt).toLocaleDateString("ar-EG", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                        });
                        return (
                            <option key={s.id} value={s.id}>
                                {s.status === "OPEN" ? `الجلسة النشطة (${dateStr})` : `جلسة مغلقة (${dateStr})`}
                            </option>
                        );
                    })}
                </select>
            )}

            {showUserFilter && (
                <select
                    className={selectClass}
                    defaultValue={searchParams.get("userId") ?? ""}
                    onChange={e => update("userId", e.target.value)}
                >
                    <option value="">كل الحسابات</option>
                    {users.map(u => (
                        <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                </select>
            )}

            <select
                className={selectClass}
                defaultValue={searchParams.get("type") ?? ""}
                onChange={e => update("type", e.target.value)}
            >
                <option value="">كل الأنواع</option>
                <option value={TransactionType.debit}>مدين لنا</option>
                <option value={TransactionType.credit}>دائن علينا</option>
                <option value={TransactionType.opening_balance}>رصيد افتتاحي</option>
            </select>

            <select
                className={selectClass}
                defaultValue={searchParams.get("currency") ?? ""}
                onChange={e => update("currency", e.target.value)}
            >
                <option value="">كل العملات</option>
                {Object.values(Currency).map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
            </select>

            <div className="flex items-center gap-2">
                <p className="text-lg text-hw-text">من</p>
                <input
                    type="date"
                    className={selectClass}
                    defaultValue={searchParams.get("dateFrom") ?? ""}
                    onChange={e => update("dateFrom", e.target.value)}
                    placeholder="من"
                />
            </div>
            <div className="flex items-center gap-2 mx-2">
                <p className="text-lg text-hw-text">إلى</p>
                <input
                    type="date"
                    className={selectClass}
                    defaultValue={searchParams.get("dateTo") ?? ""}
                    onChange={e => update("dateTo", e.target.value)}
                    placeholder="إلى"
                />
            </div>
        </div>
    );
}
