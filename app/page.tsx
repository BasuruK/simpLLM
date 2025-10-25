"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
import { Skeleton } from "@heroui/skeleton";
import { Spinner } from "@heroui/spinner";
import { extractDataFromFile } from "@/lib/openai";
import { UploadIcon, CopyIcon, TrashIcon, SparklesIcon } from "@/components/icons";
import { CodeEditor } from "@/components/code-editor";
import { JsonTable } from "@/components/json-table";
import { LoginScreen } from "@/components/login-screen";
import { Navbar } from "@/components/navbar";
import { isAuthenticated, loadCredentials, getUsername, clearCredentials } from "@/lib/secure-storage";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [isDataExtracted, setIsDataExtracted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [jsonContent, setJsonContent] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  const hasReceivedDataRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        setFileType('image');
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf') {
        setFileType('pdf');
        setSelectedImage(null);
        // Create object URL for PDF preview
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
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
        setUsername(user);
      }
      setIsCheckingAuth(false);
    };
    
    checkAuth();
  }, []);

  const handleLogin = () => {
    const user = getUsername();
    setUsername(user);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    clearCredentials();
    setIsLoggedIn(false);
    setUsername(null);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtractData = async () => {
    if (!selectedFile) return;
    
    setIsExtracting(true);
    setIsDataExtracted(true);
    setHasReceivedData(false);
    hasReceivedDataRef.current = false;
    setExtractedText("");
    
    try {
      // Use streaming to update text in real-time
      const result = await extractDataFromFile(selectedFile, (streamedText) => {
        // Mark that we've received data (enables the editor)
        if (!hasReceivedDataRef.current && streamedText.length > 0) {
          setHasReceivedData(true);
          hasReceivedDataRef.current = true;
        }
        setExtractedText(streamedText);
      });
      
      // Set the final structured result
      if (result) {
        // Clean up the response - remove "text" wrapper
        let cleanedResult = result;
        
        // If result has a "text" property, extract it
        if (typeof result === 'object' && result.text) {
          cleanedResult = result.text;
        }
        
        // Convert to string if it's an object
        let resultString = typeof cleanedResult === 'string' 
          ? cleanedResult 
          : JSON.stringify(cleanedResult, null, 2);
        
        setExtractedText(resultString);
        setHasReceivedData(true);
      }
      
      console.log("Data extracted successfully:", result);
    } catch (error) {
      console.error("Error extracting data:", error);
      setExtractedText(`Error: ${error instanceof Error ? error.message : 'Failed to extract data'}`);
      setHasReceivedData(true);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyText = async () => {
    if (!extractedText) return;
    
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Failed to copy text:", error);
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
      <Navbar username={username} onLogout={handleLogout} />
      <section className="flex flex-col items-center justify-center flex-1 py-8 gap-6 px-4">
      {selectedFile ? (
        <>
          <div className="w-full max-w-7xl flex items-center justify-center">
            <div className={`w-full grid gap-6 transition-all duration-1000 ease-in-out ${
              isDataExtracted 
                ? 'grid-cols-1 lg:grid-cols-2' 
                : 'grid-cols-1 max-w-2xl'
            }`}>
            {/* File Preview Card */}
            <Card className={`p-4 transition-all duration-1000 ease-in-out ${
              isDataExtracted ? '' : 'mx-auto w-full'
            }`}>
              {fileType === 'image' && selectedImage ? (
                <div className="w-full h-[60vh] border border-default-200 rounded-lg overflow-auto bg-default-50 dark:bg-default-100">
                  <Image
                    src={selectedImage}
                    alt="Uploaded preview"
                    className="w-full h-auto"
                  />
                </div>
              ) : fileType === 'pdf' && pdfUrl ? (
                <div className="w-full h-[60vh] border border-default-200 rounded-lg overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              ) : null}
              
              <div className="flex justify-between items-center gap-2 mt-4">
                {/* Spinner indicator when extracting */}
                {isExtracting && (
                  <div className="flex items-center gap-2 text-success">
                    <Spinner size="sm" color="success" />
                    <span className="text-sm font-medium">Extracting data...</span>
                  </div>
                )}
                
                <div className="flex gap-2 ml-auto">
                  {!isDataExtracted && (
                    <Button
                      color="success"
                      variant="flat"
                      onClick={handleExtractData}
                      isLoading={isExtracting}
                      disabled={isExtracting}
                      startContent={!isExtracting ? <SparklesIcon size={18} /> : undefined}
                    >
                      {isExtracting ? "Extracting..." : "Extract Data"}
                    </Button>
                  )}
                  <Button
                    color="danger"
                    variant="flat"
                    onClick={handleClearImage}
                    startContent={<TrashIcon size={18} />}
                  >
                    Clear
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
                    variant="flat"
                    size="sm"
                    onClick={handleCopyText}
                    isDisabled={!extractedText}
                    startContent={
                      isCopied ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9 11L12 14L22 4"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M21 12V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <CopyIcon size={18} />
                    )}
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
                    value={extractedText}
                    onChange={setExtractedText}
                    minRows={20}
                  />
                ) : null}
              </Card>
            )}
          </div>
        </div>

        {/* JSON Table Section - Full Width Below - Only show after extraction is complete */}
        {isDataExtracted && !isExtracting && jsonContent && (
          <Card className="w-full max-w-7xl p-6">
            <h2 className="text-lg font-semibold mb-4">Structured Data View</h2>
            <JsonTable jsonContent={jsonContent} />
          </Card>
        )}
      </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-default-400 flex-1">
          <div>
            <p className="text-lg">No file uploaded yet</p>
            <p className="text-sm mt-2">Click the button below to upload an image or PDF</p>
          </div>
          
          {/* Upload Button when no file */}
          <div className="mt-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              color="primary"
              size="lg"
              variant="shadow"
              onClick={handleButtonClick}
              startContent={<UploadIcon size={20} />}
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
            type="file"
            accept="image/*,application/pdf"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      )}
    </section>
    </>
  );
}
