/**
 * IndexedDB storage for saving actual file blobs
 * This allows us to save large files without localStorage size limits
 */

const DB_NAME = "simpllm_files";
const STORE_NAME = "files";
const SELECTIONS_STORE = "selections";
const DB_VERSION = 2;

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB not available"));

      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }

      // Create a separate store for persisting selected PDF pages per file
      if (!db.objectStoreNames.contains(SELECTIONS_STORE)) {
        db.createObjectStore(SELECTIONS_STORE);
      }
    };
  });
}

/**
 * Save selected pages (array of page numbers) for a given file id
 */
export async function saveSelectedPages(
  id: string,
  pages: number[],
): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([SELECTIONS_STORE], "readwrite");
      const store = transaction.objectStore(SELECTIONS_STORE);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.put(pages, id);

      request.onerror = () => {
        reject(request.error || new Error("Put request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Get selected pages (array of page numbers) for a given file id
 */
export async function getSelectedPages(id: string): Promise<number[] | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([SELECTIONS_STORE], "readonly");
      const store = transaction.objectStore(SELECTIONS_STORE);
      let result: number[] | null = null;

      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.get(id);

      request.onsuccess = () => {
        result = request.result || null;
      };

      request.onerror = () => {
        reject(request.error || new Error("Get request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Delete selected pages entry for a given file id
 */
export async function deleteSelectedPages(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([SELECTIONS_STORE], "readwrite");
      const store = transaction.objectStore(SELECTIONS_STORE);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.delete(id);

      request.onerror = () => {
        reject(request.error || new Error("Delete request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Save a file blob to IndexedDB
 */
export async function saveFileBlob(id: string, file: File): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.put(file, id);

      request.onerror = () => {
        // Transaction will handle the error, but we can log here if needed
        reject(request.error || new Error("Put request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Get a file blob from IndexedDB
 */
export async function getFileBlob(id: string): Promise<File | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      let result: File | null = null;

      transaction.oncomplete = () => {
        db.close();
        resolve(result);
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.get(id);

      request.onsuccess = () => {
        result = request.result || null;
      };

      request.onerror = () => {
        reject(request.error || new Error("Get request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Delete a file blob from IndexedDB
 */
export async function deleteFileBlob(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.delete(id);

      request.onerror = () => {
        reject(request.error || new Error("Delete request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Clear all file blobs
 */
export async function clearAllFileBlobs(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error || new Error("Transaction failed"));
      };

      transaction.onabort = () => {
        db.close();
        reject(new Error("Transaction aborted"));
      };

      const request = store.clear();

      request.onerror = () => {
        reject(request.error || new Error("Clear request failed"));
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

/**
 * Generate a thumbnail from a file for preview
 */
export async function generateThumbnail(
  file: File,
): Promise<string | undefined> {
  if (file.type.startsWith("image/")) {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(undefined);

            return;
          }

          // Create thumbnail (max 200x200)
          const maxSize = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };

        img.onerror = () => resolve(undefined);
        img.src = reader.result as string;
      };

      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }

  // For PDFs, we can't easily generate thumbnails in the browser
  return undefined;
}
