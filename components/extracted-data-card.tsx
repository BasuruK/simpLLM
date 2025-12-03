"use client";

import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";

import {
  CopyIcon,
  CheckIcon,
  ScrewdriverIcon,
  SaveIcon,
} from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";
import { ExtractionUsage } from "@/lib/openai";

interface ExtractedDataCardProps {
  isExtracting: boolean;
  hasReceivedData: boolean;
  extractedText: string;
  extractionUsage: ExtractionUsage | null;
  currentHistoryId: string | null;
  devOptionsEnabled: boolean;
  isCopied: boolean;
  onSave: () => void;
  onCopy: () => void;
  onOpenStats: () => void;
}

export function ExtractedDataCard({
  isExtracting,
  hasReceivedData,
  extractedText,
  extractionUsage,
  currentHistoryId,
  devOptionsEnabled,
  isCopied,
  onSave,
  onCopy,
  onOpenStats,
}: ExtractedDataCardProps) {
  return (
    <Card className="p-4 animate-in slide-in-from-right duration-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Extracted Data</h2>
        <div className="flex items-center gap-2">
          {/* Only show Save button for new extractions, not saved items */}
          {!isExtracting &&
            extractedText &&
            extractionUsage &&
            !currentHistoryId && (
              <Button
                color="success"
                size="sm"
                startContent={<SaveIcon size={18} />}
                variant="flat"
                onPress={onSave}
              >
                Save
              </Button>
            )}
          {devOptionsEnabled && extractionUsage && (
            <Button
              color="warning"
              size="sm"
              startContent={<ScrewdriverIcon size={18} />}
              variant="flat"
              onPress={onOpenStats}
            >
              Stats
            </Button>
          )}
          <Button
            color="primary"
            isDisabled={!extractedText}
            size="sm"
            startContent={
              isCopied ? <CheckIcon size={18} /> : <CopyIcon size={18} />
            }
            variant="flat"
            onPress={onCopy}
          >
            {isCopied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Show Skeleton while loading */}
      {isExtracting && !hasReceivedData ? (
        <div className="space-y-3">
          <Skeleton className="rounded-lg">
            <div className="h-12 rounded-lg bg-default-300" />
          </Skeleton>
          <Skeleton className="w-4/5 rounded-lg">
            <div className="h-8 rounded-lg bg-default-200" />
          </Skeleton>
          <Skeleton className="w-3/5 rounded-lg">
            <div className="h-8 rounded-lg bg-default-200" />
          </Skeleton>
          <Skeleton className="w-5/6 rounded-lg">
            <div className="h-8 rounded-lg bg-default-300" />
          </Skeleton>
          <Skeleton className="w-2/5 rounded-lg">
            <div className="h-8 rounded-lg bg-default-200" />
          </Skeleton>
          <Skeleton className="w-4/5 rounded-lg">
            <div className="h-8 rounded-lg bg-default-300" />
          </Skeleton>
          <Skeleton className="w-3/5 rounded-lg">
            <div className="h-8 rounded-lg bg-default-200" />
          </Skeleton>
        </div>
      ) : extractedText ? (
        <CodeEditor language="json" value={extractedText} />
      ) : null}
    </Card>
  );
}
