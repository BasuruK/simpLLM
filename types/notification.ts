export interface FileFailure {
  fileName: string;
  error: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  itemsProcessed: number;
  totalCost: number;
  successFiles: string[];
  fileFailures: FileFailure[];
  timestamp: Date;
  read: boolean;
  jobId?: string;
  status?: "processing" | "completed" | "failed";
  progress?: {
    current: number;
    total: number;
  };
}

export interface NotificationInput {
  title: string;
  description: string;
  itemsProcessed: number;
  totalCost: number;
  successFiles: string[];
  fileFailures: FileFailure[];
  jobId?: string;
  status?: "processing" | "completed" | "failed";
  progress?: {
    current: number;
    total: number;
  };
}
