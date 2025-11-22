# Quick Start Guide

## 🚀 Get Started in 30 Seconds

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser!

## 📖 Quick Tutorial

### 1. Format JSON
The app loads with sample JSON already formatted. Try modifying it!

### 2. Paste Your Own JSON
```json
{
  "hello": "world",
  "numbers": [1, 2, 3],
  "nested": {
    "data": true
  }
}
```

### 3. Navigate the Tree
- Click ▶ to expand nodes
- Click ▼ to collapse nodes
- Or use "Expand All" / "Collapse All" buttons

### 4. Search
Type in the search box to find:
- Keys: `name`, `id`, `price`
- Values: `true`, `123`, `"hello"`
- Any text in your JSON

### 5. Copy Formatted JSON
Click the "Copy" button to copy the formatted JSON to your clipboard.

### 6. Try Large Files
Paste this in the browser console to generate a large JSON:

```javascript
const data = {
  items: Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    data: { x: Math.random(), y: Math.random() }
  }))
};
console.log(JSON.stringify(data));
```

Copy the output and paste into the formatter. Notice how smooth it is!

## 🎨 Features Overview

| Feature | Description | Shortcut |
|---------|-------------|----------|
| **Virtual Scrolling** | Handles massive files smoothly | Always on |
| **Line Numbers** | See line numbers for each node | Always visible |
| **Syntax Highlighting** | Color-coded JSON types | Automatic |
| **Search** | Find keys/values instantly | Type in search box |
| **Expand/Collapse** | Show/hide nested data | Click arrows |
| **Copy** | Copy formatted JSON | Click "Copy" button |
| **Themes** | Switch dark/light mode | Click ☀️/🌙 icon |

## 🔥 Performance Tips

### Maximum Performance
1. **Use Collapse All** for very large files initially
2. **Expand only what you need** to explore
3. **Use Search** to find specific data quickly
4. **Clear** when done to free memory

### File Size Recommendations
- ✅ **< 1MB**: Instant, perfect experience
- ✅ **1-5MB**: Very fast, smooth scrolling
- ✅ **5-10MB**: Fast, great performance
- ⚠️ **10MB+**: Works well, may take a few seconds to parse

## 🛠️ Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 📱 Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## 🐛 Troubleshooting

### App won't start?
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### JSON won't format?
- Check for syntax errors (app will show error message)
- Try wrapping in `{}` or `[]`
- Remove trailing commas
- Check for unquoted strings

### Search not working?
- Make sure you've clicked "Format" first
- Search is case-insensitive
- Try searching for shorter terms

### Copy not working?
- Check browser clipboard permissions
- Try on HTTPS (clipboard API requires secure context)
- Use Ctrl+A, Ctrl+C as fallback

## 💡 Pro Tips

1. **Auto-Format on Paste**: The app auto-formats on first load
2. **Keyboard Focus**: Tab through the interface
3. **Mobile Friendly**: Works on phones/tablets
4. **Local Storage**: Your theme preference is saved
5. **No Server**: Everything runs in your browser (privacy-friendly)

## 🎯 Use Cases

### Development
- Debug API responses
- Format configuration files
- Inspect JSON data structures
- Copy formatted JSON for documentation

### Data Analysis
- Explore large JSON datasets
- Search for specific values
- Navigate nested structures
- Export formatted data

### Education
- Learn JSON structure
- Understand data nesting
- Visualize JSON trees
- Practice JSON formatting

## 🔒 Privacy & Security

- ✅ **100% Client-Side**: No data sent to servers
- ✅ **No Analytics**: No tracking or data collection
- ✅ **No Storage**: Data not saved (except theme preference)
- ✅ **Open Source**: Fully transparent code

## 📚 Learn More

- [Full Documentation](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Test Examples](TEST_EXAMPLES.md)

## 🤝 Need Help?

If you encounter issues:
1. Check the error message in the app
2. Review this guide
3. Check browser console for errors
4. Try a different browser
5. Open an issue on GitHub

## 🎉 Enjoy!

You now have a powerful JSON formatter that can handle files of any size. Happy formatting! 🚀
