export interface Notification {
  id: string;
  title: string;
  description: string;
  itemsProcessed: number;
  totalCost: number;
  successFiles: string[];
  failedFiles: string[];
  timestamp: Date;
  read: boolean;
}

export interface NotificationInput {
  title: string;
  description: string;
  itemsProcessed: number;
  totalCost: number;
  successFiles: string[];
  failedFiles: string[];
}
