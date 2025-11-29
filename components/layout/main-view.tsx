"use client";

import { ReadyView } from "./ready-view";
import { ExtractionView } from "./extraction-view";

import { useAppStore } from "@/store";
import { AppStage } from "@/types/enums";

export const MainView = () => {
  const { appStage } = useAppStore();

  switch (appStage) {
    case AppStage.Ready:
      return <ReadyView />;
    case AppStage.FilesSelected:
    case AppStage.ExtractionInProgress:
    case AppStage.ExtractionComplete:
      return <ExtractionView />;
    default:
      return null;
  }
};
