"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody } from "@heroui/card";

import { NotificationIcon } from "@/components/icons";
import { Notification } from "@/types/notification";

interface NotificationDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  notifications: Notification[];
  onClearAll?: () => void;
  onMarkAsRead?: (id: string) => void;
}

export const NotificationDrawer = ({
  isOpen,
  onOpenChange,
  notifications,
  onClearAll,
  onMarkAsRead,
}: NotificationDrawerProps) => {
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

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      size="lg"
      onOpenChange={onOpenChange}
    >
      <DrawerContent>
        {(onClose) => (
          <>
            <DrawerHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Notifications</h2>
                {notifications.length > 0 && (
                  <Button
                    color="danger"
                    size="sm"
                    variant="light"
                    onPress={onClearAll}
                  >
                    Clear All
                  </Button>
                )}
              </div>
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
                      isPressable
                      className={`${!notification.read ? "border-l-4 border-primary" : ""}`}
                      onPress={() => onMarkAsRead?.(notification.id)}
                    >
                      <CardHeader className="flex flex-col items-start gap-2 pb-2">
                        <div className="flex w-full items-start justify-between gap-2">
                          <h3 className="text-lg font-semibold">
                            {notification.title}
                          </h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(notification.totalCost)}
                            </span>
                            <span className="text-xs text-default-400">
                              {formatDate(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-default-600">
                          {notification.description}
                        </p>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="grid grid-cols-3 gap-3 text-sm">
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
                          <div>
                            <p className="text-default-500">Failed</p>
                            <p className="font-semibold text-danger">
                              {notification.failedFiles.length}
                            </p>
                          </div>
                        </div>
                        {notification.failedFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div>
                              <p className="text-xs text-default-500 mb-1">
                                Failed:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {notification.failedFiles
                                  .slice(0, 5)
                                  .map((file, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs bg-danger/10 text-danger px-2 py-1 rounded"
                                    >
                                      {file}
                                    </span>
                                  ))}
                                {notification.failedFiles.length > 5 && (
                                  <span className="text-xs text-default-400 px-2 py-1">
                                    +{notification.failedFiles.length - 5} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button color="primary" variant="light" onPress={onClose}>
                Close
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};
