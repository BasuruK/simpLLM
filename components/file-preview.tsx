"use client";

interface FilePreviewProps {
  file: File;
  fileUrl: string;
  fileIndex: number;
  totalFiles: number;
  minRows?: number;
}

const DEFAULT_ROWS = 25;
const ROW_HEIGHT_REM = 1.9; // Match line-height from code-editor
const CONTAINER_PADDING = 1.9;

export function FilePreview({
  file,
  fileUrl,
  fileIndex,
  totalFiles,
  minRows = DEFAULT_ROWS,
}: FilePreviewProps) {
  const isImage = file.type.startsWith("image/");
  const previewHeight = minRows * ROW_HEIGHT_REM + CONTAINER_PADDING;

  return (
    <div
      className="w-full border border-default-200 rounded-lg overflow-hidden bg-default-50 dark:bg-default-100 flex items-center justify-center"
      style={{ height: `${previewHeight}rem` }}
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
      ) : (
        <iframe
          className="w-full h-full"
          src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          title={`PDF Preview of ${file.name} (${fileIndex + 1} of ${totalFiles})`}
        />
      )}
    </div>
  );
}
