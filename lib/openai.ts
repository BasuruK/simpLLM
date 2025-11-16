import { getDecryptedApiKey } from "./secure-storage";

// Get API key from secure storage
function getApiKey(): string {
  const apiKey = getDecryptedApiKey();

  if (!apiKey) {
    throw new Error("API key not found. Please login first.");
  }

  return apiKey;
}

/**
 * Usage statistics for the extraction
 */
export interface ExtractionUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens?: number;
  durationMs: number;
  estimatedCost?: number;
  systemPrompt?: string;
}

// GPT-4o pricing per 1M tokens (in USD)
const GPT4O_PRICING = {
  INPUT_PER_1M: 2.5,
  CACHED_INPUT_PER_1M: 1.25,
  OUTPUT_PER_1M: 10.0,
};

/**
 * Calculate the estimated cost based on token usage
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number,
): number {
  // Calculate non-cached input tokens
  const nonCachedInputTokens = inputTokens - cachedTokens;

  // Calculate costs (divide by 1M to get the rate per token)
  const nonCachedInputCost =
    (nonCachedInputTokens / 1_000_000) * GPT4O_PRICING.INPUT_PER_1M;
  const cachedInputCost =
    (cachedTokens / 1_000_000) * GPT4O_PRICING.CACHED_INPUT_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * GPT4O_PRICING.OUTPUT_PER_1M;

  // Total cost
  return nonCachedInputCost + cachedInputCost + outputCost;
}

/**
 * Result from extraction including usage statistics
 */
export interface ExtractionResult {
  data: any;
  usage: ExtractionUsage;
}

/**
 * Content item for API request
 */
interface ContentItem {
  item: any;
  uploadedFileId: string | null;
}

/**
 * Convert image file to base64 data URL
 */
async function convertImageToBase64(file: File): Promise<string> {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  return await base64Promise;
}

/**
 * Upload PDF file to OpenAI Files API
 */
async function uploadPdfFile(file: File): Promise<string> {
  // Ensure filename has lowercase extension (OpenAI requirement)
  let fileName = file.name;
  const extensionMatch = fileName.match(/\.([^.]+)$/);

  if (extensionMatch && extensionMatch[1].toUpperCase() === "PDF") {
    fileName = fileName.replace(/\.PDF$/i, ".pdf");
  }

  const correctedFile = new File([file], fileName, { type: file.type });
  const formData = new FormData();

  formData.append("file", correctedFile);
  formData.append("purpose", "assistants");

  const uploadResponse = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();

    throw new Error(
      `File upload failed: ${uploadResponse.status} - ${errorText}`,
    );
  }

  const uploadResult = await uploadResponse.json();

  return uploadResult.id;
}

/**
 * Delete uploaded file from OpenAI Files API
 */
async function deleteUploadedFile(fileId: string): Promise<void> {
  try {
    const deleteResponse = await fetch(
      `https://api.openai.com/v1/files/${fileId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
        },
      },
    );

    if (!deleteResponse.ok) {
      // Silently fail - cleanup errors shouldn't break the main flow
    }
  } catch (deleteError) {
    // Silently fail - cleanup errors shouldn't break the main flow
  }
}

/**
 * Prepare content item from file for API request
 * Returns the content item and optional file ID for cleanup
 */
async function prepareContentItem(file: File): Promise<ContentItem> {
  let uploadedFileId: string | null = null;
  let contentItem: any;

  if (file.type.startsWith("image/")) {
    const fileContent = await convertImageToBase64(file);

    contentItem = {
      type: "input_image",
      image_url: fileContent,
    };
  } else if (file.type === "application/pdf") {
    uploadedFileId = await uploadPdfFile(file);

    contentItem = {
      type: "input_file",
      file_id: uploadedFileId,
    };
  } else {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  return { item: contentItem, uploadedFileId };
}

/**
 * Parse JSON string safely
 */
function parseJsonSafely(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (parseError) {
    return { text: jsonString };
  }
}

/**
 * Extract data from non-streaming API response
 */
function extractDataFromResponse(result: any): any {
  // Try multiple possible response structures
  if (result.output_items?.[0]?.content?.[0]?.text) {
    return parseJsonSafely(result.output_items[0].content[0].text);
  } else if (result.output?.[0]?.content?.[0]?.text) {
    return parseJsonSafely(result.output[0].content[0].text);
  } else if (result.content?.[0]?.text) {
    return parseJsonSafely(result.content[0].text);
  } else {
    console.error(
      "Unexpected API response structure:",
      JSON.stringify(result, null, 2),
    );
    throw new Error(
      `No output received from API. Response keys: ${Object.keys(result).join(", ")}`,
    );
  }
}

/**
 * Extract usage statistics from API response
 */
function extractUsageStats(
  result: any,
  durationMs: number,
): ExtractionUsage {
  const usage = result.usage || {};
  const inputTokens = usage.input_tokens || 0;
  const outputTokens = usage.output_tokens || 0;
  const totalTokens = usage.total_tokens || inputTokens + outputTokens;
  const cachedTokens = usage.input_tokens_details?.cached_tokens || 0;
  const systemPrompt = result.instructions || "";

  const estimatedCost = calculateCost(inputTokens, outputTokens, cachedTokens);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cachedTokens: cachedTokens > 0 ? cachedTokens : undefined,
    durationMs,
    estimatedCost,
    systemPrompt: systemPrompt || undefined,
  };
}

/**
 * Create API request body
 */
function createRequestBody(contentItem: any, stream: boolean): any {
  return {
    prompt: {
      id: "pmpt_68f9c3199cec81949e6b6611f1eedaff0b7b1713aaa337a5",
    },
    stream,
    input: [
      {
        role: "user",
        content: [contentItem],
      },
    ],
    store: false,
  };
}

/**
 * Make API request to OpenAI
 */
async function makeApiRequest(requestBody: any): Promise<Response> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetails = "";

    try {
      const errorBody = await response.text();

      errorDetails = errorBody;
    } catch (e) {
      // Ignore if we can't read the error body
    }
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ""}`,
    );
  }

  return response;
}

/**
 * Extract data from a file without streaming (for batch processing)
 * Returns the final result directly without streaming intermediate tokens
 */
export async function extractDataFromFileNonStreaming(
  file: File,
): Promise<ExtractionResult> {
  let uploadedFileId: string | null = null;

  try {
    // Prepare content item
    const { item: contentItem, uploadedFileId: fileId } =
      await prepareContentItem(file);

    uploadedFileId = fileId;

    // Make API request
    const requestBody = createRequestBody(contentItem, false);
    const startTime = Date.now();
    const response = await makeApiRequest(requestBody);

    // Parse response
    const result = await response.json();
    const durationMs = Date.now() - startTime;

    // Extract data and usage
    const resultData = extractDataFromResponse(result);
    const usage = extractUsageStats(result, durationMs);

    return {
      data: resultData,
      usage,
    };
  } catch (error) {
    throw new Error(
      `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (uploadedFileId) {
      await deleteUploadedFile(uploadedFileId);
    }
  }
}

/**
 * Streams OpenAI-compatible API responses as newline-delimited JSON events
 * and extracts the final structured JSON output
 */
export async function extractDataFromFile(
  file: File,
  onStream?: (text: string) => void,
): Promise<ExtractionResult> {
  let uploadedFileId: string | null = null;

  try {
    // Prepare content item
    const { item: contentItem, uploadedFileId: fileId } =
      await prepareContentItem(file);

    uploadedFileId = fileId;

    // Make streaming API request
    const requestBody = createRequestBody(contentItem, true);
    const response = await makeApiRequest(requestBody);

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamedText = "";
    let finalResult: any = null;

    // Track usage statistics
    const startTime = Date.now();
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let cachedTokens = 0;
    let systemPrompt = "";

    // Batching variables for smoother streaming
    let pendingUpdate = false;
    let updateScheduled = false;
    const BATCH_DELAY_MS = 5; // Update UI every 5ms for smooth streaming

    const flushUpdate = () => {
      if (onStream && pendingUpdate) {
        onStream(streamedText);
        pendingUpdate = false;
      }
      updateScheduled = false;
    };

    const scheduleUpdate = () => {
      pendingUpdate = true;
      if (!updateScheduled) {
        updateScheduled = true;
        setTimeout(flushUpdate, BATCH_DELAY_MS);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Flush any pending updates
          flushUpdate();
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");

        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip empty lines or "data: [DONE]" markers
          if (!trimmedLine || trimmedLine === "data: [DONE]") {
            continue;
          }

          // Remove "data: " prefix if present
          const jsonLine = trimmedLine.startsWith("data: ")
            ? trimmedLine.slice(6)
            : trimmedLine;

          try {
            const event = JSON.parse(jsonLine);

            // Accumulate delta tokens for UI streaming
            if (event.type === "response.output_text.delta" && event.delta) {
              streamedText += event.delta;
              // Schedule batched update instead of immediate update
              if (onStream) {
                scheduleUpdate();
              }
            }

            // Extract final structured output
            if (event.type === "response.output_item.done") {
              if (event.item?.content?.[0]?.text) {
                const jsonString = event.item.content[0].text;

                try {
                  finalResult = JSON.parse(jsonString);
                } catch (parseError) {
                  // If parsing fails, return the raw text
                  finalResult = { text: jsonString };
                }
              }
            }

            // Capture usage information from response.done event
            if (event.type === "response.completed") {
              // Check both possible locations for usage data
              const usage = event.response?.usage || event.usage;

              if (usage) {
                inputTokens = usage.input_tokens || 0;
                outputTokens = usage.output_tokens || 0;
                totalTokens = usage.total_tokens || 0;
                cachedTokens = usage.input_tokens_details?.cached_tokens || 0;
              }

              // Capture system prompt/recipe from response
              if (event.response?.instructions) {
                systemPrompt = event.response.instructions;
              }
            }
          } catch (parseError) {
            // Skip unparseable lines silently
            // Continue processing other events
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();

        if (trimmedLine && trimmedLine !== "data: [DONE]") {
          const jsonLine = trimmedLine.startsWith("data: ")
            ? trimmedLine.slice(6)
            : trimmedLine;

          try {
            const event = JSON.parse(jsonLine);

            if (
              event.type === "response.output_item.done" &&
              event.item?.content?.[0]?.text
            ) {
              try {
                finalResult = JSON.parse(event.item.content[0].text);
              } catch {
                finalResult = { text: event.item.content[0].text };
              }
            }
          } catch {
            // Ignore parse errors for final buffer
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Calculate duration
    const durationMs = Date.now() - startTime;

    // Prepare the result data
    let resultData: any;

    if (finalResult) {
      resultData = finalResult;
    } else if (streamedText) {
      resultData = parseJsonSafely(streamedText);
    } else {
      throw new Error("No output received from API");
    }

    // Calculate cost
    const estimatedCost = calculateCost(
      inputTokens,
      outputTokens,
      cachedTokens,
    );

    // Build final response with usage statistics
    return {
      data: resultData,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: totalTokens || inputTokens + outputTokens,
        cachedTokens: cachedTokens > 0 ? cachedTokens : undefined,
        durationMs,
        estimatedCost,
        systemPrompt: systemPrompt || undefined,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    if (uploadedFileId) {
      await deleteUploadedFile(uploadedFileId);
    }
  }
}
