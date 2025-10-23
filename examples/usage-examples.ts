/**
 * Example usage of the streaming OpenAI function
 * 
 * This demonstrates how to use extractDataFromFile() with proper
 * event handling and structured output parsing.
 */

import { extractDataFromFile } from '../lib/openai';

// Example 1: Basic usage without streaming callback
async function basicExample(file: File) {
  try {
    const result = await extractDataFromFile(file);
    console.log('Final result:', result);
    // result is a parsed JSON object, e.g.:
    // { name: "John Doe", email: "john@example.com", ... }
  } catch (error) {
    console.error('Extraction failed:', error);
  }
}

// Example 2: With real-time streaming updates
async function streamingExample(file: File) {
  let streamedContent = '';
  
  try {
    const result = await extractDataFromFile(
      file,
      (streamedText: string) => {
        streamedContent = streamedText;
        console.log('Stream update:', streamedText);
        // Update your UI here in real-time
      }
    );
    
    console.log('Final structured result:', result);
    console.log('Final streamed text:', streamedContent);
    
  } catch (error) {
    console.error('Extraction failed:', error);
  }
}

// Example 3: React component usage (see app/page.tsx for actual implementation)
// This is pseudocode to show the pattern:
/*
function ExampleComponent() {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleExtract = async (file: File) => {
    setIsLoading(true);
    setStreamingText('Starting extraction...');
    
    try {
      // Stream updates to UI
      const result = await extractDataFromFile(file, (text) => {
        setStreamingText(text);
      });
      
      // Set final structured data
      setExtractedData(result);
      
      // Display formatted JSON
      setStreamingText(JSON.stringify(result, null, 2));
      
    } catch (error) {
      console.error(error);
      setStreamingText('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // JSX would go here
  );
}
*/

// Example 4: Processing the structured result
async function processStructuredResult(file: File) {
  const result = await extractDataFromFile(file);
  
  // Now you can work with structured data
  if (result.name) {
    console.log('Name:', result.name);
  }
  
  if (result.items && Array.isArray(result.items)) {
    result.items.forEach((item: any) => {
      console.log('Item:', item);
    });
  }
  
  // Access nested properties
  const email = result.contact?.email || 'No email found';
  console.log('Email:', email);
}

// Example 5: Error handling patterns
async function robustExample(file: File) {
  try {
    const result = await extractDataFromFile(file, (text: string) => {
      // Real-time updates
      console.log('Progress:', text.length, 'characters');
    });
    
    // Validate the result structure
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid result format');
    }
    
    // Safe property access
    const data = {
      name: result.name ?? 'Unknown',
      date: result.date ?? new Date().toISOString(),
      items: Array.isArray(result.items) ? result.items : [],
    };
    
    return data;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('API request failed')) {
        console.error('Network error:', error);
      } else if (error.message.includes('No output received')) {
        console.error('Empty response:', error);
      } else {
        console.error('Unexpected error:', error);
      }
    }
    throw error;
  }
}

// Example 6: Event type detection (advanced)
// If you need to inspect raw events, you can modify the function
// to expose event details through a custom callback

interface StreamEvent {
  type: string;
  delta?: string;
  item?: {
    content?: Array<{ text: string }>;
  };
}

async function advancedStreamingExample(file: File) {
  const events: StreamEvent[] = [];
  
  // In a modified version, you could capture events:
  // const result = await extractDataFromFile(file, {
  //   onDelta: (delta) => console.log('Delta:', delta),
  //   onEvent: (event) => events.push(event),
  //   onComplete: (final) => console.log('Final:', final),
  // });
  
  // For now, use the simple callback:
  const result = await extractDataFromFile(file, (text: string) => {
    console.log('Streamed text length:', text.length);
  });
  
  return result;
}

export {
  basicExample,
  streamingExample,
  processStructuredResult,
  robustExample,
  advancedStreamingExample,
};
