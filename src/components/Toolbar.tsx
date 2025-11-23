import React from 'react';
import {
  Search,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Zap,
  Copy,
  Trash2,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import { FormatType } from '../types';

type ViewMode = 'tree' | 'code';

interface ToolbarProps {
  formatType: FormatType;
  viewMode: ViewMode;
  searchQuery: string;
  searchMatchCount: number;
  currentMatchIndex: number;
  isProcessing: boolean;
  hasError: boolean;
  hasNodes: boolean;
  onFormatChange: (format: FormatType) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchChange: (query: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPreviousMatch: () => void;
  onNextMatch: () => void;
  onLoadFile: () => void;
  onFormat: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onCopy: () => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  formatType,
  viewMode,
  searchQuery,
  searchMatchCount,
  currentMatchIndex,
  isProcessing,
  hasError,
  hasNodes,
  onFormatChange,
  onViewModeChange,
  onSearchChange,
  onSearchKeyDown,
  onPreviousMatch,
  onNextMatch,
  onLoadFile,
  onFormat,
  onExpandAll,
  onCollapseAll,
  onCopy,
  onClear,
}) => {
  const showSearchActions = searchMatchCount > 0 || (viewMode === 'code' && searchQuery);

  return (
    <div className="app-toolbar">
      <div className="toolbar-group">
        <div className="toggle-group">
          <button 
            className={`toggle-btn ${formatType === 'json' ? 'active' : ''}`}
            onClick={() => onFormatChange('json')}
          >
            JSON
          </button>
          <button 
            className={`toggle-btn ${formatType === 'xml' ? 'active' : ''}`}
            onClick={() => onFormatChange('xml')}
          >
            XML
          </button>
        </div>
        
        <div className="divider"></div>
        
        <div className="toggle-group">
          <button 
            className={`toggle-btn ${viewMode === 'tree' ? 'active' : ''}`}
            onClick={() => onViewModeChange('tree')}
          >
            Tree
          </button>
          <button 
            className={`toggle-btn ${viewMode === 'code' ? 'active' : ''}`}
            onClick={() => onViewModeChange('code')}
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
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            disabled={isProcessing}
          />
          {showSearchActions && (
            <div className="search-actions">
              <span className="match-count">
                {searchMatchCount > 0 
                  ? `${currentMatchIndex + 1}/${searchMatchCount}` 
                  : '0/0'
                }
              </span>
              <div className="search-nav-btns">
                <button onClick={onPreviousMatch} title="Previous (Shift+Enter)">
                  <ChevronUp size={14} />
                </button>
                <button onClick={onNextMatch} title="Next (Enter)">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-group actions-group">
        <button 
          className="tool-btn" 
          onClick={onLoadFile} 
          disabled={isProcessing} 
          title="Load File"
        >
          <FolderOpen className="btn-icon" size={16} />
          <span className="btn-text">Load</span>
        </button>
        <button 
          className="tool-btn primary" 
          onClick={onFormat} 
          disabled={isProcessing} 
          title="Format"
        >
          <Zap className="btn-icon" size={16} />
          <span className="btn-text">Format</span>
        </button>
        
        <div className="divider"></div>
        
        {viewMode === 'tree' && (
          <>
            <button 
              className="tool-btn icon-only" 
              onClick={onExpandAll} 
              disabled={isProcessing} 
              title="Expand All"
            >
              <ChevronsDown size={16} />
            </button>
            <button 
              className="tool-btn icon-only" 
              onClick={onCollapseAll} 
              disabled={isProcessing} 
              title="Collapse All"
            >
              <ChevronsUp size={16} />
            </button>
            <div className="divider"></div>
          </>
        )}
        
        <button 
          className="tool-btn icon-only" 
          onClick={onCopy} 
          disabled={hasError || !hasNodes || isProcessing} 
          title="Copy to Clipboard"
        >
          <Copy size={16} />
        </button>
        <button 
          className="tool-btn icon-only danger" 
          onClick={onClear} 
          disabled={isProcessing} 
          title="Clear All"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
