import React, { useRef, useEffect, useState } from 'react';

interface LineNumberTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  errorLine?: number | null;
}

export const LineNumberTextarea: React.FC<LineNumberTextareaProps> = ({ 
  value, 
  errorLine,
  className,
  ...props 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    if (value) {
      setLineCount(value.split('\n').length);
    } else {
      setLineCount(1);
    }
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      if (highlightRef.current) {
        highlightRef.current.style.transform = `translateY(-${scrollTop}px)`;
      }
    }
  };

  // Scroll to error line
  useEffect(() => {
    if (errorLine && textareaRef.current) {
      const lines = value.split('\n');
      if (errorLine <= lines.length) {
        const lineHeight = 24; 
        const scrollPos = (errorLine - 1) * lineHeight;
        
        textareaRef.current.scrollTo({
          top: scrollPos - 100, // Scroll a bit above so it's visible
          behavior: 'smooth'
        });
      }
    }
  }, [errorLine, value]);

  return (
    <div className={`line-number-textarea-container ${className || ''}`}>
      <div className="line-numbers" ref={lineNumbersRef}>
        {Array.from({ length: lineCount }, (_, i) => i + 1).map(num => (
          <div key={num} className={`line-number ${num === errorLine ? 'error' : ''}`}>
            {num === errorLine ? '❌' : num}
          </div>
        ))}
      </div>
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        <div className="textarea-backdrop">
           {errorLine && (
              <div 
                ref={highlightRef}
                className="error-highlight" 
                style={{ top: (errorLine - 1) * 24 + 'px' }} 
              />
           )}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onScroll={handleScroll}
          className="json-input"
          wrap="off"
          {...props}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};
