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
 * Streams OpenAI-compatible API responses as newline-delimited JSON events
 * and extracts the final structured JSON output
 */
export async function extractDataFromFile(
  file: File,
  onStream?: (text: string) => void,
): Promise<any> {
  let uploadedFileId: string | null = null;

  try {
    // Convert File to base64 for images or PDFs
    let fileContent: string | undefined;
    let contentItem: any;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      fileContent = await base64Promise;

      contentItem = {
        type: "input_image",
        image_url: fileContent,
      };
    } else if (file.type === "application/pdf") {
      // For PDFs, we need to upload via Files API first, then reference it
      // Ensure filename has lowercase extension (OpenAI requirement)
      let fileName = file.name;
      const extensionMatch = fileName.match(/\.([^.]+)$/);

      if (extensionMatch && extensionMatch[1].toUpperCase() === "PDF") {
        // Replace uppercase PDF with lowercase
        fileName = fileName.replace(/\.PDF$/i, ".pdf");
      }

      // Create a new File object with the corrected filename
      const correctedFile = new File([file], fileName, { type: file.type });

      const formData = new FormData();

      formData.append("file", correctedFile);
      formData.append("purpose", "assistants");

      // Upload the file first
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

      // Track the file ID for cleanup
      uploadedFileId = uploadResult.id;

      // Use the file ID in the content
      contentItem = {
        type: "input_file",
        file_id: uploadResult.id,
      };
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Make direct fetch call to get raw streaming response
    const requestBody = {
      prompt: {
        id: "pmpt_68f9c3199cec81949e6b6611f1eedaff0b7b1713aaa337a5"
      },
      stream: true,
      input: [
        {
          role: "user",
          content: [contentItem],
        },
      ],
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // Get error details from response body
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

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let streamedText = "";
    let finalResult: any = null;
    
    // Batching variables for smoother streaming
    let pendingUpdate = false;
    let updateScheduled = false;
    const BATCH_DELAY_MS = 20; // Update UI every 20ms for smooth streaming

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

    // Return the final structured result or fallback to streamed text
    if (finalResult) {
      return finalResult;
    } else if (streamedText) {
      // Try to parse streamed text as JSON, otherwise return as-is
      try {
        return JSON.parse(streamedText);
      } catch {
        return { text: streamedText };
      }
    } else {
      throw new Error("No output received from API");
    }
  } catch (error) {
    throw new Error(
      `Failed to extract data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    // Clean up uploaded PDF file if it was created
    if (uploadedFileId) {
      try {
        const deleteResponse = await fetch(
          `https://api.openai.com/v1/files/${uploadedFileId}`,
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
  }
}
