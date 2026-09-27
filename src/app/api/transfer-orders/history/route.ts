import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../src/auth";
import { db } from "../../../../../src/lib/db";
import { TransferCurrency, TransferStatus } from "../../../../../src/generated/prisma/client";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/transfer-orders/history — paginated history for sender or receiver
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId, type: userType } = session.user;

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "15")));
  const statusParam = searchParams.get("status") ?? "ALL";
  const currencyParam = searchParams.get("currency") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (userType === "sender") {
    where.senderId = userId;
    where.status = "DONE";
  } else {
    where.receiverId = userId;
    const allowedStatuses: TransferStatus[] =
      statusParam === "DONE"
        ? ["DONE"]
        : statusParam === "CANCELLED"
        ? ["CANCELLED"]
        : ["DONE", "CANCELLED"];
    where.status = { in: allowedStatuses };
  }

  if (currencyParam && Object.values(TransferCurrency).includes(currencyParam as TransferCurrency)) {
    where.currency = currencyParam as TransferCurrency;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { number: { contains: search, mode: "insensitive" } },
    ];
  }

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const [total, orders] = await Promise.all([
    db.transferOrder.count({ where }),
    db.transferOrder.findMany({
      where,
      include: {
        receiver: { select: { id: true, username: true } },
        sender: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}