// IndexedDB storage for history - supports large files without localStorage size limits

import { HistoryEntry, FormatType } from './types';

const DB_NAME = 'json-formatter-db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_HISTORY_ENTRIES = 50;

let dbInstance: IDBDatabase | null = null;

// Initialize IndexedDB
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance && dbInstance.objectStoreNames.contains(STORE_NAME)) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbInstance = null;
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      // Verify the object store exists before resolving
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.close();
        dbInstance = null;
        reject(new Error('Object store not found'));
        return;
      }
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Create index for sorting by timestamp
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

export async function saveToHistory(content: string, formatType: FormatType, sessionId?: string): Promise<string> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const preview = content.trim().substring(0, 100);
    const now = new Date();
    
    // If sessionId is provided, check if this session already has an entry
    if (sessionId) {
      const allEntries = await getHistory();
      const existingEntry = allEntries.find(entry => entry.sessionId === sessionId);
      
      if (existingEntry) {
        // Update existing entry
        const updatedEntry: HistoryEntry = {
          ...existingEntry,
          content,
          preview,
          timestamp: now.getTime(),
          dateString: now.toLocaleString(),
        };
        
        await new Promise<void>((resolve, reject) => {
          const updateRequest = store.put(updatedEntry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        });
        
        return existingEntry.id;
      }
    }
    
    // Create new entry
    const entry: HistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      formatType,
      content,
      preview,
      timestamp: now.getTime(),
      dateString: now.toLocaleString(),
      sessionId,
    };
    
    await new Promise<void>((resolve, reject) => {
      const addRequest = store.put(entry);
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    });
    
    // Cleanup old entries if we exceed max
    await cleanupOldEntries();
    
    return entry.id;
  } catch (error) {
    console.error('Failed to save to history:', error);
    return '';
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Sort by timestamp descending
      const results: HistoryEntry[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to delete history entry:', error);
  }
}

export async function clearAllHistory(): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

export async function getHistoryEntry(id: string): Promise<HistoryEntry | undefined> {
  try {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get history entry:', error);
    return undefined;
  }
}

// Helper function to cleanup old entries
async function cleanupOldEntries(): Promise<void> {
  try {
    const allEntries = await getHistory();
    
    if (allEntries.length > MAX_HISTORY_ENTRIES) {
      const db = await initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Delete entries beyond the limit
      const entriesToDelete = allEntries.slice(MAX_HISTORY_ENTRIES);
      
      for (const entry of entriesToDelete) {
        store.delete(entry.id);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old entries:', error);
  }
}

// Migration function to move data from localStorage to IndexedDB
export async function migrateFromLocalStorage(): Promise<void> {
  try {
    const HISTORY_KEY = 'json-formatter-history';
    const oldData = localStorage.getItem(HISTORY_KEY);
    
    if (!oldData) return;
    
    const entries: HistoryEntry[] = JSON.parse(oldData);
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    // Check if we already have data in IndexedDB
    const count = await new Promise<number>((resolve) => {
      const countRequest = store.count();
      countRequest.onsuccess = () => resolve(countRequest.result);
      countRequest.onerror = () => resolve(0);
    });
    
    // Only migrate if IndexedDB is empty
    if (count === 0 && entries.length > 0) {
      for (const entry of entries) {
        store.put(entry);
      }
      
      // Remove old localStorage data after successful migration
      localStorage.removeItem(HISTORY_KEY);
      console.log(`Migrated ${entries.length} history entries from localStorage to IndexedDB`);
    }
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
  }
}
