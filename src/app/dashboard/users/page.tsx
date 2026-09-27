import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { db } from "../../../lib/db";
import CreateUserForm from "../../../components/CreateUserForm";
import UsersTable from "@/src/components/UsersTable";

export default async function UsersPage() {
    const session = await auth();
    if (!session || session.user?.role === "Member") redirect("/dashboard");

    const userSelect: any = {
        id: true,
        username: true,
        role: true,
        type: true,
        phone: true,
        isActive: true,
        createdAt: true,
        balances: {
            select: {
                currency: true,
                balance: true,
            }
        },
    };

    const [activeUsersRaw, inactiveUsersRaw] = await Promise.all([
        db.user.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            select: userSelect,
        }),
        db.user.findMany({
            where: { isActive: false },
            orderBy: { createdAt: "desc" },
            select: userSelect,
        }),
    ]);

    const serialize = (users: typeof activeUsersRaw) =>
        users.map((u) => ({
            id: u.id,
            username: u.username,
            role: u.role,
            type: u.type,
            phone: u.phone,
            isActive: u.isActive,
            createdAt: u.createdAt,
            balances: (u.balances || []).map((b: any) => ({
                currency: b.currency,
                balance: b.balance.toNumber(),
            })),
        })) as any[];

    const activeUsers = serialize(activeUsersRaw);
    const inactiveUsers = serialize(inactiveUsersRaw);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">إدارة الحسابات</h2>
                <p className="text-hw-text-secondary mt-1">إضافة حساب جديد ومراجعة الحسابات الحالية.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                {/* Left: Create Account Form */}
                {session.user?.role === "Admin" && <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                        حساب جديد
                    </h3>
                    <div className="rounded-xl border border-hw-border bg-hw-surface p-6">
                        <CreateUserForm />
                    </div>
                </div>}
                {/* Right: Existing Users Table */}
                <div className="xl:col-span-2 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                        الحسابات النشطة ({activeUsers.length})
                    </h3>
                    <UsersTable activeUsers={activeUsers} inactiveUsers={inactiveUsers} viewerRole={session.user?.role as any} />
                </div>
            </div>
        </div>
    );
}