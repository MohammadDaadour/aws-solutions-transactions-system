import { auth } from "../../../../auth";
import { redirect } from "next/navigation";
import TransferHistory from "../../../../components/transfers/TransferHistory";

export const metadata = {
  title: "سجل التحويلات | دفتر الحوالات",
  description: "استعرض سجل طلبات التحويل السابقة مع خيارات البحث والتصفية",
};

export default async function TransferHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userType = session.user.type as "sender" | "receiver";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-hw-text">
          سجل التحويلات
        </h1>
        <p className="text-sm text-hw-text-secondary mt-1">
          {userType === "sender"
            ? "جميع طلبات التحويل التي أتممتها"
            : "جميع طلباتك المكتملة والملغاة"}
        </p>
      </div>

      <TransferHistory userType={userType} />
    </div>
  );
}
