"use client";

import { useState } from "react";
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
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Progress } from "@heroui/progress";
import { Tooltip } from "@heroui/tooltip";
import { Spinner } from "@heroui/spinner";

import {
  NotificationIcon,
  InfoCircleIcon,
  CloseCircleIcon,
  CheckIcon,
} from "@/components/icons";
import { Notification } from "@/types/notification";

interface NotificationDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  notifications: Notification[];
  onClearAll?: () => void;
  onMarkAsRead?: (id: string) => void;
  onRemove?: (id: string) => void;
  onCancelJob?: (jobId: string) => void;
}

export const NotificationDrawer = ({
  isOpen,
  onOpenChange,
  notifications,
  onClearAll,
  onMarkAsRead,
  onRemove,
  onCancelJob,
}: NotificationDrawerProps) => {
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleViewDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setIsDetailsOpen(true);
  };

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size="lg"
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        {() => (
          <>
            <DrawerHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-bold">Notifications</h2>
            </DrawerHeader>
            <DrawerBody>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <NotificationIcon
                    className="text-default-400 mb-4"
                    size={60}
                  />
                  <p className="text-default-500 text-lg">
                    No notifications yet
                  </p>
                  <p className="text-default-400 text-sm mt-2">
                    Future notifications will appear here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`relative ${!notification.read ? "border-l-4 border-primary" : ""}`}
                    >
                      <CardHeader className="flex flex-col items-start gap-2 pb-2">
                        <div className="flex w-full items-start justify-between gap-2">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => onMarkAsRead?.(notification.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onMarkAsRead?.(notification.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <h3 className="text-lg font-semibold">
                              {notification.title}
                            </h3>
                          </div>
                          {notification.fileFailures.length > 0 && (
                            <Tooltip content="View error details">
                              <Button
                                isIconOnly
                                className="min-w-unit-8 w-unit-8 h-unit-8"
                                color="danger"
                                size="sm"
                                variant="flat"
                                onPress={() => handleViewDetails(notification)}
                              >
                                <InfoCircleIcon size={18} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                        <p className="text-sm text-default-600">
                          {notification.description}
                        </p>
                        <div className="flex w-full items-center justify-between gap-2 mt-1">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(notification.totalCost)}
                            </span>
                            <span className="text-xs text-default-400">
                              {formatDate(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      {/* Close button positioned absolutely at top-right */}
                      <Tooltip content="Close notification">
                        <Button
                          isIconOnly
                          className="absolute top-2 right-2 min-w-unit-10 w-unit-10 h-unit-10 z-10"
                          size="md"
                          variant="light"
                          onPress={() => onRemove?.(notification.id)}
                        >
                          <CloseCircleIcon size={20} />
                        </Button>
                      </Tooltip>
                      {notification.status === "processing" &&
                        notification.progress && (
                          <div className="w-full px-4 pb-3">
                            <div className="flex items-center gap-3 mb-2">
                              <Spinner color="default" size="sm" />
                              <span className="text-sm text-default-600">
                                Processing {notification.progress.current} of {notification.progress.total} files...
                              </span>
                            </div>
                            <Progress
                              aria-label="Processing progress"
                              classNames={{
                                base: "w-full",
                                track: "drop-shadow-md border border-default",
                                indicator:
                                  "bg-gradient-to-r from-primary-500 to-yellow-500",
                                label:
                                  "tracking-wider font-medium text-default-600",
                                value: "text-foreground/60",
                              }}
                              color="primary"
                              label={`${notification.progress.current} of ${notification.progress.total} files`}
                              radius="sm"
                              showValueLabel
                              size="sm"
                              value={
                                notification.progress.total > 0
                                  ? (notification.progress.current /
                                      notification.progress.total) *
                                    100
                                  : 0
                              }
                            />
                            {notification.jobId && onCancelJob && (
                              <div className="mt-3 flex justify-end">
                                <Button
                                  color="danger"
                                  size="sm"
                                  variant="flat"
                                  onPress={() => onCancelJob(notification.jobId!)}
                                >
                                  Cancel Job
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      <CardBody className="pt-0">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-default-500">Total Files</p>
                            <p className="font-semibold">
                              {notification.itemsProcessed}
                            </p>
                          </div>
                          <div>
                            <p className="text-default-500">Success</p>
                            <p className="font-semibold text-success">
                              {notification.successFiles.length}
                            </p>
                          </div>
                        </div>
                        {notification.fileFailures.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-default-500">
                                Failed ({notification.fileFailures.length}):
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {notification.fileFailures
                                .slice(0, 5)
                                .map((failure, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-danger/10 text-danger px-2 py-1 rounded"
                                  >
                                    {failure.fileName}
                                  </span>
                                ))}
                              {notification.fileFailures.length > 5 && (
                                <span className="text-xs text-default-400 px-2 py-1">
                                  +{notification.fileFailures.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </DrawerBody>
            {notifications.length > 0 && (
              <DrawerFooter>
                <Button
                  color="danger"
                  size="md"
                  variant="bordered"
                  onPress={onClearAll}
                >
                  Clear All
                </Button>
              </DrawerFooter>
            )}
          </>
        )}
      </DrawerContent>

      {/* Details Modal */}
      <Modal isOpen={isDetailsOpen} size="2xl" onOpenChange={setIsDetailsOpen}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">Job Details</h2>
                {selectedNotification && (
                  <p className="text-sm font-normal text-default-500">
                    {formatDate(selectedNotification.timestamp)}
                  </p>
                )}
              </ModalHeader>
              <ModalBody>
                {selectedNotification && (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-default-100">
                        <CardBody className="text-center py-3">
                          <p className="text-2xl font-bold">
                            {selectedNotification.itemsProcessed}
                          </p>
                          <p className="text-sm text-default-600">
                            Total Files
                          </p>
                        </CardBody>
                      </Card>
                      <Card className="bg-success-50 dark:bg-success-100/10">
                        <CardBody className="text-center py-3">
                          <p className="text-2xl font-bold text-success">
                            {selectedNotification.successFiles.length}
                          </p>
                          <p className="text-sm text-default-600">Success</p>
                        </CardBody>
                      </Card>
                      <Card className="bg-danger-50 dark:bg-danger-100/10">
                        <CardBody className="text-center py-3">
                          <p className="text-2xl font-bold text-danger">
                            {selectedNotification.fileFailures.length}
                          </p>
                          <p className="text-sm text-default-600">Failed</p>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Cost */}
                    <Card>
                      <CardBody className="py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-default-600">Total Cost</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(selectedNotification.totalCost)}
                          </span>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Failed Files Details */}
                    {selectedNotification.fileFailures &&
                      selectedNotification.fileFailures.length > 0 && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <CloseCircleIcon className="text-danger" size={20} />
                            Failed Files
                          </h3>
                          <div className="space-y-2 max-h-80 overflow-y-auto">
                            {selectedNotification.fileFailures.map(
                              (failure, idx) => (
                                <Card
                                  key={idx}
                                  className="border-l-4 border-danger"
                                >
                                  <CardBody className="py-3">
                                    <div className="space-y-2">
                                      <p className="font-semibold text-sm">
                                        {failure.fileName}
                                      </p>
                                      <div className="bg-danger-50 dark:bg-danger-100/10 rounded-lg p-3">
                                        <p className="text-sm text-danger">
                                          <span className="font-semibold">
                                            Error:{" "}
                                          </span>
                                          {failure.error}
                                        </p>
                                      </div>
                                    </div>
                                  </CardBody>
                                </Card>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {/* Successful Files */}
                    {selectedNotification.successFiles.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <CheckIcon className="text-success" size={20} />
                          Successful Files
                        </h3>
                        <Card>
                          <CardBody>
                            <div className="flex flex-wrap gap-2">
                              {selectedNotification.successFiles.map(
                                (file, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs bg-success-50 dark:bg-success-100/10 text-success px-3 py-1.5 rounded-full"
                                  >
                                    {file}
                                  </span>
                                ),
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      </div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Drawer>
  );
};
