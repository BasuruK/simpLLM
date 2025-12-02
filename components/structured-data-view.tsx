"use client";

import { Card } from "@heroui/card";
import { Tooltip } from "@heroui/tooltip";

import {
  InputTokenIcon,
  OutputTokenIcon,
  TokenIcon,
  ClockIcon,
  CacheIcon,
  DollarIcon,
} from "@/components/icons";
import { JsonTable } from "@/components/json-table";
import { ExtractionUsage } from "@/lib/openai";

interface StructuredDataViewProps {
  jsonContent: string;
  extractionUsage: ExtractionUsage | null;
}

export function StructuredDataView({
  jsonContent,
  extractionUsage,
}: StructuredDataViewProps) {
  return (
    <Card className="w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Structured Data View</h2>
        {extractionUsage && (
          <div className="flex items-center gap-4 text-sm text-default-500">
            <Tooltip content="Input Tokens (Prompt/ Recipe + Document).">
              <div className="flex items-center gap-1.5 cursor-help">
                <InputTokenIcon size={16} />
                <span className="font-medium">
                  {extractionUsage.inputTokens.toLocaleString()}
                </span>
                <span className="text-xs">in</span>
              </div>
            </Tooltip>
            <Tooltip content="Output Tokens Generated from LLM (extracted data).">
              <div className="flex items-center gap-1.5 cursor-help">
                <OutputTokenIcon size={16} />
                <span className="font-medium">
                  {extractionUsage.outputTokens.toLocaleString()}
                </span>
                <span className="text-xs">out</span>
              </div>
            </Tooltip>
            <Tooltip content="Total tokens ( Input + Cached + Output ).">
              <div className="flex items-center gap-1.5 cursor-help">
                <TokenIcon size={16} />
                <span className="font-medium">
                  {extractionUsage.totalTokens.toLocaleString()}
                </span>
                <span className="text-xs">total</span>
              </div>
            </Tooltip>
            {extractionUsage.cachedTokens &&
              extractionUsage.cachedTokens > 0 && (
                <Tooltip content="Cached tokens. These are reused to reduce costs and improve speed.">
                  <div className="flex items-center gap-1.5 text-success-500 cursor-help">
                    <CacheIcon size={16} />
                    <span className="font-medium">
                      {extractionUsage.cachedTokens.toLocaleString()}
                    </span>
                    <span className="text-xs">cached</span>
                  </div>
                </Tooltip>
              )}
            <Tooltip content="Total time taken for the extraction process.">
              <div className="flex items-center gap-1.5 cursor-help">
                <ClockIcon size={16} />
                <span className="font-medium">
                  {(extractionUsage.durationMs / 1000).toFixed(2)}s
                </span>
              </div>
            </Tooltip>
            {extractionUsage.estimatedCost !== undefined && (
              <Tooltip content="Total cost of the extraction request.(OpenAI GPT-4o pricing)">
                <div className="flex items-center gap-1.5 text-warning-500 cursor-help">
                  <DollarIcon size={16} />
                  <span className="font-medium">
                    ${extractionUsage.estimatedCost.toFixed(6)}
                  </span>
                </div>
              </Tooltip>
            )}
          </div>
        )}
      </div>
      <JsonTable jsonContent={jsonContent} />
    </Card>
  );
}
