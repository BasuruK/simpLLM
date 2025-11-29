import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { ExtractionUsage } from "@/lib/openai";
import { HistoryItem } from "@/types";
import { AppStage } from "@/types/enums";
import { clearAllHistory, deleteHistoryItem } from "@/lib/history-storage";
import { deleteFileBlob, clearAllFileBlobs } from "@/lib/file-storage";

interface AppState {
  appStage: AppStage;
  setAppStage: (stage: AppStage) => void;

  files: File[];
  setFiles: (files: File[]) => void;
  clearFiles: () => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;

  isExtracting: boolean;
  setIsExtracting: (isExtracting: boolean) => void;
  extractedText: string | null;
  setExtractedText: (text: string | null) => void;
  jsonContent: any | null;
  setJsonContent: (json: any | null) => void;
  extractionUsage: ExtractionUsage | null;
  setExtractionUsage: (usage: ExtractionUsage | null) => void;

  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;
  historyItems: HistoryItem[];
  setHistoryItems: (items: HistoryItem[]) => void;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;

  reset: () => void;
}

const initialState = {
  appStage: AppStage.Ready,
  files: [],
  isDragging: false,
  isExtracting: false,
  extractedText: null,
  jsonContent: null,
  extractionUsage: null,
  currentHistoryId: null,
  historyItems: [],
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        setAppStage: (stage) => set({ appStage: stage }),
        setFiles: (files) =>
          set({
            files,
            appStage:
              files.length > 0 ? AppStage.FilesSelected : AppStage.Ready,
          }),
        clearFiles: () => set({ files: [] }),
        setIsDragging: (isDragging) => set({ isDragging }),
        setIsExtracting: (isExtracting) => set({ isExtracting }),
        setExtractedText: (text) => set({ extractedText: text }),
        setJsonContent: (json) => set({ jsonContent: json }),
        setExtractionUsage: (usage) => set({ extractionUsage: usage }),
        setCurrentHistoryId: (id) => set({ currentHistoryId: id }),
        setHistoryItems: (items) => set({ historyItems: items }),
        deleteHistoryItem: async (id) => {
          deleteHistoryItem(id);
          await deleteFileBlob(id);
          set((state) => ({
            historyItems: state.historyItems.filter((item) => item.id !== id),
            currentHistoryId:
              state.currentHistoryId === id ? null : state.currentHistoryId,
          }));
        },
        clearAllHistory: async () => {
          clearAllHistory();
          await clearAllFileBlobs();
          set({
            historyItems: [],
            currentHistoryId: null,
          });
        },
        reset: () => set(initialState),
      })),
      {
        name: "app-storage",
        partialize: (state) => ({
          historyItems: state.historyItems,
        }),
      },
    ),
  ),
);
