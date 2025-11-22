import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

type Theme = 'dark' | 'light';
type ViewMode = 'tree' | 'code';
type FormatType = 'json' | 'xml';

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
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_JSON);
  const [allNodes, setAllNodes] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [theme, setTheme] = useState<Theme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [formatType, setFormatType] = useState<FormatType>('json');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<Set<string>>(new Set());
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [currentMatchLine, setCurrentMatchLine] = useState<number>(-1);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingMessage, setProcessingMessage] = useState<string>('Processing JSON...');
  
  
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
  
  // Auto-format with debounce when jsonInput changes
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Don't auto-format if input is empty
    if (!jsonInput.trim()) {
      setAllNodes([]);
      setError(undefined);
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
  
  // Parse on mount
  useEffect(() => {
    if (jsonInput) {
      parseInput(jsonInput);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setFormatType(newFormat);
    
    // Clear current data and load sample for new format
    if (newFormat === 'xml') {
      setJsonInput(SAMPLE_XML);
      setProcessingMessage('Processing XML...');
    } else {
      setJsonInput(SAMPLE_JSON);
      setProcessingMessage('Processing JSON...');
    }
    
    // Reset state
    setAllNodes([]);
    setError(undefined);
    setSearchQuery('');
  }, []);
  
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
    setAllNodes(prev => toggleNode(prev, nodeId));
  }, []);
  
  const handleExpandAll = useCallback(() => {
    setAllNodes(prev => expandAll(prev));
  }, []);
  
  const handleCollapseAll = useCallback(() => {
    setAllNodes(prev => collapseAll(prev));
  }, []);
  
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
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Formatter Pro</span>
          </div>
        </div>
        
        <div className="header-center">
          <div className="tabs-container">
            <div className="tab active">
              <span className="tab-icon">{formatType === 'json' ? '{}' : '<>'}</span>
              <span className="tab-title">Untitled-1.{formatType}</span>
              <button className="tab-close">×</button>
            </div>
            <button className="tab-add" title="New Tab (Coming Soon)">+</button>
          </div>
        </div>

        <div className="header-right">
          <button 
            className="icon-button" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
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
            <span className="search-icon">🔍</span>
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
                  <button onClick={handlePreviousMatch} title="Previous (Shift+Enter)">▲</button>
                  <button onClick={handleNextMatch} title="Next (Enter)">▼</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-group actions-group">
          <button className="tool-btn" onClick={handleLoadFile} disabled={isProcessing} title="Load File">
            <span className="btn-icon">📂</span>
            <span className="btn-text">Load</span>
          </button>
          <button className="tool-btn primary" onClick={handleFormat} disabled={isProcessing} title="Format">
            <span className="btn-icon">⚡</span>
            <span className="btn-text">Format</span>
          </button>
          
          <div className="divider"></div>
          
          {viewMode === 'tree' && (
            <>
              <button className="tool-btn icon-only" onClick={handleExpandAll} disabled={isProcessing} title="Expand All">
                ⇊
              </button>
              <button className="tool-btn icon-only" onClick={handleCollapseAll} disabled={isProcessing} title="Collapse All">
                ⇈
              </button>
              <div className="divider"></div>
            </>
          )}
          
          <button className="tool-btn icon-only" onClick={handleCopy} disabled={!!error || allNodes.length === 0 || isProcessing} title="Copy to Clipboard">
            📋
          </button>
          <button className="tool-btn icon-only danger" onClick={handleClear} disabled={isProcessing} title="Clear All">
            🗑️
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
    </div>
  );
}

export default App;
