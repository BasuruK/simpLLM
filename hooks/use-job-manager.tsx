"use client";

import { useState, useCallback, useRef } from "react";

import { processBatch, BatchFileResult } from "@/lib/batch-processor";
import { useNotifications } from "@/hooks/use-notifications";
import { saveHistoryItem } from "@/lib/history-storage";
import { saveFileBlob, generateThumbnail } from "@/lib/file-storage";

/**
 * Job state tracking
 */
export interface Job {
  id: string;
  files: File[];
  status: "queued" | "processing" | "completed" | "failed";
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
export function useJobManager(options?: UseJobManagerOptions): UseJobManagerReturn {
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
      const jobId = `job-${Date.now()}-${jobIdCounter.current++}`;

      // Create abort controller for this job
      const abortController = new AbortController();

      abortControllers.current.set(jobId, abortController);

      // Create notification for this job
      const notificationId = addNotification({
        title: "Processing Files",
        description: `Processing ${files.length} file${files.length > 1 ? "s" : ""}...`,
        itemsProcessed: 0,
        totalCost: 0,
        successFiles: [],
        fileFailures: [],
        jobId,
        status: "queued",
        progress: {
          current: 0,
          total: files.length,
        },
      });

      // Initialize job state
      const job: Job = {
        id: jobId,
        files,
        status: "queued",
        progress: { current: 0, total: files.length },
        results: [],
        notificationId,
        startTime: Date.now(),
      };

      setJobs((prev) => new Map(prev).set(jobId, job));

      // Transition to processing when batch actually starts
      setJobs((prev) => {
        const updated = new Map(prev);
        const currentJob = updated.get(jobId);

        if (currentJob) {
          currentJob.status = "processing";
          updated.set(jobId, { ...currentJob });
        }

        return updated;
      });

      // Update notification to processing status
      updateNotification(notificationId, {
        status: "processing",
      });

      // Start processing in background
      processBatch(files, {
        maxConcurrent: 3,
        signal: abortController.signal,
        onProgress: (completed, total, results) => {
          // Calculate stats
          const successFiles = results
            .filter((r) => r?.status === "success")
            .map((r) => r.file.name);

          // Capture detailed failure information
          const fileFailures = results
            .filter((r) => r?.status === "failed")
            .map((r) => ({
              fileName: r.file.name,
              error: r.error || "Unknown error",
            }));

          const totalCost = results
            .filter((r) => r?.status === "success")
            .reduce((sum, r) => sum + (r.result?.usage.estimatedCost || 0), 0);

          // Update job state
          setJobs((prev) => {
            const updated = new Map(prev);
            const currentJob = updated.get(jobId);

            if (currentJob) {
              currentJob.progress = { current: completed, total };
              currentJob.results = results;

              if (completed === total) {
                currentJob.status =
                  fileFailures.length === total ? "failed" : "completed";
                currentJob.endTime = Date.now();
              }

              updated.set(jobId, { ...currentJob });
            }

            return updated;
          });

          // Update notification
          updateNotification(notificationId, {
            description:
              completed === total
                ? `Completed: ${successFiles.length} succeeded, ${fileFailures.length} failed`
                : `Processing ${completed} of ${total}...`,
            itemsProcessed: completed,
            totalCost,
            successFiles,
            fileFailures,
            status: completed === total ? "completed" : "processing",
            progress: { current: completed, total },
          });
        },
      })
        .then(async (batchResults) => {
          // Save successful extractions to history
          const successfulResults = batchResults.filter(
            (r) => r.status === "success" && r.result,
          );

          // Save each successful extraction
          for (const result of successfulResults) {
            try {
              // Generate thumbnail
              const thumbnail = await generateThumbnail(result.file);

              const fileType = result.file.type.startsWith("image/")
                ? "image"
                : "pdf";

              // Process the extracted data similar to single file extraction
              let extractedData: string;
              let parsedJson: unknown;

              if (result.result?.data) {
                // Clean up the response - remove "text" wrapper if present
                let cleanedResult = result.result.data;

                if (
                  typeof result.result.data === "object" &&
                  result.result.data !== null &&
                  "text" in result.result.data
                ) {
                  cleanedResult = (result.result.data as { text: unknown })
                    .text;
                }

                // Convert to string if it's an object
                extractedData =
                  typeof cleanedResult === "string"
                    ? cleanedResult
                    : JSON.stringify(cleanedResult, null, 2);

                // Parse JSON content for jsonContent field
                try {
                  parsedJson =
                    typeof extractedData === "string"
                      ? JSON.parse(extractedData)
                      : extractedData;
                } catch (err) {
                  console.error(
                    `JSON parse error for job ${jobId}, file ${result.file.name}:`,
                    err,
                    "\nRaw data:",
                    extractedData?.substring(0, 500),
                  );
                  parsedJson = null;
                }
              } else {
                continue; // Skip if no data
              }

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
            error instanceof Error ? error.message : String(error || "Unknown error");

          // Log raw error for debugging
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
  const cancelJob = useCallback((jobId: string) => {
    const controller = abortControllers.current.get(jobId);

    if (controller) {
      controller.abort();
      abortControllers.current.delete(jobId);
    }

    setJobs((prev) => {
      const updated = new Map(prev);
      const job = updated.get(jobId);

      if (job && (job.status === "processing" || job.status === "queued")) {
        job.status = "failed";
        job.endTime = Date.now();
        updated.set(jobId, { ...job });
      }

      return updated;
    });
  }, []);

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

      Array.from(updated.entries()).forEach(([jobId, job]) => {
        if (job.status === "completed" || job.status === "failed") {
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
