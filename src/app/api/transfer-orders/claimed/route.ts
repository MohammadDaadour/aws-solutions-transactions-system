import { auth } from "../../../../../src/auth";
import { db } from "../../../../../src/lib/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/transfer-orders/claimed — sender lists their own TAKEN orders
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.type !== "sender") {
    return Response.json(
      { error: "Only senders can view claimed orders" },
      { status: 403 }
    );
  }

  const orders = await db.transferOrder.findMany({
    where: {
      status: "TAKEN",
      senderId: session.user.id,
    },
    include: {
      receiver: { select: { id: true, username: true } },
    },
    orderBy: { takenAt: "desc" },
  });

  return Response.json(orders);
}
