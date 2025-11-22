// Re-export IndexedDB storage functions for backward compatibility
// This file now acts as a facade to the IndexedDB implementation

export {
  saveToHistory,
  getHistory,
  deleteHistoryEntry,
  clearAllHistory,
  getHistoryEntry,
  migrateFromLocalStorage,
} from './indexedDBStorage';
