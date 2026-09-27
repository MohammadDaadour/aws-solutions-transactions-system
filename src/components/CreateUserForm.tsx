"use client"

import { useState, useTransition } from "react";
import { createUser } from "../app/actions/users";
import { Role, UserType } from "../generated/prisma/enums";

type FormState =
    | { status: "idle" }
    | { status: "success"; username: string }
    | { status: "error"; message: string };

export default function CreateUserForm() {
    const [isPending, startTransition] = useTransition();
    const [formState, setFormState] = useState<FormState>({ status: "idle" });

    const [fields, setFields] = useState({
        username: "",
        password: "",
        confirmPassword: "",
        role: Role.Member as Role,
        type: UserType.receiver as UserType,
        phone: "",
    });

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) {
        setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setFormState({ status: "idle" });
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (fields.password !== fields.confirmPassword) {
            setFormState({ status: "error", message: "Passwords do not match." });
            return;
        }

        startTransition(async () => {
            const result = await createUser({
                username: fields.username,
                password: fields.password,
                role: fields.role,
                type: fields.type,
                phone: fields.phone,
            });

            if (result.success) {
                setFormState({ status: "success", username: result.data!.username });
                setFields({
                    username: "",
                    password: "",
                    confirmPassword: "",
                    role: Role.Member,
                    type: UserType.receiver,
                    phone: "",
                });
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

            {/* Username */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                    اسم الحساب
                </label>
                <input
                    id="new-user-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. أحمد - 123"
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
                    id="new-user-phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+20 100 000 0000"
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
                            id="new-user-role"
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
                            id="new-user-type"
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

            {/* Password */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                    كلمة المرور
                </label>
                <input
                    id="new-user-password"
                    name="password"
                    type="password"
                    required
                    placeholder="على الأقل 6 أحرف"
                    value={fields.password}
                    onChange={handleChange}
                    className={inputCls}
                />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-hw-text-secondary">
                    تأكيد كلمة المرور
                </label>
                <input
                    id="new-user-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    placeholder="تأكد من كتابة نفس كلمة المرور"
                    value={fields.confirmPassword}
                    onChange={handleChange}
                    className={inputCls}
                />
            </div>

            {/* Feedback */}
            {formState.status === "error" && (
                <div className="rounded-lg bg-hw-danger-bg border border-hw-danger-border px-4 py-3 text-sm text-hw-danger">
                    {formState.message}
                </div>
            )}
            {formState.status === "success" && (
                <div className="rounded-lg bg-hw-accent-muted/40 border border-hw-accent-muted px-4 py-3 text-sm text-hw-accent">
                    ✓ تم إنشاء الحساب <span className="font-mono font-bold">{formState.username}</span> بنجاح.
                </div>
            )}

            {/* Submit */}
            <button
                id="new-user-submit"
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg bg-hw-accent-solid hover:bg-hw-accent-solid-hover disabled:bg-hw-accent-solid/30 disabled:text-hw-accent-solid/50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
                {isPending ? "إنشاء الحساب…" : "أنشئ الحساب"}
            </button>
        </form>
    );
}
