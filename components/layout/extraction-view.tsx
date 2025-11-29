"use client";

import { FilePreviewer } from "./file-previewer";
import { ExtractedDataViewer } from "./extracted-data-viewer";
import { JsonTableView } from "./json-table-view";

import { AppStage } from "@/types/enums";
import { useAppStore } from "@/store";

export const ExtractionView = () => {
  const { appStage, jsonContent } = useAppStore();
  const isDataExtracted = appStage === AppStage.ExtractionComplete;

  return (
    <>
      <div className="w-full flex items-center justify-center">
        <div
          className={`w-full grid gap-6 transition-all duration-1000 ease-in-out ${
            isDataExtracted ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          }`}
          style={
            !isDataExtracted ? { maxWidth: "calc(40rem * 1.2)" } : undefined
          }
        >
          <FilePreviewer />
          {isDataExtracted && <ExtractedDataViewer />}
        </div>
      </div>
      {isDataExtracted && jsonContent && <JsonTableView />}
    </>
  );
};
