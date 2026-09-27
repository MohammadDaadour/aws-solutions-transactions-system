"use server"

import { auth } from "../../auth";
import { db } from "../../lib/db";
import { Prisma, Role, UserType } from "../../generated/prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export interface CreateUserInput {
    username: string;
    password: string;
    role: Role;
    type: UserType;
    phone: string;
}

export async function createUser(input: CreateUserInput) {
    // 1. Auth gate — only Admins may provision new accounts
    const session = await auth();
    if (!session || session.user?.role !== "Admin") {
        return { success: false, error: "Unauthorized: Only Admins can create accounts." };
    }

    const { username, password, role, type, phone } = input;

    // 2. Basic validation
    if (!username || username.trim().length < 3) {
        return { success: false, error: "Username must be at least 3 characters." };
    }
    if (!password || password.length < 6) {
        return { success: false, error: "Password must be at least 6 characters." };
    }
    if (!phone || phone.trim().length < 5) {
        return { success: false, error: "A valid phone number is required." };
    }
    if (role === Role.Admin) {
        return { success: false, error: "Cannot assign Admin role." };
    }

    try {
        // 3. Ensure username is not already taken
        const existing = await db.user.findUnique({ where: { username: username.trim() } });
        if (existing) {
            return { success: false, error: `Username "${username.trim()}" is already taken.` };
        }

        // 4. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Create user
        const newUser = await db.user.create({
            data: {
                username: username.trim(),
                password: hashedPassword,
                role,
                type,
                phone: phone.trim(),
            },
        });

        // 6. Write to audit trail
        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "CREATE_USER",
                tableName: "users",
                recordId: newUser.id,
                newValue: {
                    username: newUser.username,
                    role: newUser.role,
                    type: newUser.type,
                } as any,
            },
        });

        revalidatePath("/dashboard/users");
        revalidatePath("/dashboard");

        return { success: true, data: { id: newUser.id, username: newUser.username } };

    } catch (error) {
        console.error("Create user failed:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}


export interface UpdateUserInput {
    userId: string;
    username?: string;
    password?: string;
    role?: Role;
    type?: UserType;
    phone?: string;
}


export async function updateUser(input: UpdateUserInput) {

   const session = await auth();
    if (!session || (session.user?.role !== "Admin" && session.user?.role !== "Mod")) {
        return { success: false, error: "Unauthorized: Only Admins and Moderators can update accounts." };
    }

    const { userId, username, password, role, type, phone } = input;

     try {
        const existing = await db.user.findUnique({ where: { id: userId } });
        if (!existing)
            return { success: false, error: "User not found." };

        // Prevent modifying Admin accounts by non-admins
        if (existing.role === Role.Admin && session.user.role !== "Admin")
            return { success: false, error: "Cannot modify an Admin account." };

        // Prevent demoting/modifying other admins (for Admin user themselves)
        if (existing.role === Role.Admin && session.user.id !== userId)
            return { success: false, error: "Cannot modify another Admin account." };

        // Prevent non-admins from assigning Admin role
        if (role === Role.Admin && session.user.role !== "Admin")
            return { success: false, error: "Cannot assign Admin role." };

        // Check username uniqueness if changing it
        if (username && username.trim() !== existing.username) {
            const taken = await db.user.findUnique({ where: { username: username.trim() } });
            if (taken)
                return { success: false, error: `Username "${username.trim()}" is already taken.` };
        }

        // Build update payload — only include fields that were passed
        const updateData: Prisma.UserUpdateInput = {};
        if (username !== undefined) updateData.username = username.trim();
        if (password !== undefined) updateData.password = await bcrypt.hash(password, 10);
        if (role !== undefined) updateData.role = role;
        if (type !== undefined) updateData.type = type;
        if (phone !== undefined) updateData.phone = phone.trim();
        // if (isActive !== undefined) updateData.isActive = isActive;

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: updateData,
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                action: "UPDATE_USER",
                tableName: "users",
                recordId: userId,
                oldValue: {
                    username: existing.username,
                    role: existing.role,
                    type: existing.type,
                    phone: existing.phone,
                    isActive: existing.isActive,
                } as Prisma.InputJsonValue,
                newValue: {
                    username: updatedUser.username,
                    role: updatedUser.role,
                    type: updatedUser.type,
                    phone: updatedUser.phone,
                    isActive: updatedUser.isActive,
                } as Prisma.InputJsonValue,
            },
        });

        revalidatePath("/dashboard/users");
        revalidatePath(`/dashboard/users/${userId}`);
        revalidatePath("/dashboard");

        return { success: true, data: { id: updatedUser.id, username: updatedUser.username } };

    } catch (error) {
        console.error("Update user failed:", error);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}

// Internal helper: zeros out all balances for a user within an open session.
// Returns { success: true } or { success: false, error: string }
async function _resetBalancesCore(userId: string, adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
        await db.$transaction(async (tx) => {
            const activeSession = await tx.session.findFirst({ where: { status: "OPEN" } });
            if (!activeSession) throw new Error("لا توجد جلسة مفتوحة لإنشاء معاملات التصفير.");

            const totalBalancesRaw = await tx.userBalance.groupBy({
                by: ["currency"],
                where: { userId },
                _sum: { balance: true }
            });

            for (const tb of totalBalancesRaw) {
                const amount = tb._sum.balance;
                if (!amount) continue;
                const balanceVal = amount.toNumber();
                if (balanceVal === 0) continue;

                const currency = tb.currency;
                let type: "debit" | "credit" = "debit";
                let adjustAmount = balanceVal;
                if (balanceVal < 0) { type = "credit"; adjustAmount = -balanceVal; }

                const transaction = await tx.transaction.create({
                    data: {
                        userId, type,
                        amount: new Prisma.Decimal(adjustAmount),
                        currency,
                        date: new Date(),
                        notes: "تصفير حساب (إعادة ضبط الرصيد)",
                        createdBy: adminId,
                        sessionId: activeSession.id,
                    }
                });

                const currentBalanceRow = await tx.userBalance.upsert({
                    where: { sessionId_userId_currency: { sessionId: activeSession.id, userId, currency } },
                    update: {},
                    create: { sessionId: activeSession.id, userId, currency, balance: new Prisma.Decimal(0) }
                });

                const oldBalance = currentBalanceRow.balance;
                const newBalance = type === "debit" ? oldBalance.sub(adjustAmount) : oldBalance.add(adjustAmount);

                await tx.userBalance.update({
                    where: { sessionId_userId_currency: { sessionId: activeSession.id, userId, currency } },
                    data: { balance: newBalance }
                });

                await tx.auditLog.create({
                    data: {
                        userId: adminId,
                        action: `RESET_BALANCE_${currency}`,
                        tableName: "user_balances",
                        recordId: userId,
                        oldValue: { previousTotalBalance: balanceVal } as any,
                        newValue: { transactionId: transaction.id, amountAdjusted: adjustAmount, type } as any,
                    },
                });
            }
        });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "خطأ أثناء تصفير الرصيد." };
    }
}

export async function deleteUser(userId: string) {
    const session = await auth();
    if (!session || session.user?.role !== "Admin") {
        return { success: false, error: "Unauthorized: Only Admins can delete accounts." };
    }

    try {
        const existing = await db.user.findUnique({ where: { id: userId } });
        if (!existing) return { success: false, error: "User not found." };
        if (existing.role === "Admin" && session.user.id !== userId) {
            return { success: false, error: "Cannot delete another Admin account." };
        }
        if (session.user.id === userId) {
            return { success: false, error: "Cannot delete your own account." };
        }

        const txCount = await db.transaction.count({ where: { userId } });

        if (txCount > 0) {
            // Auto-reset balances before deactivating
            const resetResult = await _resetBalancesCore(userId, session.user.id);
            if (!resetResult.success) {
                return { success: false, error: `فشل تصفير الرصيد: ${resetResult.error}` };
            }

            // Soft delete because transactions exist
            await db.user.update({
                where: { id: userId },
                data: { isActive: false }
            });
            await db.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "DEACTIVATE_USER",
                    tableName: "users",
                    recordId: userId,
                    oldValue: { isActive: existing.isActive } as any,
                    newValue: { isActive: false } as any,
                }
            });
            revalidatePath("/dashboard/users");
            revalidatePath("/dashboard");
            return { success: true, message: "تم تصفير الرصيد وتعطيل الحساب بنجاح." };
        } else {
            // Hard delete safely
            await db.user.delete({ where: { id: userId } });
            await db.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "DELETE_USER",
                    tableName: "users",
                    recordId: userId,
                    oldValue: { username: existing.username } as any,
                }
            });
            revalidatePath("/dashboard/users");
            revalidatePath("/dashboard");
            return { success: true, message: "تم حذف الحساب نهائياً بنجاح." };
        }
    } catch (error) {
        console.error("Delete user failed:", error);
        return { success: false, error: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." };
    }
}


export async function resetUserBalances(userId: string) {
    const session = await auth();
    if (!session || (session.user?.role !== "Admin" && session.user?.role !== "Mod")) {
        return { success: false, error: "Unauthorized: Only Admins and Moderators can reset balances." };
    }

    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (targetUser?.role === Role.Admin && session.user?.role !== "Admin") {
        return { success: false, error: "Unauthorized: Cannot reset Admin balances." };
    }

    const result = await _resetBalancesCore(userId, session.user.id);

    if (!result.success) {
        return { success: false, error: result.error };
    }

    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${userId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/transactions");

    return { success: true, message: "تم تصفير الحساب بنجاح." };
}