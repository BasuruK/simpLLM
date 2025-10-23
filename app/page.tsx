"use client";

import { useState, useRef } from "react";
import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
import { Textarea } from "@heroui/input";
import { extractDataFromFile } from "@/lib/openai";
import { UploadIcon, CopyIcon } from "@/components/icons";

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [isDataExtracted, setIsDataExtracted] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
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
    setExtractedText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExtractData = async () => {
    if (!selectedFile) return;
    
    setIsExtracting(true);
    setIsDataExtracted(true);
    setExtractedText("Extracting data...");
    
    try {
      // Use streaming to update text in real-time
      const result = await extractDataFromFile(selectedFile, (streamedText) => {
        setExtractedText(streamedText);
      });
      
      // Set the final structured result
      if (result) {
        // Format the JSON nicely for display
        const formattedResult = typeof result === 'string' 
          ? result 
          : JSON.stringify(result, null, 2);
        setExtractedText(formattedResult);
      }
      
      console.log("Data extracted successfully:", result);
    } catch (error) {
      console.error("Error extracting data:", error);
      setExtractedText(`Error: ${error instanceof Error ? error.message : 'Failed to extract data'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <section className="flex flex-col items-center justify-between h-full min-h-[calc(100vh-200px)] py-8">
      {/* Image Preview Area */}
      <div className="flex-1 flex items-center justify-center w-full gap-6">
        {selectedFile ? (
          <>
            {/* File Preview Card */}
            <Card className={`${isDataExtracted ? 'max-w-xl' : 'max-w-2xl'} w-full p-4 transition-all duration-300`}>
              {fileType === 'image' && selectedImage ? (
                <Image
                  src={selectedImage}
                  alt="Uploaded preview"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              ) : fileType === 'pdf' && pdfUrl ? (
                <div className="w-full h-[60vh] border border-default-200 rounded-lg overflow-hidden">
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                </div>
              ) : null}
              <Button
                color="danger"
                variant="flat"
                className="mt-4"
                onClick={handleClearImage}
              >
                Clear File
              </Button>
            </Card>

            {/* Textarea - Only shown after extraction */}
            {isDataExtracted && (
                <Card className="max-w-xl w-full p-4 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Extracted Data</label>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onClick={handleCopyText}
                    title={isCopied ? "Copied!" : "Copy to clipboard"}
                  >
                    {isCopied ? (
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
                  </Button>
                </div>
                <Textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  minRows={25}
                  className="w-full"
                />
                </Card>
            )}
          </>
        ) : (
          <div className="text-center text-default-400">
            <p className="text-lg">No file uploaded yet</p>
            <p className="text-sm mt-2">Click the button below to upload an image or PDF</p>
          </div>
        )}
      </div>

      {/* Upload/Extract Button at Bottom */}
      <div className="flex items-center justify-center pb-8 pt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={handleImageUpload}
          className="hidden"
        />
        {!selectedFile ? (
          <Button
            color="primary"
            size="lg"
            variant="shadow"
            onClick={handleButtonClick}
            startContent={<UploadIcon size={20} />}
          >
            Upload File
          </Button>
        ) : !isDataExtracted ? (
          <Button
            color="success"
            size="lg"
            variant="shadow"
            onClick={handleExtractData}
            isLoading={isExtracting}
            disabled={isExtracting}
          >
            {isExtracting ? "Extracting..." : "Extract Data"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
