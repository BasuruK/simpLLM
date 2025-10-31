"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import Image from "next/image";

import { saveCredentials, validateEncryptedKey } from "@/lib/secure-storage";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [encryptedApiKey, setEncryptedApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!username.trim()) {
      setError("Username is required");

      return;
    }

    if (!encryptedApiKey.trim()) {
      setError("Login code is required");

      return;
    }

    setIsLoading(true);

    try {
      // Validate the encrypted key can be decrypted
      const validation = validateEncryptedKey(encryptedApiKey);

      if (!validation.success) {
        setIsLoading(false);
        setError(
          "Invalid Login code. Please contact the owner and request a new login code.",
        );

        return;
      }

      // Save the encrypted API key (it's already validated)
      saveCredentials(username, encryptedApiKey);

      // Small delay for better UX
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 500);
    } catch (err) {
      setIsLoading(false);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save credentials";

      setError(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              alt="IFS Logo"
              className="shrink-0"
              height={80}
              src="/ifs_logo_transparent.png"
              width={80}
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            GPT-4o Invoice Data Extractor
          </h1>
          <p className="text-default-500 text-sm">
            Secure Login - Enter your encrypted API key
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <Input
            isRequired
            autoComplete="username"
            label="Username"
            placeholder="Enter your username"
            size="lg"
            value={username}
            variant="bordered"
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            isRequired
            autoComplete="off"
            label="Login Code"
            placeholder="Enter your login code"
            size="lg"
            type="password"
            value={encryptedApiKey}
            variant="bordered"
            onChange={(e) => setEncryptedApiKey(e.target.value)}
          />

          {error && (
            <div className="text-danger text-sm p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
              {error}
            </div>
          )}

          <Button
            className="w-full"
            color="primary"
            disabled={isLoading}
            isLoading={isLoading}
            size="lg"
            type="submit"
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <div className="text-center text-xs text-default-400 mt-4">
            <p>
              🔒 Your key is stored securely. Please don&apos;t share it with
              anyone.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
