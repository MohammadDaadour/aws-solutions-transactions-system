"use client";

import { useState } from "react";
import { loginAction } from "../app/actions/login";

export default function LoginForm() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const result = await loginAction(formData);

        if (result?.error) {
            setError(result.error);
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-hw-bg flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Brand mark */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-hw-accent shadow-lg shadow-blue-500/25 mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-hw-text">الموزع</h1>
                    <p className="text-sm text-hw-text-secondary mt-1">سجّل دخولك للمتابعة</p>
                </div>

                {/* Card */}
                <div className="bg-hw-surface rounded-2xl border border-hw-border shadow-sm shadow-slate-200/80 p-7">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="block text-xs font-semibold text-hw-text-secondary mb-1.5 uppercase tracking-wide">
                                اسم الحساب
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                placeholder="e.g., mohammad"
                                className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-3 text-sm text-hw-text placeholder-hw-text-muted focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all font-mono"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-semibold text-hw-text-secondary mb-1.5 uppercase tracking-wide">
                                كلمة المرور
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                placeholder="••••••••"
                                className="w-full bg-hw-bg border border-hw-border rounded-xl px-4 py-3 text-sm text-hw-text placeholder-hw-text-muted focus:border-hw-accent focus:ring-2 focus:ring-hw-accent/20 focus:outline-none transition-all font-mono"
                            />
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="rounded-xl border border-hw-danger-border bg-hw-danger-muted px-4 py-3 text-sm font-medium text-hw-danger flex items-start gap-2">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 rounded-xl bg-hw-accent text-white text-sm font-semibold shadow-sm shadow-blue-500/30 hover:bg-hw-accent-hover focus:ring-2 focus:ring-hw-accent/40 focus:outline-none transition-all disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text disabled:shadow-none disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    جارٍ تسجيل الدخول...
                                </span>
                            ) : (
                                "تسجيل الدخول"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}