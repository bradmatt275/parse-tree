// Types for multi-tab and history functionality

export type FormatType = 'json' | 'xml';

export interface TabData {
  id: string;
  title: string;
  formatType: FormatType;
  content: string;
  nodes: any[]; // TreeNode[] but avoiding circular dependency
  error?: string;
}

export interface HistoryEntry {
  id: string;
  formatType: FormatType;
  content: string;
  preview: string; // First 100 chars for preview
  timestamp: number;
  dateString: string;
}
