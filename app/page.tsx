"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";

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
} from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";
import { JsonTable } from "@/components/json-table";
import { LoginScreen } from "@/components/login-screen";
import { Navbar } from "@/components/navbar";
import {
  isAuthenticated,
  getUsername,
  getAvatarUrl,
  clearCredentials,
} from "@/lib/secure-storage";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);
  const [isDataExtracted, setIsDataExtracted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  const [extractionUsage, setExtractionUsage] =
    useState<ExtractionUsage | null>(null);
  const hasReceivedDataRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setFileType("image");
      const reader = new FileReader();

      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setFileType("pdf");
      setSelectedImage(null);
      // Create object URL for PDF preview
      const url = URL.createObjectURL(file);

      setPdfUrl(url);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;

    if (files && files.length > 0) {
      const file = files[0];

      // Check if it's an image or PDF
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        processFile(file);
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();

      setIsLoggedIn(authenticated);
      if (authenticated) {
        const user = getUsername();
        const avatar = getAvatarUrl();

        setUsername(user);
        setAvatarUrl(avatar);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
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
        } catch (e) {
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
    // Revoke the PDF URL to free memory
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSelectedImage(null);
    setSelectedFile(null);
    setFileType(null);
    setIsDataExtracted(false);
    setIsExtracting(false);
    setHasReceivedData(false);
    hasReceivedDataRef.current = false;
    setExtractedText("");
    setJsonContent("");
    setExtractionUsage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtractData = useCallback(async () => {
    if (!selectedFile) return;

    setIsExtracting(true);
    setIsDataExtracted(true);
    setHasReceivedData(false);
    hasReceivedDataRef.current = false;
    setExtractedText("");

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

      const result = await extractDataFromFile(selectedFile, streamCallback);

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
  }, [selectedFile]);

  const handleCopyText = async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      // Silently fail - clipboard errors are not critical
    }
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
        username={username}
        onLogout={handleLogout}
      />
      <section
        className="flex flex-col items-center justify-center flex-1 py-8 gap-6"
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <>
            <div className="w-full flex items-center justify-center">
              <div
                className={`w-full grid gap-6 transition-all duration-1000 ease-in-out ${
                  isDataExtracted
                    ? "grid-cols-1 lg:grid-cols-2"
                    : "grid-cols-1 max-w-2xl"
                }`}
              >
                {/* File Preview Card */}
                <Card
                  className={`p-4 transition-all duration-1000 ease-in-out ${
                    isDataExtracted ? "" : "mx-auto w-full"
                  }`}
                >
                  {fileType === "image" && selectedImage ? (
                    <div className="w-full h-[70vh] border border-default-200 rounded-lg overflow-auto bg-default-50 dark:bg-default-100">
                      <Image
                        alt="Uploaded preview"
                        className="w-full h-auto"
                        src={selectedImage}
                      />
                    </div>
                  ) : fileType === "pdf" && pdfUrl ? (
                    <div className="w-full h-[60vh] border border-default-200 rounded-lg overflow-hidden">
                      <iframe
                        className="w-full h-full"
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        title="PDF Preview"
                      />
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center gap-2 mt-4">
                    {/* Spinner indicator when extracting */}
                    {isExtracting && (
                      <div className="flex items-center gap-2 text-success">
                        <Spinner color="success" size="sm" />
                        <span className="text-sm font-medium">
                          Extracting data...
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 ml-auto">
                      {!isDataExtracted && (
                        <Button
                          color="success"
                          disabled={isExtracting}
                          isLoading={isExtracting}
                          startContent={
                            !isExtracting ? (
                              <SparklesIcon size={18} />
                            ) : undefined
                          }
                          variant="flat"
                          onPress={handleExtractData}
                        >
                          {isExtracting ? "Extracting..." : "Extract Data"}
                        </Button>
                      )}
                      <Button
                        color="danger"
                        startContent={<TrashIcon size={18} />}
                        variant="flat"
                        onPress={handleClearImage}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Extracted Data Card - Slides in from right */}
                {isDataExtracted && (
                  <Card className="p-4 animate-in slide-in-from-right duration-700">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">Extracted Data</h2>
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
                        minRows={20}
                        value={extractedText}
                        onChange={setExtractedText}
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
                      <div className="flex items-center gap-1.5">
                        <InputTokenIcon size={16} />
                        <span className="font-medium">
                          {extractionUsage.inputTokens.toLocaleString()}
                        </span>
                        <span className="text-xs">in</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <OutputTokenIcon size={16} />
                        <span className="font-medium">
                          {extractionUsage.outputTokens.toLocaleString()}
                        </span>
                        <span className="text-xs">out</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TokenIcon size={16} />
                        <span className="font-medium">
                          {extractionUsage.totalTokens.toLocaleString()}
                        </span>
                        <span className="text-xs">total</span>
                      </div>
                      {extractionUsage.cachedTokens &&
                        extractionUsage.cachedTokens > 0 && (
                          <div className="flex items-center gap-1.5 text-success-500">
                            <CacheIcon size={16} />
                            <span className="font-medium">
                              {extractionUsage.cachedTokens.toLocaleString()}
                            </span>
                            <span className="text-xs">cached</span>
                          </div>
                        )}
                      <div className="flex items-center gap-1.5">
                        <ClockIcon size={16} />
                        <span className="font-medium">
                          {(extractionUsage.durationMs / 1000).toFixed(2)}s
                        </span>
                      </div>
                      {extractionUsage.estimatedCost !== undefined && (
                        <div className="flex items-center gap-1.5 text-warning-500">
                          <DollarIcon size={16} />
                          <span className="font-medium">
                            ${extractionUsage.estimatedCost.toFixed(6)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <JsonTable jsonContent={jsonContent} />
              </Card>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-default-400 flex-1">
            <div>
              <p className="text-lg">No file uploaded yet</p>
              <p className="text-sm mt-2">
                Click the button below to upload an image or PDF or
                <br />
                simply drag and drop here.
              </p>
            </div>

            {/* Upload Button when no file */}
            <div className="mt-8">
              <input
                ref={fileInputRef}
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
                Upload File
              </Button>
            </div>
          </div>
        )}

        {/* Upload Button at Bottom - Only show when file is selected */}
        {selectedFile && (
          <div className="flex items-center justify-center pb-4 pt-6">
            <input
              ref={fileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              type="file"
              onChange={handleImageUpload}
            />
          </div>
        )}
      </section>
    </>
  );
}
