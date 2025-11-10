/**
 * Local storage utility for managing extraction history
 */

import { HistoryItem } from "@/types";

const STORAGE_KEY = "simpllm_extraction_history";
const MAX_HISTORY_ITEMS = 100; // Limit to prevent localStorage overflow

/**
 * Get all history items from localStorage
 */
export function getHistoryItems(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return [];

    const items: HistoryItem[] = JSON.parse(stored);

    // Sort: starred items first (by timestamp desc), then non-starred (by timestamp desc)
    return items.sort((a, b) => {
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;

      return b.timestamp - a.timestamp;
    });
  } catch {
    return [];
  }
}

/**
 * Save a new extraction to history
 */
export function saveHistoryItem(item: Omit<HistoryItem, "id">): HistoryItem {
  // Generate unique ID using crypto.randomUUID if available, fallback to timestamp + random
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  const newItem: HistoryItem = {
    ...item,
    id: `extraction_${uniqueId}`,
  };

  try {
    const items = getHistoryItems();

    items.unshift(newItem);

    // Keep only the most recent MAX_HISTORY_ITEMS
    const trimmedItems = items.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedItems));

    return newItem;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";

    throw new Error(`Failed to save extraction to history: ${errorMessage}`);
  }
}

/**
 * Toggle starred status of a history item
 */
export function toggleStarHistoryItem(id: string): void {
  try {
    const items = getHistoryItems();
    const item = items.find((i) => i.id === id);

    if (!item) {
      throw new Error("History item not found");
    }

    item.starred = !item.starred;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    throw new Error(`Failed to toggle star: ${errorMessage}`);
  }
}

/**
 * Delete a history item
 */
export function deleteHistoryItem(id: string): void {
  try {
    const items = getHistoryItems();
    const filteredItems = items.filter((i) => i.id !== id);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredItems));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    throw new Error(`Failed to delete history item: ${errorMessage}`);
  }
}

/**
 * Clear all history
 */
export function clearAllHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    throw new Error(`Failed to clear history: ${errorMessage}`);
  }
}

/**
 * Get a single history item by ID
 */
export function getHistoryItemById(id: string): HistoryItem | null {
  const items = getHistoryItems();

  return items.find((i) => i.id === id) || null;
}
