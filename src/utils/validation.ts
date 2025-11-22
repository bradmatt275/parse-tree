
import { parse, ParseErrorCode, ParseError } from 'jsonc-parser';

export interface ValidationResult {
  line: number;
  message: string;
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

function getErrorMessage(errorCode: ParseErrorCode): string {
  switch (errorCode) {
    case ParseErrorCode.InvalidSymbol: return 'Invalid symbol';
    case ParseErrorCode.InvalidNumberFormat: return 'Invalid number format';
    case ParseErrorCode.PropertyNameExpected: return 'Property name expected';
    case ParseErrorCode.ValueExpected: return 'Value expected';
    case ParseErrorCode.ColonExpected: return 'Colon expected';
    case ParseErrorCode.CommaExpected: return 'Comma expected';
    case ParseErrorCode.CloseBraceExpected: return 'Closing brace expected';
    case ParseErrorCode.CloseBracketExpected: return 'Closing bracket expected';
    case ParseErrorCode.EndOfFileExpected: return 'End of file expected';
    case ParseErrorCode.InvalidCommentToken: return 'Invalid comment token';
    case ParseErrorCode.UnexpectedEndOfComment: return 'Unexpected end of comment';
    case ParseErrorCode.UnexpectedEndOfString: return 'Unexpected end of string';
    case ParseErrorCode.UnexpectedEndOfNumber: return 'Unexpected end of number';
    case ParseErrorCode.InvalidUnicode: return 'Invalid unicode sequence';
    case ParseErrorCode.InvalidEscapeCharacter: return 'Invalid escape character';
    case ParseErrorCode.InvalidCharacter: return 'Invalid character';
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
