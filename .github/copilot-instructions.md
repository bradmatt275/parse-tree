# AI Coding Agent Instructions

## Project Overview
JSON/XML Formatter Pro is a high-performance web application for formatting and visualizing large JSON/XML files (10MB+) using virtual scrolling. Built with React 18, TypeScript, and Vite.

**Key Innovation**: Virtual scrolling renders only ~100 visible nodes at a time, preventing browser crashes with massive files.

## Architecture

### Core Components & Responsibilities

1. **`App.tsx`** - Main orchestrator
   - Coordinates all components and manages UI state (theme, view mode, search)
   - Implements multi-tier debouncing: 300ms (input), 500ms (search expansion), 800ms (formatting)
   - Handles dual format support (JSON/XML) - XML parses in main thread, JSON in worker
   - Uses custom hooks (`useTabManager`, `useWebWorker`) to separate concerns
   - Search navigation uses `matchIds` array with current index tracking

2. **`components/Header.tsx`** - Top navigation bar
   - Multi-tab interface with tab switching, creation, and closing
   - Theme toggle (dark/light)
   - History modal trigger

3. **`components/Toolbar.tsx`** - Action toolbar
   - Format type selector (JSON/XML)
   - View mode toggle (Tree/Code)
   - Search box with navigation (previous/next match)
   - Action buttons: Load file, Format, Expand/Collapse all, Copy, Clear

4. **`components/InputSection.tsx`** - Input panel
   - Displays formatted input with file size
   - Handles file upload via hidden input
   - Switches between standard textarea and VirtualizedInput for large files (>100KB)
   - Manages paste events for large content

5. **`components/OutputSection.tsx`** - Output display panel
   - Shows loading/processing/error states with animations
   - Renders either VirtualTree (tree view) or CodeView (code view)
   - Displays node count statistics in tree view

6. **`hooks/useTabManager.ts`** - Tab state management hook
   - Manages multiple tabs with independent content/state
   - Syncs active tab data to component state
   - Handles tab creation, deletion, switching, and title updates
   - Tracks `sessionId` per tab for history integration

7. **`hooks/useWebWorker.ts`** - Web Worker communication hook
   - Encapsulates worker lifecycle (creation, termination)
   - Provides callbacks for parse/expand success/error/progress
   - Exposes `parseJson()` and `expandToMatches()` methods
   - Uses memoized callbacks to prevent worker recreation

8. **`components/HistoryModal.tsx`** - History management UI
   - Displays saved history entries with previews
   - Loads history entries preserving `sessionId` for updates
   - Handles individual entry deletion and clear all

9. **`parsers/jsonParser.ts`** - Tree data structure logic
   - `buildTree()` auto-expands first 2 levels (`depth < 2`)
   - Each node has unique ID (`node_${counter}`), parent reference, and dot-notation path
   - `getVisibleNodes()` filters by parent expansion state using Map for O(1) lookups
   - Search is case-insensitive, matches keys/values/paths

10. **`public/worker.js`** - Background processing (JSON only)
    - Handles heavy parsing without blocking UI thread
    - Reports progress every 500ms during large operations
    - `EXPAND_TO_MATCHES` uses Map-based lookups (660,000× faster than array.find)
    - Returns success/error messages to main thread via postMessage

11. **`components/VirtualTree.tsx`** - Tree view virtualization
    - Uses `react-window` FixedSizeList with ROW_HEIGHT=22, INDENT_SIZE=16
    - Renders only visible nodes based on scroll position
    - `scrollToNode()` exposed via ref for search navigation
    - Syntax highlighting: keys (light blue), strings (orange), numbers (green), booleans/null (blue)

12. **`components/CodeView.tsx`** - Code view with line-by-line rendering
    - Virtualized display using react-window
    - Simple regex-based syntax highlighting in `renderLine()`
    - `scrollToLine()` exposed via ref, line numbers are 1-based

13. **`components/VirtualizedInput.tsx`** - Large file editing
    - Activated when input > 100KB
    - Line-by-line editing with 300ms debounce to parent onChange
    - Handles Enter (split line), Backspace (merge), Arrow keys (navigate)

14. **`storage/indexedDBStorage.ts`** - Persistent history storage
    - Saves/retrieves history using IndexedDB
    - Updates existing entries when `sessionId` matches (prevents duplicates)
    - Migrates legacy localStorage data to IndexedDB

### Data Flow Patterns

**JSON Parsing Flow**:
```
User input → 800ms debounce → worker.postMessage(PARSE_JSON) → 
buildTree in worker → postMessage(PARSE_SUCCESS) → setAllNodes → 
getVisibleNodes → VirtualTree renders
```

**Search with Auto-Expansion**:
```
searchQuery change → searchNodes() → Set of match IDs → 
500ms debounce → worker.postMessage(EXPAND_TO_MATCHES) → 
expand parent paths → EXPAND_SUCCESS → scroll to first match
```

**XML Parsing** (no worker - DOMParser not available in workers):
```
User input → DOMParser in main thread → buildXmlTree → 
setAllNodes (attributes prefixed with @) → render
```

## Development Workflows

### Running Locally
```bash
npm install
npm run dev  # Opens http://localhost:3000
```

### Building
```bash
npm run build     # TypeScript compile + Vite build → dist/
npm run preview   # Preview production build
```

### Performance Testing
Use `examples/test-large.json` or create test files. App handles:
- 19MB JSON files (660k+ nodes)
- 785k+ lines
- 5k+ search matches

## Critical Patterns & Conventions

### State Management
- **Component composition**: App.tsx delegates rendering to specialized components (Header, Toolbar, InputSection, OutputSection)
- **Custom hooks**: Business logic extracted into `useTabManager` (tab state) and `useWebWorker` (worker communication)
- **Memoization is critical**: 
  - `React.memo` on row components
  - `useMemo` for derived data (visibleNodes, matchIds, formattedCode)
  - `useCallback` for worker callbacks to prevent recreation
- **Ref pattern**: 
  - `treeRef`/`codeViewRef` expose `scrollToNode`/`scrollToLine` methods
  - `currentSessionIdRef` for latest sessionId without triggering re-renders
  - `isExpandingRef` prevents premature scrolling during background expansion
- **Tab management**: Each tab maintains independent content, nodes, error state, and sessionId
- **History integration**: Loading history preserves `sessionId` to update existing entries on edits

### Web Worker Communication
- **Memoized callbacks**: Always wrap worker callbacks in `useCallback` to prevent worker recreation
- **Ref access**: Use refs (not state values) in callbacks to get latest values without re-creating callbacks
- Always check message type:
```javascript
if (type === 'PARSE_SUCCESS') { /* handle nodes */ }
else if (type === 'PARSE_ERROR') { /* handle error */ }
else if (type === 'PARSE_PROGRESS') { /* update UI message */ }
```
- Worker is created once and reused; termination only on component unmount

### Virtual Scrolling Constants
- **Never change ROW_HEIGHT (22px)** without updating CSS `.tree-node` height
- **INDENT_SIZE (16px)** must match visual indent spacing
- ItemData pattern: pass stable object to avoid re-renders

### Format-Specific Logic
- **JSON**: Use worker for parsing/expansion, standard JSON.stringify for output
- **XML**: Main thread DOMParser, attribute keys prefixed with `@`, text nodes have key=undefined

### Debounce Strategy
- Input changes: 300ms (VirtualizedInput)
- Format operations: 800ms (App auto-format)
- Search expansion: 500ms (after user stops typing)
- Progress reports: 500ms (in worker)

### Search Implementation
- `searchMatches` is a Set<string> of node IDs
- `matchIds` array maintains order for navigation
- `currentMatchIndex` wraps with modulo: `(prev + 1) % length`
- Tree view: expand parents then scroll; Code view: find line numbers

## Common Pitfalls

1. **Don't mutate nodes directly** - Always use spread operator or map: `nodes.map(node => node.id === id ? {...node, isExpanded: true} : node)`

2. **Worker callbacks must be memoized** - Use `useCallback` for all worker callbacks; if callbacks change on every render, worker gets recreated and loses work

3. **Use refs for latest values in callbacks** - When callbacks need current values but shouldn't re-create on value changes, use refs (e.g., `currentSessionIdRef.current`)

4. **Check worker availability** - XML uses DOMParser (main thread only), JSON uses worker

5. **Handle empty states** - Check `allNodes.length === 0` before rendering tree; empty input should not trigger processing

6. **Preserve scroll position** - Use `listRef.current?.scrollToItem(index, 'center')` not manual scroll

7. **Large file threshold** - VirtualizedInput activates at `jsonInput.length > 100000` (100KB)

8. **Progress indicators** - Always set `isProcessing` state and clear on success/error

9. **Tab initialization** - Ensure tabs are created and state is synced before attempting to parse content

10. **History sessionId tracking** - When loading from history, preserve the `sessionId` so edits update the existing entry instead of creating duplicates

## Theme System
CSS variables in `index.css`:
```css
[data-theme="dark"] { --bg-primary: #1e1e1e; ... }
[data-theme="light"] { --bg-primary: #ffffff; ... }
```
Toggle via `document.documentElement.setAttribute('data-theme', theme)`

## File Structure Conventions
- Organized folder structure:
  - `src/components/` - React components (Header, Toolbar, InputSection, OutputSection, etc.)
  - `src/hooks/` - Custom React hooks (useTabManager, useWebWorker)
  - `src/parsers/` - Data parsing logic (jsonParser, xmlParser)
  - `src/storage/` - Persistence layer (indexedDBStorage, historyStorage)
  - `src/utils/` - Utility functions (validation)
  - `src/tests/` - Test files
- TypeScript files use explicit return types for public functions
- Components export via named export + displayName for dev tools
- Worker lives in `public/` for Vite static asset handling
- No barrel exports - import directly from files
- Import paths use relative paths with folder prefixes (e.g., `'../components/Header'`, `'../parsers/jsonParser'`)

## Testing
- **Framework**: Vitest with React Testing Library
- **Test Files**: Located in `src/tests/`
  - `jsonParser.test.ts` - Core parsing logic (24 tests)
  - `validation.test.ts` - JSON/XML validation (22 tests)
  - `useTabManager.test.tsx` - Tab management hook (17 tests)
- **Run Tests**: `npm test` (watch mode), `npm run test:run` (CI mode)
- **Coverage**: `npm run test:coverage`
- **Test Environment**: happy-dom for lightweight DOM simulation
- All tests must pass before deployment (63/63 passing)

## Performance Benchmarks
- 10MB JSON: 2-4s parse, 60fps scroll, ~150MB memory
- Virtual scroll keeps DOM at ~100 nodes regardless of total size
- Search uses Map lookups: O(1) vs O(n) array operations

## Testing Large Files
1. Load file via file input (supports >100KB)
2. Check processing indicator appears
3. Verify smooth scrolling after load
4. Test search with many matches (expansion should complete before scroll)

## Deployment
Production builds optimize to ~150KB gzipped. See `docs/development/DEPLOYMENT.md` for Vercel/Netlify/GitHub Pages setup.

## Documentation Structure
All documentation is organized in the `docs/` folder:
- `docs/guides/` - User-facing documentation (QUICKSTART.md, FEATURES.md)
- `docs/development/` - Developer documentation (TESTING.md, DEPLOYMENT.md, CHANGELOG.md, PROJECT_SUMMARY.md, TEST_EXAMPLES.md)
- `docs/assets/screenshots/` - Application screenshots for README
