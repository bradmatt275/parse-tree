import { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';

export interface MonacoEditorRef {
  scrollToLine: (lineNumber: number) => void;
}

interface MonacoEditorProps {
  value: string;
  language: 'json' | 'xml';
  theme: 'dark' | 'light';
  readOnly?: boolean;
  onChange?: (value: string | undefined) => void;
  className?: string;
  lineNumbers?: 'on' | 'off';
  minimap?: boolean;
}

export const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(({
  value,
  language,
  theme,
  readOnly = false,
  onChange,
  className,
  lineNumbers = 'on',
  minimap = true,
}, ref) => {
  const editorRef = useRef<any>(null);

  const handleEditorWillMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('app-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '60a5fa' },
        { token: 'string.value.json', foreground: 'f093fb' },
        { token: 'number', foreground: '7ee8fa' },
        { token: 'keyword.json', foreground: 'a78bfa' },
        { token: 'delimiter', foreground: 'a0a0a0' },
      ],
      colors: {
        'editor.background': '#1a1a2e',
        'editor.foreground': '#e8e8e8',
        'editor.lineHighlightBackground': '#16213e',
        'editorCursor.foreground': '#00d4ff',
        'editor.selectionBackground': '#4f46e540',
        'editorLineNumber.foreground': '#8b9bb4',
        'editorLineNumber.activeForeground': '#ffffff',
      }
    });

    monaco.editor.defineTheme('app-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'string.key.json', foreground: '3b82f6' },
        { token: 'string.value.json', foreground: 'd946ef' },
        { token: 'number', foreground: '06b6d4' },
        { token: 'keyword.json', foreground: '8b5cf6' },
        { token: 'delimiter', foreground: '64748b' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#1e293b',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editorCursor.foreground': '#3b82f6',
        'editor.selectionBackground': '#ddd6fe40',
        'editorLineNumber.foreground': '#64748b',
        'editorLineNumber.activeForeground': '#0f172a',
      }
    });
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    
    // Force update options to ensure they are applied
    editor.updateOptions({
      folding: false,
      renderLineHighlight: 'all',
      showFoldingControls: 'never'
    });
  };

  // Update options when props change
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        readOnly,
        minimap: { enabled: minimap },
        lineNumbers,
        folding: false, // Always disable folding
        showFoldingControls: 'never'
      });
    }
  }, [readOnly, minimap, lineNumbers]);

  useImperativeHandle(ref, () => ({
    scrollToLine: (lineNumber: number) => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber);
        editorRef.current.setPosition({ column: 1, lineNumber });
      }
    }
  }));

  // Map app theme to Monaco theme
  const monacoTheme = theme === 'dark' ? 'app-dark' : 'app-light';

  return (
    <div className={className} style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={monacoTheme}
        beforeMount={handleEditorWillMount}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: minimap },
          scrollBeyondLastLine: false,
          fontSize: 13,
          lineNumbers,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          folding: false,
          showFoldingControls: 'never',
          renderLineHighlight: 'all',
        }}
      />
    </div>
  );
});

MonacoEditor.displayName = 'MonacoEditor';
