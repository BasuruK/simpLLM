"use client";

import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
} from "@heroui/navbar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Tooltip } from "@heroui/tooltip";
import { useDisclosure } from "@heroui/modal";
import { Avatar } from "@heroui/avatar";

import { NotificationDrawer } from "./notification-drawer";

import { ThemeSwitch } from "@/components/theme-switch";
import { HistoryIcon, LogoutIcon, NotificationIcon } from "@/components/icons";

interface NavbarProps {
  avatarUrl: string | null;
  historyCount: number;
  username: string | null;
  onCancelJob: (id: string) => void;
  onHistoryClick: () => void;
  onLogout: () => void;
}

export const Navbar = ({
  avatarUrl,
  historyCount,
  username,
  onCancelJob,
  onHistoryClick,
  onLogout,
}: NavbarProps) => {
  const {
    isOpen: isNotificationOpen,
    onOpen: onNotificationOpen,
    onOpenChange: onNotificationOpenChange,
  } = useDisclosure();

  return (
    <>
      <NextUINavbar maxWidth="xl" position="sticky">
        <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
          <NavbarBrand as="li" className="gap-3 max-w-fit">
            <Link
              className="flex justify-start items-center gap-2"
              color="foreground"
              href="/"
            >
              <p className="font-bold text-inherit">Finance AI</p>
            </Link>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent
          className="hidden sm:flex basis-1/5 sm:basis-full"
          justify="end"
        >
          <NavbarItem className="hidden sm:flex gap-2">
            <ThemeSwitch />
          </NavbarItem>
        </NavbarContent>

        <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
          <ThemeSwitch />
          <NavbarMenuToggle />
        </NavbarContent>

        <NavbarContent className="basis-1/5 sm:basis-full" justify="end">
          <Tooltip content="History">
            <Button isIconOnly variant="light" onPress={onHistoryClick}>
              <Badge
                color="primary"
                content={historyCount}
                isInvisible={historyCount === 0}
                shape="circle"
              >
                <HistoryIcon size={24} />
              </Badge>
            </Button>
          </Tooltip>
          <Tooltip content="Notifications">
            <Button isIconOnly variant="light" onPress={onNotificationOpen}>
              <NotificationIcon size={24} />
            </Button>
          </Tooltip>
          <Avatar name={username ?? undefined} src={avatarUrl ?? undefined} />
          <Button isIconOnly variant="light" onPress={onLogout}>
            <LogoutIcon size={24} />
          </Button>
        </NavbarContent>
      </NextUINavbar>
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onCancelJob={onCancelJob}
        onOpenChange={onNotificationOpenChange}
      />
    </>
  );
};
