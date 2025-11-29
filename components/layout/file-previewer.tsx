"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Card } from "@heroui/card";

import { useAppStore } from "@/store";
import { FilePreview } from "@/components/file-preview";
import { DocumentIcon } from "@/components/icons";
import { useFileActions } from "@/hooks/use-file-actions";

export const FilePreviewer = () => {
  const { files } = useAppStore();
  const { handleSlideChange, fileUrls, selectedPagesMap } = useFileActions();

  return (
    <Card className="p-4">
      <div
        aria-label="File preview carousel"
        aria-roledescription="carousel"
        className="relative w-full"
        role="region"
      >
        <Swiper
          navigation
          keyboard={{ enabled: true }}
          modules={[Navigation, Pagination, Keyboard]}
          pagination={{ clickable: true }}
          slidesPerView={1}
          spaceBetween={0}
          style={{ paddingBottom: "20px" }}
          onSlideChange={handleSlideChange}
        >
          {files.map((file, index) => (
            <SwiperSlide
              key={index}
              aria-label={`${file.name} (Slide ${index + 1} of ${
                files.length
              })`}
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
                totalFiles={files.length}
              />
            </SwiperSlide>
          ))}
        </Swiper>

        {files.length > 1 && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-default-500 bg-default-100/80 dark:bg-default-50/80 backdrop-blur-sm rounded-full"
          >
            <DocumentIcon size={16} />
            <span className="text-sm font-medium">
              {/* Add current slide index */}1 / {files.length}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
