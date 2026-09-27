"use client"

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUser, deleteUser, resetUserBalances } from "../app/actions/users";
import { Role, UserType } from "../generated/prisma/enums";

interface UpdateUserFormProps {
    user: {
        id: string;
        username: string;
        role: Role;
        type: UserType;
        phone: string;
        isActive: boolean;
    };
    viewerRole: Role;
    onSuccess?: () => void;
    hideUpdateFields?: boolean;
}

type FormState =
    | { status: "idle" }
    | { status: "success"; username: string }
    | { status: "error"; message: string };

export default function UpdateUserForm({ user, viewerRole, onSuccess, hideUpdateFields }: UpdateUserFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isResetting, startResetTransition] = useTransition();
    
    const [formState, setFormState] = useState<FormState>({ status: "idle" });

    const [fields, setFields] = useState({
        username: user.username,
        password: "",
        confirmPassword: "",
        role: user.role,
        type: user.type,
        phone: user.phone,
        // isActive: user.isActive,
    });

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        const { name, value, type } = e.target;
        setFields((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
        setFormState({ status: "idle" });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (fields.password && fields.password !== fields.confirmPassword) {
            setFormState({ status: "error", message: "كلمتا المرور غير متطابقتين." });
            return;
        }

        startTransition(async () => {
            const result = await updateUser({
                userId: user.id,
                username: fields.username,
                ...(fields.password ? { password: fields.password } : {}),
                role: fields.role,
                type: fields.type,
                phone: fields.phone,
                // isActive: fields.isActive,
            });

            if (result.success) {
                setFormState({ status: "success", username: result.data!.username });
                setFields((prev) => ({ ...prev, password: "", confirmPassword: "" }));
                router.refresh();
                onSuccess?.();
            } else {
                setFormState({ status: "error", message: result.error! });
            }
        });
    }

    function handleDelete() {
        if (!confirm("هل أنت متأكد من رغبتك في حذف هذا الحساب؟ إذا كان لديه معاملات سابقة، سيتم تعطيله فقط بدلاً من حذفه نهائياً.")) return;
        
        startDeleteTransition(async () => {
            const result = await deleteUser(user.id);
            if (result.success) {
                alert(result.message);
                router.refresh();
                onSuccess?.();
            } else {
                setFormState({ status: "error", message: result.error! });
            }
        });
    }

    function handleResetBalance() {
        if (!confirm("هل أنت متأكد من رغبتك في تصفير جميع أرصدة هذا الحساب؟ سيتم إنشاء معاملات تصفير لجميع العملات التي تحتوي على رصيد.")) return;

        startResetTransition(async () => {
            const result = await resetUserBalances(user.id);
            if (result.success) {
                alert(result.message);
                router.refresh();
                onSuccess?.();
            } else {
                setFormState({ status: "error", message: result.error! });
            }
        });
    }

    const inputCls =
        "w-full rounded-lg bg-hw-bg/60 border border-hw-border-subtle px-3 py-2 text-sm text-hw-text placeholder:text-hw-text-muted focus:outline-none focus:ring-2 focus:ring-hw-accent-ring focus:border-hw-accent transition";

    const selectCls =
        "w-full rounded-lg bg-hw-bg/60 border border-hw-border-subtle px-3 py-2 text-sm text-hw-text focus:outline-none focus:ring-2 focus:ring-hw-accent-ring focus:border-hw-accent transition appearance-none";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {!hideUpdateFields && (
                <>
                    {/* Username */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                            اسم الحساب
                        </label>
                        <input
                            name="username"
                            type="text"
                            required
                            autoComplete="off"
                            value={fields.username}
                            onChange={handleChange}
                            className={inputCls}
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                            رقم الهاتف
                        </label>
                        <input
                            name="phone"
                            type="tel"
                            required
                            value={fields.phone}
                            onChange={handleChange}
                            className={inputCls}
                        />
                    </div>

                    {/* Role + Type row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                                الرتبة
                            </label>
                            <div className="relative">
                                <select
                                    name="role"
                                    value={fields.role}
                                    onChange={handleChange}
                                    className={selectCls}
                                >
                                    <option value={Role.Member}>موزع</option>
                                    <option value={Role.Mod}>مدير</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-hw-text-secondary text-xs">▾</span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                                نوع الحساب
                            </label>
                            <div className="relative">
                                <select
                                    name="type"
                                    value={fields.type}
                                    onChange={handleChange}
                                    className={selectCls}
                                >
                                    <option value={UserType.receiver}>مستورد</option>
                                    <option value={UserType.sender}>مورد</option>
                                </select>
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-hw-text-secondary text-xs">▾</span>
                            </div>
                        </div>
                    </div>

                    {/* New Password (optional) */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                            كلمة مرور جديدة <span className="normal-case font-normal text-hw-text-muted">(اختياري)</span>
                        </label>
                        <input
                            name="password"
                            type="password"
                            placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                            value={fields.password}
                            onChange={handleChange}
                            className={inputCls}
                        />
                    </div>

                    {/* Confirm Password */}
                    {fields.password && (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                                تأكيد كلمة المرور
                            </label>
                            <input
                                name="confirmPassword"
                                type="password"
                                placeholder="تأكد من كتابة نفس كلمة المرور"
                                value={fields.confirmPassword}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Feedback */}
            {formState.status === "error" && (
                <div className="rounded-lg bg-hw-danger-bg border border-hw-danger-border px-4 py-3 text-sm text-hw-danger">
                    {formState.message}
                </div>
            )}
            {!hideUpdateFields && formState.status === "success" && (
                <div className="rounded-lg bg-hw-accent-muted/40 border border-hw-accent-muted px-4 py-3 text-sm text-hw-accent">
                    ✓ تم تحديث الحساب <span className="font-mono font-bold">{formState.username}</span> بنجاح.
                </div>
            )}

            {!hideUpdateFields && (
                <button
                    type="submit"
                    disabled={isPending || isDeleting || isResetting}
                    className="w-full rounded-lg bg-hw-accent-solid hover:bg-hw-accent-solid-hover disabled:bg-hw-accent-solid/30 disabled:text-hw-accent-solid/50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                    {isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
                </button>
            )}

            {/* Admin Danger Zone */}
            <div className={`${!hideUpdateFields ? 'border-t border-hw-border-subtle pt-4 mt-6' : ''} space-y-3`}>
                <div className="flex gap-3">
                    <button
                        type="button"
                        disabled={isResetting || isPending || isDeleting}
                        onClick={handleResetBalance}
                        className="flex-1 rounded-lg bg-orange-800 hover:bg-orange-600/20 border border-orange-600/30 text-white hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm font-semibold transition-colors"
                    >
                        {isResetting ? "جارٍ التصفير..." : "تصفير الرصيد الكلي"}
                    </button>
                    
                    {viewerRole === "Admin" && (
                        <button
                            type="button"
                            disabled={isDeleting || isPending || isResetting}
                            onClick={handleDelete}
                            className="flex-1 rounded-lg bg-red-800 hover:bg-red-600/20 border border-red-600/30 text-white hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-sm font-semibold transition-colors"
                        >
                            {isDeleting ? "جارٍ الحذف..." : "حذف / تعطيل الحساب"}
                        </button>
                    )}
                </div>
            </div>
        </form>
    );
}
