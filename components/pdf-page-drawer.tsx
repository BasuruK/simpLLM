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

  useEffect(() => {
    setNumPages(0);
  }, [isOpen, file]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <Drawer isOpen={isOpen} size="4xl" onOpenChange={onOpenChange}>
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader>PDF Pages</DrawerHeader>
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
                      {Array.from(new Array(numPages), (el, index) => (
                        <div
                          key={`page_${index + 1}`}
                          className="flex w-full flex-col items-center gap-2"
                        >
                          <div className="text-small text-default-500 font-medium">
                            Page {index + 1}
                          </div>
                          <div className="shadow-md rounded-lg overflow-hidden border border-default-200 bg-white">
                            <Page
                              className="max-w-full h-auto"
                              pageNumber={index + 1}
                              renderAnnotationLayer={false}
                              renderTextLayer={false}
                              width={250}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Document>
                </div>
              )}
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
  );
}
