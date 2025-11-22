import React from 'react';
import { motion } from 'framer-motion';
import { VirtualizedInput } from './VirtualizedInput';
import { LineNumberTextarea } from './LineNumberTextarea';
import { FormatType } from './types';

interface InputSectionProps {
  formatType: FormatType;
  jsonInput: string;
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onInputChange: (value: string) => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  errorLine?: number | null;
}

export const InputSection: React.FC<InputSectionProps> = ({
  formatType,
  jsonInput,
  isProcessing,
  fileInputRef,
  onInputChange,
  onFileUpload,
  onPaste,
  errorLine
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
        {jsonInput.length > 100000 ? (
          <VirtualizedInput
            value={jsonInput}
            onChange={onInputChange}
            placeholder="Paste your JSON here or use 'Load File' button for large files..."
            className="json-input"
            errorLine={errorLine}
          />
        ) : (
          <LineNumberTextarea
            value={jsonInput}
            onChange={(e) => onInputChange(e.target.value)}
            onPaste={onPaste}
            placeholder="Paste your JSON here or use 'Load File' button for large files..."
            spellCheck={false}
            disabled={isProcessing}
            errorLine={errorLine}
          />
        )}
      </div>
    </motion.div>
  );
};
