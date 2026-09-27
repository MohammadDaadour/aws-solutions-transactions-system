"use client";

/**
 * useTransferSocket
 *
 * Manages a single Socket.IO connection to the standalone WS server.
 * - Reads the session token from next-auth to authenticate the handshake.
 * - Registers event handlers passed in via `handlers`.
 * - On reconnect, calls `onReconnect` so callers can re-sync state.
 * - Cleans up the socket on unmount.
 */

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

export type TransferEventHandlers = {
  onOrderNew?: (order: unknown) => void;
  onOrderTaken?: (order: unknown) => void;
  onOrderDone?: (order: unknown) => void;
  onOrderClaimFailed?: (data: unknown) => void;
  onReconnect?: () => void;
};

export function useTransferSocket(handlers: TransferEventHandlers) {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  // Keep handlers in a ref so we can update them without re-subscribing
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl || !session) return;

    // next-auth JWT is available via session's internal token —
    // we pass it via the auth cookie that next-auth sets automatically.
    // The WS server reads the token from socket.handshake.auth.token.
    // We retrieve it by fetching /api/auth/session which includes the raw JWT.
    let cancelled = false;

    (async () => {
      // Fetch the raw JWT from next-auth's session endpoint
      const tokenRes = await fetch("/api/auth/token").catch(() => null);
      if (cancelled || !tokenRes?.ok) return;
      const { token } = await tokenRes.json().catch(() => ({ token: null }));
      if (cancelled || !token) return;

      const socket = io(wsUrl, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
      });

      socketRef.current = socket;

      socket.on("order:new", (order) => handlersRef.current.onOrderNew?.(order));
      socket.on("order:taken", (order) => handlersRef.current.onOrderTaken?.(order));
      socket.on("order:done", (order) => handlersRef.current.onOrderDone?.(order));
      socket.on("order:claim_failed", (data) =>
        handlersRef.current.onOrderClaimFailed?.(data)
      );

      socket.io.on("reconnect", () => {
        handlersRef.current.onReconnect?.();
      });
    })();

    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [session]);

  return socketRef;
}
