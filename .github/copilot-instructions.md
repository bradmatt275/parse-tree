# AI Coding Agent Instructions

## Project Overview
JSON/XML Formatter Pro is a high-performance web application for formatting and visualizing large JSON/XML files (10MB+) using virtual scrolling. Built with React 18, TypeScript, and Vite.

**Key Innovation**: Virtual scrolling renders only ~100 visible nodes at a time, preventing browser crashes with massive files.

## Architecture

### Core Components & Responsibilities

1. **`App.tsx`** - Main orchestrator
   - Manages all application state (nodes, search, theme, view mode)
   - Coordinates Web Worker communication for JSON parsing
   - Handles dual format support (JSON/XML) - XML parses in main thread, JSON in worker
   - Implements multi-tier debouncing: 300ms (input), 500ms (search expansion), 800ms (formatting)
   - Search navigation uses `matchIds` array with current index tracking

2. **`jsonParser.ts`** - Tree data structure logic
   - `buildTree()` auto-expands first 2 levels (`depth < 2`)
   - Each node has unique ID (`node_${counter}`), parent reference, and dot-notation path
   - `getVisibleNodes()` filters by parent expansion state using Map for O(1) lookups
   - Search is case-insensitive, matches keys/values/paths

3. **`public/worker.js`** - Background processing (JSON only)
   - Handles heavy parsing without blocking UI thread
   - Reports progress every 500ms during large operations
   - `EXPAND_TO_MATCHES` uses Map-based lookups (660,000× faster than array.find)
   - Returns success/error messages to main thread via postMessage

4. **`VirtualTree.tsx`** - Tree view virtualization
   - Uses `react-window` FixedSizeList with ROW_HEIGHT=22, INDENT_SIZE=16
   - Renders only visible nodes based on scroll position
   - `scrollToNode()` exposed via ref for search navigation
   - Syntax highlighting: keys (light blue), strings (orange), numbers (green), booleans/null (blue)

5. **`CodeView.tsx`** - Code view with line-by-line rendering
   - Virtualized display using react-window
   - Simple regex-based syntax highlighting in `renderLine()`
   - `scrollToLine()` exposed via ref, line numbers are 1-based

6. **`VirtualizedInput.tsx`** - Large file editing
   - Activated when input > 100KB
   - Line-by-line editing with 300ms debounce to parent onChange
   - Handles Enter (split line), Backspace (merge), Arrow keys (navigate)

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
- **Avoid prop drilling**: Pass callbacks, not nested data
- **Memoization is critical**: `React.memo` on row components, `useMemo` for derived data (visibleNodes, matchIds, formattedCode)
- **Ref pattern**: treeRef/codeViewRef expose `scrollToNode/scrollToLine` methods
- **Expansion flag**: `isExpandingRef.current` prevents premature scrolling during background expansion

### Web Worker Communication
Always check message type:
```javascript
if (type === 'PARSE_SUCCESS') { /* handle nodes */ }
else if (type === 'PARSE_ERROR') { /* handle error */ }
else if (type === 'PARSE_PROGRESS') { /* update UI message */ }
```

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

2. **Check worker availability** - XML uses DOMParser (main thread only), JSON uses worker

3. **Handle empty states** - Check `allNodes.length === 0` before rendering tree

4. **Preserve scroll position** - Use `listRef.current?.scrollToItem(index, 'center')` not manual scroll

5. **Large file threshold** - VirtualizedInput activates at `jsonInput.length > 100000` (100KB)

6. **Progress indicators** - Always set `isProcessing` state and clear on success/error

## Theme System
CSS variables in `index.css`:
```css
[data-theme="dark"] { --bg-primary: #1e1e1e; ... }
[data-theme="light"] { --bg-primary: #ffffff; ... }
```
Toggle via `document.documentElement.setAttribute('data-theme', theme)`

## File Structure Conventions
- TypeScript files use explicit return types for public functions
- Components export via named export + displayName for dev tools
- Worker lives in `public/` for Vite static asset handling
- No barrel exports - import directly from files

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
Production builds optimize to ~150KB gzipped. See `DEPLOYMENT.md` for Vercel/Netlify/GitHub Pages setup.
