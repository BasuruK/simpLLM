import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-4 text-base leading-7 text-default-700 dark:text-default-300">
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-default-900 dark:text-default-100 border-b border-default-200 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-default-900 dark:text-default-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-default-800 dark:text-default-200">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 text-default-800 dark:text-default-200">
              {children}
            </h4>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-default-700 dark:text-default-300">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-default-700 dark:text-default-300">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-7">{children}</li>,
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-default-100 dark:bg-default-900 p-4 rounded-lg text-sm font-mono overflow-x-auto my-3 border border-default-200 dark:border-default-800">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="my-4">{children}</pre>,
          strong: ({ children }) => (
            <strong className="font-bold text-default-900 dark:text-default-100">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-default-800 dark:text-default-200">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-500 pl-4 py-2 my-4 italic text-default-600 dark:text-default-400 bg-default-50 dark:bg-default-900/20">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary-600 dark:text-primary-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-default-300 dark:border-default-700">
                {children}
              </table>
            </div>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-default-200 dark:border-default-700">
              {children}
            </tr>
          ),
          thead: ({ children }) => (
            <thead className="bg-default-100 dark:bg-default-700">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border border-default-300 dark:border-default-700 px-4 py-2 text-left font-semibold text-default-900 dark:text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-default-300 dark:border-default-700 px-4 py-2 text-default-900 dark:text-white">
              {children}
            </td>
          ),
          hr: () => <hr className="my-6 border-default-200 dark:border-default-800" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
