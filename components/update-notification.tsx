"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";
import { useEffect, useState } from "react";

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseName?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export function UpdateNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [isReadyToInstall, setIsReadyToInstall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we're in Electron environment
    if (typeof window === "undefined" || !window.electron?.updater) {
      return;
    }

    // Listen for update available
    window.electron.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setIsOpen(true);
      setIsDownloading(false);
      setIsReadyToInstall(false);
      setError(null);
    });

    // Listen for download progress
    window.electron.updater.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress);
    });

    // Listen for update downloaded
    window.electron.updater.onUpdateDownloaded((info: UpdateInfo) => {
      setIsDownloading(false);
      setIsReadyToInstall(true);
      setDownloadProgress(null);
    });

    // Listen for errors
    window.electron.updater.onUpdateError((error: { message: string }) => {
      setError(error.message);
      setIsDownloading(false);
    });

    // Cleanup listeners on unmount
    return () => {
      if (window.electron?.updater) {
        window.electron.updater.removeAllListeners();
      }
    };
  }, []);

  const handleDownload = () => {
    if (window.electron?.updater) {
      setIsDownloading(true);
      setError(null);
      window.electron.updater.downloadUpdate();
    }
  };

  const handleInstall = () => {
    if (window.electron?.updater) {
      window.electron.updater.installUpdate();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return formatBytes(bytesPerSecond) + "/s";
  };

  return (
    <Modal
      backdrop="blur"
      classNames={{
        backdrop:
          "bg-gradient-to-t from-zinc-900 to-zinc-900/10 backdrop-opacity-20",
      }}
      hideCloseButton={true}
      isDismissable={false}
      isOpen={isOpen}
      size="lg"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <span>Update Available</span>
          </div>
        </ModalHeader>
        <ModalBody>
          {updateInfo && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-default-500">
                  A new version of simpLLM is available
                </p>
                <p className="text-lg font-semibold mt-1">
                  Version {updateInfo.version}
                </p>
                {updateInfo.releaseName && (
                  <p className="text-sm text-default-600 mt-1">
                    {updateInfo.releaseName}
                  </p>
                )}
              </div>

              {/* Release Notes / Changelog */}
              {updateInfo.releaseNotes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-default-700">
                    <p>What&apos;s New:</p>
                  </h4>
                  <div className="max-h-60 overflow-y-auto p-3 bg-default-100 dark:bg-default-50/10 rounded-lg">
                    <div className="text-sm text-default-600 dark:text-default-400 whitespace-pre-wrap">
                      {typeof updateInfo.releaseNotes === "string"
                        ? updateInfo.releaseNotes
                        : updateInfo.releaseNotes}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
                  <p className="text-sm text-danger">{error}</p>
                </div>
              )}

              {isDownloading && downloadProgress && (
                <div className="space-y-2">
                  <Progress
                    className="max-w-full"
                    color="primary"
                    showValueLabel={true}
                    size="sm"
                    value={downloadProgress.percent}
                  />
                  <div className="flex justify-between text-xs text-default-500">
                    <span>
                      {formatBytes(downloadProgress.transferred)} /{" "}
                      {formatBytes(downloadProgress.total)}
                    </span>
                    <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
                  </div>
                </div>
              )}

              {isReadyToInstall && (
                <div className="p-3 bg-success-50 dark:bg-success-900/20 rounded-lg">
                  <p className="text-sm text-success">
                    ✓ Update downloaded and ready to install
                  </p>
                </div>
              )}

              <div className="p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                <p className="text-xs text-warning-700 dark:text-warning-500">
                  ⚠️ The application will restart to complete the update
                  installation.
                </p>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {!isDownloading && !isReadyToInstall && (
            <Button
              className="w-full"
              color="primary"
              size="lg"
              onClick={handleDownload}
            >
              Download Update
            </Button>
          )}

          {isDownloading && (
            <Button
              className="w-full"
              color="primary"
              disabled={true}
              isLoading={true}
              size="lg"
            >
              Downloading...
            </Button>
          )}

          {isReadyToInstall && (
            <Button
              className="w-full"
              color="success"
              size="lg"
              onClick={handleInstall}
            >
              Install and Restart
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
