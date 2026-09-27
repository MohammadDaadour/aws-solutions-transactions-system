import { auth } from "../../../../../src/auth";
import { db } from "../../../../../src/lib/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/transfer-orders/mine — receiver lists their own orders
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.type !== "receiver") {
    return Response.json(
      { error: "Only receivers can view their own orders" },
      { status: 403 }
    );
  }

  const orders = await db.transferOrder.findMany({
    where: { receiverId: session.user.id },
    include: {
      sender: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}
