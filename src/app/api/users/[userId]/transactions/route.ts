import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { getPaginatedTransactions } from "../../../../../lib/queries";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Security check: Only Admins and Moderators can see other users' transactions
    if (session.user.role !== "Admin" && session.user.role !== "Mod" && session.user.id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "10");
    const search = searchParams.get("search") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    try {
        const result = await getPaginatedTransactions(
            {
                userId,
                sessionId: "ALL", // Special flag we added to fetch across all sessions
                search,
                dateFrom,
                dateTo,
            },
            page,
            pageSize
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Failed to fetch user transactions:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
