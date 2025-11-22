
import { parse, ParseError } from 'jsonc-parser';
import { SaxesParser } from 'saxes';

export interface ValidationResult {
  line: number;
  message: string;
}

export function validateXml(input: string): ValidationResult[] {
  const errors: ValidationResult[] = [];
  const parser = new SaxesParser();
  const errorLines = new Set<number>();

  parser.on("error", (e) => {
    // Limit to 10 errors total
    if (errors.length >= 10) return;

    // Only report the first error for each line to avoid spam
    if (!errorLines.has(parser.line)) {
      errorLines.add(parser.line);
      errors.push({
        line: parser.line,
        message: e.message
      });
    }
  });

  try {
    parser.write(input).close();
  } catch (e) {
    // Ignore errors thrown here as they are captured by the error event
  }

  return errors.sort((a, b) => a.line - b.line);
}

export function validateJson(input: string): ValidationResult[] {
  const errors: ParseError[] = [];
  parse(input, errors);
  
  if (errors.length === 0) return [];

  const results: ValidationResult[] = [];
  const lines = input.split('\n');
  
  // Helper to get line number from offset
  const getLineFromOffset = (offset: number): number => {
    let charCount = 0;
    for (let i = 0; i < lines.length; i++) {
      // +1 for newline character (approximation, works for LF. CRLF might be off by 1 per line if not careful, but split handles it mostly)
      // Actually, split consumes the delimiter.
      // If input has \r\n, split('\n') leaves \r at end of line. length includes it.
      // If input has \n, split('\n') works.
      // We need to be careful about the +1.
      const lineLength = lines[i].length + 1; 
      if (charCount + lineLength > offset) {
        return i + 1;
      }
      charCount += lineLength;
    }
    return lines.length;
  };

  // Limit to 10 errors as requested
  const maxErrors = Math.min(errors.length, 10);
  
  for (let i = 0; i < maxErrors; i++) {
    const error = errors[i];
    const line = getLineFromOffset(error.offset);
    results.push({
      line,
      message: getErrorMessage(error.error)
    });
  }

  return results;
}

function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case 1: return 'Invalid symbol';
    case 2: return 'Invalid number format';
    case 3: return 'Property name expected';
    case 4: return 'Value expected';
    case 5: return 'Colon expected';
    case 6: return 'Comma expected';
    case 7: return 'Closing brace expected';
    case 8: return 'Closing bracket expected';
    case 9: return 'End of file expected';
    case 10: return 'Invalid comment token';
    case 11: return 'Unexpected end of comment';
    case 12: return 'Unexpected end of string';
    case 13: return 'Unexpected end of number';
    case 14: return 'Invalid unicode sequence';
    case 15: return 'Invalid escape character';
    case 16: return 'Invalid character';
    default: return 'Syntax error';
  }
}

export function getErrorLine(errorMessage: string, input: string): number | null {
  if (!errorMessage) return null;

  // JSON error: "Unexpected token } in JSON at position 123"
  // V8 / Chrome / Node style
  const positionMatch = errorMessage.match(/at position (\d+)/);
  if (positionMatch) {
    const position = parseInt(positionMatch[1], 10);
    // Calculate line number from position
    // We take the substring up to the position and count newlines
    return input.substring(0, position).split('\n').length;
  }

  // Firefox style JSON error: "line 1 column 1"
  const lineColumnMatch = errorMessage.match(/line\s+(\d+)\s+column/i);
  if (lineColumnMatch) {
    return parseInt(lineColumnMatch[1], 10);
  }

  // XML error: "error on line 2 at column 5"
  const lineMatch = errorMessage.match(/line\s+(\d+)/i);
  if (lineMatch) {
    return parseInt(lineMatch[1], 10);
  }

  return null;
}
