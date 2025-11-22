
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
