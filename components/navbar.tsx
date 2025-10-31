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
import { Avatar } from "@heroui/avatar";
import { Badge } from "@heroui/badge";
import { useTheme } from "next-themes";
import NextLink from "next/link";
import Image from "next/image";

import {
  SunFilledIcon,
  MoonFilledIcon,
  LogoutIcon,
  SettingsIcon,
} from "@/components/icons";

interface NavbarProps {
  username?: string | null;
  avatarUrl?: string | null;
  onLogout?: () => void;
}

export const Navbar = ({ username, avatarUrl, onLogout }: NavbarProps) => {
  const { theme, setTheme } = useTheme();
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

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
            <Image
              alt="IFS Logo"
              className="shrink-0"
              height={30}
              src="/ifs_logo.svg"
              width={30}
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
    </HeroUINavbar>
  );
};
