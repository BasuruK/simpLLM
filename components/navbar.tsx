"use client";

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
import { User } from "@heroui/user";
import { useTheme } from "next-themes";
import NextLink from "next/link";
import Image from "next/image";

import {
  SunFilledIcon,
  MoonFilledIcon,
  LogoutIcon,
} from "@/components/icons";

interface NavbarProps {
  username?: string | null;
  onLogout?: () => void;
}

export const Navbar = ({ username, onLogout }: NavbarProps) => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const iconClasses = "text-xl text-default-500 pointer-events-none shrink-0";

  return (
    <HeroUINavbar height="80px" maxWidth="full" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-2" href="/">
            <Image 
              src="/ifs_logo.svg" 
              alt="IFS Logo" 
              width={30} 
              height={30}
              className="shrink-0"
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
                <User
                  as="button"
                  avatarProps={{
                    isBordered: false,
                    color: "default",
                    name: username,
                  }}
                  className="transition-transform cursor-pointer"
                  classNames={{
                    name: "font-bold"
                  }}
                  name={username}
                />
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
