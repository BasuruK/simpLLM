import CryptoJS from "crypto-js";

// AES-256 decryption key for OpenAI API key
const DECRYPTION_KEY = "SUINVDATACAPAUTOMATION2025AESKEY";

// In-memory storage for the decrypted API key (cleared on page refresh)
let cachedDecryptedKey: string | null = null;

export interface UserCredentials {
  username: string;
  encryptedApiKey: string; // This is the encrypted key provided by the user
  avatarUrl?: string; // Generated avatar URL stored at login
}

/**
 * Decrypt the API key using AES-256 decryption with CBC mode
 * The user provides a Base64-encoded encrypted key
 */
export function decryptApiKey(encryptedKeyBase64: string): string {
  try {
    // Create a proper key from the passphrase
    const key = CryptoJS.enc.Utf8.parse(DECRYPTION_KEY);

    // Parse Base64 ciphertext with zero IV
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedKeyBase64);
    const iv = CryptoJS.lib.WordArray.create([0, 0, 0, 0]); // Zero IV

    // Create a proper CipherParams object
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertext,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString || decryptedString.length === 0) {
      throw new Error("Decryption failed - invalid encrypted data");
    }

    return decryptedString;
  } catch (error) {
    throw new Error("Invalid encrypted API key or wrong decryption key");
  }
}

/**
 * Generate a random avatar URL using robohash
 */
function generateAvatarUrl(): string {
  const randomId = Math.floor(Math.random() * 10000);

  return `https://robohash.org/${randomId}?set=set3`;
}

/**
 * Save credentials to localStorage and cache the decrypted key
 * The API key should already be encrypted by the user (AES-256)
 */
export function saveCredentials(
  username: string,
  encryptedApiKey: string,
): void {
  // Generate avatar URL only if it doesn't exist
  const existingCredentials = loadCredentials();
  const avatarUrl = existingCredentials?.avatarUrl || generateAvatarUrl();

  const credentials: UserCredentials = {
    username,
    encryptedApiKey,
    avatarUrl,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("simpLLM_credentials", JSON.stringify(credentials));

    // Try to decrypt and cache the key immediately to validate it works
    try {
      cachedDecryptedKey = decryptApiKey(encryptedApiKey);
    } catch (error) {
      cachedDecryptedKey = null;
      throw error; // Re-throw to notify the caller
    }
  }
}

/**
 * Load credentials from localStorage
 */
export function loadCredentials(): UserCredentials | null {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("simpLLM_credentials");

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        return null;
      }
    }
  }

  return null;
}

/**
 * Get decrypted API key from storage
 * Returns cached key if available, otherwise decrypts from storage
 */
export function getDecryptedApiKey(): string | null {
  // Return cached key if available
  if (cachedDecryptedKey) {
    return cachedDecryptedKey;
  }

  const credentials = loadCredentials();

  if (credentials && credentials.encryptedApiKey) {
    try {
      const decryptedKey = decryptApiKey(credentials.encryptedApiKey);

      // Cache the decrypted key for future use
      cachedDecryptedKey = decryptedKey;

      return decryptedKey;
    } catch (error) {
      return null;
    }
  }

  return null;
}

/**
 * Get username from storage
 */
export function getUsername(): string | null {
  const credentials = loadCredentials();

  return credentials?.username || null;
}

/**
 * Get avatar URL from storage
 */
export function getAvatarUrl(): string | null {
  const credentials = loadCredentials();

  return credentials?.avatarUrl || null;
}

/**
 * Clear stored credentials and cached key
 */
export function clearCredentials(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("simpLLM_credentials");
  }
  // Clear the cached decrypted key
  cachedDecryptedKey = null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  const credentials = loadCredentials();

  if (!credentials?.encryptedApiKey) {
    return false;
  }

  if (cachedDecryptedKey) {
    return true;
  }

  try {
    cachedDecryptedKey = decryptApiKey(credentials.encryptedApiKey);

    return true;
  } catch {
    clearCredentials();

    return false;
  }
}

/**
 * Validate if the encrypted key can be decrypted successfully
 * Returns the decrypted key if successful, null otherwise
 */
export function validateEncryptedKey(encryptedKey: string): {
  success: boolean;
  key?: string;
  error?: string;
} {
  try {
    const decrypted = decryptApiKey(encryptedKey);

    if (!decrypted || decrypted.length === 0) {
      return { success: false, error: "Decryption resulted in empty key" };
    }
    // Basic validation - OpenAI keys typically start with "sk-"
    if (!decrypted.startsWith("sk-")) {
      return {
        success: false,
        error:
          'Decrypted key does not start with "sk-" - may be incorrectly encrypted',
      };
    }

    return { success: true, key: decrypted };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
