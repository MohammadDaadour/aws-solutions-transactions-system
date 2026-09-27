import { auth, signOut } from "../../auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardSidebar from "../../components/DashboardSideBar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session) redirect("/login");

    const { username, role } = session.user;

    return (
        <div className="flex min-h-screen bg-hw-bg text-hw-text antialiased">
            <DashboardSidebar
                username={username}
                role={role}
            />
            {/* Main App Window Content */}
            <main className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}