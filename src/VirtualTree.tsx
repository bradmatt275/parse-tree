import React, { memo, useRef, useImperativeHandle, forwardRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, LayoutList, Type, Hash, ToggleLeft, Ban, FileText } from 'lucide-react';
import { TreeNode } from './jsonParser';

interface VirtualTreeProps {
  nodes: TreeNode[];
  onToggle: (nodeId: string) => void;
  searchMatches: Set<string>;
  currentMatchId?: string;
  height: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    nodes: TreeNode[];
    onToggle: (nodeId: string) => void;
    searchMatches: Set<string>;
    currentMatchId?: string;
  };
}

const INDENT_SIZE = 16;
const ROW_HEIGHT = 22;

const TreeNodeRow = memo(({ index, style, data }: RowProps) => {
  const { nodes, onToggle, searchMatches, currentMatchId } = data;
  const node = nodes[index];
  
  if (!node) return null;
  
  const isMatch = searchMatches.has(node.id);
  const isCurrentMatch = currentMatchId === node.id;
  
  const renderValue = () => {
    if (node.type === 'object') {
      // If it has a key (property), just show {count}
      // If it's a root or array item (no key or index key), show object {count}
      const typeLabel = (node.key && node.index === undefined) ? '' : 'object ';
      return <span className="json-punctuation">{typeLabel}{'{'}{node.childCount || 0}{'}'}</span>;
    }
    
    if (node.type === 'array') {
      const typeLabel = (node.key && node.index === undefined) ? '' : 'array ';
      return <span className="json-punctuation">{typeLabel}[{node.childCount || 0}]</span>;
    }
    
    if (node.type === 'string') {
      return <span className="json-string">&quot;{node.value}&quot;</span>;
    }
    
    if (node.type === 'number') {
      return <span className="json-number">{node.value}</span>;
    }
    
    if (node.type === 'boolean') {
      return (
        <>
          <input 
            type="checkbox" 
            checked={node.value} 
            readOnly 
            style={{ marginRight: 6, verticalAlign: 'middle', accentColor: 'var(--boolean-color)' }} 
          />
          <span className="json-boolean">{String(node.value)}</span>
        </>
      );
    }
    
    if (node.type === 'null') {
      return <span className="json-null">null</span>;
    }
    
    return null;
  };
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.hasChildren) {
      onToggle(node.id);
    }
  };
  
  const expandIcon = node.hasChildren ? (
    <span className="expand-icon" onClick={handleToggle}>
      {node.isExpanded ? '▼' : '▶'}
    </span>
  ) : (
    <span className="expand-icon" style={{ opacity: 0 }}>·</span>
  );

  const getIcon = () => {
    const iconProps = { size: 14, style: { marginRight: 6, opacity: 0.7, flexShrink: 0 } };
    
    switch (node.type) {
      case 'object':
        return <Box {...iconProps} color="var(--accent-color)" />;
      case 'array':
        return <LayoutList {...iconProps} color="var(--key-color)" />;
      case 'string':
        return <Type {...iconProps} color="var(--string-color)" />;
      case 'number':
        return <Hash {...iconProps} color="var(--number-color)" />;
      case 'boolean':
        return <ToggleLeft {...iconProps} color="var(--boolean-color)" />;
      case 'null':
        return <Ban {...iconProps} color="var(--null-color)" />;
      default:
        return <FileText {...iconProps} color="var(--text-secondary)" />;
    }
  };
  
  return (
    <div 
      className={`tree-node ${isMatch ? 'highlight' : ''} ${isCurrentMatch ? 'current-match' : ''}`}
      style={style}
    >
      <span className="line-number">{index + 1}</span>
      <div className="tree-content">
        <span className="indent" style={{ width: node.depth * INDENT_SIZE }} />
        {expandIcon}
        {getIcon()}
        {node.key && (
          <>
            <span className="json-key" style={node.index !== undefined ? { color: 'var(--text-secondary)' } : {}}>
              {node.key}
            </span>
            <span className="json-punctuation" style={{ marginRight: 6 }}> :</span>
          </>
        )}
        {renderValue()}
      </div>
    </div>
  );
});

TreeNodeRow.displayName = 'TreeNodeRow';

export const VirtualTree = forwardRef<any, VirtualTreeProps>(({
  nodes,
  onToggle,
  searchMatches,
  currentMatchId,
  height,
}, ref) => {
  const listRef = useRef<List>(null);
  
  useImperativeHandle(ref, () => ({
    scrollToNode: (nodeId: string) => {
      const index = nodes.findIndex(node => node.id === nodeId);
      if (index !== -1 && listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      }
    },
  }));
  
  if (nodes.length === 0) {
    return (
      <div className="empty-state">
        Paste JSON in the left panel to format
      </div>
    );
  }
  
  return (
    <List
      ref={listRef}
      height={height}
      itemCount={nodes.length}
      itemSize={ROW_HEIGHT}
      width="100%"
      itemData={{
        nodes,
        onToggle,
        searchMatches,
        currentMatchId,
      }}
    >
      {TreeNodeRow}
    </List>
  );
});
