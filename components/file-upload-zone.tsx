"use client";

import { useRef } from "react";
import { Button } from "@heroui/button";

import { UploadIcon } from "@/components/icons";

interface FileUploadZoneProps {
  isDragging: boolean;
  onFileSelect: (files: File[]) => void;
  fileInputRef?: React.RefObject<HTMLInputElement>;
}

export function FileUploadZone({
  isDragging,
  onFileSelect,
  fileInputRef: externalFileInputRef,
}: FileUploadZoneProps) {
  const internalFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = externalFileInputRef || internalFileInputRef;

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      onFileSelect(Array.from(files));
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`flex flex-col items-center justify-center text-center flex-1 max-w-2xl w-full mx-auto transition-all duration-200 ${
        isDragging ? "scale-95 opacity-50" : ""
      }`}
    >
      <div
        className={`border-2 border-dashed rounded-3xl p-16 w-full transition-all duration-300 ${
          isDragging
            ? "border-primary-400/60 bg-primary-50 dark:bg-primary-950/20 shadow-lg shadow-primary-500/10"
            : "border-default-300/70 hover:border-default-400 hover:bg-default-50 dark:hover:bg-default-100/50 hover:shadow-md"
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          <UploadIcon
            className={`transition-all duration-200 ${
              isDragging ? "text-primary-500 scale-110" : "text-default-400"
            }`}
            size={64}
          />
          <div>
            <p className="text-lg font-medium text-default-600 dark:text-default-400">
              {isDragging ? "Drop your file here" : "No file uploaded yet"}
            </p>
            <p className="text-sm text-default-400 mt-2">
              {isDragging ? (
                "Release to upload"
              ) : (
                <>
                  Click the button below to upload an image or PDF
                  <br />
                  or simply drag and drop here
                </>
              )}
            </p>
          </div>

          {/* Upload Button when no file */}
          <div className="mt-2">
            <input
              ref={fileInputRef}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              type="file"
              onChange={handleImageUpload}
            />
            <Button
              color="primary"
              size="lg"
              startContent={<UploadIcon size={20} />}
              variant="shadow"
              onPress={handleButtonClick}
            >
              Upload Files
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DragOverlayProps {
  isDragging: boolean;
}

export function DragOverlay({ isDragging }: DragOverlayProps) {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="border-3 border-dashed border-primary-400/60 rounded-3xl p-12 bg-primary-50/90 dark:bg-primary-950/90 backdrop-blur-sm shadow-2xl shadow-primary-500/20">
        <div className="flex flex-col items-center gap-4">
          <UploadIcon className="text-primary-500" size={64} />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              Drop your files here
            </p>
            <p className="text-sm text-primary-500 mt-2">
              Supports images and PDF files
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
