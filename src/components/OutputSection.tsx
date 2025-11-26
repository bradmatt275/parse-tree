import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtualTree } from './VirtualTree';
import { CodeView, CodeViewRef } from './CodeView';
import { TreeNode } from '../parsers/jsonParser';

type ViewMode = 'tree' | 'code';

interface OutputSectionProps {
  viewMode: ViewMode;
  isProcessing: boolean;
  processingMessage: string;
  error: string | undefined;
  visibleNodes: TreeNode[];
  allNodes: TreeNode[];
  containerHeight: number;
  formattedCode: string;
  searchMatches: Set<string>;
  currentMatchId: string | undefined;
  searchQuery: string;
  currentMatchLine: number;
  outputRef: React.RefObject<HTMLDivElement>;
  treeRef: React.RefObject<any>;
  codeViewRef: React.RefObject<CodeViewRef>;
  onToggle: (nodeId: string) => void;
  validationErrors?: Map<number, string>;
  onCopyAll?: () => Promise<void>;
}

export const OutputSection: React.FC<OutputSectionProps> = ({
  viewMode,
  isProcessing,
  processingMessage,
  error,
  visibleNodes,
  allNodes,
  containerHeight,
  formattedCode,
  searchMatches,
  currentMatchId,
  searchQuery,
  currentMatchLine,
  outputRef,
  treeRef,
  codeViewRef,
  onToggle,
  validationErrors,
  onCopyAll,
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Clear selection when content changes or view mode changes
  useEffect(() => {
    setIsSelected(false);
  }, [formattedCode, viewMode, allNodes]);

  // Handle keyboard events for Ctrl+A (select all) and Ctrl+C (copy)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    
    if (isCtrlOrCmd && e.key === 'a') {
      // Ctrl+A: Select all content (visual feedback)
      e.preventDefault();
      e.stopPropagation();
      setIsSelected(true);
      setCopyFeedback('All content selected. Press Ctrl+C to copy.');
      setTimeout(() => setCopyFeedback(null), 2000);
    } else if (isCtrlOrCmd && e.key === 'c') {
      // Ctrl+C: Copy all formatted content
      e.preventDefault();
      e.stopPropagation();
      if (onCopyAll) {
        onCopyAll().then(() => {
          setCopyFeedback('Copied to clipboard!');
          setTimeout(() => {
            setCopyFeedback(null);
            setIsSelected(false);
          }, 2000);
        }).catch(() => {
          setCopyFeedback('Failed to copy');
          setTimeout(() => setCopyFeedback(null), 2000);
        });
      }
    }
  }, [onCopyAll]);

  // Handle copy event (for right-click copy menu)
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    // Only intercept if we have content to copy and the onCopyAll handler
    if (onCopyAll && formattedCode) {
      e.preventDefault();
      onCopyAll().then(() => {
        setCopyFeedback('Copied to clipboard!');
        setTimeout(() => {
          setCopyFeedback(null);
          setIsSelected(false);
        }, 2000);
      }).catch(() => {
        setCopyFeedback('Failed to copy');
        setTimeout(() => setCopyFeedback(null), 2000);
      });
    }
  }, [onCopyAll, formattedCode]);

  return (
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
      <div 
        className={`tree-container ${isSelected ? 'selected' : ''}`}
        ref={outputRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        role="region"
        aria-label="Formatted output"
      >
        {copyFeedback && (
          <div className="copy-feedback">
            {copyFeedback}
          </div>
        )}
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
              <strong>{validationErrors && validationErrors.size > 1 ? `Found ${validationErrors.size} Errors:` : 'Error parsing input:'}</strong>
              <br />
              {validationErrors && validationErrors.size > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0, marginTop: '0.5rem', textAlign: 'left' }}>
                  {Array.from(validationErrors.entries()).sort((a, b) => a[0] - b[0]).map(([line, msg]) => (
                    <li key={line} style={{ marginBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>
                      <span style={{ color: '#ff6b6b', fontWeight: 'bold', marginRight: '0.5rem' }}>Line {line}:</span>
                      {msg}
                    </li>
                  ))}
                </ul>
              ) : (
                error
              )}
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
                onToggle={onToggle}
                searchMatches={searchMatches}
                currentMatchId={currentMatchId}
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
  );
};
