"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

interface JsonTableProps {
  jsonContent: string;
}

// Component to render nested data as a small table
function NestedTable({ data, depth = 0 }: { data: any; depth?: number }) {
  // Limit recursion depth to prevent infinite loops
  const maxDepth = 5; // Increased from 3 to handle deeper nesting

  if (Array.isArray(data)) {
    // Handle empty arrays
    if (data.length === 0) {
      return <span className="text-xs text-default-400">Empty array</span>;
    }

    // Handle arrays of objects
    if (data[0] !== null && typeof data[0] === "object" && !Array.isArray(data[0])) {
      const keys = Object.keys(data[0]);

      return (
        <div className="my-2">
          <Table
            removeWrapper
            aria-label="Nested data"
            classNames={{
              base: "text-xs",
              th: "text-xs py-1 px-2 bg-default-200 dark:bg-default-100",
              td: "text-xs py-1 px-2",
            }}
            color="default"
          >
            <TableHeader>
              {keys.map((key) => (
                <TableColumn key={key}>
                  {key.replace(/_/g, " ").toUpperCase()}
                </TableColumn>
              ))}
            </TableHeader>
            <TableBody>
              {data.map((item, idx) => (
                <TableRow key={idx}>
                  {keys.map((key) => (
                    <TableCell key={`${idx}-${key}`} className="align-top">
                      {typeof item[key] === "object" &&
                      item[key] !== null &&
                      depth < maxDepth ? (
                        <NestedTable data={item[key]} depth={depth + 1} />
                      ) : (
                        <span className="whitespace-pre-wrap">{String(item[key] ?? "")}</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    } else {
      // Simple array (primitives)
      return (
        <div className="my-2">
          <ul className="list-disc list-inside text-xs space-y-1">
            {data.map((item, idx) => (
              <li key={idx}>
                {typeof item === "object" && item !== null && depth < maxDepth ? (
                  <NestedTable data={item} depth={depth + 1} />
                ) : (
                  String(item)
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
  } else if (typeof data === "object" && data !== null) {
    // Handle nested objects - render as striped mini table
    return (
      <div className="my-2">
        <Table
          removeWrapper
          aria-label="Nested object"
          classNames={{
            base: "text-xs",
            th: "text-xs py-1 px-2 bg-default-200 dark:bg-default-100",
            td: "text-xs py-1 px-2",
          }}
          color="default"
        >
          <TableHeader>
            <TableColumn>FIELD</TableColumn>
            <TableColumn>VALUE</TableColumn>
          </TableHeader>
          <TableBody>
            {Object.entries(data).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="font-semibold align-top w-1/3">
                  {key.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="align-top">
                  {typeof value === "object" &&
                  value !== null &&
                  depth < maxDepth ? (
                    <NestedTable data={value} depth={depth + 1} />
                  ) : (
                    <span className="whitespace-pre-wrap">{String(value ?? "")}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return <span className="whitespace-pre-wrap">{String(data)}</span>;
}

export function JsonTable({ jsonContent }: JsonTableProps) {
  // Parse the JSON content
  const parseJsonData = () => {
    try {
      const data = JSON.parse(jsonContent);

      // Convert the JSON object into table rows
      const rows: {
        key: string;
        field: string;
        value: any;
        isNested: boolean;
      }[] = [];

      const flattenObject = (obj: any, prefix = "") => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (value && typeof value === "object" && !Array.isArray(value)) {
            // Don't flatten nested objects - show them as nested tables instead
            rows.push({
              key: fullKey,
              field: key,
              value: value,
              isNested: true,
            });
          } else if (Array.isArray(value)) {
            // Handle arrays - show as nested tables
            rows.push({
              key: fullKey,
              field: key,
              value: value,
              isNested: true,
            });
          } else {
            // Handle primitive values
            rows.push({
              key: fullKey,
              field: key,
              value: String(value ?? ""),
              isNested: false,
            });
          }
        });
      };

      flattenObject(data);

      return rows;
    } catch (error) {
      console.error("Failed to parse JSON:", error);

      return [];
    }
  };

  const rows = parseJsonData();

  if (rows.length === 0) {
    return (
      <div className="text-center text-default-400 py-8">
        <p>No data available to display</p>
      </div>
    );
  }

  return (
    <Table
      aria-label="Extracted data table"
      classNames={{
        wrapper: "bg-transparent",
        th: "text-sm",
        td: "",
      }}
      color="default"
    >
      <TableHeader>
        <TableColumn>INVOICE SECTION</TableColumn>
        <TableColumn>EXTRACTED</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={`${row.key}-${index}`}>
            <TableCell className="font-medium align-top w-1/4">
              {row.field}
            </TableCell>
            <TableCell className="align-top">
              {row.isNested ? (
                <NestedTable data={row.value} />
              ) : (
                <span className="whitespace-pre-wrap">{row.value}</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
