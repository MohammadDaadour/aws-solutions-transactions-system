import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import SenderQueue from "../../../components/transfers/SenderQueue";
import ReceiverTracker from "../../../components/transfers/ReceiverTracker";
import SenderClaimedOrders from "../../../components/transfers/SenderClaimedOrders";

export const metadata = {
  title: "التحويلات | دفتر الحوالات",
  description: "إدارة طلبات التحويل في الوقت الفعلي",
};

export default async function TransfersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { type, id: userId } = session.user;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-hw-text">
          {type === "sender" ? "قائمة طلبات التحويل" : "إدارة طلبات التحويل"}
        </h1>
        <p className="text-sm text-hw-text-secondary mt-1">
          {type === "sender"
            ? "احجز الطلبات المتاحة وأتممها — تتحدث القائمة تلقائيًا"
            : "أرسل طلبات التحويل وتابع حالتها مباشرة"}
        </p>
      </div>

      {type === "sender" ? (
        <div className="flex flex-col gap-8">
          <SenderQueue />
          <SenderClaimedOrders />
        </div>
      ) : (
        <ReceiverTracker userId={userId} />
      )}
    </div>
  );
}
