"use client";

import { Button } from "@heroui/button";

interface FilePreviewProps {
  file: File;
  fileUrl: string;
  fileIndex: number;
  totalFiles: number;
  isFailed: boolean;
  onRetry: () => void;
  onError: () => void;
}

export function FilePreview({
  file,
  fileUrl,
  fileIndex,
  totalFiles,
  isFailed,
  onRetry,
  onError,
}: FilePreviewProps) {
  const isImage = file.type.startsWith("image/");

  return (
    <div
      className="w-full border border-default-200 rounded-lg overflow-hidden bg-default-50 dark:bg-default-100 flex items-center justify-center"
      style={{ height: `${25 * 1.9 + 1}rem` }}
    >
      {isImage ? (
        fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={`Preview of ${file.name} (${fileIndex + 1} of ${totalFiles})`}
            src={fileUrl}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-default-500">
            <p className="text-sm">No preview available</p>
          </div>
        )
      ) : isFailed ? (
        <div
          aria-live="polite"
          className="flex flex-col items-center justify-center gap-4 p-8 text-center"
          role="alert"
        >
          <div className="text-danger text-lg font-semibold">
            Failed to load PDF preview
          </div>
          <p className="text-default-500 text-sm">{file.name}</p>
          <Button color="primary" size="sm" variant="flat" onPress={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <iframe
          className="w-full h-full"
          src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          title={`PDF Preview of ${file.name} (${fileIndex + 1} of ${totalFiles})`}
          onError={onError}
        />
      )}
    </div>
  );
}
