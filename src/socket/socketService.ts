import { io, Socket } from "socket.io-client";
import { NotificationItem } from "../app/component/NotificationDropdown";
import { ChatMessageNotificationPayload } from "../app/component/tabs/chat/ChatTabContentTypes";

interface SocketServiceHandlers {
  onNotificationReceived: (notification: NotificationItem) => void;
  onGlobalChatNotificationReceived: (payload: ChatMessageNotificationPayload) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: Socket.DisconnectReason) => void;
  onConnectError?: (error: Error) => void;
}

let socket: Socket | null = null;

export const initializeSocket = (
  userId: string,
  handlers: SocketServiceHandlers
): Socket | null => {
  if (socket && socket.connected) {
    if (socket.io.opts.query && (socket.io.opts.query as any).userId === userId) {
      return socket;
    }
    socket.disconnect();
    socket = null;
  }

  const newSocket = io(`${process.env.NEXT_PUBLIC_SOCKET_URL}`, {
    path: "/socket.io",
    query: { userId },
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 3000,
  });

  newSocket.on("connect", () => {
    if (handlers.onConnect) {
      handlers.onConnect();
    }
  });

  newSocket.on("disconnect", (reason) => {
    if (handlers.onDisconnect) {
      handlers.onDisconnect(reason);
    }
  });

  newSocket.on("connect_error", (error) => {
    if (handlers.onConnectError) {
      handlers.onConnectError(error);
    }
  });

  newSocket.on("error", (error) => {
    console.error("SOCKET_SERVICE: Socket error - User ID:", userId, error);
  });

  newSocket.on("notification", (data: any) => {
    if (data && typeof data === "object") {
      const newNotification: NotificationItem = {
        id: data.id || `socket-notif-${Date.now()}`,
        title: data.title || "Thông báo",
        content: data.content || "",
        type: data.type || "SYSTEM",
        read: data.read !== undefined ? data.read : false,
        createdAt: data.createdAt || new Date().toISOString(),
        relatedId: data.relatedId ?? null,
        userId: data.userId ?? userId,
      };
      handlers.onNotificationReceived(newNotification);
    }
  });

  newSocket.on(
    "global_chat_notification",
    (payload: ChatMessageNotificationPayload) => {
      handlers.onGlobalChatNotificationReceived(payload);
    }
  );

  socket = newSocket;
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.off("connect");
    socket.off("disconnect");
    socket.off("connect_error");
    socket.off("error");
    socket.off("notification");
    socket.off("global_chat_notification");
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => socket;