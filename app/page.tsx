"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { Tooltip } from "@heroui/tooltip";
import { Alert } from "@heroui/alert";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import { useDisclosure } from "@heroui/modal";
import { PDFDocument } from "pdf-lib";

import { extractDataFromFile, ExtractionUsage } from "@/lib/openai";
import {
  CopyIcon,
  TrashIcon,
  SparklesIcon,
  InputTokenIcon,
  OutputTokenIcon,
  TokenIcon,
  ClockIcon,
  CacheIcon,
  CheckIcon,
  DollarIcon,
  ScrewdriverIcon,
  HistoryIcon,
  SaveIcon,
  DocumentIcon,
  BackIcon,
} from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";
import { JsonTable } from "@/components/json-table";
import { LoginScreen } from "@/components/login-screen";
import { Navbar } from "@/components/navbar";
import { FilePreview } from "@/components/file-preview";
import { FileUploadZone, DragOverlay } from "@/components/file-upload-zone";
import { HistoryDrawer } from "@/components/history-drawer";
import { Snow } from "@/components/snow";
import {
  isAuthenticated,
  getUsername,
  getAvatarUrl,
  clearCredentials,
} from "@/lib/secure-storage";
import {
  getHistoryItems,
  saveHistoryItem,
  toggleStarHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
} from "@/lib/history-storage";
import {
  saveFileBlob,
  getFileBlob,
  deleteFileBlob,
  generateThumbnail,
  clearAllFileBlobs,
  saveSelectedPages,
  getSelectedPages,
  deleteSelectedPages,
} from "@/lib/file-storage";
import { useJobManager } from "@/hooks/use-job-manager";
import { HistoryItem } from "@/types";

const PdfPageDrawer = dynamic(
  () => import("@/components/pdf-page-drawer").then((mod) => mod.PdfPageDrawer),
  { ssr: false },
);

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const fileUrlsRef = useRef<string[]>([]);
  const [liveMessage, setLiveMessage] = useState("");
  const [isDataExtracted, setIsDataExtracted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  const [extractionUsage, setExtractionUsage] =
    useState<ExtractionUsage | null>(null);
  const [devOptionsEnabled, setDevOptionsEnabled] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [showBatchNotification, setShowBatchNotification] = useState(false);
  const batchNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pdfPageCount, setPdfPageCount] = useState<number>(0);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  // Reset pdfPageCount to 0 whenever the current file changes
  useEffect(() => {
    setPdfPageCount(0);
  }, [selectedFiles, currentFileIndex]);
  const [selectedPagesMap, setSelectedPagesMap] = useState<Record<string, number[]>>({});
  const invoiceCount = useMemo(() => {
    const currentFile = selectedFiles[currentFileIndex];
    if (!currentFile) return 0;
    const id = `${currentFile.name}_${currentFile.size}_${currentFile.lastModified}`;
    const selected = selectedPagesMap[id] || [];
    if (selected.length === 0) return 0;
    let count = 0;
    let currentGroup: number[] = [];

    for (let i = 1; i <= pdfPageCount; i++) {
      if (selected.includes(i)) {
        if (currentGroup.length > 0) {
          count++;
        }
        currentGroup = [i];
      } else {
        currentGroup.push(i);
      }
    }
    if (currentGroup.length > 0) {
      count++;
    }

    return count;
  }, [selectedPagesMap, pdfPageCount, selectedFiles, currentFileIndex]);
  const hasReceivedDataRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveSuccessTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragCounterRef = useRef(0);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const {
    isOpen: isHistoryOpen,
    onOpen: onHistoryOpen,
    onOpenChange: onHistoryOpenChange,
  } = useDisclosure();
  const {
    isOpen: isClearModalOpen,
    onOpen: onClearModalOpen,
    onOpenChange: onClearModalOpenChange,
  } = useDisclosure();
  const {
    isOpen: isPdfDrawerOpen,
    onOpen: onPdfDrawerOpen,
    onClose: onPdfDrawerClose,
    onOpenChange: onPdfDrawerOpenChange,
  } = useDisclosure();
  const { startBatchJob, activeJobCount, cancelJob } = useJobManager({
    onJobComplete: () => {
      // Refresh history when batch job completes
      setHistoryItems(getHistoryItems());
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;

    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  const processFiles = async (files: File[]) => {
    // Filter valid files (images and PDFs)
    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/") || file.type === "application/pdf",
    );

    // Handle invalid file uploads
    if (validFiles.length === 0) {
      // Clean up any existing URLs
      fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      fileUrlsRef.current = [];

      // Clear all related state
      setSelectedFiles([]);
      setFileUrls([]);
      setCurrentFileIndex(0);
      setLiveMessage(
        "No valid files uploaded. Only images and PDFs are accepted.",
      );

      return;
    }

    // Normal single-file or preview workflow
    // Clean up old URLs from ref (not stale state)
    fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

    // Create URLs for all files
    const urls = validFiles.map((file) => URL.createObjectURL(file));

    // Update ref immediately after creating URLs
    fileUrlsRef.current = urls;

    setSelectedFiles(validFiles);
    setFileUrls(urls);
    setCurrentFileIndex(0);
    setLiveMessage(`Viewing file 1 of ${validFiles.length}`);

    // Load persisted selections for all files (non-blocking)
    (async () => {
      try {
        const entries: Record<string, number[]> = {};

        await Promise.all(
          validFiles.map(async (file) => {
            const id = `${file.name}_${file.size}_${file.lastModified}`;

            try {
              const pages = await getSelectedPages(id);

              if (pages && Array.isArray(pages) && pages.length > 0) {
                entries[id] = pages;
              }
            } catch {
              // ignore
            }
          }),
        );

        setSelectedPagesMap(entries);
      } catch {
        // ignore
      }
    })();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;

    if (files && files.length > 0) {
      processFiles(Array.from(files));
    }
  };

  // PDF page count is now set via PdfPageDrawer's onNumPages callback

  // Also proactively check page count when a file is viewed to avoid
  // depending solely on the drawer's load (helps when drawer isn't opened).
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: any = null;
    const capturedIndex = currentFileIndex;

    const checkPdfPages = async () => {
      const currentFile = selectedFiles[capturedIndex];
      const currentUrl = fileUrls[capturedIndex];

      if (currentFile && currentFile.type === "application/pdf" && currentUrl) {
        try {
          const { pdfjs } = await import("react-pdf");

          if (isCancelled) return;

          loadingTask = pdfjs.getDocument(currentUrl);
          const pdf = await loadingTask.promise;

          if (!isCancelled && capturedIndex === currentFileIndex) {
            setPdfPageCount(pdf.numPages);
          }
        } catch (error) {
          if (!isCancelled && capturedIndex === currentFileIndex) {
            // eslint-disable-next-line no-console
            console.error("Error checking PDF pages:", error);
            setPdfPageCount(0);
          }
        }
      } else {
        if (!isCancelled && capturedIndex === currentFileIndex) {
          setPdfPageCount(0);
        }
      }
    };

    checkPdfPages();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [selectedFiles, currentFileIndex, fileUrls]);

  // Load history on mount
  useEffect(() => {
    if (isLoggedIn) {
      const history = getHistoryItems();

      setHistoryItems(history);
    }
  }, [isLoggedIn]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();

      setIsLoggedIn(authenticated);
      const user = authenticated ? getUsername() : null;
      const avatar = authenticated ? getAvatarUrl() : null;

      setUsername(user);
      setAvatarUrl(avatar);
      setIsCheckingAuth(false);
    };

    checkAuth();

    const updateDevOptions = (value: string | null) => {
      setDevOptionsEnabled(value === "true");
    };

    const handleDevOptionsChanged = (event: Event) => {
      if (
        event instanceof CustomEvent &&
        typeof event.detail?.enabled === "boolean"
      ) {
        setDevOptionsEnabled(event.detail.enabled);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "devOptionsEnabled") {
        updateDevOptions(event.newValue);
      }
    };

    updateDevOptions(localStorage.getItem("devOptionsEnabled"));
    window.addEventListener("devOptionsChanged", handleDevOptionsChanged);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("devOptionsChanged", handleDevOptionsChanged);
      window.removeEventListener("storage", handleStorageChange);
      // Clean up file URLs on unmount
      fileUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      // Clear save success timeout on unmount
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }
      // Clear batch notification timeout on unmount
      if (batchNotificationTimeoutRef.current) {
        clearTimeout(batchNotificationTimeoutRef.current);
        batchNotificationTimeoutRef.current = null;
      }
    };
  }, []);

  const handleLogin = () => {
    const user = getUsername();
    const avatar = getAvatarUrl();

    setUsername(user);
    setAvatarUrl(avatar);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    clearCredentials();
    setIsLoggedIn(false);
    setUsername(null);
    setAvatarUrl(null);
    // Clear all app state
    handleClearImage();
  };

  // Save current extraction to history
  const handleSaveToHistory = async () => {
    // Validate bounds before accessing array
    if (
      !selectedFiles ||
      typeof currentFileIndex !== "number" ||
      currentFileIndex < 0 ||
      currentFileIndex >= selectedFiles.length
    ) {
      return;
    }

    const currentFile = selectedFiles[currentFileIndex];

    if (!currentFile || !extractedText || !extractionUsage) return;

    let newItem: HistoryItem | null = null;

    try {
      // Generate thumbnail for preview
      const thumbnail = await generateThumbnail(currentFile);

      // Save metadata first to get the generated ID
      // Parse JSON content - type is unknown as structure depends on extraction
      const parsedJson: unknown = jsonContent ? JSON.parse(jsonContent) : null;

      const fileType = currentFile.type.startsWith("image/") ? "image" : "pdf";

      newItem = saveHistoryItem({
        timestamp: Date.now(),
        filename: currentFile.name,
        fileType: fileType,
        fileSize: currentFile.size,
        extractedData: extractedText,
        jsonContent: parsedJson,
        usage: extractionUsage,
        starred: false,
        preview: thumbnail,
      });

      // Save the actual file to IndexedDB with the generated ID
      // If this fails, we need to rollback the metadata
      try {
        await saveFileBlob(newItem.id, currentFile);
      } catch (fileError) {
        // Rollback: delete the metadata we just saved
        deleteHistoryItem(newItem.id);
        throw fileError;
      }

      setHistoryItems(getHistoryItems());
      setCurrentHistoryId(newItem.id);

      // Show success message
      setShowSaveSuccess(true);

      // Clear any existing timeout
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }

      // Auto-hide after 3 seconds
      saveSuccessTimeoutRef.current = setTimeout(() => {
        setShowSaveSuccess(false);
        saveSuccessTimeoutRef.current = null;
      }, 3000);
    } catch {
      // Handle error silently
    }
  };

  // Load a history item
  const handleLoadHistoryItem = async (item: HistoryItem) => {
    try {
      // Clear current state first
      handleClearImage();

      // Load the actual file from IndexedDB
      const savedFile = await getFileBlob(item.id);

      if (savedFile) {
        // Process the file normally
        processFiles([savedFile]);
      }

      // Set the history data
      setExtractedText(item.extractedData);
      // Type guard: Safely stringify unknown jsonContent
      const jsonString =
        item.jsonContent !== null && item.jsonContent !== undefined
          ? JSON.stringify(item.jsonContent, null, 2)
          : "";

      setJsonContent(jsonString);
      setExtractionUsage(item.usage);
      setIsDataExtracted(true);
      setHasReceivedData(true);
      hasReceivedDataRef.current = true;
      setCurrentHistoryId(item.id);

      // Close the history drawer
      onHistoryOpenChange();
    } catch {
      // Handle error silently
    }
  };

  // Toggle star on history item
  const handleToggleStar = (id: string) => {
    try {
      toggleStarHistoryItem(id);
      setHistoryItems(getHistoryItems());
    } catch {
      // Handle error silently
    }
  };

  // Delete history item
  const handleDeleteHistoryItem = async (id: string) => {
    try {
      // Delete from localStorage
      deleteHistoryItem(id);

      // Delete file from IndexedDB
      await deleteFileBlob(id);

      setHistoryItems(getHistoryItems());
      if (currentHistoryId === id) {
        setCurrentHistoryId(null);
      }
    } catch {
      // Handle error silently
    }
  };

  // Clear all history
  const handleClearAllHistory = async () => {
    try {
      // Clear all files from IndexedDB
      await clearAllFileBlobs();

      // Clear all from localStorage
      clearAllHistory();

      // Revoke all file URLs to free memory
      fileUrlsRef.current?.forEach((url) => URL.revokeObjectURL(url));
      fileUrlsRef.current = [];

      // Reset state
      setHistoryItems([]);
      setCurrentHistoryId(null);
      setSelectedFiles([]);
      setFileUrls([]);
      setCurrentFileIndex(0);
      setExtractedText("");
      setJsonContent("");
      setIsDataExtracted(false);
      setExtractionUsage(null);

      // Close the modal
      onClearModalOpenChange();
    } catch {
      // Handle error silently
    }
  };

  // Parse extracted text into JSON
  useEffect(() => {
    if (extractedText) {
      // Try to find JSON block (between ```json and ```)
      const jsonMatch = extractedText.match(/```json\s*([\s\S]*?)```/);

      if (jsonMatch) {
        // Extract JSON content
        setJsonContent(jsonMatch[1].trim());
      } else {
        // No JSON block found, try to parse as pure JSON
        try {
          const parsed = JSON.parse(extractedText);

          setJsonContent(JSON.stringify(parsed, null, 2));
        } catch {
          // If not valid JSON, set empty
          setJsonContent("");
        }
      }
    } else {
      // Clear when extractedText is empty
      setJsonContent("");
    }
  }, [extractedText]);

  const handleClearImage = () => {
    // Revoke all file URLs to free memory
    fileUrlsRef.current?.forEach((url) => URL.revokeObjectURL(url));
    fileUrlsRef.current = [];
    const filesToClear = selectedFiles.slice();

    setSelectedFiles([]);
    setFileUrls([]);
    setCurrentFileIndex(0);
    setIsDataExtracted(false);
    setIsExtracting(false);
    setHasReceivedData(false);
    hasReceivedDataRef.current = false;
    setExtractedText("");
    setJsonContent("");
    setExtractionUsage(null);
    setCurrentHistoryId(null); // Clear history ID
    // Best-effort: remove persisted selections for cleared files
    if (filesToClear && filesToClear.length > 0) {
      filesToClear.forEach((file) => {
        const id = `${file.name}_${file.size}_${file.lastModified}`;

        deleteSelectedPages(id).catch(() => {});
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // Close PDF drawer when switching files to ensure clean state
  useEffect(() => {
    onPdfDrawerClose();
  }, [currentFileIndex, onPdfDrawerClose]);

  const handleExtractData = useCallback(async () => {
    // Validate bounds before accessing array
    if (
      !selectedFiles ||
      selectedFiles.length === 0 ||
      typeof currentFileIndex !== "number" ||
      currentFileIndex < 0 ||
      currentFileIndex >= selectedFiles.length
    ) {
      return;
    }

    const currentFile = selectedFiles[currentFileIndex];

    if (!currentFile) return;

    setIsExtracting(true);
    setIsDataExtracted(true);
    setHasReceivedData(false);
    hasReceivedDataRef.current = false;
    setExtractedText("");
    // Clear history ID when doing a new extraction
    setCurrentHistoryId(null);

    try {
      // Use streaming to update text in real-time with batched callback
      const streamCallback = (streamedText: string) => {
        // Mark that we've received data (enables the editor)
        if (!hasReceivedDataRef.current && streamedText.length > 0) {
          setHasReceivedData(true);
          hasReceivedDataRef.current = true;
        }
        setExtractedText(streamedText);
      };

      const result = await extractDataFromFile(currentFile, streamCallback);

      // Set the final structured result
      if (result) {
        // Store usage statistics
        setExtractionUsage(result.usage);

        // Clean up the response - remove "text" wrapper
        let cleanedResult = result.data;

        // If result has a "text" property, extract it
        if (typeof result.data === "object" && result.data.text) {
          cleanedResult = result.data.text;
        }

        // Convert to string if it's an object
        let resultString =
          typeof cleanedResult === "string"
            ? cleanedResult
            : JSON.stringify(cleanedResult, null, 2);

        setExtractedText(resultString);
        setHasReceivedData(true);
      }
    } catch (error) {
      setExtractedText(
        `Error: ${error instanceof Error ? error.message : "Failed to extract data"}`,
      );
      setHasReceivedData(true);
    } finally {
      setIsExtracting(false);
    }
  }, [selectedFiles, currentFileIndex]);

  const handleCopyText = async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch {
      // Silently fail - clipboard errors are not critical
    }
  };

  const getProcessedFiles = async (files: File[]): Promise<File[]> => {
    const processed: File[] = [];

    for (const file of files) {
      if (file.type === "application/pdf") {
        const id = `${file.name}_${file.size}_${file.lastModified}`;
        const selected = selectedPagesMap[id] || [];

        if (selected.length > 0) {
          // split the PDF
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer);
          const numPages = pdfDoc.getPageCount();
          const groups: number[][] = [];
          let currentGroup: number[] = [];

          for (let i = 1; i <= numPages; i++) {
            if (selected.includes(i)) {
              if (currentGroup.length > 0) {
                groups.push(currentGroup);
              }
              currentGroup = [i];
            } else {
              currentGroup.push(i);
            }
          }
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          for (const group of groups) {
            const newPdf = await PDFDocument.create();
            const copiedPages = await newPdf.copyPages(
              pdfDoc,
              group.map((p) => p - 1),
            );

            copiedPages.forEach((page) => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
              type: "application/pdf",
            });
            const nameSuffix =
              group.length === 1
                ? `_page${group[0]}`
                : `_pages${group.join("-")}`;

            processed.push(
              new File(
                [pdfBlob],
                `${file.name.replace(/\.pdf$/, "")}${nameSuffix}.pdf`,
                { type: "application/pdf" },
              ),
            );
          }
        } else {
          processed.push(file);
        }
      } else {
        processed.push(file);
      }
    }

    return processed;
  };

  // Extract text from system prompt structure
  const getSystemPromptText = (): string => {
    if (!extractionUsage?.systemPrompt) {
      return "No system prompt available";
    }

    const prompt: any = extractionUsage.systemPrompt;

    // If it's already a string, return it
    if (typeof prompt === "string") {
      return prompt;
    }

    // If it's an array, look for the text in the nested structure
    if (Array.isArray(prompt)) {
      for (const item of prompt) {
        if (item.type === "message" && Array.isArray(item.content)) {
          for (const contentItem of item.content) {
            if (contentItem.type === "input_text" && contentItem.text) {
              return contentItem.text;
            }
          }
        }
      }
    }

    // If it's an object with content array
    if (typeof prompt === "object" && prompt !== null) {
      if (Array.isArray(prompt.content)) {
        for (const contentItem of prompt.content) {
          if (contentItem.type === "input_text" && contentItem.text) {
            return contentItem.text;
          }
        }
      }
      // If there's a text property directly
      if (prompt.text) {
        return prompt.text;
      }
    }

    // Fallback to JSON stringified version
    return JSON.stringify(prompt, null, 2);
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] overflow-hidden">
        <div className="w-full max-w-md scale-90">
          <LoginScreen onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Snow />
      <Navbar
        avatarUrl={avatarUrl}
        historyCount={historyItems.length}
        username={username}
        onCancelJob={cancelJob}
        onHistoryClick={onHistoryOpen}
        onLogout={handleLogout}
      />

      {/* Success Alert */}
      {showSaveSuccess && (
        <div className="fixed top-20 right-4 z-50 w-full max-w-md">
          <Alert
            color="success"
            description="Your extraction has been saved to history."
            isVisible={showSaveSuccess}
            title="Extraction Saved Successfully"
            variant="faded"
            onClose={() => setShowSaveSuccess(false)}
          />
        </div>
      )}

      {/* Batch Processing Notification */}
      {showBatchNotification && (
        <div
          aria-atomic="true"
          aria-live="polite"
          className="fixed top-20 right-4 z-50 w-full max-w-md"
          role="status"
        >
          <Alert
            color="primary"
            description="Your files are being processed in the background. Status can be viewed in the notifications."
            isVisible={showBatchNotification}
            title={`Processing Files in Background`}
            variant="faded"
            onClose={() => setShowBatchNotification(false)}
          />
        </div>
      )}

      <section
        className="flex flex-col items-center justify-center flex-1 py-8 gap-6 relative transition-all duration-200"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        <DragOverlay isDragging={isDragging} />

        {selectedFiles.length > 0 ? (
          <>
            <div className="w-full flex items-center justify-center">
              <div
                className={`w-full grid gap-6 transition-all duration-1000 ease-in-out ${isDataExtracted ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
                style={
                  !isDataExtracted
                    ? { maxWidth: "calc(40rem * 1.2)" }
                    : undefined
                }
              >
                {/* File Preview Card with Swiper */}
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
                    <div
                      aria-atomic="true"
                      aria-live="polite"
                      className="sr-only"
                    >
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
                        setCurrentFileIndex(swiper.activeIndex);
                        setLiveMessage(
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
                        <span className="text-sm font-medium">
                          Extracting data...
                        </span>
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
                      {!isDataExtracted && !currentHistoryId && selectedFiles[currentFileIndex]?.type ===
                        "application/pdf" &&
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
                          onPress={async () => {
                            setIsProcessingPdf(true);
                            try {
                              const processedFiles =
                                await getProcessedFiles(selectedFiles);

                              if (
                                processedFiles.length > 1 ||
                                (processedFiles.length === 1 &&
                                  processedFiles[0] !== selectedFiles[0])
                              ) {
                                await startBatchJob(processedFiles);
                                setLiveMessage(
                                  `Started background processing of ${processedFiles.length} invoice${processedFiles.length !== 1 ? "s" : ""}.`,
                                );
                                setShowBatchNotification(true);
                                if (batchNotificationTimeoutRef.current) {
                                  clearTimeout(
                                    batchNotificationTimeoutRef.current,
                                  );
                                }
                                batchNotificationTimeoutRef.current = setTimeout(
                                  () => {
                                    setShowBatchNotification(false);
                                    batchNotificationTimeoutRef.current = null;
                                  },
                                  5000,
                                );
                                handleClearImage();
                              } else {
                                // Single file, no splitting
                                await handleExtractData();
                              }
                            } finally {
                              setIsProcessingPdf(false);
                            }
                          }}
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
                        onPress={handleClearImage}
                      >
                        {currentHistoryId ? "Back" : null}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Extracted Data Card - Slides in from right */}
                {isDataExtracted && (
                  <Card className="p-4 animate-in slide-in-from-right duration-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Extracted Data</h2>
                      <div className="flex items-center gap-2">
                        {/* Only show Save button for new extractions, not saved items */}
                        {!isExtracting &&
                          extractedText &&
                          extractionUsage &&
                          !currentHistoryId && (
                            <Button
                              color="success"
                              size="sm"
                              startContent={<SaveIcon size={18} />}
                              variant="flat"
                              onPress={handleSaveToHistory}
                            >
                              Save
                            </Button>
                          )}
                        {devOptionsEnabled && extractionUsage && (
                          <Button
                            color="warning"
                            size="sm"
                            startContent={<ScrewdriverIcon size={18} />}
                            variant="flat"
                            onPress={onOpen}
                          >
                            Stats
                          </Button>
                        )}
                        <Button
                          color="primary"
                          isDisabled={!extractedText}
                          size="sm"
                          startContent={
                            isCopied ? (
                              <CheckIcon size={18} />
                            ) : (
                              <CopyIcon size={18} />
                            )
                          }
                          variant="flat"
                          onPress={handleCopyText}
                        >
                          {isCopied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {/* Show Skeleton while loading */}
                    {isExtracting && !hasReceivedData ? (
                      <div className="space-y-3">
                        <Skeleton className="rounded-lg">
                          <div className="h-12 rounded-lg bg-default-300" />
                        </Skeleton>
                        <Skeleton className="w-4/5 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-200" />
                        </Skeleton>
                        <Skeleton className="w-3/5 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-200" />
                        </Skeleton>
                        <Skeleton className="w-5/6 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-300" />
                        </Skeleton>
                        <Skeleton className="w-2/5 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-200" />
                        </Skeleton>
                        <Skeleton className="w-4/5 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-300" />
                        </Skeleton>
                        <Skeleton className="w-3/5 rounded-lg">
                          <div className="h-8 rounded-lg bg-default-200" />
                        </Skeleton>
                      </div>
                    ) : extractedText ? (
                      <CodeEditor language="json" value={extractedText} />
                    ) : null}
                  </Card>
                )}
              </div>
            </div>

            {/* JSON Table Section - Full Width Below - Only show after extraction is complete */}
            {isDataExtracted && !isExtracting && jsonContent && (
              <Card className="w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    Structured Data View
                  </h2>
                  {extractionUsage && (
                    <div className="flex items-center gap-4 text-sm text-default-500">
                      <Tooltip content="Input Tokens (Prompt/ Recipie + Document).">
                        <div className="flex items-center gap-1.5 cursor-help">
                          <InputTokenIcon size={16} />
                          <span className="font-medium">
                            {extractionUsage.inputTokens.toLocaleString()}
                          </span>
                          <span className="text-xs">in</span>
                        </div>
                      </Tooltip>
                      <Tooltip content="Output Tokens Generated from LLM (extracted data).">
                        <div className="flex items-center gap-1.5 cursor-help">
                          <OutputTokenIcon size={16} />
                          <span className="font-medium">
                            {extractionUsage.outputTokens.toLocaleString()}
                          </span>
                          <span className="text-xs">out</span>
                        </div>
                      </Tooltip>
                      <Tooltip content="Total tokens ( Input + Cached + Output ).">
                        <div className="flex items-center gap-1.5 cursor-help">
                          <TokenIcon size={16} />
                          <span className="font-medium">
                            {extractionUsage.totalTokens.toLocaleString()}
                          </span>
                          <span className="text-xs">total</span>
                        </div>
                      </Tooltip>
                      {extractionUsage.cachedTokens &&
                        extractionUsage.cachedTokens > 0 && (
                          <Tooltip content="Cached tokens. These are reused to reduce costs and improve speed.">
                            <div className="flex items-center gap-1.5 text-success-500 cursor-help">
                              <CacheIcon size={16} />
                              <span className="font-medium">
                                {extractionUsage.cachedTokens.toLocaleString()}
                              </span>
                              <span className="text-xs">cached</span>
                            </div>
                          </Tooltip>
                        )}
                      <Tooltip content="Total time taken for the extraction process.">
                        <div className="flex items-center gap-1.5 cursor-help">
                          <ClockIcon size={16} />
                          <span className="font-medium">
                            {(extractionUsage.durationMs / 1000).toFixed(2)}s
                          </span>
                        </div>
                      </Tooltip>
                      {extractionUsage.estimatedCost !== undefined && (
                        <Tooltip content="Total cost of the extraction request.(OpenAI GPT-4o pricing)">
                          <div className="flex items-center gap-1.5 text-warning-500 cursor-help">
                            <DollarIcon size={16} />
                            <span className="font-medium">
                              ${extractionUsage.estimatedCost.toFixed(6)}
                            </span>
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
                <JsonTable jsonContent={jsonContent} />
              </Card>
            )}
          </>
        ) : (
          <FileUploadZone
            fileInputRef={fileInputRef}
            isDragging={isDragging}
            onFileSelect={processFiles}
          />
        )}

        {/* Upload Button at Bottom - Only show when files are selected */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center justify-center pb-4 pt-6">
            <input
              ref={fileInputRef}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              type="file"
              onChange={handleImageUpload}
            />
          </div>
        )}
      </section>

      {/* Recipe/System Prompt Drawer */}
      <Drawer
        isOpen={isOpen}
        motionProps={{
          variants: {
            enter: {
              opacity: 1,
              x: 0,
              transition: {
                type: "spring",
                bounce: 0.35,
                duration: 0.5,
              },
            },
            exit: {
              x: 100,
              opacity: 0,
              transition: {
                duration: 0.2,
              },
            },
          },
        }}
        size="5xl"
        onOpenChange={onOpenChange}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                Recipe (System Prompt)
              </DrawerHeader>
              <DrawerBody>
                <div className="whitespace-pre-wrap font-mono text-sm bg-default-100 p-4 rounded-lg max-h-[95vh] overflow-auto">
                  {getSystemPromptText()}
                </div>
              </DrawerBody>
              <DrawerFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Close
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* History Drawer */}
      <HistoryDrawer
        currentHistoryId={currentHistoryId}
        historyItems={historyItems}
        isClearModalOpen={isClearModalOpen}
        isOpen={isHistoryOpen}
        onClearAllHistory={handleClearAllHistory}
        onClearModalOpen={onClearModalOpen}
        onClearModalOpenChange={onClearModalOpenChange}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onLoadHistoryItem={handleLoadHistoryItem}
        onOpenChange={onHistoryOpenChange}
        onToggleStar={handleToggleStar}
      />

      {/* PDF Page Drawer */}
      <PdfPageDrawer
        file={selectedFiles[currentFileIndex]}
        isOpen={isPdfDrawerOpen}
        selectedPages={
          selectedPagesMap[
            `${selectedFiles[currentFileIndex]?.name}_${selectedFiles[currentFileIndex]?.size}_${selectedFiles[currentFileIndex]?.lastModified}`
          ] || []
        }
        setSelectedPages={(pages: number[]) => {
          const currentFile = selectedFiles[currentFileIndex];

          if (currentFile) {
            const id = `${currentFile.name}_${currentFile.size}_${currentFile.lastModified}`;

            setSelectedPagesMap((prev) => ({ ...prev, [id]: pages }));
            // persist to IndexedDB (fire-and-forget)
            if (pages.length === 0) {
              deleteSelectedPages(id).catch(() => {});
            } else {
              saveSelectedPages(id, pages).catch(() => {});
            }
          }
        }}
        onNumPages={setPdfPageCount}
        onOpenChange={onPdfDrawerOpenChange}
      />
    </>
  );
}
