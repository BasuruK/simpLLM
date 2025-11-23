import { extractDataFromFileNonStreaming, ExtractionResult } from "./openai";

/**
 * Result for a single file in a batch
 */
export interface BatchFileResult {
  file: File;
  status: "success" | "failed" | "cancelled";
  result?: ExtractionResult;
  error?: string;
}

/**
 * Progress callback for batch processing
 */
export type BatchProgressCallback = (
  completed: number,
  total: number,
  results: BatchFileResult[],
) => void;

/**
 * Rate limiter to control concurrent API requests
 */
class RateLimiter {
  private running = 0;
  private queue: Array<() => void> = [];
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    // Normalize maxConcurrent to at least 1 to prevent deadlock
    this.maxConcurrent = Math.max(1, Number(maxConcurrent) || 1);
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    // Wait if we've reached max concurrent limit
    if (this.running >= this.maxConcurrent) {
      await new Promise<void>((resolve) => {
        this.queue.push(resolve);
      });
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      // Process next queued task if any
      const nextResolver = this.queue.shift();

      if (nextResolver) {
        nextResolver();
      }
    }
  }
}

/**
 * Process multiple files concurrently with rate limiting
 * Uses extractDataFromFileNonStreaming from /lib/openai.ts
 */
export async function processBatch(
  files: File[],
  options: {
    maxConcurrent?: number;
    onProgress?: BatchProgressCallback;
    signal?: AbortSignal;
  } = {},
): Promise<BatchFileResult[]> {
  const { maxConcurrent = 3, onProgress, signal } = options;
  const limiter = new RateLimiter(maxConcurrent);

  const results: BatchFileResult[] = [];
  let completed = 0;

  // Process all files concurrently with rate limiting
  const promises = files.map((file, index) =>
    limiter.add(async () => {
      // Check if aborted before processing each file
      if (signal?.aborted) {
        const fileResult: BatchFileResult = {
          file,
          status: "cancelled",
          error: "Cancelled by user",
        };

        results[index] = fileResult;
        completed++;

        // Report progress
        if (onProgress) {
          onProgress(completed, files.length, [...results]);
        }

        return fileResult;
      }

      try {
        // Use non-streaming extraction for batch processing
        const result = await extractDataFromFileNonStreaming(file, signal);

        const fileResult: BatchFileResult = {
          file,
          status: "success",
          result,
        };

        results[index] = fileResult;
        completed++;

        // Report progress
        if (onProgress) {
          onProgress(completed, files.length, [...results]);
        }

        return fileResult;
      } catch (error) {
        const fileResult: BatchFileResult = {
          file,
          status: "failed",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        };

        results[index] = fileResult;
        completed++;

        // Report progress even on failure
        if (onProgress) {
          onProgress(completed, files.length, [...results]);
        }

        return fileResult;
      }
    }),
  );

  // Wait for all files to complete
  await Promise.allSettled(promises);

  return results;
}
