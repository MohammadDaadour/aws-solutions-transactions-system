import { auth } from "../../../../../../src/auth";
import { db } from "../../../../../../src/lib/db";
import { broadcastEvent } from "../../../../../../src/lib/ws-broadcast";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/transfer-orders/[id]/done — claiming sender marks order as done
//
// Guarded: only the sender who actually claimed the order can mark it done.
// Uses updateMany with senderId = currentUser so another sender can never
// mark someone else's claimed order as done.
// ---------------------------------------------------------------------------
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.type !== "sender") {
    return Response.json(
      { error: "Only senders can mark transfer orders as done" },
      { status: 403 }
    );
  }

  const { id: orderId } = await params;

  // Only the claiming sender can mark their own order done
  const updated = await db.transferOrder.updateMany({
    where: {
      id: orderId,
      status: "TAKEN",
      senderId: session.user.id,
    },
    data: {
      status: "DONE",
      doneAt: new Date(),
      version: { increment: 1 },
    },
  });

  if (updated.count === 0) {
    return Response.json(
      {
        error:
          "Order not found, not in TAKEN state, or you are not the claiming sender",
      },
      { status: 404 }
    );
  }

  const order = await db.transferOrder.findUnique({
    where: { id: orderId },
    include: {
      receiver: { select: { id: true, username: true } },
      sender: { select: { id: true, username: true } },
    },
  });

  if (!order) {
    return Response.json({ ok: true });
  }

  // Only notify the receiver — the order is already gone from the sender queue
  broadcastEvent({
    event: "order:done",
    payload: order,
    rooms: [`receiver:${order.receiverId}`],
  });

  return Response.json(order);
}
