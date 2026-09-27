"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UpdateUserForm from "./UpdateUserForm";
import { Role, UserType, Currency } from "../generated/prisma/enums";

type UserBalance = {
    currency: Currency;
    balance: { toNumber: () => number } | number;
};

type User = {
    id: string;
    username: string;
    role: Role;
    type: UserType;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    balances: UserBalance[];
};

interface UsersTableProps {
    activeUsers: User[];
    inactiveUsers: User[];
    viewerRole: Role;
}

export default function UsersTable({ activeUsers, inactiveUsers, viewerRole }: UsersTableProps) {
    const router = useRouter();
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    const visibleActive = viewerRole === "Mod" ? activeUsers.filter((u) => u.role === "Member") : activeUsers;
    const visibleInactive = viewerRole === "Mod" ? inactiveUsers.filter((u) => u.role === "Member") : inactiveUsers;

    return (
        <>
            {/* Active Users Table */}
            <UserTableSection
                users={visibleActive}
                emptyMessage="لا يوجد حسابات نشطة"
                onEdit={setEditingUser}
            />

            {/* Deactivated Accounts Toggle */}
            {visibleInactive.length > 0 && (
                <div className="mt-6 space-y-3">
                    <button
                        onClick={() => setShowInactive((v) => !v)}
                        className="flex items-center gap-2 text-sm font-semibold border rounded-xl p-2 uppercase tracking-wider text-hw-text-secondary hover:text-hw-text transition-colors group"
                    >
                        <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full  border-hw-border-subtle text-[25px] transition-transform duration-200 ${showInactive ? "rotate-90" : ""}`}
                        >
                            ▶
                        </span>
                        الحسابات المعطلة
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-red-900/30 text-red-800 text-[20px] font-bold min-w-[18px]">
                            {visibleInactive.length}
                        </span>
                    </button>

                    {showInactive && (
                        <div className="rounded-xl border border-red-900/30 bg-red-950/10 overflow-hidden">
                            <div className="px-4 py-2 border-b border-red-900/20 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block animate-pulse" />
                                <span className="text-xs font-medium text-red-500">حسابات معطلة — للعرض فقط</span>
                            </div>
                            <UserTableSection
                                users={visibleInactive}
                                emptyMessage="لا يوجد حسابات معطلة"
                                onEdit={undefined}
                                dimmed
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {editingUser && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setEditingUser(null); }}
                >
                    <div className="w-full max-w-md rounded-xl border border-hw-border bg-hw-surface p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-hw-text">
                                تعديل الحساب: <span className="font-mono text-hw-accent">{editingUser.username}</span>
                            </h3>
                            <button
                                onClick={() => setEditingUser(null)}
                                className="text-hw-text-muted hover:text-hw-text transition-colors text-lg leading-none"
                            >
                                ✕
                            </button>
                        </div>
                        <UpdateUserForm
                            user={editingUser}
                            viewerRole={viewerRole}
                            onSuccess={() => {
                                setEditingUser(null);
                                router.refresh();
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}

// ─── Shared table section ────────────────────────────────────────────────────

function UserTableSection({
    users,
    emptyMessage,
    onEdit,
    dimmed = false,
}: {
    users: User[];
    emptyMessage: string;
    onEdit?: (u: User) => void;
    dimmed?: boolean;
}) {
    return (
        <div className={`rounded-xl border border-hw-border bg-hw-surface overflow-auto ${dimmed ? "opacity-75" : ""}`}>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-hw-border text-right">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">اسم المستخدم</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الصلاحية</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">النوع</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الرصيد</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">الهاتف</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">تاريخ الاضافة</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">عرض</th>
                        {onEdit && (
                            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">تعديل</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-hw-border/60">
                    {users.map((u) => (
                        <tr key={u.id} className="hover:bg-hw-surface-alt/30 transition-colors">
                            <td className="px-4 py-3 font-mono text-hw-text">{u.username}</td>
                            <td className="px-4 py-3">
                                <RoleBadge role={u.role} />
                            </td>
                            <td className="px-4 py-3 text-hw-text-secondary capitalize">
                                {u.type === "receiver" ? "مستورد" : "مورد"}
                            </td>
                            <td className="px-4 py-3 text-hw-text-secondary font-mono text-xs">
                                <BalanceCell balances={u.balances} />
                            </td>
                            <td className="px-4 py-3 text-hw-text-secondary font-mono text-xs">{u.phone}</td>
                            <td className="px-4 py-3 text-gray-700 text-xs font-mono">
                                {new Date(u.createdAt).toLocaleDateString("ar-EG")}
                            </td>
                            <td className="px-4 py-3">
                                <Link
                                    href={`/dashboard/users/${u.id}`}
                                    className="text-white hover:text-hw-accent-hover focus:outline-none bg-hw-accent hover:bg-hw-accent/20 border border-hw-accent/30 px-2 py-1 rounded text-xs font-medium transition-colors"
                                >
                                    عرض
                                </Link>
                            </td>
                            {onEdit && (
                                <td className="px-4 py-3">
                                    {u.role !== "Admin" && (
                                        <button
                                            onClick={() => onEdit(u)}
                                            className="text-hw-success hover:text-hw-accent-hover focus:outline-none bg-hw-surface-alt/30 hover:bg-hw-surface-alt/50 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
                                        >
                                            تعديل
                                        </button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                    {users.length === 0 && (
                        <tr>
                            <td colSpan={onEdit ? 8 : 7} className="px-4 py-8 text-center text-hw-text-muted text-sm">
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ─── Balance cell ─────────────────────────────────────────────────────────────

function BalanceCell({ balances }: { balances: UserBalance[] }) {
    const totals = new Map<Currency, number>();
    for (const b of balances) {
        const amount = typeof b.balance === "number" ? b.balance : b.balance.toNumber();
        totals.set(b.currency, (totals.get(b.currency) ?? 0) + amount);
    }
    const entries = Array.from(totals.entries());

    return entries.length === 0 ? (
        <span className="text-hw-text-faint">—</span>
    ) : (
        <div className="space-y-0.5">
            {entries.map(([currency, amount]) => (
                <div key={currency} className="flex items-center gap-1.5">
                    <span className="text-hw-text">{currency}</span>
                    <span className={amount >= 0 ? "text-hw-accent bold text-lg" : "text-red-800 bold text-lg"}>
                        {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
    const styles: Record<string, string> = {
        Admin: "bg-[var(--hw-role-admin-bg)] text-[var(--hw-role-admin-text)] border-[var(--hw-role-admin-border)]",
        Mod: "bg-[var(--hw-role-mod-bg)] text-[var(--hw-role-mod-text)] border-[var(--hw-role-mod-border)]",
        Member: "bg-hw-surface-alt/60 text-gray-600 border-hw-border-subtle/50",
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-mono font-medium rounded border ${styles[role] ?? styles.Member}`}>
            {role === "Admin" ? "أدمن" : role === "Mod" ? "مدير" : "موزع"}
        </span>
    );
}