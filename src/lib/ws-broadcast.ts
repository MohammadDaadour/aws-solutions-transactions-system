/**
 * ws-broadcast.ts
 *
 * Fire-and-forget helper that POSTs to the standalone WS server's /broadcast
 * endpoint after each successful DB write. Uses a shared internal secret so the
 * endpoint cannot be called from a browser.
 *
 * On failure: logs a structured error line (visible in any JSON log aggregator)
 * but does NOT throw — callers should not fail a user request because of a WS
 * relay failure. The SenderQueue component also polls every 30 s as a backstop.
 */

const WS_SERVER_URL = process.env.WS_SERVER_URL;
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET;

interface BroadcastPayload {
  event: string;
  payload: unknown;
  /** Socket.IO room names to emit to (e.g. ["senders", "receiver:abc123"]) */
  rooms: string[];
}

/**
 * Emit an event to one or more Socket.IO rooms via the WS server.
 * Safe to call without await — failure is logged but never re-thrown.
 */
export async function broadcastEvent(opts: BroadcastPayload): Promise<void> {
  if (!WS_SERVER_URL || !WS_INTERNAL_SECRET) {
    // Structured warning — visible in production logs
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "warn",
        event: "broadcast:config_missing",
        message:
          "WS_SERVER_URL or WS_INTERNAL_SECRET is not set — skipping broadcast",
        broadcastEvent: opts.event,
      })
    );
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 s timeout

  try {
    const res = await fetch(`${WS_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": WS_INTERNAL_SECRET,
      },
      body: JSON.stringify(opts),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "(unreadable)");
      // Structured error — will be captured by any log aggregator (Datadog, CloudWatch, etc.)
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: "error",
          event: "broadcast:http_error",
          broadcastEvent: opts.event,
          rooms: opts.rooms,
          statusCode: res.status,
          responseBody: body,
        })
      );
    }
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error && err.name === "AbortError";

    // Structured error — covers timeouts, ECONNREFUSED, etc.
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: isTimeout ? "broadcast:timeout" : "broadcast:network_error",
        broadcastEvent: opts.event,
        rooms: opts.rooms,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
