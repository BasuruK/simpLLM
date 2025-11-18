"use client";

import { useState, useCallback, useRef } from "react";

import { processBatch, BatchFileResult } from "@/lib/batch-processor";
import { useNotifications } from "@/hooks/use-notifications";
import { saveHistoryItem } from "@/lib/history-storage";
import { saveFileBlob, generateThumbnail } from "@/lib/file-storage";

/**
 * Remove Markdown code fences (```json ... ```), keeping the inner payload.
 */
const stripMarkdownCodeFence = (input: string): string => {
  const trimmed = input.trim();

  if (!trimmed.startsWith("```")) return input;

  const firstNewLine = trimmed.indexOf("\n");

  if (firstNewLine === -1) return input;

  const openingLine = trimmed.slice(0, firstNewLine).trim();

  if (!openingLine.startsWith("```")) return input;

  let inner = trimmed.slice(firstNewLine + 1);
  const closingFenceIndex = inner.lastIndexOf("```");

  if (closingFenceIndex === -1) return input;

  inner = inner.slice(0, closingFenceIndex);

  return inner.trim();
};

/**
 * Normalize extracted data by unwrapping text wrappers, converting to string, and parsing JSON
 * @param data - The raw extracted data from the API
 * @param context - Context information for error logging (jobId, fileName)
 * @returns Normalized data with text string and parsed JSON, or null if no data
 */
function normalizeExtractedData(
  data: unknown,
  context?: { jobId: string; fileName: string },
): { text: string; parsed: unknown } | null {
  if (!data) return null;

  // Unwrap "text" wrapper if present
  let cleaned: unknown = data;

  if (typeof data === "object" && data !== null && "text" in data) {
    cleaned = (data as Record<string, unknown>).text;
  }

  // Convert to string
  const textRaw =
    typeof cleaned === "string" ? cleaned : JSON.stringify(cleaned, null, 2);
  const text = stripMarkdownCodeFence(textRaw);

  // Parse JSON with error logging
  let parsed: unknown;

  try {
    parsed = typeof text === "string" ? JSON.parse(text) : text;
  } catch (err) {
    if (context) {
      // eslint-disable-next-line no-console
      console.error(
        `JSON parse error for job ${context.jobId}, file ${context.fileName}:`,
        err,
        "\nRaw data:",
        text?.substring(0, 500),
      );
    }
    parsed = null;
  }

  return { text, parsed };
}

const cancellationPatterns = [
  "abort",
  "aborted",
  "cancel",
  "canceled",
  "cancelled",
  "operation was cancelled",
  "operation was canceled",
];

const matchesCancellationText = (value?: string): boolean => {
  if (!value) return false;
  const normalized = value.toLowerCase();

  return cancellationPatterns.some((pattern) => normalized.includes(pattern));
};

/**
 * Robustly detect if an error is an abort/cancellation error.
 */
const isAbortCancellation = (error: unknown): boolean => {
  if (!error) return false;

  if (typeof error === "object" && error !== null) {
    const name = (error as { name?: unknown }).name;

    if (typeof name === "string" && name.toLowerCase() === "aborterror") {
      return true;
    }

    const message = (error as { message?: unknown }).message;
    const messageText = typeof message === "string" ? message : undefined;

    if (matchesCancellationText(messageText)) {
      return true;
    }

    const toStringFn = (error as { toString?: () => string }).toString;

    if (
      typeof toStringFn === "function" &&
      matchesCancellationText(toStringFn.call(error))
    ) {
      return true;
    }
  }

  if (typeof error === "string" && matchesCancellationText(error)) {
    return true;
  }

  return false;
};

/**
 * Job state tracking
 */
export interface Job {
  id: string;
  files: File[];
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  progress: {
    current: number;
    total: number;
  };
  results: BatchFileResult[];
  notificationId: string;
  startTime: number;
  endTime?: number;
}

export interface UseJobManagerReturn {
  jobs: Map<string, Job>;
  activeJobCount: number;
  startBatchJob: (files: File[]) => Promise<string>;
  cancelJob: (jobId: string) => void;
  getJob: (jobId: string) => Job | undefined;
  clearCompletedJobs: () => void;
}

export interface UseJobManagerOptions {
  onJobComplete?: (jobId: string) => void;
}

/**
 * Hook to manage multiple concurrent extraction jobs
 * Integrates with notification system for real-time updates
 */
export function useJobManager(
  options?: UseJobManagerOptions,
): UseJobManagerReturn {
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());
  const { addNotification, updateNotification } = useNotifications();
  const jobIdCounter = useRef(0);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Count active jobs (queued or processing)
  const activeJobCount = Array.from(jobs.values()).filter(
    (job) => job.status === "queued" || job.status === "processing",
  ).length;

  /**
   * Start a new batch job
   */
  const startBatchJob = useCallback(
    async (files: File[]): Promise<string> => {
      // Handle empty files array edge case
      if (files.length === 0) {
        const jobId = `job-${Date.now()}-${jobIdCounter.current++}`;
        const notificationId = addNotification({
          title: "Processing Files",
          description: "No files to process",
          itemsProcessed: 0,
          totalCost: 0,
          successFiles: [],
          fileFailures: [],
          cancelledFiles: [],
          jobId,
          status: "completed",
          progress: { current: 0, total: 0 },
        });

        const job: Job = {
          id: jobId,
          files: [],
          status: "completed",
          progress: { current: 0, total: 0 },
          results: [],
          notificationId,
          startTime: Date.now(),
          endTime: Date.now(),
        };

        setJobs((prev) => new Map(prev).set(jobId, job));

        // Notify completion immediately
        if (options?.onJobComplete) {
          options.onJobComplete(jobId);
        }

        return jobId;
      }

      const jobId = `job-${Date.now()}-${jobIdCounter.current++}`;

      // Create abort controller for this job
      const abortController = new AbortController();

      abortControllers.current.set(jobId, abortController);

      // Create notification for this job with processing status
      const notificationId = addNotification({
        title: "Processing Files",
        description: `Processing ${files.length} file${files.length > 1 ? "s" : ""}...`,
        itemsProcessed: 0,
        totalCost: 0,
        successFiles: [],
        fileFailures: [],
        cancelledFiles: [],
        jobId,
        status: "processing",
        progress: {
          current: 0,
          total: files.length,
        },
      });

      // Initialize job state as processing (single state update)
      const job: Job = {
        id: jobId,
        files,
        status: "processing",
        progress: { current: 0, total: files.length },
        results: [],
        notificationId,
        startTime: Date.now(),
      };

      setJobs((prev) => new Map(prev).set(jobId, job));

      // Start processing in background
      processBatch(files, {
        maxConcurrent: 3,
        signal: abortController.signal,
        onProgress: (completed, total, results) => {
          // Calculate stats
          const successFiles = results
            .filter((r) => r?.status === "success")
            .map((r) => r.file.name);

          // Separate failed files from cancelled files
          const fileFailures = results
            .filter(
              (r) => r?.status === "failed" && !isAbortCancellation(r.error),
            )
            .map((r) => ({
              fileName: r.file.name,
              error: r.error || "Unknown error",
            }));

          const cancelledFiles = results
            .filter(
              (r) =>
                r?.status === "cancelled" ||
                (r?.status === "failed" && isAbortCancellation(r.error)),
            )
            .map((r) => ({
              fileName: r.file.name,
              reason: r.error || "Job was cancelled",
            }));

          const totalCost = results
            .filter((r) => r?.status === "success")
            .reduce((sum, r) => sum + (r.result?.usage.estimatedCost || 0), 0);

          // Update job state
          let jobWasCancelled = false;

          setJobs((prev) => {
            const updated = new Map(prev);
            const currentJob = updated.get(jobId);

            if (currentJob) {
              jobWasCancelled = currentJob.status === "cancelled";
              currentJob.progress = { current: completed, total };
              currentJob.results = results;

              if (!jobWasCancelled && completed === total) {
                const totalFailures =
                  fileFailures.length + cancelledFiles.length;

                currentJob.status =
                  totalFailures === total ? "failed" : "completed";
                currentJob.endTime = Date.now();
              }

              updated.set(jobId, { ...currentJob });
            }

            return updated;
          });

          // Derive notification status to match job status logic
          let notificationStatus:
            | "queued"
            | "processing"
            | "completed"
            | "failed"
            | "cancelled";
          const totalFailures = fileFailures.length + cancelledFiles.length;

          if (jobWasCancelled) {
            notificationStatus = "cancelled";
          } else if (completed === total) {
            notificationStatus =
              totalFailures === total ? "failed" : "completed";
          } else {
            notificationStatus = "processing";
          }

          // Build description (show progress text only while running)
          const description =
            completed === total ? "" : `Processing ${completed} of ${total}...`;

          // Update notification
          const notificationUpdate: Parameters<typeof updateNotification>[1] = {
            itemsProcessed: completed,
            totalCost,
            successFiles,
            fileFailures,
            cancelledFiles,
            progress: { current: completed, total },
          };

          if (!jobWasCancelled) {
            notificationUpdate.description = description;
            notificationUpdate.status = notificationStatus;
          }

          updateNotification(notificationId, notificationUpdate);
        },
      })
        .then(async (batchResults) => {
          // Save successful extractions to history
          // Guard against undefined entries (can happen when job is cancelled)
          const successfulResults = batchResults.filter(
            (r) => r != null && r.status === "success" && r.result,
          );

          // Save each successful extraction
          for (const result of successfulResults) {
            try {
              // Generate thumbnail
              const thumbnail = await generateThumbnail(result.file);

              const fileType = result.file.type.startsWith("image/")
                ? "image"
                : "pdf";

              // Process the extracted data using normalization utility
              const normalized = normalizeExtractedData(result.result?.data, {
                jobId,
                fileName: result.file.name,
              });

              if (!normalized) {
                continue; // Skip if no data
              }

              const { text: extractedData, parsed: parsedJson } = normalized;

              // Save to history (only if we have usage data)
              if (result.result?.usage) {
                const historyItem = saveHistoryItem({
                  timestamp: Date.now(),
                  filename: result.file.name,
                  fileType: fileType,
                  fileSize: result.file.size,
                  extractedData: extractedData,
                  jsonContent: parsedJson,
                  usage: result.result.usage,
                  starred: false,
                  preview: thumbnail,
                });

                // Save file blob
                await saveFileBlob(historyItem.id, result.file);
              }
            } catch {
              // Silently fail individual saves - don't block the batch completion
            }
          }

          // Final state update on completion - only set endTime if not already set
          setJobs((prev) => {
            const updated = new Map(prev);
            const job = updated.get(jobId);

            if (job && !job.endTime) {
              job.endTime = Date.now();
              updated.set(jobId, { ...job });
            }

            return updated;
          });

          // Notify parent that job completed
          if (options?.onJobComplete) {
            options.onJobComplete(jobId);
          }
        })
        .catch((error) => {
          // Safely derive error message
          const errorMessage =
            error instanceof Error
              ? error.message
              : String(error || "Unknown error");

          // Log raw error for debugging
          // eslint-disable-next-line no-console
          console.error("Batch job failed:", error);

          // Handle job failure
          setJobs((prev) => {
            const updated = new Map(prev);
            const job = updated.get(jobId);

            if (job) {
              job.status = "failed";
              job.endTime = Date.now();
              updated.set(jobId, { ...job });
            }

            return updated;
          });

          updateNotification(notificationId, {
            description: `Job failed: ${errorMessage}`,
            status: "failed",
          });
        })
        .finally(() => {
          // Cleanup abort controller
          abortControllers.current.delete(jobId);
        });

      return jobId;
    },
    [addNotification, updateNotification, options],
  );

  /**
   * Cancel a running job
   */
  const cancelJob = useCallback(
    (jobId: string) => {
      const controller = abortControllers.current.get(jobId);

      if (controller) {
        controller.abort();
        abortControllers.current.delete(jobId);
      }

      setJobs((prev) => {
        const updated = new Map(prev);
        const job = updated.get(jobId);

        if (job && (job.status === "processing" || job.status === "queued")) {
          // Mark as cancelled immediately
          job.status = "cancelled";
          job.endTime = Date.now();
          updated.set(jobId, { ...job });

          // Calculate current stats from results
          const successFiles = job.results
            .filter((r) => r?.status === "success")
            .map((r) => r.file.name);
          const fileFailures = job.results
            .filter(
              (r) => r?.status === "failed" && !isAbortCancellation(r.error),
            )
            .map((r) => ({
              fileName: r.file.name,
              error: r.error || "Unknown error",
            }));
          const cancelledFiles = job.results
            .filter(
              (r) =>
                r?.status === "cancelled" ||
                (r?.status === "failed" && isAbortCancellation(r.error)),
            )
            .map((r) => ({
              fileName: r.file.name,
              reason: r.error || "Job was cancelled",
            }));
          const totalCost = job.results
            .filter((r) => r?.status === "success")
            .reduce((sum, r) => sum + (r.result?.usage.estimatedCost || 0), 0);

          const completed =
            successFiles.length + fileFailures.length + cancelledFiles.length;

          // Build description
          const parts: string[] = [];

          if (successFiles.length > 0)
            parts.push(`${successFiles.length} succeeded`);
          if (fileFailures.length > 0)
            parts.push(`${fileFailures.length} failed`);
          if (cancelledFiles.length > 0)
            parts.push(`${cancelledFiles.length} cancelled`);
          const description =
            parts.length > 0
              ? `Job cancelled: ${parts.join(", ")}`
              : "Job cancelled.";

          // Update notification to reflect cancellation with final stats
          updateNotification(job.notificationId, {
            description,
            status: "cancelled",
            itemsProcessed: completed,
            totalCost,
            successFiles,
            fileFailures,
            cancelledFiles,
            progress: { current: completed, total: job.files.length },
          });
        }

        return updated;
      });
    },
    [updateNotification],
  );

  /**
   * Get a specific job
   */
  const getJob = useCallback(
    (jobId: string): Job | undefined => {
      return jobs.get(jobId);
    },
    [jobs],
  );

  /**
   * Clear all completed jobs
   */
  const clearCompletedJobs = useCallback(() => {
    setJobs((prev) => {
      const updated = new Map(prev);

      const terminalStatuses: Array<Job["status"]> = [
        "completed",
        "failed",
        "cancelled",
      ];

      Array.from(updated.entries()).forEach(([jobId, job]) => {
        if (terminalStatuses.includes(job.status)) {
          updated.delete(jobId);
        }
      });

      return updated;
    });
  }, []);

  return {
    jobs,
    activeJobCount,
    startBatchJob,
    cancelJob,
    getJob,
    clearCompletedJobs,
  };
}
