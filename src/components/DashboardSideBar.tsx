"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "../app/actions/logout";
import { usePathname } from "next/navigation";
import {
    FaRegTrashCan,
    FaHouse,
    FaBook,
    FaArrowRightArrowLeft,
    FaClockRotateLeft,
    FaUsers,
    FaCalendarDays,
    FaRightFromBracket,
} from "react-icons/fa6";

type Props = {
    username: string;
    role: string;
};

export default function DashboardSidebar({ username, role }: Props) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    const isActive = (href: string) => pathname === href;

    const linkClass = (href: string) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            isActive(href)
                ? "bg-hw-sidebar-active text-white shadow-sm"
                : "text-hw-sidebar-text hover:bg-hw-sidebar-hover hover:text-white"
        }`;

    return (
        <>
            {/* Mobile hamburger (Moved to top-right for RTL) */}
            <button
                onClick={() => setOpen(!open)}
                className="md:hidden fixed top-4 right-4 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-hw-sidebar text-white shadow-lg"
                aria-label="فتح القائمة"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile overlay */}
            {open && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Spacer to hold 64px width in flex layout */}
            <div className="hidden md:block w-64 shrink-0" aria-hidden="true" />
            
            <aside
                className={`
                    fixed top-0 right-0
                    h-screen w-64
                    bg-hw-sidebar
                    flex flex-col
                    z-50
                    transition-transform duration-300 ease-in-out
                    ${open ? "translate-x-0" : "translate-x-full md:translate-x-0"}
                `}
            >
                {/* Brand */}
                <div className="px-6 py-6 border-b border-hw-sidebar-border">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                            <FaArrowRightArrowLeft className="text-white text-xs" />
                        </div>
                        <h1 className="text-base font-bold tracking-tight text-white">
                           الموزع
                        </h1>
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-hw-sidebar-text truncate max-w-[140px]">
                            {username}
                        </p>
                        {role !== "Member" && (
                            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                                role === "Admin"
                                    ? "bg-violet-900/50 text-violet-300 border-violet-700/50"
                                    : "bg-sky-900/50 text-sky-300 border-sky-700/50"
                            }`}>
                                {role === "Admin" ? "أدمن" : "مشرف"}
                            </span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-hw-sidebar-text/60">
                        القائمة الرئيسية
                    </p>

                    <Link
                        href="/dashboard"
                        className={linkClass("/dashboard")}
                        onClick={() => setOpen(false)}
                    >
                        <FaHouse className="w-4 h-4 shrink-0" />
                        <span>نظرة عامة</span>
                        {isActive("/dashboard") && (
                            <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                    </Link>

                    <Link
                        href="/dashboard/transactions"
                        className={linkClass("/dashboard/transactions")}
                        onClick={() => setOpen(false)}
                    >
                        <FaBook className="w-4 h-4 shrink-0" />
                        <span>إدارة الدفتر</span>
                        {isActive("/dashboard/transactions") && (
                            <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                    </Link>

                    <Link
                        href="/dashboard/transfers"
                        className={linkClass("/dashboard/transfers")}
                        onClick={() => setOpen(false)}
                    >
                        <FaArrowRightArrowLeft className="w-4 h-4 shrink-0" />
                        <span>التحويلات</span>
                        {isActive("/dashboard/transfers") && (
                            <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                    </Link>

                    <Link
                        href="/dashboard/transfers/history"
                        className={linkClass("/dashboard/transfers/history")}
                        onClick={() => setOpen(false)}
                    >
                        <FaClockRotateLeft className="w-4 h-4 shrink-0" />
                        <span>سجل التحويلات</span>
                        {isActive("/dashboard/transfers/history") && (
                            <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                        )}
                    </Link>

                    {role === "Admin" && (
                        <Link
                            href="/dashboard/sessions"
                            className={linkClass("/dashboard/sessions")}
                            onClick={() => setOpen(false)}
                        >
                            <FaCalendarDays className="w-4 h-4 shrink-0" />
                            <span>سجل الجلسات</span>
                            {isActive("/dashboard/sessions") && (
                                <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                            )}
                        </Link>
                    )}

                    {role !== "Member" && (
                        <Link
                            href="/dashboard/users"
                            className={linkClass("/dashboard/users")}
                            onClick={() => setOpen(false)}
                        >
                            <FaUsers className="w-4 h-4 shrink-0" />
                            <span>إدارة الحسابات</span>
                            {isActive("/dashboard/users") && (
                                <span className="mr-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                            )}
                        </Link>
                    )}
                </nav>

                {/* Footer */}
                <div className="px-3 py-4 border-t border-hw-sidebar-border space-y-1">
                    {role !== "Member" && (
                        <Link
                            href="/dashboard/transactions/recycle-bin"
                            className={`${linkClass("/dashboard/transactions/recycle-bin")} text-amber-400/80 hover:text-amber-300`}
                            onClick={() => setOpen(false)}
                        >
                            <FaRegTrashCan className="w-4 h-4 shrink-0" />
                            <span>سلة المحذوفات</span>
                        </Link>
                    )}

                    <form
                        action={async () => {
                            await logoutAction();
                        }}
                    >
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400/80 hover:bg-red-900/30 hover:text-red-300 transition-all duration-150"
                        >
                            <FaRightFromBracket className="w-4 h-4 shrink-0" />
                            <span>تسجيل الخروج</span>
                        </button>
                    </form>
                </div>
            </aside>
        </>
    );
}