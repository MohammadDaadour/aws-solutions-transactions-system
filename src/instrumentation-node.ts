import cron from "node-cron";
import { db } from "./lib/db";

// Daily at 02:00 server time: permanently purge DeletedTransaction rows whose
// purge_at deadline has passed or whose session has closed.
cron.schedule("0 2 * * *", async () => {
    try {
        const closedSessions = await db.session.findMany({
            where: { status: "CLOSED" },
            select: { id: true },
        });
        const closedSessionIds = closedSessions.map((s) => s.id);

        const result = await db.deletedTransaction.deleteMany({
            where: {
                OR: [
                    { purgeAt: { lte: new Date() } },
                    ...(closedSessionIds.length > 0 ? [{ sessionId: { in: closedSessionIds } }] : []),
                ],
            },
        });
        console.log(`[RecycleBin Cron] Purged ${result.count} expired/closed-session transaction(s).`);
    } catch (err) {
        console.error("[RecycleBin Cron] Purge failed:", err);
    }
});

console.log("[RecycleBin Cron] Scheduled daily purge at 02:00.");
