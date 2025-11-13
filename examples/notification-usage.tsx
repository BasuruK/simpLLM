/**
 * Notification System Usage Example
 *
 * This file demonstrates how to use the notification system to add, update,
 * and manage notifications in your application.
 */

import { useNotifications } from "@/hooks/use-notifications";

/**
 * Example 1: Basic Usage - Adding a notification
 */
export function ExampleAddNotification() {
  const { addNotification } = useNotifications();

  const handleProcessComplete = () => {
    // Add a new notification
    const notificationId = addNotification({
      title: "Invoice Processing Complete",
      description: "Successfully processed all invoice files",
      itemsProcessed: 25,
      totalCost: 0.15,
      successFiles: ["invoice-001.pdf", "invoice-002.pdf", "invoice-003.pdf"],
      failedFiles: [],
    });

    console.log("Created notification with ID:", notificationId);
  };

  return (
    <button onClick={handleProcessComplete}>Process Invoices</button>
  );
}

/**
 * Example 2: Adding a notification with failures
 */
export function ExampleWithFailures() {
  const { addNotification } = useNotifications();

  const handleProcessWithErrors = () => {
    addNotification({
      title: "Batch Processing Completed with Errors",
      description: "Some files failed to process",
      itemsProcessed: 10,
      totalCost: 0.08,
      successFiles: ["file1.pdf", "file2.pdf", "file3.pdf"],
      failedFiles: ["corrupted.pdf", "invalid-format.pdf"],
    });
  };

  return (
    <button onClick={handleProcessWithErrors}>Process Batch</button>
  );
}

/**
 * Example 3: Updating a notification
 */
export function ExampleUpdateNotification() {
  const { addNotification, updateNotification } = useNotifications();

  const handleProgressiveProcess = async () => {
    // Create initial notification
    const notificationId = addNotification({
      title: "Processing Started",
      description: "Processing files...",
      itemsProcessed: 0,
      totalCost: 0,
      successFiles: [],
      failedFiles: [],
    });

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update notification with progress
    updateNotification(notificationId, {
      title: "Processing In Progress",
      description: "50% complete",
      itemsProcessed: 5,
      totalCost: 0.05,
      successFiles: ["file1.pdf", "file2.pdf"],
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Final update
    updateNotification(notificationId, {
      title: "Processing Complete",
      description: "All files processed successfully",
      itemsProcessed: 10,
      totalCost: 0.12,
      successFiles: [
        "file1.pdf",
        "file2.pdf",
        "file3.pdf",
        "file4.pdf",
        "file5.pdf",
      ],
      failedFiles: [],
    });
  };

  return (
    <button onClick={handleProgressiveProcess}>Start Progressive Process</button>
  );
}

/**
 * Example 4: Using all notification features
 */
export function ExampleFullFeatures() {
  const {
    addNotification,
    updateNotification,
    markAsRead,
    clearAll,
    notifications,
    unreadCount,
  } = useNotifications();

  const handleAddMultiple = () => {
    // Add multiple notifications
    addNotification({
      title: "Batch 1 Complete",
      description: "First batch processed",
      itemsProcessed: 5,
      totalCost: 0.03,
      successFiles: ["a.pdf", "b.pdf"],
      failedFiles: [],
    });

    addNotification({
      title: "Batch 2 Complete",
      description: "Second batch processed",
      itemsProcessed: 3,
      totalCost: 0.02,
      successFiles: ["c.pdf"],
      failedFiles: ["d.pdf"],
    });
  };

  const handleMarkFirstAsRead = () => {
    if (notifications.length > 0) {
      markAsRead(notifications[0].id);
    }
  };

  return (
    <div>
      <button onClick={handleAddMultiple}>Add Multiple Notifications</button>
      <button onClick={handleMarkFirstAsRead}>Mark First as Read</button>
      <button onClick={clearAll}>Clear All Notifications</button>
      <p>Unread notifications: {unreadCount}</p>
      <p>Total notifications: {notifications.length}</p>
    </div>
  );
}

/**
 * Example 5: Real-world usage in a file processing component
 */
export function ExampleRealWorld() {
  const { addNotification, updateNotification } = useNotifications();

  const processFiles = async (files: File[]) => {
    // Create initial notification
    const notificationId = addNotification({
      title: "Processing Files",
      description: `Processing ${files.length} files...`,
      itemsProcessed: 0,
      totalCost: 0,
      successFiles: [],
      failedFiles: [],
    });

    const successFiles: string[] = [];
    const failedFiles: string[] = [];
    let totalCost = 0;

    for (let i = 0; i < files.length; i++) {
      try {
        // Simulate file processing
        await processFile(files[i]);
        successFiles.push(files[i].name);
        totalCost += 0.01; // Example cost per file

        // Update notification with progress
        updateNotification(notificationId, {
          description: `Processing ${i + 1}/${files.length} files...`,
          itemsProcessed: i + 1,
          totalCost,
          successFiles: [...successFiles],
          failedFiles: [...failedFiles],
        });
      } catch (error) {
        failedFiles.push(files[i].name);
        updateNotification(notificationId, {
          itemsProcessed: i + 1,
          failedFiles: [...failedFiles],
        });
      }
    }

    // Final update
    updateNotification(notificationId, {
      title: "Processing Complete",
      description:
        failedFiles.length > 0
          ? `Completed with ${failedFiles.length} error(s)`
          : "All files processed successfully",
      itemsProcessed: files.length,
      totalCost,
      successFiles,
      failedFiles,
    });
  };

  return <div>{/* Your component UI */}</div>;
}

// Mock function for example
async function processFile(file: File): Promise<void> {
  // Simulate async processing
  await new Promise((resolve) => setTimeout(resolve, 100));
}
