import { Prisma, TransactionType, Currency } from "../generated/prisma/client";
import type { PrismaClient } from "../generated/prisma/client";

type TransactionClient = Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Applies the balance effect of a credit or debit transaction.
 * opening_balance is intentionally excluded — callers must reject
 * opening_balance rows at the API level before reaching these helpers.
 *
 * Uses increment/decrement (not read-modify-write) for atomicity.
 */
export async function applyTransactionDelta(
    tx: TransactionClient,
    userId: string,
    sessionId: string,
    currency: Currency,
    type: TransactionType,
    amount: Prisma.Decimal
) {
    if (type === TransactionType.opening_balance) {
        throw new Error("applyTransactionDelta: opening_balance is not supported.");
    }

    // credit adds, debit subtracts
    const delta = type === TransactionType.credit ? amount : amount.neg();

    await tx.userBalance.upsert({
        where: { sessionId_userId_currency: { sessionId, userId, currency } },
        update: { balance: { increment: delta } },
        create: { sessionId, userId, currency, balance: delta },
    });
}

/**
 * Reverses the balance effect of a credit or debit transaction.
 * Equivalent to applying the inverse type.
 */
export async function reverseTransactionDelta(
    tx: TransactionClient,
    userId: string,
    sessionId: string,
    currency: Currency,
    type: TransactionType,
    amount: Prisma.Decimal
) {
    if (type === TransactionType.opening_balance) {
        throw new Error("reverseTransactionDelta: opening_balance is not supported.");
    }

    // Reverse: credit -> subtract, debit -> add
    const delta = type === TransactionType.credit ? amount.neg() : amount;

    await tx.userBalance.update({
        where: { sessionId_userId_currency: { sessionId, userId, currency } },
        data: { balance: { increment: delta } },
    });
}
