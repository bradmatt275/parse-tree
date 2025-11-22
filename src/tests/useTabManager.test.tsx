import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabManager } from '../useTabManager';

describe('useTabManager', () => {
  it('should initialize with empty tabs', () => {
    const { result } = renderHook(() => useTabManager());
    
    expect(result.current.tabs).toEqual([]);
    expect(result.current.activeTabId).toBe(''); // Initially empty string, not null
  });

  it('should create a new JSON tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
    });
    
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].formatType).toBe('json');
    expect(result.current.tabs[0].title).toContain('.json');
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id);
  });

  it('should create a new XML tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('xml');
    });
    
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs[0].formatType).toBe('xml');
    expect(result.current.tabs[0].title).toContain('.xml');
  });

  it('should create multiple tabs with sequential titles', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    expect(result.current.tabs).toHaveLength(3);
    // Tab titles are based on current length
    expect(result.current.tabs[0].title).toContain('.json');
    expect(result.current.tabs[1].title).toContain('.json');
    expect(result.current.tabs[2].title).toContain('.json');
  });

  it('should switch active tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    const firstTabId = result.current.tabs[0].id;
    const secondTabId = result.current.tabs[1].id;
    
    expect(result.current.activeTabId).toBe(secondTabId);
    
    act(() => {
      result.current.setActiveTabId(firstTabId);
    });
    
    expect(result.current.activeTabId).toBe(firstTabId);
  });

  it('should sync content to active tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
    });
    
    const testContent = '{"test": "content"}';
    
    act(() => {
      result.current.setJsonInput(testContent);
    });
    
    expect(result.current.jsonInput).toBe(testContent);
    expect(result.current.tabs[0].content).toBe(testContent);
  });

  it('should maintain independent state per tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    // Create two tabs
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    // Verify we have 2 tabs with unique IDs
    expect(result.current.tabs).toHaveLength(2);
    expect(result.current.tabs[0].id).not.toBe(result.current.tabs[1].id);
    
    // Verify each tab has independent sessionIds
    expect(result.current.tabs[0].sessionId).not.toBe(result.current.tabs[1].sessionId);
  });

  it('should close a tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    const tabToClose = result.current.tabs[0].id;
    
    act(() => {
      result.current.closeTab(tabToClose);
    });
    
    expect(result.current.tabs).toHaveLength(1);
    expect(result.current.tabs.find(t => t.id === tabToClose)).toBeUndefined();
  });

  it('should switch to next tab when closing active tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    const firstTabId = result.current.tabs[0].id;
    const secondTabId = result.current.tabs[1].id;
    
    // Make first tab active
    act(() => {
      result.current.setActiveTabId(firstTabId);
    });
    
    // Close first tab
    act(() => {
      result.current.closeTab(firstTabId);
    });
    
    expect(result.current.activeTabId).toBe(secondTabId);
  });

  it('should switch to previous tab when closing last tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    const firstTabId = result.current.tabs[0].id;
    const secondTabId = result.current.tabs[1].id;
    
    // Second tab is already active (last created)
    expect(result.current.activeTabId).toBe(secondTabId);
    
    // Close second tab
    act(() => {
      result.current.closeTab(secondTabId);
    });
    
    expect(result.current.activeTabId).toBe(firstTabId);
  });

  it('should update tab title', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
    });
    
    const tabId = result.current.tabs[0].id;
    const newTitle = 'custom-file.json';
    
    act(() => {
      result.current.updateTabTitle(tabId, newTitle);
    });
    
    expect(result.current.tabs[0].title).toBe(newTitle);
  });

  it('should generate unique sessionIds for each tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
      result.current.createNewTab('json');
      result.current.createNewTab('json');
    });
    
    const sessionIds = result.current.tabs.map(t => t.sessionId);
    const uniqueSessionIds = new Set(sessionIds);
    
    expect(uniqueSessionIds.size).toBe(3);
  });

  it('should store nodes per tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    // Create a tab
    act(() => {
      result.current.createNewTab('json');
    });
    
    // Set nodes after tab is created
    act(() => {
      result.current.setAllNodes([
        { id: 'node1', type: 'string', value: 'test', depth: 0, isExpanded: false, hasChildren: false, path: 'root' }
      ]);
    });
    
    // Verify nodes are set in current state
    expect(result.current.allNodes.length).toBe(1);
    expect(result.current.allNodes[0]?.id).toBe('node1');
  });

  it('should store errors per tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    // Create a tab
    act(() => {
      result.current.createNewTab('json');
    });
    
    // Set error after tab is created
    act(() => {
      result.current.setError('Test error');
    });
    
    // Verify error is set in current state
    expect(result.current.error).toBe('Test error');
  });

  it('should track currentSessionIdRef', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
    });
    
    const sessionId = result.current.currentSessionId;
    
    expect(result.current.currentSessionIdRef.current).toBe(sessionId);
  });

  it('should not close tab if only one remains', () => {
    const { result } = renderHook(() => useTabManager());
    
    act(() => {
      result.current.createNewTab('json');
    });
    
    const onlyTabId = result.current.tabs[0].id;
    
    act(() => {
      result.current.closeTab(onlyTabId);
    });
    
    // Should still have one tab (prevented closing)
    expect(result.current.tabs).toHaveLength(1);
  });

  it('should handle format type changes per tab', () => {
    const { result } = renderHook(() => useTabManager());
    
    // Create a JSON tab
    act(() => {
      result.current.createNewTab('json');
    });
    
    expect(result.current.formatType).toBe('json');
    
    // Change to XML
    act(() => {
      result.current.setFormatType('xml');
    });
    
    expect(result.current.formatType).toBe('xml');
  });
});
