"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { closeActiveSession } from "../app/actions/sessions";

interface SessionControlProps {
    activeSession: {
        id: string;
        openedAt: Date;
        openedByUser: { username: string };
        status: string;
    };
    isAdmin: boolean;
}

export default function SessionControl({ activeSession, isAdmin }: SessionControlProps) {
    const [loading, setLoading] = useState(false);

    async function handleCloseSession() {
        const result = await Swal.fire({
            title: 'إغلاق الجلسة المحاسبية',
            text: 'هل أنت متأكد من رغبتك في إغلاق الجلسة الحالية؟ سيتم ترحيل وتجميد جميع أرصدة الحسابات لهذه الفترة وبدء فترة محاسبية جديدة.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، إغلاق الجلسة',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#dc2626', // Red
            cancelButtonColor: '#1e293b',
            input: 'text',
            inputPlaceholder: 'أضف ملاحظات اختيارية للجلسة...',
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        const notes = result.value || "";
        const response = await closeActiveSession(notes);
        setLoading(false);

        if (response.success) {
            await Swal.fire({
                title: 'تم بنجاح',
                text: 'تم إغلاق الجلسة وترحيل الأرصدة بنجاح وبدء جلسة جديدة.',
                icon: 'success',
                confirmButtonText: 'موافق'
            });
        } else {
            await Swal.fire({
                title: 'خطأ',
                text: `فشل إغلاق الجلسة: ${response.error}`,
                icon: 'error',
                confirmButtonText: 'موافق'
            });
        }
    }

    const formattedDate = new Date(activeSession.openedAt).toLocaleString('en-US', {
        dateStyle: "medium",
        timeStyle: "short",
    });

    return (
        <div className="rounded-xl border border-hw-border bg-hw-surface p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-hw-success animate-pulse" />
                    <h3 className="text-sm font-semibold text-hw-text">الجلسة المحاسبية الحالية</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-hw-success-muted text-green-700 border border-hw-success-border">
                    نشطة
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-hw-bg rounded-lg p-3">
                <div>
                    <span className="text-xs text-hw-text-secondary block mb-0.5">تاريخ البدء</span>
                    <span className="font-mono font-semibold text-hw-text text-sm">{formattedDate}</span>
                </div>
                <div>
                    <span className="text-xs text-hw-text-secondary block mb-0.5">بواسطة</span>
                    <span className="font-semibold text-hw-text text-sm">{activeSession.openedByUser.username}</span>
                </div>
            </div>

            {isAdmin && (
                <button
                    onClick={handleCloseSession}
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-500/20 disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text disabled:shadow-none disabled:cursor-not-allowed"
                >
                    {loading ? "جار إغلاق الجلسة وترحيل الأرصدة..." : "إغلاق الجلسة المحاسبية وترحيل الأرصدة"}
                </button>
            )}
        </div>
    );
}
