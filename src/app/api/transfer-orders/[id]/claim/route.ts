import { auth } from "../../../../../../src/auth";
import { db } from "../../../../../../src/lib/db";
import { broadcastEvent } from "../../../../../../src/lib/ws-broadcast";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/transfer-orders/[id]/claim — sender atomically claims an order
//
// RACE-CONDITION SAFETY: uses a single conditional updateMany that only
// matches rows where status=PENDING AND senderId=null. PostgreSQL's row-level
// locking ensures only one concurrent request wins. The loser gets count=0
// and receives a 409 — no silent failure, no double-claim.
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
      { error: "Only senders can claim transfer orders" },
      { status: 403 }
    );
  }

  const { id: orderId } = await params;

  // Single atomic conditional update — the heart of the race-condition safety
  const claimed = await db.transferOrder.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
      senderId: null,
    },
    data: {
      status: "TAKEN",
      senderId: session.user.id,
      takenAt: new Date(),
      version: { increment: 1 },
    },
  });

  if (claimed.count === 0) {
    // Either doesn't exist, already TAKEN, or cancelled — caller lost the race
    return Response.json(
      { error: "Order is no longer available" },
      { status: 409 }
    );
  }

  // Fetch the updated order to broadcast its full shape
  const order = await db.transferOrder.findUnique({
    where: { id: orderId },
    include: {
      receiver: { select: { id: true, username: true } },
      sender: { select: { id: true, username: true } },
    },
  });

  if (!order) {
    // Extremely unlikely: claimed but then vanished — treat as success to the caller
    return Response.json({ ok: true });
  }

  // Broadcast order:taken to:
  //   - "senders" room: remove the order from every sender's queue
  //   - "receiver:{receiverId}": update the receiver's status badge
  broadcastEvent({
    event: "order:taken",
    payload: order,
    rooms: ["senders", `receiver:${order.receiverId}`],
  });

  return Response.json(order);
}
