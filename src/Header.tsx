import React from 'react';
import { Zap, History, Sun, Moon, X, Plus } from 'lucide-react';
import { TabData } from './types';

type Theme = 'dark' | 'light';

interface HeaderProps {
  tabs: TabData[];
  activeTabId: string;
  theme: Theme;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onToggleTheme: () => void;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tabs,
  activeTabId,
  theme,
  onTabChange,
  onTabClose,
  onNewTab,
  onToggleTheme,
  onOpenHistory,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="app-logo">
          <Zap className="logo-icon" size={18} />
          <span className="logo-text">Formatter Pro</span>
        </div>
      </div>
      
      <div className="header-center">
        <div className="tabs-container">
          {tabs.map((tab) => (
            <div 
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.formatType === 'json' ? '{}' : '<>'}</span>
              <span className="tab-title">{tab.title}</span>
              <button 
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button 
            className="tab-add" 
            onClick={onNewTab}
            title="New Tab"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="header-right">
        <button 
          className="icon-button" 
          onClick={onOpenHistory}
          title="History"
        >
          <History size={18} />
        </button>
        <button 
          className="icon-button" 
          onClick={onToggleTheme} 
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
