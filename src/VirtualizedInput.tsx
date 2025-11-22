import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface LineData {
  lines: string[];
  onChange: (lineIndex: number, newContent: string) => void;
  onKeyDown: (lineIndex: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  focusedLine: number | null;
  setFocusedLine: (lineIndex: number | null) => void;
}

const LineRow = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: LineData }) => {
  const { lines, onChange, onKeyDown, focusedLine, setFocusedLine } = data;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const line = lines[index];

  useEffect(() => {
    if (focusedLine === index && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [focusedLine, index]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(index, e.target.value);
  }, [index, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown(index, e);
  }, [index, onKeyDown]);

  const handleFocus = useCallback(() => {
    setFocusedLine(index);
  }, [index, setFocusedLine]);

  return (
    <div style={style} className="virtual-line">
      <span className="line-number">{index + 1}</span>
      <textarea
        ref={textareaRef}
        value={line}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className="line-textarea"
        rows={1}
        spellCheck={false}
      />
    </div>
  );
});

LineRow.displayName = 'LineRow';

export const VirtualizedInput: React.FC<VirtualizedInputProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Paste or type JSON here...',
  className = ''
}) => {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedLine, setFocusedLine] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>(() => value.split('\n'));
  const [containerHeight, setContainerHeight] = useState<number>(600);

  // Update lines when value prop changes externally
  useEffect(() => {
    setLines(value.split('\n'));
  }, [value]);

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

  const handleLineChange = useCallback((lineIndex: number, newContent: string) => {
    setLines(prevLines => {
      const newLines = [...prevLines];
      newLines[lineIndex] = newContent;
      return newLines;
    });
  }, []);

  // Debounced onChange to parent - only send updates every 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const newValue = lines.join('\n');
      onChange(newValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [lines, onChange]);

  const handleKeyDown = useCallback((lineIndex: number, e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const cursorPosition = textarea.selectionStart;
    const lineContent = lines[lineIndex];

    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Split current line at cursor position
      const beforeCursor = lineContent.substring(0, cursorPosition);
      const afterCursor = lineContent.substring(cursorPosition);

      setLines(prevLines => {
        const newLines = [...prevLines];
        newLines[lineIndex] = beforeCursor;
        newLines.splice(lineIndex + 1, 0, afterCursor);
        return newLines;
      });

      // Focus next line after state updates
      setTimeout(() => {
        setFocusedLine(lineIndex + 1);
        if (listRef.current) {
          listRef.current.scrollToItem(lineIndex + 1, 'smart');
        }
      }, 0);
    } else if (e.key === 'Backspace' && cursorPosition === 0 && lineIndex > 0) {
      e.preventDefault();
      
      // Merge with previous line
      const prevLineLength = lines[lineIndex - 1].length;
      setLines(prevLines => {
        const newLines = [...prevLines];
        newLines[lineIndex - 1] = newLines[lineIndex - 1] + newLines[lineIndex];
        newLines.splice(lineIndex, 1);
        return newLines;
      });

      // Focus previous line at merge point
      setTimeout(() => {
        setFocusedLine(lineIndex - 1);
        if (listRef.current) {
          listRef.current.scrollToItem(lineIndex - 1, 'smart');
        }
        // Set cursor position after merge
        const prevTextarea = document.querySelector(`.virtual-line:nth-child(${lineIndex}) .line-textarea`) as HTMLTextAreaElement;
        if (prevTextarea) {
          prevTextarea.selectionStart = prevLineLength;
          prevTextarea.selectionEnd = prevLineLength;
        }
      }, 0);
    } else if (e.key === 'Delete' && cursorPosition === lineContent.length && lineIndex < lines.length - 1) {
      e.preventDefault();
      
      // Merge with next line
      setLines(prevLines => {
        const newLines = [...prevLines];
        newLines[lineIndex] = newLines[lineIndex] + newLines[lineIndex + 1];
        newLines.splice(lineIndex + 1, 1);
        return newLines;
      });
    } else if (e.key === 'ArrowUp' && lineIndex > 0) {
      e.preventDefault();
      setFocusedLine(lineIndex - 1);
      if (listRef.current) {
        listRef.current.scrollToItem(lineIndex - 1, 'smart');
      }
    } else if (e.key === 'ArrowDown' && lineIndex < lines.length - 1) {
      e.preventDefault();
      setFocusedLine(lineIndex + 1);
      if (listRef.current) {
        listRef.current.scrollToItem(lineIndex + 1, 'smart');
      }
    }
  }, [lines, onChange]);

  const itemData: LineData = {
    lines,
    onChange: handleLineChange,
    onKeyDown: handleKeyDown,
    focusedLine,
    setFocusedLine
  };

  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        spellCheck={false}
      />
    );
  }

  return (
    <div ref={containerRef} className={`virtualized-input ${className}`}>
      <List
        ref={listRef}
        height={containerHeight}
        itemCount={lines.length}
        itemSize={24}
        width="100%"
        itemData={itemData}
      >
        {LineRow}
      </List>
    </div>
  );
};
