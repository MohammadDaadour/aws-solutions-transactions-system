import { auth } from "../../../auth";
import { db } from "../../../lib/db";
import { redirect } from "next/navigation";
import { TransactionType, Currency } from "../../../generated/prisma/client";
import ManualTransactionForm from "../../../components/ManualTransactionForm";
import DynamicLedgerTable from "../../../components/DynamicLedgerTable";
import TransactionFilterBar from "../../../components/TransactionFilterBar";
import PaginationControls from "../../../components/PaginationControls";
import { getPaginatedTransactions } from "../../../lib/queries";

const PAGE_SIZE = 15;

interface SearchParams {
    page?: string;
    userId?: string;
    type?: string;
    currency?: string;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
}

export default async function TransactionsManagementPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const session = await auth();
    if (!session) redirect("/dashboard");

    const { role } = session.user;
    const params = await searchParams;
    const page = Math.max(1, parseInt(params.page ?? "1"));

    const filters = {
        ...(params.userId && { userId: params.userId }),
        ...(Object.values(TransactionType).includes(params.type as TransactionType) && {
            type: params.type as TransactionType,
        }),
        ...(Object.values(Currency).includes(params.currency as Currency) && {
            currency: params.currency as Currency,
        }),
        ...(params.dateFrom && { dateFrom: params.dateFrom }),
        ...(params.dateTo && { dateTo: params.dateTo }),
        ...(params.sessionId && { sessionId: params.sessionId }),
    };

    const [activeUsers, allSessions, { transactions, total, pageCount }] = await Promise.all([
        db.user.findMany({
            where: { isActive: true },
            select: { id: true, username: true },
        }),
        db.session.findMany({
            orderBy: { openedAt: "desc" },
            select: { id: true, openedAt: true, status: true },
        }),
        getPaginatedTransactions(filters, page, PAGE_SIZE),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 border-b border-hw-border pb-5 sm:flex-row sm:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-hw-text">عمليات الدفتر</h2>
                    <p className="text-sm text-hw-text-secondary mt-0.5">
                        تسجيل يدوي، تحقق من القيود، وتصحيحات النظام.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-hw-success-muted border border-hw-success-border text-xs font-semibold text-green-700 self-start">
                    <span className="w-2 h-2 rounded-full bg-hw-success animate-pulse" />
                    <span>وضع المشغل المباشر</span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
                <div className="xl:col-span-2 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                            سجل القيود ({total} إجمالي)
                        </h3>
                    </div>

                    <TransactionFilterBar
                        users={activeUsers}
                        showUserFilter={role !== "Member"}
                        userId={session.user.id}
                        agent={role === "Member"}
                        sessions={role !== "Member" ? allSessions : undefined}
                    />

                    <DynamicLedgerTable
                        transactions={transactions}
                        showReversalControl={role !== "Member"}
                        userRole={role}
                    />

                    <PaginationControls
                        currentPage={page}
                        pageCount={pageCount}
                        total={total}
                        pageSize={PAGE_SIZE}
                    />
                </div>

                {role != "Member" && (
                    <div className="space-y-4 xl:sticky xl:top-6">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-hw-text-secondary">
                            إضافة قيد يدوي
                        </h3>
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
