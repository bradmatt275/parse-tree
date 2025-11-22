# Test JSON Examples

## Small Example (Included in App)
The app loads with a simple example showing basic features.

## Medium Example
```json
{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "address": {
        "street": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip": "94102",
        "coordinates": {
          "lat": 37.7749,
          "lng": -122.4194
        }
      },
      "orders": [
        {
          "orderId": "ORD-001",
          "date": "2024-01-15",
          "total": 299.99,
          "items": [
            {"product": "Laptop", "quantity": 1, "price": 299.99}
          ]
        }
      ],
      "active": true
    }
  ],
  "metadata": {
    "version": "2.0",
    "timestamp": "2024-11-22T10:00:00Z",
    "processed": true
  }
}
```

## Large Example Generator

To test with very large JSON files, you can generate test data using this JavaScript snippet in the browser console:

```javascript
// Generate a large JSON with nested data
function generateLargeJSON(items = 1000) {
  const data = {
    metadata: {
      generated: new Date().toISOString(),
      itemCount: items,
      version: "1.0"
    },
    items: []
  };
  
  for (let i = 0; i < items; i++) {
    data.items.push({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `This is a description for item ${i + 1}`,
      category: ["Electronics", "Books", "Clothing", "Food"][i % 4],
      price: Math.round(Math.random() * 10000) / 100,
      inStock: Math.random() > 0.3,
      tags: Array.from({ length: 5 }, (_, j) => `tag${j + 1}`),
      metadata: {
        created: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated: new Date().toISOString(),
        views: Math.floor(Math.random() * 10000),
        rating: Math.round(Math.random() * 50) / 10
      },
      variants: Array.from({ length: 3 }, (_, v) => ({
        sku: `SKU-${i + 1}-${v + 1}`,
        color: ["Red", "Blue", "Green"][v],
        size: ["S", "M", "L"][v],
        stock: Math.floor(Math.random() * 100)
      }))
    });
  }
  
  return JSON.stringify(data, null, 2);
}

// Generate 1000 items (approximately 500KB)
console.log(generateLargeJSON(1000));

// For even larger files, try:
// generateLargeJSON(5000)  // ~2.5MB
// generateLargeJSON(10000) // ~5MB
// generateLargeJSON(20000) // ~10MB
```

## Performance Test Results

Expected performance with virtual scrolling:

- **1,000 items** (~500KB): Instant loading, smooth scrolling
- **5,000 items** (~2.5MB): Fast loading (<1s), smooth scrolling
- **10,000 items** (~5MB): Loads in 1-2s, smooth scrolling
- **20,000 items** (~10MB): Loads in 2-4s, smooth scrolling

Without virtual scrolling, files over 1MB would typically crash the browser or cause severe lag.

## Testing Features

### Search Testing
Try searching for:
- Keys: "name", "id", "price"
- Values: specific numbers, text strings
- Paths: nested property names

### Expand/Collapse Testing
1. Click "Collapse All" to close all nodes
2. Click "Expand All" to open all nodes
3. Click individual arrows to toggle single nodes

### Theme Testing
- Click the sun/moon icon to toggle between light and dark themes
- All syntax highlighting updates accordingly

### Copy Testing
- Format any JSON
- Click "Copy" to copy formatted JSON to clipboard
- Paste into another application to verify

### Error Handling Testing
Try these invalid JSON inputs:
- `{invalid}` - Missing quotes
- `{"key": value}` - Unquoted value
- `{"key": "value",}` - Trailing comma
- `{"key": "value"` - Missing closing brace

Each should show a clear error message.
