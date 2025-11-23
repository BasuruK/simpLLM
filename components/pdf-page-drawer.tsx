"use client";

import { useEffect, useState } from "react";
import { Document, Page } from "react-pdf";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Spinner } from "@heroui/spinner";

// Configure worker via lib/pdfjs-init

interface PdfPageDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  file: File | null;
}

export function PdfPageDrawer({
  isOpen,
  onOpenChange,
  file,
}: PdfPageDrawerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

  useEffect(() => {
    setNumPages(0);
    setSelectedPages(new Set());
  }, [isOpen, file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const togglePageSelection = (pageNumber: number) => {
    const newSelected = new Set(selectedPages);

    if (newSelected.has(pageNumber)) {
      newSelected.delete(pageNumber);
    } else {
      newSelected.add(pageNumber);
    }
    setSelectedPages(newSelected);
  };

  return (
    <Drawer isOpen={isOpen} size="4xl" onOpenChange={onOpenChange}>
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="flex justify-between items-center">
              <span>PDF Pages</span>
              <div className="text-small font-normal text-default-500">
                {selectedPages.size} selected
              </div>
            </DrawerHeader>
            <DrawerBody>
              {file && (
                <div className="flex flex-col items-center gap-6 pb-6">
                  <Document
                    error={
                      <div className="text-danger p-4">
                        Failed to load PDF. Please try again.
                      </div>
                    }
                    file={file}
                    loading={
                      <div className="flex justify-center p-4">
                        <Spinner label="Loading PDF..." />
                      </div>
                    }
                    onLoadSuccess={onDocumentLoadSuccess}
                  >
                    <div className="grid grid-cols-3 gap-4 w-full">
                      {Array.from(new Array(numPages), (el, index) => {
                        const pageNum = index + 1;
                        const isSelected = selectedPages.has(pageNum);

                        return (
                          <div
                            key={`page_${pageNum}`}
                            className="flex w-full flex-col items-center gap-2"
                          >
                            <div className="text-small text-default-500 font-medium">
                              Page {pageNum}
                            </div>
                            <div className="relative group">
                              <div className="absolute top-2 right-2 z-10">
                                <Checkbox
                                  classNames={{
                                    wrapper:
                                      "bg-white/80 backdrop-blur-sm rounded-md",
                                  }}
                                  isSelected={isSelected}
                                  onValueChange={() =>
                                    togglePageSelection(pageNum)
                                  }
                                />
                              </div>
                              <div
                                className={`shadow-md rounded-lg overflow-hidden border transition-colors cursor-pointer ${
                                  isSelected
                                    ? "border-primary border-2"
                                    : "border-default-200 bg-white"
                                }`}
                                role="button"
                                tabIndex={0}
                                onClick={() => togglePageSelection(pageNum)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    togglePageSelection(pageNum);
                                  }
                                }}
                              >
                                <Page
                                  className="max-w-full h-auto block"
                                  pageNumber={pageNum}
                                  renderAnnotationLayer={false}
                                  renderTextLayer={false}
                                  width={250}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Document>
                </div>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button color="danger" variant="light" onPress={onClose}>
                Close
              </Button>
              <Button color="primary" onPress={onClose}>
                Confirm Selection
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
