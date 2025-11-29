import { useState, useEffect } from "react";

import { useAppStore } from "@/store";
import { getSelectedPages } from "@/lib/file-storage";

export const useFileActions = () => {
  const { files } = useAppStore();
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [selectedPagesMap, setSelectedPagesMap] = useState<
    Record<string, number[]>
  >({});

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));

    setFileUrls(urls);

    const loadSelectedPages = async () => {
      const entries: Record<string, number[]> = {};

      for (const file of files) {
        const id = `${file.name}_${file.size}_${file.lastModified}`;
        const pages = await getSelectedPages(id);

        if (pages && pages.length > 0) {
          entries[id] = pages;
        }
      }
      setSelectedPagesMap(entries);
    };

    loadSelectedPages();

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleSlideChange = (swiper: any) => {
    setCurrentFileIndex(swiper.activeIndex);
  };

  return {
    currentFileIndex,
    fileUrls,
    selectedPagesMap,
    handleSlideChange,
  };
};
