// Next.js instrumentation hook — runs once at server startup.
// Conditionally imports the node-specific cron job (not safe on edge runtime).
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("./instrumentation-node");
    }
}
