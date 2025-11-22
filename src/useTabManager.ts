import { useState, useCallback, useEffect, useRef } from 'react';
import { TabData, FormatType } from './types';
import { TreeNode } from './jsonParser';

const SAMPLE_JSON = `{
  "name": "JSON Formatter Pro",
  "version": "1.0.0",
  "features": [
    "Virtual scrolling for large files",
    "Syntax highlighting",
    "Search functionality",
    "Dark/light themes"
  ],
  "performance": {
    "maxFileSize": "10MB+",
    "rendering": "Only visible nodes",
    "scrolling": "Smooth and fast"
  },
  "supported": true,
  "downloads": 1000000
}`;

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="bk101">
    <author>Gambardella, Matthew</author>
    <title>XML Developer's Guide</title>
    <genre>Computer</genre>
    <price>44.95</price>
    <publish_date>2000-10-01</publish_date>
    <description>An in-depth look at creating applications with XML.</description>
  </book>
  <book id="bk102">
    <author>Ralls, Kim</author>
    <title>Midnight Rain</title>
    <genre>Fantasy</genre>
    <price>5.95</price>
    <publish_date>2000-12-16</publish_date>
    <description>A former architect battles corporate zombies.</description>
  </book>
</catalog>`;

export const useTabManager = () => {
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  
  // Active tab content (direct state for reactivity - synced with tabs)
  const [jsonInput, setJsonInputState] = useState<string>('');
  const [allNodes, setAllNodesState] = useState<TreeNode[]>([]);
  const [error, setErrorState] = useState<string | undefined>();
  const [formatType, setFormatTypeState] = useState<FormatType>('json');
  
  const currentSessionIdRef = useRef<string | undefined>(undefined);
  const initializedRef = useRef<boolean>(false);

  // Get active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  // Setters that update both state and tabs
  const setJsonInput = useCallback((content: string) => {
    setJsonInputState(content);
    if (activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, content } : tab
      ));
    }
  }, [activeTabId]);
  
  const setAllNodes = useCallback((nodes: TreeNode[]) => {
    setAllNodesState(nodes);
    if (activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, nodes } : tab
      ));
    }
  }, [activeTabId]);
  
  const setError = useCallback((error: string | undefined) => {
    setErrorState(error);
    if (activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, error } : tab
      ));
    }
  }, [activeTabId]);
  
  const setFormatType = useCallback((formatType: FormatType) => {
    setFormatTypeState(formatType);
    if (activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, formatType } : tab
      ));
    }
  }, [activeTabId]);
  
  const createNewTab = useCallback((formatType: FormatType = 'json') => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newTab: TabData = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: `Untitled-${tabs.length + 1}.${formatType}`,
      formatType,
      content: formatType === 'json' ? SAMPLE_JSON : SAMPLE_XML,
      nodes: [],
      error: undefined,
      sessionId,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    
    // Immediately sync state for the new tab
    setJsonInputState(newTab.content);
    setAllNodesState(newTab.nodes);
    setErrorState(newTab.error);
    setFormatTypeState(newTab.formatType);
    currentSessionIdRef.current = newTab.sessionId;
    
    return newTab.id;
  }, [tabs.length]);
  
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      
      // If closing active tab, switch to another tab
      if (activeTabId === tabId && filtered.length > 0) {
        const currentIndex = prev.findIndex(tab => tab.id === tabId);
        const newActiveIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        setActiveTabId(filtered[newActiveIndex].id);
      } else if (filtered.length === 0) {
        // If no tabs left, create a new one
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newTab: TabData = {
          id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: 'Untitled-1.json',
          formatType: 'json',
          content: SAMPLE_JSON,
          nodes: [],
          error: undefined,
          sessionId,
        };
        setActiveTabId(newTab.id);
        return [newTab];
      }
      
      return filtered;
    });
  }, [activeTabId]);

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, title } : tab
    ));
  }, []);
  
  // Sync active tab data to state when switching tabs
  useEffect(() => {
    if (activeTab) {
      setJsonInputState(activeTab.content);
      setAllNodesState(activeTab.nodes);
      setErrorState(activeTab.error);
      setFormatTypeState(activeTab.formatType);
      currentSessionIdRef.current = activeTab.sessionId;
    }
  }, [activeTab?.id, activeTab?.sessionId]); // Also sync when sessionId changes
  
  return {
    tabs,
    activeTabId,
    activeTab,
    jsonInput,
    allNodes,
    error,
    formatType,
    currentSessionId: currentSessionIdRef.current,
    currentSessionIdRef,
    setJsonInput,
    setAllNodes,
    setError,
    setFormatType,
    setActiveTabId,
    setTabs,
    createNewTab,
    closeTab,
    updateTabTitle,
    initializedRef,
  };
};
