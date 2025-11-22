import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

function App() {
  const [jsonInput, setJsonInput] = useState<string>(SAMPLE_JSON);
  const [allNodes, setAllNodes] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [theme, setTheme] = useState<Theme>('dark');
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
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
      setIsProcessing(true);
      setError(undefined);
      
      workerRef.current?.postMessage({
        type: 'PARSE_JSON',
        data: jsonInput
      });
    }, 800);
    
    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [jsonInput]);
  
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
  
  // Parse JSON on mount
  useEffect(() => {
    if (jsonInput) {
      setIsProcessing(true);
      workerRef.current?.postMessage({
        type: 'PARSE_JSON',
        data: jsonInput
      });
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
  
  const handleFormat = useCallback(() => {
    if (!jsonInput.trim()) {
      setError('Please enter some JSON to format');
      return;
    }
    
    setIsProcessing(true);
    setError(undefined);
    
    // Use Web Worker for parsing
    workerRef.current?.postMessage({
      type: 'PARSE_JSON',
      data: jsonInput
    });
  }, [jsonInput]);
  
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setJsonInput(text);
      
      // Use Web Worker for parsing
      workerRef.current?.postMessage({
        type: 'PARSE_JSON',
        data: text
      });
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  }, []);
  
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
      const formatted = JSON.stringify(JSON.parse(jsonInput), null, 2);
      await navigator.clipboard.writeText(formatted);
      alert('Copied to clipboard!');
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  }, [jsonInput]);
  
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
      setIsProcessing(true);
      setError(undefined);
      
      // Parse immediately using Web Worker
      workerRef.current?.postMessage({
        type: 'PARSE_JSON',
        data: pastedText
      });
    }
    // For small pastes, let default behavior handle it
  }, []);
  
  const visibleNodes = useMemo(() => getVisibleNodes(allNodes), [allNodes]);
  
  const formattedCode = useMemo(() => {
    if (error || allNodes.length === 0) return '';
    try {
      return JSON.stringify(JSON.parse(jsonInput), null, 2);
    } catch {
      return '';
    }
  }, [jsonInput, error, allNodes.length]);
  
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
      <header className="header">
        <h1 className="header-title">JSON Formatter Pro</h1>
        <div className="header-controls">
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
              onClick={() => setViewMode('tree')}
              title="Tree View"
            >
              🌳 Tree
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
              onClick={() => setViewMode('code')}
              title="Code View"
            >
              {'{ }'} Code
            </button>
          </div>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search keys/values..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              disabled={isProcessing}
            />
            {searchMatches.size > 0 && viewMode === 'tree' && (
              <div className="search-navigation">
                <span className="search-results">
                  {currentMatchIndex + 1} / {matchIds.length}
                </span>
                <button 
                  className="nav-btn" 
                  onClick={handlePreviousMatch}
                  title="Previous match (Shift+Enter)"
                  disabled={matchIds.length === 0}
                >
                  ▲
                </button>
                <button 
                  className="nav-btn" 
                  onClick={handleNextMatch}
                  title="Next match (Enter)"
                  disabled={matchIds.length === 0}
                >
                  ▼
                </button>
              </div>
            )}
            {searchQuery && viewMode === 'code' && formattedCode && (
              <div className="search-navigation">
                <span className="search-results">
                  {(() => {
                    const lines = formattedCode.split('\\n');
                    const matchCount = lines.filter(line => 
                      line.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length;
                    return matchCount > 0 ? `${currentMatchIndex + 1} / ${matchCount}` : '0 / 0';
                  })()}
                </span>
                <button 
                  className="nav-btn" 
                  onClick={handlePreviousMatch}
                  title="Previous match (Shift+Enter)"
                >
                  ▲
                </button>
                <button 
                  className="nav-btn" 
                  onClick={handleNextMatch}
                  title="Next match (Enter)"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
          <button className="btn" onClick={handleLoadFile} disabled={isProcessing}>
            📁 Load File
          </button>
          <button className="btn" onClick={handleFormat} disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Format'}
          </button>
          {viewMode === 'tree' && (
            <>
              <button className="btn btn-secondary" onClick={handleExpandAll} disabled={isProcessing}>
                Expand All
              </button>
              <button className="btn btn-secondary" onClick={handleCollapseAll} disabled={isProcessing}>
                Collapse All
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={handleCopy} disabled={!!error || allNodes.length === 0 || isProcessing}>
            Copy
          </button>
          <button className="btn btn-secondary" onClick={handleClear} disabled={isProcessing}>
            Clear
          </button>
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      
      <div className="content">
        <div className="input-section">
          <div className="input-header">
            Input JSON
            {jsonInput && (
              <span style={{ marginLeft: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {(jsonInput.length / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
          <div className="textarea-container">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
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
        </div>
        
        <div className="output-section">
          <div className="output-header">
            Formatted Output
            {viewMode === 'tree' && visibleNodes.length > 0 && (
              <span style={{ marginLeft: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>
                {visibleNodes.length} visible / {allNodes.length} total nodes
              </span>
            )}
          </div>
          <div className="tree-container" ref={outputRef}>
            {isProcessing ? (
              <div className="processing-indicator">
                <div className="spinner"></div>
                <p>{processingMessage}</p>
              </div>
            ) : error ? (
              <div className="error-message">
                <strong>Error parsing JSON:</strong>
                <br />
                {error}
              </div>
            ) : viewMode === 'tree' ? (
              <VirtualTree
                ref={treeRef}
                nodes={visibleNodes}
                onToggle={handleToggle}
                searchMatches={searchMatches}
                currentMatchId={currentMatchIndex >= 0 ? matchIds[currentMatchIndex] : undefined}
                height={containerHeight}
              />
            ) : (
              <CodeView 
                ref={codeViewRef}
                code={formattedCode} 
                searchQuery={searchQuery}
                currentMatchLine={currentMatchLine}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
