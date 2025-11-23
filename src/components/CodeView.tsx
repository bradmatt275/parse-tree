import React, { useMemo, useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';

interface CodeViewProps {
  code: string;
  searchQuery?: string;
  currentMatchLine?: number;
}

interface LineData {
  lines: string[];
  searchQuery?: string;
  currentMatchLine?: number;
}

export interface CodeViewRef {
  scrollToLine: (lineNumber: number) => void;
}

const CodeLine = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: LineData }) => {
  const { lines, searchQuery, currentMatchLine } = data;
  const line = lines[index];
  const isCurrentMatch = currentMatchLine === index + 1;
  
  // Simple syntax highlighting for each line
  const renderLine = (text: string) => {
    const parts: JSX.Element[] = [];
    let i = 0;
    let key = 0;
    
    while (i < text.length) {
      const char = text[i];
      
      // Strings
      if (char === '"') {
        let str = '"';
        i++;
        while (i < text.length && text[i] !== '"') {
          if (text[i] === '\\') {
            str += text[i] + (text[i + 1] || '');
            i += 2;
          } else {
            str += text[i];
            i++;
          }
        }
        if (i < text.length) {
          str += '"';
          i++;
        }
        
        // Check if this is a key (followed by colon)
        let j = i;
        while (j < text.length && /\s/.test(text[j])) j++;
        const isKey = text[j] === ':';
        
        parts.push(<span key={key++} className={`json-${isKey ? 'key' : 'string'}`}>{str}</span>);
        continue;
      }
      
      // Numbers
      if (/[-0-9]/.test(char)) {
        let num = '';
        while (i < text.length && /[0-9.eE+\-]/.test(text[i])) {
          num += text[i];
          i++;
        }
        parts.push(<span key={key++} className="json-number">{num}</span>);
        continue;
      }
      
      // Booleans and null
      if (/[a-z]/.test(char)) {
        let word = '';
        while (i < text.length && /[a-z]/.test(text[i])) {
          word += text[i];
          i++;
        }
        if (word === 'true' || word === 'false') {
          parts.push(<span key={key++} className="json-boolean">{word}</span>);
        } else if (word === 'null') {
          parts.push(<span key={key++} className="json-null">{word}</span>);
        } else {
          parts.push(<span key={key++}>{word}</span>);
        }
        continue;
      }
      
      // Punctuation and everything else
      if (/[{}[\]:,]/.test(char)) {
        parts.push(<span key={key++} className="json-punctuation">{char}</span>);
        i++;
        continue;
      }
      
      // Regular characters and whitespace
      parts.push(<span key={key++}>{char}</span>);
      i++;
    }
    
    return parts;
  };
  
  // Highlight search query if present
  const highlightSearch = (renderedParts: JSX.Element[]) => {
    if (!searchQuery || !searchQuery.trim()) return renderedParts;
    
    // Simple highlighting - wrap the line if it contains the search query
    const lowerLine = line.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    
    if (!lowerLine.includes(lowerQuery)) return renderedParts;
    
    // Return parts wrapped in a highlighted span
    return renderedParts;
  };
  
  return (
    <div style={style} className={`code-line ${isCurrentMatch ? 'current-match' : ''}`}>
      <span className="line-number">{index + 1}</span>
      <code className="line-content">{highlightSearch(renderLine(line))}</code>
    </div>
  );
});

CodeLine.displayName = 'CodeLine';

export const CodeView = forwardRef<CodeViewRef, CodeViewProps>(({ code, searchQuery, currentMatchLine }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const [containerHeight, setContainerHeight] = useState<number>(600);
  
  const lines = useMemo(() => code.split('\n'), [code]);
  
  useImperativeHandle(ref, () => ({
    scrollToLine: (lineNumber: number) => {
      if (listRef.current && lineNumber > 0 && lineNumber <= lines.length) {
        listRef.current.scrollToItem(lineNumber - 1, 'center');
      }
    },
  }));
  
  // Measure container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  if (!code) {
    return (
      <div className="empty-state">
        Paste JSON in the left panel to format
      </div>
    );
  }

  const itemData: LineData = { lines, searchQuery, currentMatchLine };
  
  return (
    <div ref={containerRef} className="code-view-container">
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={lines.length}
        itemSize={20}
        width="100%"
        itemData={itemData}
      >
        {CodeLine}
      </List>
    </div>
  );
});

CodeView.displayName = 'CodeView';
