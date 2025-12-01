"use client";

import { Button } from "@heroui/button";
import { Card } from "@heroui/card";
import { Image } from "@heroui/image";
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
} from "@heroui/modal";

import {
  HistoryIcon,
  TrashIcon,
  StarIcon,
  DocumentIcon,
  TokenIcon,
  ClockIcon,
  DollarIcon,
} from "@/components/icons";
import { HistoryItem } from "@/types";

interface HistoryDrawerProps {
  isOpen: boolean;
  onOpenChange: () => void;
  historyItems: HistoryItem[];
  currentHistoryId: string | null;
  onLoadHistoryItem: (item: HistoryItem) => void;
  onToggleStar: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearAllHistory: () => void;
  isClearModalOpen: boolean;
  onClearModalOpen: () => void;
  onClearModalOpenChange: () => void;
}

export function HistoryDrawer({
  isOpen,
  onOpenChange,
  historyItems,
  currentHistoryId,
  onLoadHistoryItem,
  onToggleStar,
  onDeleteHistoryItem,
  onClearAllHistory,
  isClearModalOpen,
  onClearModalOpen,
  onClearModalOpenChange,
}: HistoryDrawerProps) {
  return (
    <>
      <Drawer
        isOpen={isOpen}
        placement="left"
        size="lg"
        onOpenChange={onOpenChange}
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
                        onClick={() => onLoadHistoryItem(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onLoadHistoryItem(item);
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
                                    onPress={() => onToggleStar(item.id)}
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
                                onPress={() => onDeleteHistoryItem(item.id)}
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
                <Button color="danger" onPress={onClearAllHistory}>
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
