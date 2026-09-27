import { auth } from "../../auth";
import { db } from "../../lib/db";
import { getAllSessionsBalances, getGlobalSystemBalances, getRecentLedger } from "../../lib/queries";
import { TransactionType, Currency } from "../../generated/prisma/client";

import ManualTransactionForm from "../../components/ManualTransactionForm";
import DynamicLedgerTable from "../../components/DynamicLedgerTable";
import { UserTransactionPanel } from "../../components/UserTransactionPanel";
import SessionControl from "../../components/SessionControl";
import Link from "next/link";
import Image from "next/image";
import heroImage from "../../../utils/hero.png";

const currencyIcons: Record<Currency, React.ReactNode> = {
    USD: <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" fill="#6cde07" r="16" /><path d="M22.5 19.154c0 2.57-2.086 4.276-5.166 4.533V26h-2.11v-2.336A11.495 11.495 0 019.5 21.35l1.552-2.126c1.383 1.075 2.692 1.776 4.269 2.01v-4.58c-3.541-.888-5.19-2.173-5.19-4.813 0-2.523 2.061-4.252 5.093-4.486V6h2.11v1.402a9.49 9.49 0 014.56 1.776l-1.359 2.196c-1.067-.771-2.158-1.262-3.298-1.495v4.439c3.687.888 5.263 2.313 5.263 4.836zm-7.18-5.327V9.715c-1.527.117-2.327.935-2.327 1.963 0 .98.46 1.612 2.328 2.15zm4.318 5.49c0-1.05-.51-1.681-2.401-2.219v4.23c1.528-.118 2.401-.889 2.401-2.01z" fill="#ffffff" /></svg>,
    AED: <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 32 32" fill="none" stroke="#004f0dff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 19h-3.5" /><path d="M8.599 16.479a1.5 1.5 0 1 0 -1.099 2.521" /><path d="M7 4v9" /><path d="M15 13h1.888a1.5 1.5 0 0 0 1.296 -2.256l-2.184 -3.744" /><path d="M11 13.01v-.01" /></svg>,
    EGP: <svg fill="#735117" height="48" width="48" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 470 470" stroke="#735117"><path d="M401.17,68.83C356.784,24.444,297.771,0,235,0C172.229,0,113.215,24.444,68.83,68.83C24.444,113.216,0,172.229,0,235 s24.444,121.784,68.83,166.17C113.215,445.556,172.229,470,235,470c62.771,0,121.784-24.444,166.17-68.83S470,297.771,470,235 S445.556,113.216,401.17,68.83z M235,455c-121.309,0-220-98.691-220-220S113.691,15,235,15s220,98.691,220,220S356.309,455,235,455 z" /><path d="M269.067,260.577c-4.143,0-7.5,3.357-7.5,7.5V362c0,4.143,3.357,7.5,7.5,7.5c30.325,0,54.996-24.671,54.996-54.996v-14.253 c0-24.657,16.378-46.923,39.827-54.146c2.209-0.681,3.98-2.342,4.803-4.503c0.821-2.16,0.601-4.579-0.599-6.555l-70.078-115.516 c-0.019-0.032-0.042-0.06-0.062-0.091c-0.089-0.143-0.184-0.281-0.283-0.417c-0.042-0.057-0.081-0.117-0.124-0.172 c-0.132-0.171-0.27-0.337-0.416-0.497c-0.029-0.031-0.058-0.061-0.087-0.091c-0.137-0.145-0.279-0.284-0.427-0.418 c-0.065-0.059-0.134-0.113-0.201-0.169c-0.109-0.091-0.218-0.181-0.332-0.266c-0.075-0.056-0.152-0.109-0.229-0.162 c-0.113-0.078-0.229-0.153-0.346-0.225c-0.078-0.048-0.157-0.094-0.236-0.139c-0.123-0.069-0.249-0.134-0.377-0.196 c-0.079-0.038-0.156-0.077-0.236-0.113c-0.135-0.06-0.275-0.114-0.415-0.167c-0.075-0.028-0.149-0.059-0.225-0.084 c-0.027-0.009-0.052-0.021-0.079-0.03c-0.61-0.2-13.554-4.387-33.294-6.719c-1.08-7.828-5.761-11.447-9.769-13.115 C246.169,94.5,240.744,94.5,235,94.5c-5.744,0-11.168,0-15.878,1.96c-4.008,1.667-8.689,5.287-9.769,13.115 c-19.741,2.333-32.685,6.519-33.294,6.719c-0.024,0.008-0.047,0.019-0.071,0.026c-0.089,0.03-0.177,0.066-0.265,0.1 c-0.125,0.048-0.25,0.096-0.372,0.15c-0.092,0.041-0.182,0.085-0.272,0.13c-0.114,0.057-0.227,0.114-0.338,0.176 c-0.091,0.051-0.18,0.104-0.27,0.158c-0.105,0.064-0.208,0.132-0.309,0.201c-0.088,0.06-0.175,0.12-0.26,0.184 c-0.101,0.075-0.197,0.154-0.293,0.234c-0.079,0.065-0.159,0.129-0.235,0.198c-0.125,0.113-0.244,0.232-0.361,0.353 c-0.065,0.066-0.129,0.133-0.191,0.203c-0.128,0.142-0.251,0.289-0.367,0.439c-0.046,0.06-0.089,0.124-0.134,0.186 c-0.096,0.133-0.188,0.268-0.276,0.407c-0.02,0.032-0.043,0.06-0.063,0.092l-70.079,115.516c-1.199,1.976-1.42,4.395-0.598,6.555 c0.821,2.161,2.593,3.822,4.802,4.503c23.45,7.224,39.828,29.489,39.828,54.146v14.253c0,30.325,24.671,54.996,54.996,54.996 c4.142,0,7.5-3.357,7.5-7.5v-93.923c0-4.143-3.358-7.5-7.5-7.5s-7.5,3.357-7.5,7.5v85.718c-18.481-3.521-32.496-19.8-32.496-39.291 v-14.253c0-27.976-16.692-53.522-41.563-65.081l53.716-88.543c2.338,23.013,6.227,57.527,9.989,73.833 c3.881,16.83,18.994,33.79,44.422,36.602l0,56.829c0,4.142,3.358,7.5,7.5,7.5c4.142,0,7.5-3.358,7.5-7.5l0.001-56.829 c25.427-2.812,40.539-19.772,44.422-36.602c3.761-16.306,7.65-50.82,9.988-73.833l53.715,88.544 c-24.871,11.558-41.563,37.104-41.563,65.08v14.253c0,19.491-14.015,35.771-32.496,39.291v-85.718 C276.567,263.935,273.21,260.577,269.067,260.577z M213.623,124.19l2.207,4.615v9.026c0,4.143,3.358,7.5,7.5,7.5s7.5-3.357,7.5-7.5 v-10.728c0-1.12-0.251-2.226-0.734-3.236l-5.881-12.295c0.094-0.65,0.23-0.981,0.289-1.062c1.09-1.011,6.978-1.011,10.495-1.011 s9.405,0,10.486,1.001c0.064,0.086,0.203,0.42,0.298,1.071l-5.881,12.295c-0.483,1.011-0.734,2.116-0.734,3.236v10.728 c0,4.143,3.357,7.5,7.5,7.5s7.5-3.357,7.5-7.5v-9.026l2.207-4.615c11.956,1.271,21.517,3.341,27.185,4.772 c-0.537,5.7-1.423,14.831-2.529,25.242h-92.064c-1.106-10.411-1.993-19.541-2.53-25.241 C192.108,127.531,201.669,125.461,213.623,124.19z M272.306,217.088c-2.392,10.371-11.607,22.276-29.805,24.866v-2.215 c0-4.142-3.358-7.5-7.5-7.5c-4.142,0-7.5,3.358-7.5,7.5v2.215c-18.199-2.59-27.414-14.494-29.806-24.866 c-2.421-10.498-4.964-29.6-7.069-47.884h88.75C277.271,187.487,274.728,206.588,272.306,217.088z" /><path d="M235,54c-45.617,0-89.191,17.025-122.695,47.939C78.999,132.671,58.534,174.372,54.68,219.36 c-0.354,4.127,2.706,7.759,6.833,8.112c4.135,0.354,7.76-2.706,8.113-6.833C76.909,135.608,149.55,69,235,69 c91.533,0,166,74.468,166,166s-74.467,166-166,166c-85.45,0-158.091-66.608-165.375-151.64c-0.354-4.128-3.987-7.196-8.113-6.833 c-4.127,0.354-7.186,3.985-6.833,8.112c3.854,44.988,24.318,86.689,57.625,117.421C145.809,398.975,189.383,416,235,416 c99.804,0,181-81.196,181-181S334.804,54,235,54z" /></svg>,
    VOD: <svg fill="#E60000" width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Vodafone</title><path d="M12 0A12 12 0 0 0 0 12A12 12 0 0 0 12 24A12 12 0 0 0 24 12A12 12 0 0 0 12 0M16.25 1.12C16.57 1.12 16.9 1.15 17.11 1.22C14.94 1.67 13.21 3.69 13.22 6C13.22 6.05 13.22 6.11 13.23 6.17C16.87 7.06 18.5 9.25 18.5 12.28C18.54 15.31 16.14 18.64 12.09 18.65C8.82 18.66 5.41 15.86 5.39 11.37C5.38 8.4 7 5.54 9.04 3.85C11.04 2.19 13.77 1.13 16.25 1.12Z" /></svg>,
};

export default async function DashboardOverview() {
    const session = await auth();
    if (!session?.user) return null;

    const { id: currentUserId, role } = session.user;

    const activeSession = await db.session.findFirst({
        where: { status: "OPEN" },
        include: { openedByUser: { select: { username: true } } }
    });

    // 1. Setup blank arrays to safely absorb logic state if no session exists
    let userBalances: any[] = [];
    let allUserBalances: any[] = [];

    // 2. Fetch non-session-dependent information in parallel first
    const [globalBalances, recentTransactions, activeUsers, totalUserBalancesRaw, totalAllBalancesRaw] = await Promise.all([
        getAllSessionsBalances(),
        getRecentLedger(role === "Member" ? currentUserId : undefined),
        role !== "Member"
            ? db.user.findMany({
                where: { isActive: true },
                select: { id: true, username: true }
            })
            : [],
        // Total balance for the current user, summed across ALL sessions
        db.userBalance.groupBy({
            by: ["currency"],
            where: { userId: currentUserId },
            _sum: { balance: true },
        }),
        // Total balance per user per currency, summed across ALL sessions (non-Member only)
        role !== "Member"
            ? db.userBalance.groupBy({
                by: ["userId", "currency"],
                _sum: { balance: true },
            })
            : [],
    ]);

    const totalUserBalancesMap = new Map(
        totalUserBalancesRaw.map((b) => [b.currency, b._sum.balance?.toNumber() ?? 0])
    );

    // Resolve usernames for active users for the total-across-sessions per-user breakdown
    const totalPerCurrencyUsers = new Map<Currency, { id: string; username: string; balance: number }[]>();
    if (role !== "Member" && totalAllBalancesRaw.length > 0) {
        const userIds = [...new Set(totalAllBalancesRaw.map((b) => b.userId))];
        const usersById = new Map(
            (await db.user.findMany({
                where: { id: { in: userIds }, isActive: true },
                select: { id: true, username: true },
            })).map((u) => [u.id, u.username])
        );
        for (const b of totalAllBalancesRaw) {
            const username = usersById.get(b.userId);
            if (!username) continue; // Skip inactive/deleted users
            const amount = b._sum.balance?.toNumber() ?? 0;
            const list = totalPerCurrencyUsers.get(b.currency) ?? [];
            list.push({ id: b.userId, username, balance: amount });
            totalPerCurrencyUsers.set(b.currency, list);
        }
    }

    // 3. Only safely run balance lookups if we have a valid open session UUID
    if (activeSession?.id) {
        const [userBalancesData, allUserBalancesData] = await Promise.all([
            db.userBalance.findMany({
                where: {
                    userId: currentUserId,
                    sessionId: activeSession.id
                }
            }),
            role !== "Member"
                ? db.userBalance.findMany({
                    where: {
                        sessionId: activeSession.id,
                        user: { isActive: true }
                    },
                    select: {
                        currency: true,
                        balance: true,
                        user: { select: { username: true } }
                    }
                })
                : [],
        ]);
        userBalances = userBalancesData;
        allUserBalances = allUserBalancesData;
    }

    const userBalancesMap = new Map(userBalances.map(b => [b.currency, b.balance.toNumber()]));
    const globalBalancesMap = new Map(globalBalances.map(b => [b.currency, b.netPosition]));

    // Group per-user balances by currency
    const perCurrencyUsers = new Map<Currency, { username: string; balance: number }[]>();
    for (const b of allUserBalances) {
        const list = perCurrencyUsers.get(b.currency) ?? [];
        list.push({ username: b.user.username, balance: b.balance.toNumber() });
        perCurrencyUsers.set(b.currency, list);
    }

    return (
        <div className="space-y-8">

            {/* Hero Image */}
            <div className="w-full relative overflow-hidden rounded-xl">
                <Image
                    src={heroImage}
                    alt="Hero"
                    className="w-full object-cover max-h-[260px] sm:max-h-[340px] md:max-h-[420px] lg:max-h-[500px] xl:max-h-[560px]"
                    priority
                />
                {/* Overlay */}
                <div dir="rtl" className="absolute inset-y-0 right-0 w-1/2 flex flex-col justify-center items-start text-right px-6 sm:px-10 md:px-14 lg:px-20 gap-2 sm:gap-3 md:gap-4">
                    <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight drop-shadow-lg">
                        حوالاتك المالية
                    </h1>
                    <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-white drop-shadow-md">
                        أسهل .. أسرع .. أكثر أمانا
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-white/90 drop-shadow max-w-[260px] sm:max-w-sm md:max-w-md">
                        آلاف الحوالات يتم تنفيذها يوميا بأسعار تنافسية و سرعة عالية
                    </p>
                    <a href="#overview" className="mt-1 sm:mt-2 px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 bg-hw-success text-hw-sidebar text-xs sm:text-sm md:text-base font-semibold rounded-lg cursor-pointer shadow-lg hover:opacity-90 transition-opacity">
                        تفاصيل أكثر
                    </a>
                </div>
            </div>

            {/* Page Header */}
            <div id="overview" className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-hw-text">نظرة عامة</h2>
                    <p className="text-sm text-hw-text-secondary mt-0.5">عرض تشغيلي مباشر ومراقبة الدفتر</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hw-success-muted border border-hw-success-border text-xs font-semibold text-green-700">
                    <span className="w-2 h-2 rounded-full bg-hw-success animate-pulse" />
                    مباشر
                </div>
            </div>

            {role !== "Member" ? (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-hw-text-secondary mb-3">إجمالي صافي السيولة</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.values(Currency).map((currency) => {
                            const netPosition = globalBalancesMap.get(currency) || 0;
                            const inverted = netPosition === 0 ? 0 : netPosition * -1;
                            const users = totalPerCurrencyUsers.get(currency) ?? [];

                            return (
                                <div key={currency} className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-2">
                                        <span className="shrink-0">{currencyIcons[currency]}</span>
                                        <span className="text-sm font-medium text-hw-text-secondary">{currency} رصيد الحساب</span>
                                    </div>
                                    <p className={`text-2xl font-mono font-bold ${inverted >= 0 ? "text-hw-success" : "text-hw-danger"}`}>
                                        {inverted.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                    </p>
                                    {users.filter((u) => u.balance !== 0).length > 0 && (
                                        <div className="border-t border-hw-border pt-3 space-y-1">
                                            {users.filter((u) => u.balance !== 0).map((u) => (
                                                <Link key={u.username} href={`/dashboard/users/${u.id}`}>
                                                    <div className="flex justify-between items-center text-xs hover:bg-hw-surface-alt rounded-lg px-2 py-1.5 transition-colors">
                                                        <span className="font-mono text-hw-text font-medium">{u.username}</span>
                                                        <span className={`font-mono font-bold ${u.balance >= 0 ? "text-hw-success" : "text-hw-danger"}`}>
                                                            {u.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary mb-3">رصيد الحساب</h3>
                    {/* {userBalancesMap.size === 0 ? (
                        <p className="text-sm text-hw-text-muted">لا يوجد رصيد حالياً</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {Object.values(Currency)
                                .filter((currency) => {
                                    const balance = userBalancesMap.get(currency) || 0;
                                    return balance !== 0;
                                })
                                .map((currency) => {
                                    const balance = userBalancesMap.get(currency) || 0;
                                    return (
                                        <div key={currency} className="rounded-xl border border-hw-border bg-hw-surface p-5">
                                            <p className="text-sm font-medium text-hw-text-secondary flex items-center">
                                                <span className="ml-2">{currencyIcons[currency]}</span>
                                                {currency} رصيد الحساب
                                            </p>
                                            <p className="text-2xl font-mono font-bold mt-2 text-hw-text">
                                                {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    );
                                })}
                        </div>
                    )} */}

                    <div>
                        {/* <h3 className="text-xs font-semibold uppercase text-bold tracking-wider text-hw-text-secondary mb-3">
                            {role !== "Member" ? "إجمالي الرصيد الكلي (كل الجلسات)" : "إجمالي رصيدك (كل الجلسات)"}
                        </h3> */}
                        {role !== "Member" ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {Object.values(Currency).map((currency) => {
                                    const users = totalPerCurrencyUsers.get(currency) ?? [];
                                    const total = users.reduce((sum, u) => sum + u.balance, 0);
                                    if (total === 0 && users.length === 0) return null;

                                    return (
                                        <div key={currency} className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2">
                                                <span className="shrink-0">{currencyIcons[currency]}</span>
                                                <span className="text-sm font-medium text-hw-text-secondary">{currency} إجمالي</span>
                                            </div>
                                            <p className={`text-2xl font-mono font-bold ${total >= 0 ? "text-hw-success" : "text-hw-danger"}`}>
                                                {total.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                            </p>
                                            {users.length > 0 && (
                                                <div className="border-t border-hw-border pt-3 space-y-1">
                                                    {users.map((u) => (
                                                        <div key={u.username} className="flex justify-between items-center px-2 py-1">
                                                            <span className="font-mono text-hw-text text-sm font-medium">{u.username}</span>
                                                            <span className={`font-mono font-bold text-sm ${u.balance >= 0 ? "text-hw-success" : "text-hw-danger"}`}>
                                                                {u.balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : totalUserBalancesMap.size === 0 ? (
                            <p className="text-sm text-hw-text-muted">لا يوجد رصيد حالياً</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {Object.values(Currency)
                                    .filter((currency) => (totalUserBalancesMap.get(currency) || 0) !== 0)
                                    .map((currency) => {
                                        const balance = totalUserBalancesMap.get(currency) || 0;
                                        return (
                                            <div key={currency} className="rounded-xl border border-hw-border bg-hw-surface p-5 shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="shrink-0">{currencyIcons[currency]}</span>
                                                    <span className="text-sm font-medium text-hw-text-secondary">{currency} إجمالي</span>
                                                </div>
                                                <p className={`text-2xl font-mono font-bold ${balance >= 0 ? "text-hw-success" : "text-hw-danger"}`}>
                                                    {balance.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-hw-border bg-hw-surface p-5 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-hw-accent-muted flex items-center justify-center">
                            <svg className="w-4 h-4 text-hw-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-hw-text">معلومات الحساب</h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-hw-text-secondary">اسم الحساب</span>
                            <span className="font-mono font-semibold text-hw-text">{session.user.name}</span>
                        </div>
                        {role !== "Member" && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-hw-text-secondary">الرتبة</span>
                                <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                                    role === "Admin"
                                        ? "bg-[var(--hw-role-admin-bg)] text-[var(--hw-role-admin-text)] border-[var(--hw-role-admin-border)]"
                                        : "bg-[var(--hw-role-mod-bg)] text-[var(--hw-role-mod-text)] border-[var(--hw-role-mod-border)]"
                                }`}>{role === "Admin" ? "أدمن" : "مشرف"}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-hw-text-secondary">النوع</span>
                            <span className="font-medium text-hw-text">{session.user.type === "sender" ? "مورد" : "مستورد"}</span>
                        </div>
                    </div>
                </div>

                {activeSession && (
                    <div className="xl:col-span-2">
                        <SessionControl
                            activeSession={{
                                id: activeSession.id,
                                openedAt: (activeSession.openedAt instanceof Date
                                    ? activeSession.openedAt.toISOString()
                                    : new Date(activeSession.openedAt).toISOString()) as unknown as Date,
                                openedByUser: { username: activeSession.openedByUser.username },
                                status: activeSession.status,
                            }}
                            isAdmin={role === "Admin"}
                        />
                    </div>
                )}
            </div>

            <hr className="border-hw-border" />

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
                <div className={role !== "Member" ? "xl:col-span-2 space-y-4" : "xl:col-span-3 space-y-4"}>
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-hw-text-secondary">آخر العمليات</h3>
                    <div className="overflow-y-auto max-h-[420px] rounded-xl border border-hw-border">
                        {role === "Member" ? (
                            <UserTransactionPanel
                                userId={currentUserId}
                                showReversalControl={false}
                            />
                        ) : (
                            <DynamicLedgerTable
                                transactions={recentTransactions}
                                showReversalControl={true}
                            />
                        )}
                    </div>
                </div>

                {role !== "Member" && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-hw-text-secondary">إضافة قيد</h3>
                        <div className="rounded-xl border border-hw-border bg-hw-surface p-6 shadow-sm">
                            <ManualTransactionForm
                                users={activeUsers}
                                allowOpeningBalance={role === "Admin"}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}