# Test Data Examples

This directory contains test data files for performance testing and development.

## Generating Test Data

Instead of committing large JSON files, use the generator script:

```bash
# Generate all test files (small, medium, large)
npm run generate:test-data

# Generate specific size file
npm run generate:test-data 20

# Generate custom file
npm run generate:test-data 5 custom
```

### Default Test Suite

Running `npm run generate:test-data` creates:
- `test-small.json` - ~100KB for quick testing
- `test-medium.json` - ~1MB for moderate testing
- `test-large.json` - ~19MB for performance testing

The script generates realistic JSON data including:
- User records with names, emails, departments, salaries
- Project records with teams, milestones, budgets
- Document records with metadata and content

## Output

Generated files are automatically excluded from git (via `.gitignore`).

Default output: `examples/test-large.json`

## Performance Testing

Use generated files to test:
- Large file parsing (10MB+)
- Virtual scrolling performance
- Search functionality with many nodes
- Memory usage during operations
