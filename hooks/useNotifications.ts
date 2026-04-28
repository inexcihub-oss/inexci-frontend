"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  notificationService,
  Notification,
} from "@/services/notification.service";

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [latest, setLatest] = useState<Notification[]>([]);

  useEffect(() => {
    notificationService
      .getUnreadCount()
      .then((count) => setUnreadCount(count))
      .catch(() => {});

    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) return;

    const socket = io(
      `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
      { auth: { token }, transports: ["websocket"] },
    );

    socket.on("notification:new", (notification: Notification) => {
      setUnreadCount((prev) => prev + 1);
      setLatest((prev) => [notification, ...prev].slice(0, 10));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { unreadCount, setUnreadCount, latest, setLatest };
}
