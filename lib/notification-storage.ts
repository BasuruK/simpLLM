import { Notification } from "@/types/notification";

export interface NotificationStorageClient {
  loadNotifications(): Promise<Notification[]>;
  saveNotifications(notifications: Notification[]): Promise<void>;
  clearAll(): Promise<void>;
}

const DB_NAME = "simpllm-notifications";
const DB_VERSION = 1;
const STORE_NAME = "notifications";

export class IndexedDBNotificationStorage implements NotificationStorageClient {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
          });

          // Create indexes for efficient querying
          objectStore.createIndex("timestamp", "timestamp", { unique: false });
          objectStore.createIndex("read", "read", { unique: false });
        }
      };
    });
  }

  async saveNotifications(notifications: Notification[]): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing notifications
      const clearRequest = store.clear();

      clearRequest.onsuccess = () => {
        // Add all notifications
        notifications.forEach((notification) => {
          store.add({
            ...notification,
            timestamp: notification.timestamp.toISOString(),
          });
        });
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async loadNotifications(): Promise<Notification[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const notifications = request.result.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));

        resolve(notifications);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const notificationStorage: NotificationStorageClient =
  new IndexedDBNotificationStorage();
