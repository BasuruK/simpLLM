"use client";

interface CodeEditorProps {
  value: string;
  minRows?: number;
  language?: "json" | "text";
}

// Helper function to syntax highlight JSON
function highlightJSON(jsonString: string): JSX.Element[] {
  const elements: JSX.Element[] = [];
  let key = 0;

  // Simple JSON syntax highlighter
  const tokenPattern =
    /("(?:[^"\\]|\\.)*")|(\d+\.?\d*)|(\btrue\b|\bfalse\b|\bnull\b)|([{}[\],:])/g;
  let lastIndex = 0;

  jsonString.replace(
    tokenPattern,
    (match, string, number, keyword, punctuation, offset) => {
      // Add any text before this match
      if (offset > lastIndex) {
        elements.push(
          <span key={key++} className="text-default-700">
            {jsonString.slice(lastIndex, offset)}
          </span>,
        );
      }

      // Add the matched token with appropriate styling
      if (string) {
        // Check if it's a key (followed by a colon) or a value
        const nextChar = jsonString.slice(offset + match.length).trim()[0];
        const isKey = nextChar === ":";

        elements.push(
          <span
            key={key++}
            className={
              isKey
                ? "text-orange-600 dark:text-orange-400 font-semibold"
                : "text-green-600 dark:text-green-400"
            }
          >
            {match}
          </span>,
        );
      } else if (number) {
        elements.push(
          <span key={key++} className="text-orange-600 dark:text-orange-400">
            {match}
          </span>,
        );
      } else if (keyword) {
        elements.push(
          <span
            key={key++}
            className="text-purple-600 dark:text-purple-400 font-semibold"
          >
            {match}
          </span>,
        );
      } else if (punctuation) {
        elements.push(
          <span key={key++} className="text-default-500">
            {match}
          </span>,
        );
      }

      lastIndex = offset + match.length;

      return match;
    },
  );

  // Add any remaining text
  if (lastIndex < jsonString.length) {
    elements.push(
      <span key={key++} className="text-default-700">
        {jsonString.slice(lastIndex)}
      </span>,
    );
  }

  return elements;
}

export function CodeEditor({
  value,
  minRows = 25,
  language = "json",
}: CodeEditorProps) {
  // Calculate fixed height based on rows
  const fixedHeight = minRows * 1.8 + 1; // Approximate line height in rem

  return (
    <div
      className="border border-default-200 rounded-lg p-3 overflow-auto bg-default-100/50 dark:bg-default-100/30"
      style={{
        height: `${fixedHeight}rem`,
        fontFamily: 'ui-monospace, SFMono-Regular, "Jetbrains Mono", monospace',
        fontSize: "0.875rem",
        lineHeight: "1.5rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {language === "json" ? highlightJSON(value) : value}
    </div>
  );
}
