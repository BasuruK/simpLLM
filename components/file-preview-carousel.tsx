"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Spinner } from "@heroui/spinner";

import {
  TrashIcon,
  SparklesIcon,
  HistoryIcon,
  DocumentIcon,
  BackIcon,
} from "@/components/icons";
import { FilePreview } from "@/components/file-preview";

interface FilePreviewCarouselProps {
  selectedFiles: File[];
  fileUrls: string[];
  currentFileIndex: number;
  selectedPagesMap: Record<string, number[]>;
  liveMessage: string;
  isDataExtracted: boolean;
  isExtracting: boolean;
  isProcessingPdf: boolean;
  currentHistoryId: string | null;
  pdfPageCount: number;
  invoiceCount: number;
  activeJobCount: number;
  onSlideChange: (index: number) => void;
  onLiveMessageChange: (message: string) => void;
  onPdfDrawerOpen: () => void;
  onExtract: () => void;
  onClear: () => void;
}

export function FilePreviewCarousel({
  selectedFiles,
  fileUrls,
  currentFileIndex,
  selectedPagesMap,
  liveMessage,
  isDataExtracted,
  isExtracting,
  isProcessingPdf,
  currentHistoryId,
  pdfPageCount,
  invoiceCount,
  activeJobCount,
  onSlideChange,
  onLiveMessageChange,
  onPdfDrawerOpen,
  onExtract,
  onClear,
}: FilePreviewCarouselProps) {
  return (
    <Card
      className={`p-4 transition-all duration-1000 ease-in-out ${
        isDataExtracted ? "" : "mx-auto w-full"
      }`}
    >
      <div
        aria-label="File preview carousel"
        aria-roledescription="carousel"
        className="relative w-full"
        role="region"
      >
        {/* Live region for screen reader announcements */}
        <div aria-atomic="true" aria-live="polite" className="sr-only">
          {liveMessage}
        </div>

        <Swiper
          navigation
          keyboard={{ enabled: true }}
          modules={[Navigation, Pagination, Keyboard]}
          pagination={{ clickable: true }}
          slidesPerView={1}
          spaceBetween={0}
          style={{ paddingBottom: "20px" }}
          onSlideChange={(swiper) => {
            onSlideChange(swiper.activeIndex);
            onLiveMessageChange(
              `Viewing file ${swiper.activeIndex + 1} of ${selectedFiles.length}`,
            );
          }}
        >
          {selectedFiles.map((file, index) => (
            <SwiperSlide
              key={index}
              aria-label={`${file.name} (Slide ${index + 1} of ${selectedFiles.length})`}
              aria-roledescription="slide"
              role="group"
            >
              <FilePreview
                file={file}
                fileIndex={index}
                fileUrl={fileUrls[index]}
                minRows={34}
                selectedPages={
                  selectedPagesMap[
                    `${file.name}_${file.size}_${file.lastModified}`
                  ] || []
                }
                totalFiles={selectedFiles.length}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {/* File count indicator - centered at bottom */}
        {selectedFiles.length > 1 && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-default-500 bg-default-100/80 dark:bg-default-50/80 backdrop-blur-sm rounded-full"
          >
            <DocumentIcon size={16} />
            <span className="text-sm font-medium">
              {currentFileIndex + 1} / {selectedFiles.length}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center gap-2 mt-2">
        {/* Spinner indicator when extracting */}
        {isExtracting && (
          <div className="flex items-center gap-2 text-success">
            <Spinner color="success" size="sm" />
            <span className="text-sm font-medium">Extracting data...</span>
          </div>
        )}

        {/* Saved item indicator */}
        {!isExtracting && currentHistoryId && (
          <div className="flex items-center gap-2 text-primary">
            <HistoryIcon size={18} />
            <span className="text-sm font-medium">
              Viewing saved extraction
            </span>
          </div>
        )}

        <div className="flex gap-2 ml-auto">
          {!isDataExtracted &&
            !currentHistoryId &&
            selectedFiles[currentFileIndex]?.type === "application/pdf" &&
            pdfPageCount > 1 && (
              <Button
                color="secondary"
                startContent={<DocumentIcon size={18} />}
                variant="flat"
                onPress={onPdfDrawerOpen}
              >
                Mark Pages
                {invoiceCount > 0 && (
                  <span className="ml-2 text-xs text-primary font-semibold">
                    {invoiceCount} invoice
                    {invoiceCount !== 1 ? "s" : ""}
                  </span>
                )}
              </Button>
            )}
          {!isDataExtracted && (
            <Button
              color="success"
              disabled={isExtracting || activeJobCount > 0 || isProcessingPdf}
              isLoading={isExtracting || isProcessingPdf}
              startContent={
                !isExtracting && !isProcessingPdf ? (
                  <SparklesIcon size={18} />
                ) : undefined
              }
              variant="flat"
              onPress={onExtract}
            >
              {isExtracting
                ? "Extracting..."
                : isProcessingPdf
                  ? "Processing..."
                  : `Extract${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ""}`}
            </Button>
          )}
          <Button
            color={currentHistoryId ? "default" : "danger"}
            isIconOnly={!currentHistoryId}
            startContent={
              currentHistoryId ? (
                <BackIcon size={18} />
              ) : (
                <TrashIcon size={18} />
              )
            }
            variant="flat"
            onPress={onClear}
          >
            {currentHistoryId ? "Back" : null}
          </Button>
        </div>
      </div>
    </Card>
  );
}
