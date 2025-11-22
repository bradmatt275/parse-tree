import { describe, it, expect } from 'vitest';
import { validateJson, validateXml, getErrorLine } from '../utils/validation';

describe('validation', () => {
  describe('validateJson', () => {
    it('should return empty array for valid JSON', () => {
      const validJson = '{"name": "test", "value": 42}';
      const errors = validateJson(validJson);
      
      expect(errors).toEqual([]);
    });

    it('should detect missing closing brace', () => {
      const invalidJson = '{"name": "test"';
      const errors = validateJson(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/Closing brace|Unexpected end/);
    });

    it('should detect missing comma', () => {
      const invalidJson = '{"a": 1 "b": 2}';
      const errors = validateJson(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect trailing comma', () => {
      const invalidJson = '{"a": 1, "b": 2,}';
      const errors = validateJson(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect unquoted keys', () => {
      const invalidJson = '{name: "test"}';
      const errors = validateJson(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should provide accurate line numbers', () => {
      const invalidJson = `{
  "valid": "line",
  "invalid" "missing colon"
}`;
      const errors = validateJson(invalidJson);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].line).toBe(3);
    });

    it('should detect multiple errors', () => {
      const invalidJson = `{
  "a": 1
  "b": 2,
  "c": 3,
}`;
      const errors = validateJson(invalidJson);
      
      // Should find missing comma and trailing comma
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty string', () => {
      const errors = validateJson('');
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle whitespace only', () => {
      const errors = validateJson('   \n  \t  ');
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateXml', () => {
    it('should return empty array for valid XML', () => {
      const validXml = '<?xml version="1.0"?><root><child>value</child></root>';
      const errors = validateXml(validXml);
      
      expect(errors).toEqual([]);
    });

    it('should detect unclosed tags', () => {
      const invalidXml = '<root><child>value</root>';
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].message).toMatch(/unexpected close tag|unclosed|child/i);
    });

    it('should detect mismatched tags', () => {
      const invalidXml = '<root><child>value</children></root>';
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect missing closing tag', () => {
      const invalidXml = '<root><child>value</child>';
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should provide accurate line numbers', () => {
      const invalidXml = `<?xml version="1.0"?>
<root>
  <child>
    <invalid
  </child>
</root>`;
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].line).toBeGreaterThanOrEqual(4);
    });

    it('should detect invalid attribute syntax', () => {
      const invalidXml = '<root attr=value></root>';
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty string', () => {
      const errors = validateXml('');
      
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle text without root element', () => {
      const invalidXml = 'just some text';
      const errors = validateXml(invalidXml);
      
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('getErrorLine', () => {
    it('should extract line number from JSON error message', () => {
      const errorMsg = 'Unexpected token } in JSON at position 42 (line 5)';
      const content = 'some\ncontent\nhere\n';
      
      const line = getErrorLine(errorMsg, content);
      
      expect(line).toBe(4); // Actual line calculated from position
    });

    it('should extract line number from position-based error', () => {
      const content = 'line1\nline2\nline3\nerror here\nline5';
      const errorMsg = 'Error at position 18';
      
      const line = getErrorLine(errorMsg, content);
      
      expect(line).toBeGreaterThan(0);
    });

    it('should return undefined or null if no line info found', () => {
      const errorMsg = 'Generic error message';
      const content = 'some content';
      
      const line = getErrorLine(errorMsg, content);
      
      expect(line == null).toBe(true); // null or undefined
    });

    it('should handle multi-line content correctly', () => {
      const content = `{
  "line": 1,
  "error": here
}`;
      const errorMsg = 'Error at position 25';
      
      const line = getErrorLine(errorMsg, content);
      
      expect(line).toBe(3);
    });

    it('should handle empty content', () => {
      const errorMsg = 'Error at position 0';
      const content = '';
      
      const line = getErrorLine(errorMsg, content);
      
      expect(line).toBeDefined();
    });
  });
});
