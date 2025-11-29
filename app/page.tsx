"use client";

import { useState, useEffect } from "react";
import { Spinner } from "@heroui/spinner";
import { useDisclosure } from "@heroui/modal";

import { LoginScreen } from "@/components/login-screen";
import { Navbar } from "@/components/navbar";
import { Snow } from "@/components/snow";
import { MainView } from "@/components/layout/main-view";
import {
  isAuthenticated,
  getUsername,
  getAvatarUrl,
  clearCredentials,
} from "@/lib/secure-storage";
import { useAppStore } from "@/store";
import { useJobManager } from "@/hooks/use-job-manager";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { historyItems } = useAppStore();
  const { cancelJob } = useJobManager({});
  const { onOpen: onHistoryOpen } = useDisclosure();

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();

      setIsLoggedIn(authenticated);
      if (authenticated) {
        setUsername(getUsername());
        setAvatarUrl(getAvatarUrl());
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUsername(getUsername());
    setAvatarUrl(getAvatarUrl());
  };

  const handleLogout = () => {
    clearCredentials();
    setIsLoggedIn(false);
    setUsername(null);
    setAvatarUrl(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)] overflow-hidden">
        <div className="w-full max-w-md scale-90">
          <LoginScreen onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <>
      <Snow sleighDemo={true} />
      <Navbar
        avatarUrl={avatarUrl}
        historyCount={historyItems.length}
        username={username}
        onCancelJob={cancelJob}
        onHistoryClick={onHistoryOpen}
        onLogout={handleLogout}
      />
      <MainView />
    </>
  );
}
