"use client";

import { Card } from "@heroui/card";
import { Tooltip } from "@heroui/tooltip";

import { useAppStore } from "@/store";
import { InputTokenIcon } from "@/components/icons";
import { JsonTable } from "@/components/json-table";

export const JsonTableView = () => {
  const { jsonContent, extractionUsage } = useAppStore();

  if (!jsonContent || !extractionUsage) return null;

  return (
    <Card className="w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Structured Data View</h2>
        <div className="flex items-center gap-4 text-sm text-default-500">
          <Tooltip content="Input Tokens">
            <div className="flex items-center gap-1.5 cursor-help">
              <InputTokenIcon size={16} />
              <span>{extractionUsage.inputTokens.toLocaleString()}</span>
            </div>
          </Tooltip>
          {/* ... other stats */}
        </div>
      </div>
      <JsonTable jsonContent={JSON.stringify(jsonContent)} />
    </Card>
  );
};
