/**
 * Runs once when the Next.js server starts.
 * supabase-js >= 2.109 requires a global WebSocket, which Node only ships natively
 * from v22. On older Node (e.g. local Node 20) we install the `ws` implementation.
 * The Edge runtime (middleware) already has WebSocket, so it is skipped there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && typeof globalThis.WebSocket === "undefined") {
    const { default: WebSocket } = await import("ws");
    (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
  }
}
