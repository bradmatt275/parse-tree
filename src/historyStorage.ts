// Utility functions for managing history in localStorage

import { HistoryEntry, FormatType } from './types';

const HISTORY_KEY = 'json-formatter-history';
const MAX_HISTORY_ENTRIES = 50; // Limit history to prevent localStorage overflow

export function saveToHistory(content: string, formatType: FormatType): string {
  try {
    const history = getHistory();
    const preview = content.trim().substring(0, 100);
    const now = new Date();
    
    const entry: HistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      formatType,
      content,
      preview,
      timestamp: now.getTime(),
      dateString: now.toLocaleString(),
    };
    
    // Add to beginning of array
    history.unshift(entry);
    
    // Keep only the latest MAX_HISTORY_ENTRIES
    if (history.length > MAX_HISTORY_ENTRIES) {
      history.splice(MAX_HISTORY_ENTRIES);
    }
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    return entry.id;
  } catch (error) {
    console.error('Failed to save to history:', error);
    return '';
  }
}

export function getHistory(): HistoryEntry[] {
  try {
    const historyJson = localStorage.getItem(HISTORY_KEY);
    if (!historyJson) return [];
    return JSON.parse(historyJson);
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export function deleteHistoryEntry(id: string): void {
  try {
    const history = getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete history entry:', error);
  }
}

export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear history:', error);
  }
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  const history = getHistory();
  return history.find(entry => entry.id === id);
}
