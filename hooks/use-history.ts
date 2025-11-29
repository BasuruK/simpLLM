import { useAppStore } from "@/store";
import { HistoryItem } from "@/types";
import {
  saveHistoryItem,
  getHistoryItems,
  toggleStarHistoryItem,
} from "@/lib/history-storage";
import { saveFileBlob, getFileBlob } from "@/lib/file-storage";
import { generateThumbnail } from "@/lib/file-storage";

export const useHistory = () => {
  const {
    setHistoryItems,
    setFiles,
    setExtractedText,
    setJsonContent,
    setExtractionUsage,
    setCurrentHistoryId,
  } = useAppStore();

  const loadHistory = () => {
    const items = getHistoryItems();

    setHistoryItems(items);
  };

  const saveToHistory = async (
    file: File,
    extractedText: string,
    usage: any,
  ) => {
    const thumbnail = await generateThumbnail(file);
    const newItem = saveHistoryItem({
      timestamp: Date.now(),
      filename: file.name,
      fileType: file.type.startsWith("image/") ? "image" : "pdf",
      fileSize: file.size,
      extractedData: extractedText,
      jsonContent: JSON.parse(extractedText),
      usage,
      starred: false,
      preview: thumbnail,
    });

    await saveFileBlob(newItem.id, file);
    loadHistory();
    setCurrentHistoryId(newItem.id);
  };

  const loadHistoryItem = async (item: HistoryItem) => {
    const file = await getFileBlob(item.id);

    if (file) {
      setFiles([file]);
      setExtractedText(item.extractedData);
      setJsonContent(item.jsonContent);
      setExtractionUsage(item.usage);
      setCurrentHistoryId(item.id);
    }
  };

  const toggleStar = (id: string) => {
    toggleStarHistoryItem(id);
    loadHistory();
  };

  return { loadHistory, saveToHistory, loadHistoryItem, toggleStar };
};
