import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtualTree } from './VirtualTree';
import { MonacoEditor, MonacoEditorRef } from './MonacoEditor';
import { TreeNode } from '../parsers/jsonParser';
import { FormatType } from '../types';

type ViewMode = 'tree' | 'code';

interface OutputSectionProps {
  viewMode: ViewMode;
  formatType: FormatType;
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
  codeViewRef: React.RefObject<MonacoEditorRef>;
  onToggle: (nodeId: string) => void;
  onCopyAll?: () => Promise<void>;
  theme: 'dark' | 'light';
}

export const OutputSection: React.FC<OutputSectionProps> = ({
  viewMode,
  formatType,
  isProcessing,
  processingMessage,
  error,
  visibleNodes,
  allNodes,
  containerHeight,
  formattedCode,
  searchMatches,
  currentMatchId,
  outputRef,
  treeRef,
  codeViewRef,
  onToggle,
  onCopyAll,
  theme
}) => {
  const [isSelected, setIsSelected] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Helper function to show feedback message with auto-clear
  const showFeedback = useCallback((message: string, clearSelection = false) => {
    setCopyFeedback(message);
    setTimeout(() => {
      setCopyFeedback(null);
      if (clearSelection) {
        setIsSelected(false);
      }
    }, 2000);
  }, []);

  // Helper function to perform copy operation with feedback
  const performCopy = useCallback(() => {
    if (onCopyAll) {
      onCopyAll()
        .then(() => showFeedback('Copied to clipboard!', true))
        .catch(() => showFeedback('Failed to copy'));
    }
  }, [onCopyAll, showFeedback]);

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
      showFeedback('All content selected. Press Ctrl+C to copy.');
    } else if (isCtrlOrCmd && e.key === 'c') {
      // Ctrl+C: Copy all formatted content
      e.preventDefault();
      e.stopPropagation();
      performCopy();
    }
  }, [showFeedback, performCopy]);

  // Handle copy event (for right-click copy menu)
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    // Only intercept if we have content to copy and the onCopyAll handler
    if (onCopyAll && formattedCode) {
      e.preventDefault();
      performCopy();
    }
  }, [onCopyAll, formattedCode, performCopy]);

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
              <strong>Error parsing input:</strong>
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
              <MonacoEditor
                ref={codeViewRef}
                value={formattedCode}
                language={formatType}
                theme={theme}
                readOnly={true}
                className="monaco-editor-container"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
