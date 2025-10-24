"use client";

import { useState } from "react";
import { Card } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { saveCredentials, validateEncryptedKey } from "@/lib/secure-storage";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [encryptedApiKey, setEncryptedApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        setError(`Invalid login code: ${validation.error || 'Decryption failed'}`);
        return;
      }
      
      // Save the encrypted API key (it's already validated)
      saveCredentials(username, encryptedApiKey);
      
      // Small delay for better UX
      setTimeout(() => {
        setIsLoading(false);
        onLogin();
      }, 500);
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save credentials';
      setError(errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">GPT-4o Invoice Data Extractor</h1>
          <p className="text-default-500 text-sm">
            Secure Login - Enter your encrypted API key
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="bordered"
            size="lg"
            autoComplete="username"
            isRequired
          />

          <Input
            label="Login Code"
            placeholder="Enter your login code"
            type="password"
            value={encryptedApiKey}
            onChange={(e) => setEncryptedApiKey(e.target.value)}
            variant="bordered"
            size="lg"
            autoComplete="off"
            isRequired
          />

          {error && (
            <div className="text-danger text-sm p-3 bg-danger-50 dark:bg-danger-900/20 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            color="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>

          <div className="text-center text-xs text-default-400 mt-4">
            <p>🔒 Your key is stored securely. Please don't share it with anyone.</p>
          </div>
        </form>
      </Card>
    </div>
  );
}
