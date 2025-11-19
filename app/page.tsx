"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Keyboard } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
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
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";

import { extractDataFromFile, ExtractionUsage } from "@/lib/openai";
import {
  UploadIcon,
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
  StarIcon,
  SaveIcon,
  DocumentIcon,
  BackIcon,
} from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";
import { JsonTable } from "@/components/json-table";
import { LoginScreen } from "@/components/login-screen";
import { Navbar } from "@/components/navbar";
import { FilePreview } from "@/components/file-preview";
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
} from "@/lib/file-storage";
import { useJobManager } from "@/hooks/use-job-manager";
import { HistoryItem } from "@/types";

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

  const processFiles = async (files: File[], processInBackground = false) => {
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

    // If multiple files and background processing requested
    if (validFiles.length > 1 && processInBackground) {
      // Start batch job in background with error handling
      try {
        await startBatchJob(validFiles);

        // Show confirmation message only on success
        setLiveMessage(
          `Started background processing of ${validFiles.length} files. Check notifications for progress.`,
        );

        // Show toast notification
        setShowBatchNotification(true);

        // Clear any existing timeout
        if (batchNotificationTimeoutRef.current) {
          clearTimeout(batchNotificationTimeoutRef.current);
        }

        // Auto-hide after 5 seconds
        batchNotificationTimeoutRef.current = setTimeout(() => {
          setShowBatchNotification(false);
          batchNotificationTimeoutRef.current = null;
        }, 5000);
      } catch (error) {
        // Log the error for debugging
        console.error("Failed to start batch job:", error);

        // Set error message for screen readers and UI
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to start background processing";

        setLiveMessage(`Error: ${errorMessage}`);

        // Ensure notification stays hidden on error
        setShowBatchNotification(false);

        // Clear any existing timeout
        if (batchNotificationTimeoutRef.current) {
          clearTimeout(batchNotificationTimeoutRef.current);
          batchNotificationTimeoutRef.current = null;
        }
      }

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

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
        {isDragging && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="border-3 border-dashed border-primary-400/60 rounded-3xl p-12 bg-primary-50/90 dark:bg-primary-950/90 backdrop-blur-sm shadow-2xl shadow-primary-500/20">
              <div className="flex flex-col items-center gap-4">
                <UploadIcon className="text-primary-500" size={64} />
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    Drop your files here
                  </p>
                  <p className="text-sm text-primary-500 mt-2">
                    Supports images and PDF files
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedFiles.length > 0 ? (
          <>
            <div className="w-full flex items-center justify-center">
              <div
                className={`w-full grid gap-6 transition-all duration-1000 ease-in-out ${isDataExtracted ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
                style={
                  !isDataExtracted
                    ? { maxWidth: "calc(40rem * 1.5)" }
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
                            totalFiles={selectedFiles.length}
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>

                    {/* File count indicator - centered at bottom */}
                    {selectedFiles.length > 1 && (
                      <div
                        aria-hidden="true"
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex items-center gap-2 text-default-500 bg-default-100/80 dark:bg-default-50/80 backdrop-blur-sm px-3 py-1 rounded-full mb-0"
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
                      {!isDataExtracted && (
                        <Button
                          color="success"
                          disabled={isExtracting || activeJobCount > 0}
                          isLoading={isExtracting}
                          startContent={
                            !isExtracting ? (
                              <SparklesIcon size={18} />
                            ) : undefined
                          }
                          variant="flat"
                          onPress={() => {
                            if (selectedFiles.length > 1) {
                              // Multiple files: process in background
                              processFiles(selectedFiles, true);
                              handleClearImage();
                            } else {
                              // Single file: extract directly
                              handleExtractData();
                            }
                          }}
                        >
                          {isExtracting
                            ? "Extracting..."
                            : `Extract${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ""}`}
                        </Button>
                      )}
                      <Button
                        color={currentHistoryId ? "default" : "danger"}
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
                        {currentHistoryId ? "Back" : "Remove"}
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
                      <CodeEditor
                        language="json"
                        minRows={28}
                        value={extractedText}
                      />
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
          <div
            className={`flex flex-col items-center justify-center text-center flex-1 max-w-2xl w-full mx-auto transition-all duration-200 ${
              isDragging ? "scale-95 opacity-50" : ""
            }`}
          >
            <div
              className={`border-2 border-dashed rounded-3xl p-16 w-full transition-all duration-300 ${
                isDragging
                  ? "border-primary-400/60 bg-primary-50 dark:bg-primary-950/20 shadow-lg shadow-primary-500/10"
                  : "border-default-300/70 hover:border-default-400 hover:bg-default-50 dark:hover:bg-default-100/50 hover:shadow-md"
              }`}
            >
              <div className="flex flex-col items-center gap-6">
                <UploadIcon
                  className={`transition-all duration-200 ${
                    isDragging
                      ? "text-primary-500 scale-110"
                      : "text-default-400"
                  }`}
                  size={64}
                />
                <div>
                  <p className="text-lg font-medium text-default-600 dark:text-default-400">
                    {isDragging
                      ? "Drop your file here"
                      : "No file uploaded yet"}
                  </p>
                  <p className="text-sm text-default-400 mt-2">
                    {isDragging ? (
                      "Release to upload"
                    ) : (
                      <>
                        Click the button below to upload an image or PDF
                        <br />
                        or simply drag and drop here
                      </>
                    )}
                  </p>
                </div>

                {/* Upload Button when no file */}
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    multiple
                    accept="image/*,application/pdf"
                    className="hidden"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <Button
                    color="primary"
                    size="lg"
                    startContent={<UploadIcon size={20} />}
                    variant="shadow"
                    onPress={handleButtonClick}
                  >
                    Upload Files
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
      <Drawer
        isOpen={isHistoryOpen}
        placement="left"
        size="lg"
        onOpenChange={onHistoryOpenChange}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">History</h2>
                <div className="flex flex-col gap-1 text-sm text-default-500">
                  <p>
                    {historyItems.length} extraction
                    {historyItems.length !== 1 ? "s" : ""}
                  </p>
                  {historyItems.length > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarIcon size={16} />
                      <span>
                        Total cost: $
                        {historyItems
                          .reduce(
                            (sum, item) =>
                              sum + (item.usage?.estimatedCost || 0),
                            0,
                          )
                          .toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </DrawerHeader>
              <DrawerBody>
                {historyItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-default-400">
                    <HistoryIcon size={48} />
                    <p className="mt-4 text-lg">No history yet</p>
                    <p className="text-sm mt-2">
                      Your saved extractions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyItems.map((item) => (
                      <div
                        key={item.id}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleLoadHistoryItem(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleLoadHistoryItem(item);
                          }
                        }}
                      >
                        <Card
                          className={`p-4 hover:bg-default-100 transition-colors ${
                            currentHistoryId === item.id
                              ? "border-2 border-primary"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Preview thumbnail */}
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-default-200 flex items-center justify-center">
                              {item.preview ? (
                                <Image
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  src={item.preview}
                                />
                              ) : (
                                <DocumentIcon
                                  className="text-default-400"
                                  size={32}
                                />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate">
                                    {item.filename}
                                  </h3>
                                  <p className="text-xs text-default-500 mt-1">
                                    {new Date(item.timestamp).toLocaleString()}
                                  </p>
                                </div>

                                {/* Star button */}
                                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    isIconOnly
                                    className="flex-shrink-0"
                                    size="sm"
                                    variant="light"
                                    onPress={() => handleToggleStar(item.id)}
                                  >
                                    <StarIcon
                                      fill={
                                        item.starred ? "currentColor" : "none"
                                      }
                                      size={20}
                                    />
                                  </Button>
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-default-500">
                                <div className="flex items-center gap-1">
                                  <TokenIcon size={14} />
                                  <span>
                                    {item.usage.totalTokens.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ClockIcon size={14} />
                                  <span>
                                    {(item.usage.durationMs / 1000).toFixed(1)}s
                                  </span>
                                </div>
                                {item.usage.estimatedCost !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <DollarIcon size={14} />
                                    <span>
                                      ${item.usage.estimatedCost.toFixed(4)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Delete button */}
                            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                            <div
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              <Button
                                isIconOnly
                                className="flex-shrink-0"
                                color="danger"
                                size="sm"
                                variant="light"
                                onPress={() => handleDeleteHistoryItem(item.id)}
                              >
                                <TrashIcon size={16} />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </DrawerBody>
              <DrawerFooter className="flex justify-between">
                <Button
                  color="danger"
                  isDisabled={historyItems.length === 0}
                  startContent={<TrashIcon size={18} />}
                  variant="flat"
                  onPress={onClearModalOpen}
                >
                  Clear All History
                </Button>
                <Button color="primary" variant="light" onPress={onClose}>
                  Close
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Clear History Confirmation Modal */}
      <Modal isOpen={isClearModalOpen} onOpenChange={onClearModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Clear All History?
              </ModalHeader>
              <ModalBody>
                <p>
                  This will permanently delete all history and stored files.
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="danger" onPress={handleClearAllHistory}>
                  Clear All
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
