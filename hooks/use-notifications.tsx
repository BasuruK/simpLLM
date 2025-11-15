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
import {
  NotificationStorageClient,
  notificationStorage,
} from "@/lib/notification-storage";

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

interface NotificationProviderProps {
  children: React.ReactNode;
  storage?: NotificationStorageClient;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  storage = notificationStorage,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const notificationIdCounter = useRef(0);
  const hydratedSnapshotRef = useRef<Notification[] | null>(null);

  // Load notifications from IndexedDB on mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const saved = await storage.loadNotifications();

        hydratedSnapshotRef.current = saved;
        setNotifications(saved);
      } catch {
        // Silent fail - start with empty notifications
      } finally {
        setIsLoaded(true);
      }
    };

    loadNotifications();
  }, [storage]);

  // Save notifications to IndexedDB whenever they change
  useEffect(() => {
    if (!isLoaded) return;

    if (hydratedSnapshotRef.current === notifications) {
      hydratedSnapshotRef.current = null;

      return;
    }

    hydratedSnapshotRef.current = null;

    const saveNotifications = async () => {
      try {
        await storage.saveNotifications(notifications);
      } catch {
        // Silent fail - continue with in-memory notifications
      }
    };

    saveNotifications();
  }, [notifications, isLoaded, storage]);

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
      await storage.clearAll();
      setNotifications([]);
    } catch {
      // Silent fail - at least clear in-memory
      setNotifications([]);
    }
  }, [storage]);

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
