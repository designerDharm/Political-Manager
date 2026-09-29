/**
 * CSV Generator and Formula Injection Sanitizer
 * Implements OWASP spreadsheet export safety:
 * Prepends a single quote to free-text fields starting with '=', '+', '-', '@', or tab/CR.
 * Preserves Hindi/Devanagari scripts via UTF-8 BOM (\uFEFF).
 */

export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If numeric or date string that does not start with formula character, return clean
  if (typeof value === 'number') {
    return String(value);
  }

  // Check for CSV Formula Injection indicators: '=', '+', '-', '@', '\t', '\r'
  let safeStr = str;
  const firstChar = str.charAt(0);
  if (['=', '+', '-', '@', '\t', '\r'].includes(firstChar)) {
    // Only escape if it's not a standard negative number
    if (!(firstChar === '-' && !isNaN(Number(str)))) {
      safeStr = `'${str}`;
    }
  }

  // Escape double quotes by doubling them
  const escaped = safeStr.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateCsv(headers: string[], rows: any[][]): string {
  // \uFEFF is UTF-8 Byte Order Mark (BOM) ensuring Excel correctly detects UTF-8 Devanagari script
  const bom = '\uFEFF';
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCsvCell).join(','));
  return bom + [headerLine, ...rowLines].join('\r\n');
}
