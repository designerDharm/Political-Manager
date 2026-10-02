/**
 * Normalizes a booth display label to prevent duplicate booth number prefixes.
 *
 * Examples:
 * - formatBoothLabel(1, "Booth 1 - Village 1") -> "Booth 1 - Village 1"
 * - formatBoothLabel(1, "Village 1") -> "Booth 1 - Village 1"
 * - formatBoothLabel(1, "Booth #1: Village 1") -> "Booth 1 - Village 1"
 * - formatBoothLabel(1, "Booth 1") -> "Booth 1"
 * - formatBoothLabel(1, "") -> "Booth 1"
 * - formatBoothLabel(2, "Booth 2 - Village 1") -> "Booth 2 - Village 1"
 */
export function formatBoothLabel(boothNumber?: number | string | null, name?: string | null): string {
  const num = boothNumber !== undefined && boothNumber !== null ? String(boothNumber).trim() : '';
  const rawName = (name || '').trim();

  if (!num) {
    return rawName || 'Booth';
  }

  if (!rawName) {
    return `Booth ${num}`;
  }

  // Regex to detect if rawName already starts with "Booth <num>", "Booth #<num>", etc.
  // Case-insensitive, matches variations like:
  // "^booth\s*#?\s*<num>\s*[-:]?\s*(.*)$"
  const escapedNum = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boothPrefixRegex = new RegExp(`^booth\\s*#?\\s*${escapedNum}(?:\\s*[-:]\\s*|\\s+)(.*)$`, 'i');
  const exactBoothOnlyRegex = new RegExp(`^booth\\s*#?\\s*${escapedNum}$`, 'i');

  if (exactBoothOnlyRegex.test(rawName)) {
    return `Booth ${num}`;
  }

  const match = rawName.match(boothPrefixRegex);
  if (match) {
    const remainder = match[1]?.trim();
    return remainder ? `Booth ${num} - ${remainder}` : `Booth ${num}`;
  }

  // If rawName starts with general "Booth " but with a different number or formatting
  const generalBoothRegex = /^booth\s*#?\s*\d+\s*[-:]\s*(.*)$/i;
  const generalMatch = rawName.match(generalBoothRegex);
  if (generalMatch) {
    const remainder = generalMatch[1]?.trim();
    return remainder ? `Booth ${num} - ${remainder}` : `Booth ${num}`;
  }

  return `Booth ${num} - ${rawName}`;
}

/**
 * Normalizes a ward display label to prevent duplicate ward number prefixes.
 *
 * Examples:
 * - formatWardLabel(1, "Ward 1 - Central") -> "Ward 1 - Central"
 * - formatWardLabel(1, "Central") -> "Ward 1 - Central"
 * - formatWardLabel(1, "Ward #1: Central") -> "Ward 1 - Central"
 * - formatWardLabel(1, "Ward 1") -> "Ward 1"
 * - formatWardLabel(1, "") -> "Ward 1"
 */
export function formatWardLabel(wardNumber?: number | string | null, name?: string | null): string {
  const num = wardNumber !== undefined && wardNumber !== null ? String(wardNumber).trim() : '';
  const rawName = (name || '').trim();

  if (!num) {
    return rawName || 'Ward';
  }

  if (!rawName) {
    return `Ward ${num}`;
  }

  const escapedNum = num.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wardPrefixRegex = new RegExp(`^ward\\s*#?\\s*${escapedNum}(?:\\s*[-:]\\s*|\\s+)(.*)$`, 'i');
  const exactWardOnlyRegex = new RegExp(`^ward\\s*#?\\s*${escapedNum}$`, 'i');

  if (exactWardOnlyRegex.test(rawName)) {
    return `Ward ${num}`;
  }

  const match = rawName.match(wardPrefixRegex);
  if (match) {
    const remainder = match[1]?.trim();
    return remainder ? `Ward ${num} - ${remainder}` : `Ward ${num}`;
  }

  const generalWardRegex = /^ward\s*#?\s*\d+\s*[-:]\s*(.*)$/i;
  const generalMatch = rawName.match(generalWardRegex);
  if (generalMatch) {
    const remainder = generalMatch[1]?.trim();
    return remainder ? `Ward ${num} - ${remainder}` : `Ward ${num}`;
  }

  return `Ward ${num} - ${rawName}`;
}
