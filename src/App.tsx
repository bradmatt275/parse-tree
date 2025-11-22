import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { CodeViewRef } from './CodeView';
import {
  getVisibleNodes,
  toggleNode,
  expandAll,
  collapseAll,
  searchNodes,
  TreeNode,
} from './jsonParser';
import { getErrorLine, validateJson, validateXml } from './utils/validation';
import { HistoryModal } from './HistoryModal';
import { saveToHistory, migrateFromLocalStorage } from './historyStorage';
import { FormatType } from './types';
import { Header } from './Header';
import { Toolbar } from './Toolbar';
import { InputSection } from './InputSection';
import { OutputSection } from './OutputSection';
import { useWebWorker } from './useWebWorker';
import { useTabManager } from './useTabManager';

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
  // Tab management
  const {
    tabs,
    activeTabId,
    jsonInput,
    allNodes,
    error,
    formatType,
    currentSessionId,
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
  } = useTabManager();
  
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
  const [validationErrors, setValidationErrors] = useState<Map<number, string>>(new Map());
  
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const expansionDebounceRef = useRef<number | null>(null);
  const treeRef = useRef<any>(null);
  const codeViewRef = useRef<CodeViewRef>(null);
  const isExpandingRef = useRef<boolean>(false);
  const lastSearchQueryRef = useRef<string>('');
  const pendingScrollRef = useRef<string | null>(null);
  const mountParseRef = useRef<boolean>(false);
  const jsonInputRef = useRef<string>(jsonInput);

  // Keep jsonInputRef in sync
  useEffect(() => {
    jsonInputRef.current = jsonInput;
  }, [jsonInput]);
  
  // Initialize with one tab
  useEffect(() => {
    if (!initializedRef.current && tabs.length === 0) {
      initializedRef.current = true;
      createNewTab('json');
      // Migrate from localStorage to IndexedDB if needed
      migrateFromLocalStorage().catch(err => {
        console.error('Migration failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Web Worker callbacks (memoized to prevent worker recreation)
  const onParseSuccess = useCallback((nodes: TreeNode[], originalInput?: string) => {
    setAllNodes(nodes);
    setError(undefined);
    setValidationErrors(new Map());
    setIsProcessing(false);
    setProcessingMessage('Processing JSON...');
    
    // Save to history on successful parse (skip if it's the default sample)
    if (originalInput && originalInput.trim() && originalInput !== SAMPLE_JSON) {
      const sessionId = currentSessionIdRef.current;
      saveToHistory(originalInput, 'json', sessionId);
    }
  }, [setAllNodes, setError]);
  
  const onParseError = useCallback((err: string) => {
    setError(err);
    
    // Try to find multiple errors if it's JSON
    if (formatType === 'json') {
      const errors = validateJson(jsonInputRef.current);
      if (errors.length > 0) {
        const errorMap = new Map<number, string>();
        errors.forEach(e => errorMap.set(e.line, e.message));
        setValidationErrors(errorMap);
      } else {
        // Fallback to single error line from message
        const line = getErrorLine(err, jsonInputRef.current);
        if (line) {
          setValidationErrors(new Map([[line, err]]));
        } else {
          setValidationErrors(new Map());
        }
      }
    } else {
      // XML or other
      const line = getErrorLine(err, jsonInputRef.current);
      if (line) {
        setValidationErrors(new Map([[line, err]]));
      } else {
        setValidationErrors(new Map());
      }
    }
    
    setAllNodes([]);
    setIsProcessing(false);
    setProcessingMessage('Processing JSON...');
  }, [setError, setAllNodes, formatType]);
  
  const onParseProgress = useCallback((message: string) => {
    setProcessingMessage(message);
  }, []);
  
  const onExpandSuccess = useCallback((nodes: TreeNode[]) => {
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
  }, [setAllNodes]);
  
  const onExpandError = useCallback((err: string) => {
    console.error('Expand error:', err);
    isExpandingRef.current = false;
    pendingScrollRef.current = null;
  }, []);
  
  // Web Worker for JSON parsing
  const { parseJson, expandToMatches } = useWebWorker({
    onParseSuccess,
    onParseError,
    onParseProgress,
    onExpandSuccess,
    onExpandError,
  });
  
  // Parse input based on format type
  const parseInput = useCallback((input: string) => {
    // Don't process empty input
    if (!input || !input.trim()) {
      setAllNodes([]);
      setError(undefined);
      setIsProcessing(false);
      return;
    }
    
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
          const errorMsg = parserError.textContent || 'Invalid XML';
          setError(errorMsg);
          
          // Use saxes to find all errors
          const errors = validateXml(input);
          if (errors.length > 0) {
            const errorMap = new Map<number, string>();
            errors.forEach(e => {
              const existing = errorMap.get(e.line);
              errorMap.set(e.line, existing ? `${existing}; ${e.message}` : e.message);
            });
            setValidationErrors(errorMap);
          } else {
            const line = getErrorLine(errorMsg, input);
            if (line) {
              setValidationErrors(new Map([[line, errorMsg]]));
            } else {
              setValidationErrors(new Map());
            }
          }
          
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
        setValidationErrors(new Map());
        setIsProcessing(false);
        
        // Save to history on successful parse (skip if it's the default sample)
        if (input.trim() && input !== SAMPLE_XML) {
          const sessionId = currentSessionIdRef.current;
          saveToHistory(input, 'xml', sessionId);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Invalid XML';
        setError(errorMsg);
        
        // Use saxes to find all errors
        const errors = validateXml(input);
        if (errors.length > 0) {
          const errorMap = new Map<number, string>();
          errors.forEach(e => {
            const existing = errorMap.get(e.line);
            errorMap.set(e.line, existing ? `${existing}; ${e.message}` : e.message);
          });
          setValidationErrors(errorMap);
        } else {
          const line = getErrorLine(errorMsg, input);
          if (line) {
            setValidationErrors(new Map([[line, errorMsg]]));
          } else {
            setValidationErrors(new Map());
          }
        }
        
        setAllNodes([]);
        setIsProcessing(false);
      }
    } else {
      // Use Web Worker for JSON parsing
      parseJson(input);
    }
  }, [formatType, parseJson, currentSessionId]);
  
  // Auto-format with debounce when tab content or format changes
  useEffect(() => {
    // Skip if this is the mount parse (handled separately)
    if (mountParseRef.current) {
      return;
    }
    
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
  
  // Parse on mount (like original code)
  useEffect(() => {
    if (jsonInput && jsonInput.trim() && tabs.length > 0) {
      mountParseRef.current = true;
      parseInput(jsonInput);
      // Reset flag after a short delay so subsequent changes trigger auto-format
      const timer = setTimeout(() => {
        mountParseRef.current = false;
      }, 100);
      
      return () => {
        clearTimeout(timer);
        mountParseRef.current = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs.length]);
  
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
            
            expandToMatches(allNodes, matchIdsArray);
          }, 500); // Wait 500ms after user stops typing
        }
      }
      lastSearchQueryRef.current = searchQuery;
    } else {
      setSearchMatches(new Set());
      setCurrentMatchIndex(-1);
      lastSearchQueryRef.current = '';
    }
  }, [searchQuery, allNodes, expandToMatches]);
  
  const handleFormatChange = useCallback((newFormat: FormatType) => {
    // Update active tab format type and content
    const newContent = newFormat === 'xml' ? SAMPLE_XML : SAMPLE_JSON;
    setFormatType(newFormat);
    setJsonInput(newContent);
    setAllNodes([]);
    setError(undefined);
    setValidationErrors(new Map());
    
    // Update tab title
    const tabIndex = tabs.findIndex(t => t.id === activeTabId);
    if (tabIndex !== -1) {
      updateTabTitle(activeTabId, `Untitled-${tabIndex + 1}.${newFormat}`);
    }
    
    setProcessingMessage(newFormat === 'xml' ? 'Processing XML...' : 'Processing JSON...');
    setSearchQuery('');
  }, [activeTabId, tabs, setFormatType, setJsonInput, setAllNodes, setError, updateTabTitle]);
  
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
  }, [parseInput, setJsonInput]);
  
  const handleToggle = useCallback((nodeId: string) => {
    setAllNodes(toggleNode(allNodes, nodeId));
  }, [allNodes, setAllNodes]);
  
  const handleExpandAll = useCallback(() => {
    setAllNodes(expandAll(allNodes));
  }, [allNodes, setAllNodes]);
  
  const handleCollapseAll = useCallback(() => {
    setAllNodes(collapseAll(allNodes));
  }, [allNodes, setAllNodes]);
  
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
    setValidationErrors(new Map());
    setSearchQuery('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setJsonInput, setAllNodes, setError]);
  
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
  }, [parseInput, setJsonInput]);
  
  const handleLoadFromHistory = useCallback((content: string, format: FormatType, sessionId?: string) => {
    setJsonInput(content);
    setFormatType(format);
    setAllNodes([]);
    setError(undefined);
    
    // Update the active tab's sessionId to continue editing the same history entry
    if (sessionId && activeTabId) {
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, sessionId } : tab
      ));
    }
    
    parseInput(content);
  }, [parseInput, setJsonInput, setFormatType, setAllNodes, setError, activeTabId, setTabs]);
  
  const visibleNodes = useMemo(() => getVisibleNodes(allNodes), [allNodes]);
  
  const formattedCode = useMemo(() => {
    if (error || allNodes.length === 0) return '';
    try {
      if (formatType === 'xml') {
        // Format XML properly
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(jsonInput, 'text/xml');
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(xmlDoc);
        
        // Pretty print XML
        let formatted = '';
        let indent = 0;
        const tab = '  ';
        
        xmlString.split(/>\s*</).forEach((node, index) => {
          if (index > 0) formatted += '\n';
          
          if (node.match(/^\/\w/)) indent--; // Closing tag
          formatted += tab.repeat(indent) + '<' + node + '>';
          if (node.match(/^<?\w[^>]*[^\/]$/)) indent++; // Opening tag
        });
        
        return formatted.substring(1, formatted.length - 1); // Remove extra < >
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

  // Calculate search match count for toolbar
  const searchMatchCount = useMemo(() => {
    if (viewMode === 'tree') {
      return matchIds.length;
    } else {
      // For code view
      if (!formattedCode || !searchQuery) return 0;
      const lines = formattedCode.split('\n');
      return lines.filter(line => 
        line.toLowerCase().includes(searchQuery.toLowerCase())
      ).length;
    }
  }, [viewMode, matchIds.length, formattedCode, searchQuery]);
  
  return (
    <div className="app">
      <Header
        tabs={tabs}
        activeTabId={activeTabId}
        theme={theme}
        onTabChange={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={() => createNewTab('json')}
        onToggleTheme={toggleTheme}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <Toolbar
        formatType={formatType}
        viewMode={viewMode}
        searchQuery={searchQuery}
        searchMatchCount={searchMatchCount}
        currentMatchIndex={currentMatchIndex}
        isProcessing={isProcessing}
        hasError={!!error}
        hasNodes={allNodes.length > 0}
        onFormatChange={handleFormatChange}
        onViewModeChange={setViewMode}
        onSearchChange={setSearchQuery}
        onSearchKeyDown={handleSearchKeyDown}
        onPreviousMatch={handlePreviousMatch}
        onNextMatch={handleNextMatch}
        onLoadFile={handleLoadFile}
        onFormat={handleFormat}
        onExpandAll={handleExpandAll}
        onCollapseAll={handleCollapseAll}
        onCopy={handleCopy}
        onClear={handleClear}
      />
      
      <div className="content">
        <InputSection
          formatType={formatType}
          jsonInput={jsonInput}
          isProcessing={isProcessing}
          fileInputRef={fileInputRef}
          onInputChange={setJsonInput}
          onFileUpload={handleFileUpload}
          onPaste={handlePaste}
          validationErrors={validationErrors}
        />
        
        <OutputSection
          viewMode={viewMode}
          isProcessing={isProcessing}
          processingMessage={processingMessage}
          error={error}
          visibleNodes={visibleNodes}
          allNodes={allNodes}
          containerHeight={containerHeight}
          formattedCode={formattedCode}
          searchMatches={searchMatches}
          currentMatchId={currentMatchIndex >= 0 ? matchIds[currentMatchIndex] : undefined}
          searchQuery={searchQuery}
          currentMatchLine={currentMatchLine}
          outputRef={outputRef}
          treeRef={treeRef}
          codeViewRef={codeViewRef}
          onToggle={handleToggle}
          validationErrors={validationErrors}
        />
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
