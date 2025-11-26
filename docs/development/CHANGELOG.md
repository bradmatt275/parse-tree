# Changelog

All notable changes to JSON Formatter Pro will be documented in this file.

## [1.2.0] - 2025-11-26

### ✨ Major Improvements
- **Monaco Editor Integration**: Replaced custom virtualized input/output with the industry-standard Monaco Editor (VS Code engine).
  - Provides native syntax highlighting, code folding, and minimap.
  - Solves text selection and copy/paste issues found in the previous implementation.
  - Seamlessly integrated with the application's dark/light theme system.
- **Simplified Architecture**: Removed complex custom virtualization logic for text editing in favor of the robust Monaco solution.

### 🧹 Code Cleanup
- Removed legacy validation logic (`validation.ts`) as Monaco handles syntax validation natively.
- Deleted unused components: `VirtualizedInput`, `LineNumberTextarea`, `CodeView`.
- Cleaned up `App.tsx` state management by removing redundant validation error tracking.

## [1.1.0] - 2024-11-22

### ✨ New Features
- **Advanced Error Validation**: 
  - Added support for detecting multiple errors simultaneously (up to 10)
  - Implemented visual error indicators (red 'X') in the line number gutter
  - Added line highlighting for all detected errors
  - New error list view in the output pane showing all issues at once
- **XML Validation**: 
  - Integrated `saxes` parser for robust XML validation
  - Implemented smart "one error per line" logic to prevent error cascades
  - Full parity with JSON validation features

### 🐛 Bug Fixes
- Fixed issue where validation errors wouldn't clear after fixing XML input
- Improved error message clarity for both formats

## [1.0.0] - 2024-11-22

### 🎉 Initial Release

#### ✨ Features
- **Virtual Scrolling**: Implemented using react-window for handling large JSON files (10MB+)
- **Tree View**: Collapsible/expandable tree structure for JSON objects and arrays
- **Line Numbers**: Sequential line numbering for all nodes
- **Syntax Highlighting**: Color-coded display for different JSON value types
  - Strings (orange/red)
  - Numbers (green)
  - Booleans (blue)
  - Null values (blue)
  - Keys (light blue)
- **Search Functionality**: Real-time search with match highlighting
- **Copy to Clipboard**: One-click formatted JSON copying
- **Theme Toggle**: Dark and light theme support with persistence
- **Responsive Design**: Mobile and desktop optimized layouts
- **Error Handling**: Graceful error messages for malformed JSON

#### 🚀 Performance
- Handles JSON files up to 10MB+ without browser crashes
- Virtual scrolling ensures smooth 60fps performance
- Only renders visible nodes (~100 at a time)
- Optimized with React.memo, useMemo, and useCallback
- Fast parsing and rendering (<2s for 5MB files)

#### 🎨 User Experience
- Auto-expand first 2 levels by default
- Item count preview for collapsed nodes
- Real-time search with match counter
- Clear expand/collapse indicators
- Professional Monaco-editor-inspired design
- Intuitive controls and layout

#### 🛠️ Technical
- Built with React 18 and TypeScript
- Vite for fast development and building
- react-window for virtual scrolling
- CSS Variables for theming
- Fully type-safe codebase

#### 📚 Documentation
- Comprehensive README with all features
- Quick start guide for new users
- Detailed feature showcase
- Test examples and test data generators
- Deployment guide for production
- Complete project summary

#### 🔒 Privacy & Security
- 100% client-side processing
- No data sent to servers
- No analytics or tracking
- No persistent storage (except theme preference)
- Open source and transparent

---

## Planned Features (Future Releases)

### Version 1.1.0 (Planned)
- [ ] Web Worker for parsing (offload main thread)
- [ ] JSON Schema validation
- [ ] Keyboard shortcuts
- [ ] JSON path copying
- [ ] Tree statistics

### Version 1.2.0 (Planned)
- [ ] Edit mode (modify JSON in place)
- [ ] Diff two JSON files
- [ ] Export to CSV/XML
- [ ] Custom color themes
- [ ] Save/load from file

### Version 2.0.0 (Planned)
- [ ] Progressive rendering for huge files
- [ ] Streaming parser
- [ ] IndexedDB for file caching
- [ ] Multiple file tabs
- [ ] Advanced data type filters

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-11-22 | Initial release with all core features |

---

## Contributing

We welcome contributions! Here's how you can help:

### Bug Reports
- Use GitHub Issues
- Include JSON sample (if not sensitive)
- Describe expected vs actual behavior
- Include browser and OS info

### Feature Requests
- Use GitHub Issues with "enhancement" label
- Describe the use case
- Explain expected behavior
- Consider implementation complexity

### Pull Requests
- Fork the repository
- Create a feature branch
- Write clean, typed code
- Add tests if applicable
- Update documentation
- Submit PR with clear description

### Development Setup
```bash
git clone <repository-url>
cd parse-tree
npm install
npm run dev
```

---

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Run tests and verify all features
4. Build production version
5. Test production build
6. Create git tag
7. Push to repository
8. Deploy to hosting platform

---

## Migration Guides

### From Other Formatters
1. Copy your JSON from the other formatter
2. Paste into JSON Formatter Pro
3. Click "Format" if not auto-formatted
4. Enjoy better performance!

No migration needed - just use the new formatter!

---

## Support

- **Documentation**: See README.md, QUICKSTART.md
- **Issues**: Use GitHub Issues
- **Questions**: Check existing issues first
- **Updates**: Watch repository for new releases

---

## License

MIT License - See LICENSE file for details

---

**JSON Formatter Pro** - Making JSON formatting fast and easy! 🚀
