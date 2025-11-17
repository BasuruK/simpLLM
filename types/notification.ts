export interface FileFailure {
  fileName: string;
  error: string;
}

export interface FileCancellation {
  fileName: string;
  reason: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  itemsProcessed: number;
  totalCost: number;
  successFiles: string[];
  fileFailures: FileFailure[];
  cancelledFiles: FileCancellation[];
  timestamp: Date;
  read: boolean;
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed" | "cancelled";
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
  cancelledFiles: FileCancellation[];
  jobId?: string;
  status?: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress?: {
    current: number;
    total: number;
  };
}
