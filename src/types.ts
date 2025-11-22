// Types for multi-tab and history functionality

import type { TreeNode } from './jsonParser';

export type FormatType = 'json' | 'xml';

export interface TabData {
  id: string;
  title: string;
  formatType: FormatType;
  content: string;
  nodes: TreeNode[];
  error?: string;
  sessionId?: string; // Track editing session to prevent duplicate history entries
}

export interface HistoryEntry {
  id: string;
  formatType: FormatType;
  content: string;
  preview: string; // First 100 chars for preview
  timestamp: number;
  dateString: string;
  sessionId?: string; // Link to editing session
}
