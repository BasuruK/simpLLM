"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

import { Notification, NotificationInput } from "@/types/notification";
import { notificationStorage } from "@/lib/notification-storage";

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (input: NotificationInput) => string;
  updateNotification: (id: string, updates: Partial<NotificationInput>) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  unreadCount: number;
  isLoaded: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const notificationIdCounter = useRef(0);

  // Load notifications from IndexedDB on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const saved = await notificationStorage.loadNotifications();

        setNotifications(saved);
      } catch {
        // Silent fail - start with empty notifications
      } finally {
        setIsLoaded(true);
      }
    };

    loadNotifications();
  }, []);

  // Save notifications to IndexedDB whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    const saveNotifications = async () => {
      try {
        await notificationStorage.saveNotifications(notifications);
      } catch {
        // Silent fail - continue with in-memory notifications
      }
    };

    saveNotifications();
  }, [notifications, isLoaded]);

  const addNotification = useCallback((input: NotificationInput): string => {
    const id = `notification-${Date.now()}-${notificationIdCounter.current++}`;
    const newNotification: Notification = {
      id,
      ...input,
      timestamp: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    return id;
  }, []);

  const updateNotification = useCallback(
    (id: string, updates: Partial<NotificationInput>) => {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, ...updates }
            : notification,
        ),
      );
    },
    [],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await notificationStorage.clearAll();
      setNotifications([]);
    } catch {
      // Silent fail - at least clear in-memory
      setNotifications([]);
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    addNotification,
    updateNotification,
    markAsRead,
    clearAll,
    unreadCount,
    isLoaded,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }

  return context;
};
