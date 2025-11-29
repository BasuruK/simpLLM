"use client";

import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";

import { useAppStore } from "@/store";
import { AppStage } from "@/types/enums";
import { SaveIcon, ScrewdriverIcon, CopyIcon } from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";

export const ExtractedDataViewer = () => {
  const { appStage, extractedText, extractionUsage, currentHistoryId } =
    useAppStore();
  const isExtracting = appStage === AppStage.ExtractionInProgress;

  return (
    <Card className="p-4 animate-in slide-in-from-right duration-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Extracted Data</h2>
        <div className="flex items-center gap-2">
          {!isExtracting &&
            extractedText &&
            extractionUsage &&
            !currentHistoryId && (
              <Button
                color="success"
                size="sm"
                startContent={<SaveIcon size={18} />}
                variant="flat"
              >
                Save
              </Button>
            )}
          <Button
            color="warning"
            size="sm"
            startContent={<ScrewdriverIcon size={18} />}
            variant="flat"
          >
            Stats
          </Button>
          <Button
            color="primary"
            size="sm"
            startContent={<CopyIcon size={18} />}
            variant="flat"
          >
            Copy
          </Button>
        </div>
      </div>

      {isExtracting ? (
        <div className="space-y-3">
          <Skeleton className="rounded-lg">
            <div className="h-12 rounded-lg bg-default-300" />
          </Skeleton>
          {/* ... other skeletons */}
        </div>
      ) : extractedText ? (
        <CodeEditor language="json" value={extractedText} />
      ) : null}
    </Card>
  );
};
