import { auth } from "../../../../src/auth";
import { db } from "../../../../src/lib/db";
import { broadcastEvent } from "../../../../src/lib/ws-broadcast";
import { TransferCurrency } from "../../../../src/generated/prisma/client";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/transfer-orders — receiver creates a new order
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.type !== "receiver") {
    return Response.json(
      { error: "Only receivers can create transfer orders" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, amount, number, currency } = body as {
    name?: string;
    amount?: number;
    number?: string;
    currency?: string;
  };

  if (!name || !amount || !number || !currency) {
    return Response.json(
      { error: "name, amount, number, and currency are required" },
      { status: 400 }
    );
  }

  // Validate currency is one of the TransferCurrency enum values
  if (!Object.values(TransferCurrency).includes(currency as TransferCurrency)) {
    return Response.json({ error: "Invalid currency" }, { status: 400 });
  }

  const order = await db.transferOrder.create({
    data: {
      name,
      amount,
      number,
      currency: currency as TransferCurrency,
      receiverId: session.user.id,
    },
    include: {
      receiver: { select: { id: true, username: true } },
    },
  });

  // Broadcast to all senders (fire-and-forget — failure is logged, not re-thrown)
  broadcastEvent({
    event: "order:new",
    payload: order,
    rooms: ["senders"],
  });

  return Response.json(order, { status: 201 });
}

// ---------------------------------------------------------------------------
// GET /api/transfer-orders — sender lists all PENDING orders (initial load)
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.type !== "sender") {
    return Response.json(
      { error: "Only senders can list the transfer order queue" },
      { status: 403 }
    );
  }

  const orders = await db.transferOrder.findMany({
    where: { status: "PENDING" },
    include: {
      receiver: { select: { id: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(orders);
}
