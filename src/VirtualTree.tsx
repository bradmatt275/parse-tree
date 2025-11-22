import React, { memo, useRef, useImperativeHandle, forwardRef } from 'react';
import { FixedSizeList as List } from 'react-window';
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
      const preview = node.isExpanded ? '{' : `{ ${node.childCount || 0} items }`;
      return <span className="json-punctuation">{preview}</span>;
    }
    
    if (node.type === 'array') {
      const preview = node.isExpanded ? '[' : `[ ${node.childCount || 0} items ]`;
      return <span className="json-punctuation">{preview}</span>;
    }
    
    if (node.type === 'string') {
      return <span className="json-string">&quot;{node.value}&quot;</span>;
    }
    
    if (node.type === 'number') {
      return <span className="json-number">{node.value}</span>;
    }
    
    if (node.type === 'boolean') {
      return <span className="json-boolean">{String(node.value)}</span>;
    }
    
    if (node.type === 'null') {
      return <span className="json-null">null</span>;
    }
    
    return null;
  };
  
  const renderClosingBracket = () => {
    if (node.type === 'object' && node.isExpanded && node.hasChildren) {
      return <span className="json-punctuation">{'}'}</span>;
    }
    if (node.type === 'array' && node.isExpanded && node.hasChildren) {
      return <span className="json-punctuation">{']'}</span>;
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
  
  // Check if this is a closing bracket row
  const isClosingBracket = index > 0 && nodes[index - 1] && 
    (nodes[index - 1].type === 'object' || nodes[index - 1].type === 'array') &&
    nodes[index - 1].isExpanded && 
    nodes[index - 1].hasChildren &&
    node.depth < nodes[index - 1].depth;
  
  if (isClosingBracket) {
    const parentNode = nodes[index - 1];
    return (
      <div 
        className={`tree-node ${isMatch ? 'highlight' : ''}`}
        style={style}
      >
        <span className="line-number">{index + 1}</span>
        <div className="tree-content">
          <span className="indent" style={{ width: parentNode.depth * INDENT_SIZE }} />
          <span className="expand-icon" style={{ opacity: 0 }}>·</span>
          {renderClosingBracket()}
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`tree-node ${isMatch ? 'highlight' : ''} ${isCurrentMatch ? 'current-match' : ''}`}
      style={style}
    >
      <span className="line-number">{index + 1}</span>
      <div className="tree-content">
        <span className="indent" style={{ width: node.depth * INDENT_SIZE }} />
        {expandIcon}
        {node.key && (
          <>
            <span className="json-key">&quot;{node.key}&quot;</span>
            <span className="json-punctuation">: </span>
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
