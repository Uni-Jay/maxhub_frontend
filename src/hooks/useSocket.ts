import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "../lib/api";

const socketUrl = API_URL.replace(/\/api$/, "");

export type SocketStatus = "disconnected" | "connecting" | "connected" | "error";

export const socket = io(socketUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
});

export function useSocket() {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleConnect = () => {
      setStatus("connected");
      setErrorMessage(null);
      console.log("[Socket] Connected");
    };

    const handleDisconnect = (reason: string) => {
      setStatus("disconnected");
      console.log("[Socket] Disconnected:", reason);
    };

    const handleConnectError = (error: unknown) => {
      setStatus("error");
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Connection error: ${message}`);
      console.error("[Socket] Error:", error);
    };

    const handleReconnectAttempt = () => {
      setStatus("connecting");
      console.log("[Socket] Attempting reconnect...");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("reconnect_attempt", handleReconnectAttempt);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("reconnect_attempt", handleReconnectAttempt);
    };
  }, []);

  return { socket, status, errorMessage };
}
