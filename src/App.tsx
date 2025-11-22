import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, 
  Moon, 
  Search, 
  ChevronUp, 
  ChevronDown, 
  FolderOpen, 
  Zap, 
  Copy, 
  Trash2, 
  ChevronsDown, 
  ChevronsUp,
  History,
  X,
  Plus
} from 'lucide-react';
import { VirtualTree } from './VirtualTree';
import { CodeView, CodeViewRef } from './CodeView';
import { VirtualizedInput } from './VirtualizedInput';
import {
  getVisibleNodes,
  toggleNode,
  expandAll,
  collapseAll,
  searchNodes,
  TreeNode,
} from './jsonParser';
import { HistoryModal } from './HistoryModal';
import { saveToHistory } from './historyStorage';
import { TabData, FormatType } from './types';

type Theme = 'dark' | 'light';
type ViewMode = 'tree' | 'code';

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

function App() {
  // Multi-tab state
  const [tabs, setTabs] = useState<TabData[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  
  // Active tab content (direct state for reactivity - synced with tabs)
  const [jsonInput, setJsonInputState] = useState<string>(SAMPLE_JSON);
  const [allNodes, setAllNodesState] = useState<TreeNode[]>([]);
  const [error, setErrorState] = useState<string | undefined>();
  const [formatType, setFormatTypeState] = useState<FormatType>('json');
  
  // Get active tab
  const activeTab = useMemo(() => 
    tabs.find(tab => tab.id === activeTabId),
    [tabs, activeTabId]
  );
  
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
  
  // UI state
  const [theme, setTheme] = useState<Theme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<Set<string>>(new Set());
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [currentMatchLine, setCurrentMatchLine] = useState<number>(-1);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing JSON...');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  
  
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const expansionDebounceRef = useRef<number | null>(null);
  const treeRef = useRef<any>(null);
  const codeViewRef = useRef<CodeViewRef>(null);
  const isExpandingRef = useRef<boolean>(false);
  const lastSearchQueryRef = useRef<string>('');
  const pendingScrollRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);
  
  // Tab management functions
  const createNewTab = useCallback((formatType: FormatType = 'json') => {
    const newTab: TabData = {
      id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: `Untitled-${tabs.length + 1}.${formatType}`,
      formatType,
      content: formatType === 'json' ? SAMPLE_JSON : SAMPLE_XML,
      nodes: [],
      error: undefined,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
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
        const newTab: TabData = {
          id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          title: 'Untitled-1.json',
          formatType: 'json',
          content: SAMPLE_JSON,
          nodes: [],
          error: undefined,
        };
        setActiveTabId(newTab.id);
        return [newTab];
      }
      
      return filtered;
    });
  }, [activeTabId]);
  
  // Sync active tab data to state when switching tabs
  useEffect(() => {
    if (activeTab) {
      setJsonInputState(activeTab.content);
      setAllNodesState(activeTab.nodes);
      setErrorState(activeTab.error);
      setFormatTypeState(activeTab.formatType);
    }
  }, [activeTab?.id]); // Only trigger when tab ID changes (switching tabs)
  
  // Initialize with one tab
  useEffect(() => {
    if (!initializedRef.current && tabs.length === 0) {
      initializedRef.current = true;
      createNewTab('json');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Parse input based on format type
  const parseInput = useCallback((input: string) => {
    setIsProcessing(true);
    setError(undefined);
    
    if (formatType === 'xml') {
      // Parse XML in main thread (DOMParser not available in workers)
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(input, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          setError(parserError.textContent || 'Invalid XML');
          setAllNodes([]);
          setIsProcessing(false);
          return;
        }
        
        // Build tree from XML
        const nodes: TreeNode[] = [];
        let nodeIdCounter = 0;
        
        function generateNodeId(): string {
          return `node_${nodeIdCounter++}`;
        }
        
        function buildXmlTree(element: Element | ChildNode, nodes: TreeNode[], depth: number, key: string, parentId?: string, path: string = ''): string {
          const nodeId = generateNodeId();
          
          // Handle text nodes
          if (element.nodeType === Node.TEXT_NODE) {
            const textContent = element.textContent?.trim();
            if (!textContent) return nodeId;
            
            const currentPath = path ? `${path}.text` : 'text';
            nodes.push({
              id: nodeId,
              type: 'string',
              key: undefined,
              value: textContent,
              depth,
              isExpanded: false,
              hasChildren: false,
              parent: parentId,
              path: currentPath,
            });
            return nodeId;
          }
          
          // Handle element nodes
          if (element.nodeType === Node.ELEMENT_NODE) {
            const elem = element as Element;
            const tagName = key || elem.tagName;
            const currentPath = path ? `${path}.${tagName}` : tagName;
            
            const attributes = elem.attributes;
            const childNodes = Array.from(elem.childNodes).filter(
              node => node.nodeType === Node.ELEMENT_NODE || 
                      (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
            );
            
            const hasChildren = attributes.length > 0 || childNodes.length > 0;
            
            nodes.push({
              id: nodeId,
              type: 'object',
              key: tagName,
              depth,
              isExpanded: depth < 2,
              hasChildren,
              childCount: attributes.length + childNodes.length,
              parent: parentId,
              path: currentPath,
            });
            
            // Add attributes
            for (let i = 0; i < attributes.length; i++) {
              const attr = attributes[i];
              const attrNodeId = generateNodeId();
              const attrPath = `${currentPath}.@${attr.name}`;
              
              nodes.push({
                id: attrNodeId,
                type: 'string',
                key: `@${attr.name}`,
                value: attr.value,
                depth: depth + 1,
                isExpanded: false,
                hasChildren: false,
                parent: nodeId,
                path: attrPath,
              });
            }
            
            // Add child nodes
            if (childNodes.length === 1 && childNodes[0].nodeType === Node.TEXT_NODE) {
              const textContent = childNodes[0].textContent?.trim();
              if (textContent) {
                const textNodeId = generateNodeId();
                const textPath = `${currentPath}.text`;
                
                nodes.push({
                  id: textNodeId,
                  type: 'string',
                  key: undefined,
                  value: textContent,
                  depth: depth + 1,
                  isExpanded: false,
                  hasChildren: false,
                  parent: nodeId,
                  path: textPath,
                });
              }
            } else {
              childNodes.forEach((child) => {
                buildXmlTree(child, nodes, depth + 1, '', nodeId, currentPath);
              });
            }
            
            return nodeId;
          }
          
          return nodeId;
        }
        
        const root = xmlDoc.documentElement;
        if (!root) {
          setError('No root element found');
          setAllNodes([]);
          setIsProcessing(false);
          return;
        }
        
        buildXmlTree(root, nodes, 0, '', undefined);
        setAllNodes(nodes);
        setIsProcessing(false);
        
        // Save to history on successful parse
        if (input.trim()) {
          saveToHistory(input, 'xml');
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Invalid XML');
        setAllNodes([]);
        setIsProcessing(false);
      }
    } else {
      // Use Web Worker for JSON parsing
      workerRef.current?.postMessage({
        type: 'PARSE_JSON',
        data: input
      });
    }
  }, [formatType]);
  
  // Auto-format with debounce when tab content or format changes
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Don't auto-format if input is empty
    if (!jsonInput.trim()) {
      return;
    }
    
    // Set a new timer for debounced parsing (800ms delay)
    debounceTimerRef.current = window.setTimeout(() => {
      parseInput(jsonInput);
    }, 800);
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [jsonInput, formatType, parseInput]);
  
  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker('/worker.js');
    
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, nodes, error, message } = e.data;
      
      if (type === 'PARSE_SUCCESS') {
        setAllNodes(nodes);
        setError(undefined);
        setIsProcessing(false);
        setProcessingMessage('Processing JSON...');
        
        // Save to history on successful parse
        if (jsonInput.trim()) {
          saveToHistory(jsonInput, 'json');
        }
      } else if (type === 'PARSE_ERROR') {
        setError(error);
        setAllNodes([]);
        setIsProcessing(false);
        setProcessingMessage('Processing JSON...');
      } else if (type === 'PARSE_PROGRESS') {
        setProcessingMessage(message);
      } else if (type === 'EXPAND_SUCCESS') {
        setAllNodes(nodes);
        isExpandingRef.current = false;
        
        // If there's a pending scroll, execute it now
        if (pendingScrollRef.current && treeRef.current?.scrollToNode) {
          const nodeId = pendingScrollRef.current;
          pendingScrollRef.current = null;
          setTimeout(() => {
            treeRef.current?.scrollToNode(nodeId);
          }, 50);
        }
      } else if (type === 'EXPAND_ERROR') {
        console.error('Expand error:', error);
        isExpandingRef.current = false;
        pendingScrollRef.current = null;
      }
    };
    
    return () => {
      workerRef.current?.terminate();
    };
  }, []);
  
  // Parse on mount (like original code)
  useEffect(() => {
    if (jsonInput) {
      parseInput(jsonInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (outputRef.current) {
        setContainerHeight(outputRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  // Get match IDs as array for navigation (includes all matches, not just visible)
  const matchIds = useMemo(() => {
    return allNodes
      .filter(node => searchMatches.has(node.id))
      .map(node => node.id);
  }, [allNodes, searchMatches]);
  
  // Update search matches when query or nodes change
  useEffect(() => {
    if (searchQuery.trim()) {
      const matches = searchNodes(allNodes, searchQuery);
      setSearchMatches(matches);
      
      // Only reset the index if the search query actually changed, not just the nodes
      if (lastSearchQueryRef.current !== searchQuery) {
        setCurrentMatchIndex(matches.size > 0 ? 0 : -1);
        
        // Cancel any pending expansion
        if (expansionDebounceRef.current) {
          clearTimeout(expansionDebounceRef.current);
          expansionDebounceRef.current = null;
        }
        
        // Reset expansion flag when search changes (cancel previous expansion)
        isExpandingRef.current = false;
        pendingScrollRef.current = null;
        
        // Expand all parent nodes of all matches when search query changes (using worker)
        // Debounce to avoid expanding on every keystroke
        if (matches.size > 0) {
          const matchIdsArray = Array.from(matches);
          
          expansionDebounceRef.current = window.setTimeout(() => {
            isExpandingRef.current = true;
            pendingScrollRef.current = matchIdsArray[0];
            
            workerRef.current?.postMessage({
              type: 'EXPAND_TO_MATCHES',
              data: { nodes: allNodes, matchIds: matchIdsArray }
            });
          }, 500); // Wait 500ms after user stops typing
        }
      }
      lastSearchQueryRef.current = searchQuery;
    } else {
      setSearchMatches(new Set());
      setCurrentMatchIndex(-1);
      lastSearchQueryRef.current = '';
    }
  }, [searchQuery, allNodes]);
  
  const handleFormatChange = useCallback((newFormat: FormatType) => {
    // Update active tab format type and content
    const newContent = newFormat === 'xml' ? SAMPLE_XML : SAMPLE_JSON;
    setFormatType(newFormat);
    setJsonInput(newContent);
    setAllNodes([]);
    setError(undefined);
    
    // Update tab title
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId
        ? { ...tab, title: `Untitled-${prev.findIndex(t => t.id === activeTabId) + 1}.${newFormat}` }
        : tab
    ));
    
    setProcessingMessage(newFormat === 'xml' ? 'Processing XML...' : 'Processing JSON...');
    setSearchQuery('');
  }, [activeTabId]);
  
  const handleFormat = useCallback(() => {
    if (!jsonInput.trim()) {
      setError(`Please enter some ${formatType.toUpperCase()} to format`);
      return;
    }
    
    parseInput(jsonInput);
  }, [jsonInput, formatType, parseInput]);
  
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonInput(text);
      parseInput(text);
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  }, [formatType, parseInput]);
  
  const handleToggle = useCallback((nodeId: string) => {
    setAllNodes(toggleNode(allNodes, nodeId));
  }, [allNodes]);
  
  const handleExpandAll = useCallback(() => {
    setAllNodes(expandAll(allNodes));
  }, [allNodes]);
  
  const handleCollapseAll = useCallback(() => {
    setAllNodes(collapseAll(allNodes));
  }, [allNodes]);
  
  const handleNextMatch = useCallback(() => {
    if (matchIds.length > 0) {
      setCurrentMatchIndex(prev => (prev + 1) % matchIds.length);
    }
  }, [matchIds.length]);
  
  const handlePreviousMatch = useCallback(() => {
    if (matchIds.length > 0) {
      setCurrentMatchIndex(prev => (prev - 1 + matchIds.length) % matchIds.length);
    }
  }, [matchIds.length]);
  
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePreviousMatch();
      } else {
        handleNextMatch();
      }
    }
  }, [handleNextMatch, handlePreviousMatch]);
  
  const handleCopy = useCallback(async () => {
    try {
      let formatted: string;
      if (formatType === 'xml') {
        // For XML, just use the original input (already formatted)
        formatted = jsonInput;
      } else {
        formatted = JSON.stringify(JSON.parse(jsonInput), null, 2);
      }
      await navigator.clipboard.writeText(formatted);
      alert('Copied to clipboard!');
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  }, [jsonInput, formatType]);
  
  const toggleTheme = useCallback(() => {
    setTheme((prev: Theme) => prev === 'dark' ? 'light' : 'dark');
  }, []);
  
  const handleClear = useCallback(() => {
    setJsonInput('');
    setAllNodes([]);
    setError(undefined);
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  const handleLoadFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');
    
    // If paste is large (> 100KB), handle it specially
    if (pastedText.length > 100000) {
      event.preventDefault();
      
      setJsonInput(pastedText);
      parseInput(pastedText);
    }
    // For small pastes, let default behavior handle it
  }, [formatType, parseInput]);
  
  const handleLoadFromHistory = useCallback((content: string, format: FormatType) => {
    setJsonInput(content);
    setFormatType(format);
    setAllNodes([]);
    setError(undefined);
    parseInput(content);
  }, [parseInput]);
  
  const visibleNodes = useMemo(() => getVisibleNodes(allNodes), [allNodes]);
  
  const formattedCode = useMemo(() => {
    if (error || allNodes.length === 0) return '';
    try {
      if (formatType === 'xml') {
        return jsonInput; // For XML, use the original input
      }
      return JSON.stringify(JSON.parse(jsonInput), null, 2);
    } catch {
      return '';
    }
  }, [jsonInput, error, allNodes.length, formatType]);
  
  // Scroll to current match
  useEffect(() => {
    if (currentMatchIndex >= 0 && matchIds.length > 0) {
      if (viewMode === 'tree') {
        const currentMatchId = matchIds[currentMatchIndex];
        if (currentMatchId) {
          // If expansion is in progress, queue the scroll
          if (isExpandingRef.current) {
            pendingScrollRef.current = currentMatchId;
          } else if (treeRef.current?.scrollToNode) {
            treeRef.current.scrollToNode(currentMatchId);
          }
        }
      } else if (viewMode === 'code') {
        // For code view, find the line number containing the search query
        if (searchQuery && formattedCode && codeViewRef.current) {
          const lines = formattedCode.split('\n');
          const lowerQuery = searchQuery.toLowerCase();
          
          // Find all lines that match the search query
          const matchingLines: number[] = [];
          lines.forEach((line, index) => {
            if (line.toLowerCase().includes(lowerQuery)) {
              matchingLines.push(index + 1); // 1-based line numbers
            }
          });
          
          // Scroll to the current match
          if (matchingLines.length > 0 && currentMatchIndex < matchingLines.length) {
            const lineNumber = matchingLines[currentMatchIndex];
            setCurrentMatchLine(lineNumber);
            codeViewRef.current.scrollToLine(lineNumber);
          }
        }
      }
    }
  }, [currentMatchIndex, matchIds, viewMode, searchQuery, formattedCode]);
  
  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
            <Zap className="logo-icon" size={18} />
            <span className="logo-text">Formatter Pro</span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="tabs-container">
            {tabs.map((tab) => (
              <div 
                key={tab.id}
                className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span className="tab-icon">{tab.formatType === 'json' ? '{}' : '<>'}</span>
                <span className="tab-title">{tab.title}</span>
                <button 
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button 
              className="tab-add" 
              onClick={() => createNewTab('json')}
              title="New Tab"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="icon-button" 
            onClick={() => setIsHistoryOpen(true)}
            title="History"
          >
            <History size={18} />
          </button>
          <button 
            className="icon-button" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="app-toolbar">
        <div className="toolbar-group">
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${formatType === 'json' ? 'active' : ''}`}
              onClick={() => handleFormatChange('json')}
            >
              JSON
            </button>
            <button 
              className={`toggle-btn ${formatType === 'xml' ? 'active' : ''}`}
              onClick={() => handleFormatChange('xml')}
            >
              XML
            </button>
          </div>
          
          <div className="divider"></div>
          
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
            >
              Tree
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
            >
              Code
            </button>
          </div>
        </div>

        <div className="toolbar-group search-group">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              disabled={isProcessing}
            />
            {(searchMatches.size > 0 || (viewMode === 'code' && searchQuery)) && (
              <div className="search-actions">
                <span className="match-count">
                  {viewMode === 'tree' 
                    ? `${matchIds.length > 0 ? currentMatchIndex + 1 : 0}/${matchIds.length}`
                    : (() => {
                        if (!formattedCode) return '0/0';
                        const lines = formattedCode.split('\n');
                        const matchCount = lines.filter(line => 
                          line.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length;
                        return matchCount > 0 ? `${currentMatchIndex + 1}/${matchCount}` : '0/0';
                      })()
                  }
                </span>
                <div className="search-nav-btns">
                  <button onClick={handlePreviousMatch} title="Previous (Shift+Enter)">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={handleNextMatch} title="Next (Enter)">
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group actions-group">
          <button className="tool-btn" onClick={handleLoadFile} disabled={isProcessing} title="Load File">
            <FolderOpen className="btn-icon" size={16} />
            <span className="btn-text">Load</span>
          </button>
          <button className="tool-btn primary" onClick={handleFormat} disabled={isProcessing} title="Format">
            <Zap className="btn-icon" size={16} />
            <span className="btn-text">Format</span>
          </button>
          
          <div className="divider"></div>
          
          {viewMode === 'tree' && (
            <>
              <button className="tool-btn icon-only" onClick={handleExpandAll} disabled={isProcessing} title="Expand All">
                <ChevronsDown size={16} />
              </button>
              <button className="tool-btn icon-only" onClick={handleCollapseAll} disabled={isProcessing} title="Collapse All">
                <ChevronsUp size={16} />
              </button>
              <div className="divider"></div>
            </>
          )}
          
          <button className="tool-btn icon-only" onClick={handleCopy} disabled={!!error || allNodes.length === 0 || isProcessing} title="Copy to Clipboard">
            <Copy size={16} />
          </button>
          <button className="tool-btn icon-only danger" onClick={handleClear} disabled={isProcessing} title="Clear All">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="content">
        <motion.div 
          className="input-section"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
        >
          <motion.div 
            className="input-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Input {formatType.toUpperCase()}
            {jsonInput && (
              <span style={{ marginLeft: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {(jsonInput.length / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </motion.div>
          <div className="textarea-container">
            <input
              ref={fileInputRef}
              type="file"
              accept={formatType === 'xml' ? '.xml,text/xml,application/xml' : '.json,application/json'}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {jsonInput.length > 100000 ? (
              <VirtualizedInput
                value={jsonInput}
                onChange={setJsonInput}
                placeholder="Paste your JSON here or use 'Load File' button for large files..."
                className="json-input"
              />
            ) : (
              <textarea
                className="json-input"
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste your JSON here or use 'Load File' button for large files..."
                spellCheck={false}
                disabled={isProcessing}
              />
            )}
          </div>
        </motion.div>
        
        <motion.div 
          className="output-section"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
        >
          <motion.div 
            className="output-header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Formatted Output
            {viewMode === 'tree' && visibleNodes.length > 0 && (
              <span style={{ marginLeft: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                {visibleNodes.length} visible / {allNodes.length} total nodes
              </span>
            )}
          </motion.div>
          <div className="tree-container" ref={outputRef}>
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div 
                  className="processing-indicator"
                  key="processing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <motion.div 
                    className="spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {processingMessage}
                  </motion.p>
                </motion.div>
              ) : error ? (
                <motion.div 
                  className="error-message"
                  key="error"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <strong>Error parsing JSON:</strong>
                  <br />
                  {error}
                </motion.div>
              ) : viewMode === 'tree' ? (
                <motion.div
                  key="tree"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%' }}
                >
                  <VirtualTree
                    ref={treeRef}
                    nodes={visibleNodes}
                    onToggle={handleToggle}
                    searchMatches={searchMatches}
                    currentMatchId={currentMatchIndex >= 0 ? matchIds[currentMatchIndex] : undefined}
                    height={containerHeight}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="code"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ height: '100%' }}
                >
                  <CodeView 
                    ref={codeViewRef}
                    code={formattedCode} 
                    searchQuery={searchQuery}
                    currentMatchLine={currentMatchLine}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
      
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoad={handleLoadFromHistory}
      />
    </div>
  );
}

export default App;
