"use client";

import { useRef } from "react";
import { Button } from "@heroui/button";

import { useFileHandling } from "@/hooks/use-file-handling";
import { UploadIcon } from "@/components/icons";

export const ReadyView = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    processFiles,
  } = useFileHandling();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  return (
    <section
      className="flex flex-col items-center justify-center flex-1 py-8 gap-6 relative transition-all duration-200"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center flex-1 max-w-2xl w-full mx-auto">
        <div className="border-2 border-dashed rounded-3xl p-16 w-full border-default-300/70 hover:border-default-400 hover:bg-default-50 dark:hover:bg-default-100/50 hover:shadow-md">
          <div className="flex flex-col items-center gap-6">
            <UploadIcon className="text-default-400" size={64} />
            <div>
              <p className="text-lg font-medium text-default-600 dark:text-default-400">
                No file uploaded yet
              </p>
              <p className="text-sm text-default-400 mt-2">
                Click the button below to upload an image or PDF
                <br />
                or simply drag and drop here
              </p>
            </div>

            <div className="mt-2">
              <input
                ref={fileInputRef}
                multiple
                accept="image/*,application/pdf"
                className="hidden"
                type="file"
                onChange={handleFileChange}
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
    </section>
  );
};
