"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { getUnreadNotificationCount } from "@/lib/notifications";

interface NotificationContextType {
  unreadCount: number;
  updateUnreadCount: (userId: string) => Promise<void>;
  setUnreadCount: (count: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const updateUnreadCount = useCallback(async (userId: string) => {
    try {
      const result = await getUnreadNotificationCount(userId);
      if (result.success) {
        setUnreadCount(result.data || 0);
      }
    } catch (error) {
      console.error("알림 개수 조회 실패:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, updateUnreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
