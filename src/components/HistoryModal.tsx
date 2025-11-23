import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, History } from 'lucide-react';
import { HistoryEntry } from '../types';
import { getHistory, deleteHistoryEntry, clearAllHistory } from '../storage/historyStorage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (content: string, formatType: 'json' | 'xml', sessionId?: string) => void;
}

export function HistoryModal({ isOpen, onClose, onLoad }: HistoryModalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);
  
  const loadHistory = async () => {
    setLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await deleteHistoryEntry(id);
      await loadHistory();
    } catch (error) {
      console.error('Failed to delete history entry:', error);
    }
  };
  
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      try {
        await clearAllHistory();
        setHistory([]);
      } catch (error) {
        console.error('Failed to clear history:', error);
      }
    }
  };
  
  const handleLoad = (entry: HistoryEntry) => {
    onLoad(entry.content, entry.formatType, entry.sessionId);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content history-modal"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>
              <History size={20} className="history-icon" />
              History
            </h2>
            <div className="modal-actions">
              {history.length > 0 && (
                <button className="tool-btn danger" onClick={handleClearAll}>
                  Clear All
                </button>
              )}
              <button className="icon-button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
          
          <div className="modal-body">
            {loading ? (
              <div className="empty-state">
                <p>Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <p>No history yet</p>
                <p className="empty-state-hint">
                  Parsed JSON/XML will be automatically saved here
                </p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((entry) => (
                  <motion.div
                    key={entry.id}
                    className="history-item"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleLoad(entry)}
                  >
                    <div className="history-item-header">
                      <span className="history-type-badge">
                        {entry.formatType.toUpperCase()}
                      </span>
                      <span className="history-date">{entry.dateString}</span>
                      <button
                        className="history-delete"
                        onClick={(e) => handleDelete(entry.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="history-preview">
                      <code>{entry.preview}{entry.content.length > 100 ? '...' : ''}</code>
                    </div>
                    <div className="history-size">
                      {(entry.content.length / 1024).toFixed(2)} KB
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

HistoryModal.displayName = 'HistoryModal';
