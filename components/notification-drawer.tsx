"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@heroui/drawer";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";
import { useJobManager } from "@/hooks/use-job-manager";
import { TrashIcon } from "./icons";

interface NotificationDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCancelJob: (id: string) => void;
}

export const NotificationDrawer = ({
  isOpen,
  onOpenChange,
  onCancelJob,
}: NotificationDrawerProps) => {
  const { jobs } = useJobManager({});
  const jobList = Array.from(jobs.values());

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange} placement="right">
      <DrawerContent>
        <DrawerHeader>Notifications</DrawerHeader>
        <DrawerBody>
          {jobList.length === 0 ? (
            <p>No active jobs.</p>
          ) : (
            jobList.map((job) => (
              <div key={job.id} className="mb-4">
                <div className="flex justify-between">
                  <p>{job.files[0].name}</p>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => onCancelJob(job.id)}
                  >
                    <TrashIcon size={16} />
                  </Button>
                </div>
                <Progress
                  value={
                    job.status === "completed"
                      ? 100
                      : job.status === "processing"
                      ? 50
                      : 0
                  }
                />
              </div>
            ))
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="light" onPress={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
