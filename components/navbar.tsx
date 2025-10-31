"use client";

import { useState, useEffect } from "react";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarBrand,
  NavbarItem,
} from "@heroui/navbar";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/dropdown";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { Button } from "@heroui/button";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Divider } from "@heroui/divider";
import { Image } from "@heroui/image";
import { useTheme } from "next-themes";
import NextLink from "next/link";
import NextImage from "next/image";

import {
  SunFilledIcon,
  MoonFilledIcon,
  LogoutIcon,
  SettingsIcon,
  InfoIcon,
} from "@/components/icons";

interface NavbarProps {
  username?: string | null;
  avatarUrl?: string | null;
  onLogout?: () => void;
}

export const Navbar = ({ username, avatarUrl, onLogout }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Load developer mode from localStorage on mount
  useEffect(() => {
    const devOptions = localStorage.getItem("devOptionsEnabled");

    console.log("Navbar - Initial devOptions from localStorage:", devOptions);
    setIsDeveloperMode(devOptions === "true");
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const toggleDeveloperMode = () => {
    const newValue = !isDeveloperMode;

    console.log("Navbar - Toggling developer mode to:", newValue);
    setIsDeveloperMode(newValue);
    localStorage.setItem("devOptionsEnabled", String(newValue));
    console.log("Navbar - Dispatching devOptionsChanged event");
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent("devOptionsChanged", { detail: { enabled: newValue } }));
    // Also dispatch storage event manually since it doesn't fire in the same tab
    window.dispatchEvent(new StorageEvent("storage", {
      key: "devOptionsEnabled",
      newValue: String(newValue),
      url: window.location.href,
      storageArea: localStorage,
    }));
  };

  const iconClasses = "text-xl text-default-500 pointer-events-none shrink-0";

  return (
    <HeroUINavbar height="80px" maxWidth="full" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-2" href="/">
            <NextImage
              alt="IFS Logo"
              className="shrink-0"
              height={40}
              src="/ifs_logo_transparent.png"
              width={40}
            />
            <p className="font-bold text-inherit">
              GPT-4o Invoice Data Extractor
            </p>
          </NextLink>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent justify="end">
        {username && (
          <NavbarItem>
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <button className="flex items-center gap-3 bg-transparent outline-none transition-transform cursor-pointer">
                  <Badge
                    color="warning"
                    content="DEV"
                    isInvisible={!isDeveloperMode}
                    placement="bottom-right"
                    size="sm"
                  >
                    <Avatar
                      className="transition-transform"
                      color={isDeveloperMode ? "warning" : "default"}
                      isBordered={isDeveloperMode}
                      name={username || undefined}
                      src={avatarUrl || undefined}
                    />
                  </Badge>
                  <span className="font-bold text-inherit">{username}</span>
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label="User Actions" variant="faded">
                <DropdownSection showDivider title="Settings">
                  <DropdownItem
                    key="theme"
                    description="Toggle between light and dark mode"
                    startContent={
                      theme === "light" ? (
                        <MoonFilledIcon className={iconClasses} />
                      ) : (
                        <SunFilledIcon className={iconClasses} />
                      )
                    }
                    onPress={toggleTheme}
                  >
                    {theme === "light" ? "Dark Mode" : "Light Mode"}
                  </DropdownItem>
                  <DropdownItem
                    key="developer"
                    className={isDeveloperMode ? "text-warning" : ""}
                    color={isDeveloperMode ? "warning" : "default"}
                    description={
                      isDeveloperMode
                        ? "Disable developer options"
                        : "Enable developer options"
                    }
                    startContent={
                      <SettingsIcon
                        className={
                          isDeveloperMode
                            ? "text-xl text-warning pointer-events-none shrink-0"
                            : iconClasses
                        }
                      />
                    }
                    onPress={toggleDeveloperMode}
                  >
                    Developer Options
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection showDivider title="Information">
                  <DropdownItem
                    key="about"
                    description="About this application"
                    startContent={<InfoIcon className={iconClasses} />}
                    onPress={onOpen}
                  >
                    About
                  </DropdownItem>
                </DropdownSection>
                <DropdownSection title="Actions">
                  <DropdownItem
                    key="logout"
                    className="text-danger"
                    color="danger"
                    description="Sign out of your account"
                    startContent={
                      <LogoutIcon className="text-xl text-danger pointer-events-none shrink-0" />
                    }
                    onPress={onLogout}
                  >
                    Log Out
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* About Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">About</ModalHeader>
              <ModalBody>
                <Card className="shadow-none border-none">
                  <CardHeader className="flex gap-3">
                    <Image
                      alt="Application logo"
                      height={60}
                      radius="sm"
                      src="/ifs_logo_transparent.png"
                      width={60}
                    />
                    <div className="flex flex-col">
                      <p className="text-md font-semibold">
                        GPT-4o Invoice Data Extractor
                      </p>
                      <p className="text-small text-default-500">
                        Version 0.0.4
                      </p>
                    </div>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <p className="text-center py-4">
                      Built with Love 💖 by Basuru Balasuriya
                    </p>
                  </CardBody>
                  <Divider />
                  <CardFooter className="flex flex-col gap-2">
                    <p className="text-tiny text-default-400">
                      © 2025 Basuru Balasuriya. All rights reserved.
                    </p>
                  </CardFooter>
                </Card>
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
    </HeroUINavbar>
  );
};
