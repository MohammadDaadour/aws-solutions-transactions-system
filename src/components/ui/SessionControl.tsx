"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { closeActiveSession } from "../../app/actions/sessions";

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
        <div className="rounded-xl border border-hw-border bg-hw-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                    <h3 className="text-sm font-semibold text-hw-text">الجلسة المحاسبية الحالية</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-hw-accent-muted text-gray-100 uppercase">
                    نشطة
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                    <span className="text-hw-text-secondary block">تاريخ البدء</span>
                    <span className="font-mono font-medium text-hw-text text-sm">{formattedDate}</span>
                </div>
                <div>
                    <span className="text-hw-text-secondary block">بواسطة</span>
                    <span className="font-medium text-hw-text text-sm">{activeSession.openedByUser.username}</span>
                </div>
            </div>

            {isAdmin && (
                <button
                    onClick={handleCloseSession}
                    disabled={loading}
                    className="w-full py-2 px-4 rounded-md font-medium text-sm transition text-white bg-red-800 hover:bg-red-950 disabled:bg-hw-disabled-bg disabled:text-hw-disabled-text"
                >
                    {loading ? "جار إغلاق الجلسة وترحيل الأرصدة..." : "إغلاق الجلسة المحاسبية وترحيل الأرصدة"}
                </button>
            )}
        </div>
    );
}
