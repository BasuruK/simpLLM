import { useAppStore } from "@/store";
import { AppStage } from "@/types/enums";
import { extractDataFromFile } from "@/lib/openai";

export const useExtraction = () => {
  const {
    files,
    setAppStage,
    setExtractedText,
    setJsonContent,
    setExtractionUsage,
  } = useAppStore();

  const handleExtract = async (file: File) => {
    setAppStage(AppStage.ExtractionInProgress);
    try {
      const { data, usage } = await extractDataFromFile(file, (text) => {
        setExtractedText(text);
      });

      setJsonContent(data);
      setExtractionUsage(usage);
      setAppStage(AppStage.ExtractionComplete);
    } catch (error) {
      console.error(error);
      setExtractedText("Error extracting data.");
      setAppStage(AppStage.ExtractionComplete);
    }
  };

  return { handleExtract };
};
