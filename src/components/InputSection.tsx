import React from 'react';
import { motion } from 'framer-motion';
import { MonacoEditor } from './MonacoEditor';
import { FormatType } from '../types';

interface InputSectionProps {
  formatType: FormatType;
  jsonInput: string;
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onCopyAll?: () => Promise<void>;
  theme: 'dark' | 'light';
}

export const InputSection: React.FC<InputSectionProps> = ({
  formatType,
  jsonInput,
  isProcessing,
  fileInputRef,
  onInputChange,
  onFileUpload,
  theme
}) => {
  return (
    <motion.div 
      className="input-section"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
    >
      <motion.div 
        className="input-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Input {formatType.toUpperCase()}
        {jsonInput && (
          <span style={{ marginLeft: '1rem', fontWeight: 'normal', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {(jsonInput.length / 1024 / 1024).toFixed(2)} MB
          </span>
        )}
      </motion.div>
      <div className="textarea-container">
        <input
          ref={fileInputRef}
          type="file"
          accept={formatType === 'xml' ? '.xml,text/xml,application/xml' : '.json,application/json'}
          onChange={onFileUpload}
          style={{ display: 'none' }}
        />
        <MonacoEditor
          value={jsonInput}
          language={formatType}
          theme={theme}
          onChange={(value) => onInputChange(value || '')}
          className="monaco-editor-container"
          readOnly={isProcessing}
        />
      </div>
    </motion.div>
  );
};
