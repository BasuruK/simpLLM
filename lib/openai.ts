import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true,
});

/**
 * Streams OpenAI-compatible API responses as newline-delimited JSON events
 * and extracts the final structured JSON output
 */
export async function extractDataFromFile(
  file: File,
  onStream?: (text: string) => void
): Promise<any> {
  try {
    // Convert File to base64 for images or PDFs
    let fileContent: string | undefined;
    let contentType: string = "input_image";
    let urlKey: string = "image_url";

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      fileContent = await base64Promise;
      contentType = "input_image";
      urlKey = "image_url";
    } else if (file.type === 'application/pdf') {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      fileContent = await base64Promise;
      contentType = "input_pdf";
      urlKey = "pdf_url";
    }

    // Make direct fetch call to get raw streaming response
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openai.apiKey}`,
      },
      body: JSON.stringify({
        prompt: {
          id: "pmpt_68f9c3199cec81949e6b6611f1eedaff0b7b1713aaa337a5",
          version: "2",
        },
        stream: true,
        input: [
          {
            role: "user",
            content: [
              {
                type: contentType,
                [urlKey]: fileContent,
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamedText = '';
    let finalResult: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines or "data: [DONE]" markers
          if (!trimmedLine || trimmedLine === 'data: [DONE]') {
            continue;
          }

          // Remove "data: " prefix if present
          const jsonLine = trimmedLine.startsWith('data: ') 
            ? trimmedLine.slice(6) 
            : trimmedLine;

          try {
            const event = JSON.parse(jsonLine);

            // Accumulate delta tokens for UI streaming
            if (event.type === 'response.output_text.delta' && event.delta) {
              streamedText += event.delta;
              if (onStream) {
                onStream(streamedText);
              }
            }

            // Extract final structured output
            if (event.type === 'response.output_item.done') {
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
            console.warn('Failed to parse event line:', trimmedLine, parseError);
            // Continue processing other events
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const trimmedLine = buffer.trim();
        if (trimmedLine && trimmedLine !== 'data: [DONE]') {
          const jsonLine = trimmedLine.startsWith('data: ') 
            ? trimmedLine.slice(6) 
            : trimmedLine;
          
          try {
            const event = JSON.parse(jsonLine);
            if (event.type === 'response.output_item.done' && event.item?.content?.[0]?.text) {
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
      throw new Error('No output received from API');
    }

  } catch (error) {
    console.error("Error extracting data:", error);
    throw new Error(`Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
