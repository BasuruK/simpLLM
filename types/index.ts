import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export interface HistoryItem {
  id: string;
  timestamp: number;
  filename: string;
  fileType: string;
  fileSize: number;
  extractedData: string;
  jsonContent: unknown;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedTokens?: number;
    durationMs: number;
    estimatedCost?: number;
  };
  starred: boolean;
  preview?: string;
}
