import zlib from 'zlib';
import { ParsedVoterRow, ParseRollResult } from './electoralRollParser';

/**
 * Standard Expected Column Mappings for Voter Import Spreadsheets
 */
export const REQUIRED_VOTER_COLUMNS = [
  { key: 'epicNumber', label: 'EPIC Number / Voter ID', aliases: ['epic', 'epicnumber', 'epic_number', 'voterid', 'voter_id', 'cardno', 'card_no', 'पहचान पत्र'] },
  { key: 'fullName', label: 'Full Name', aliases: ['name', 'fullname', 'full_name', 'voter_name', 'votername', 'नाम', 'मतदाता का नाम'] },
  { key: 'age', label: 'Age', aliases: ['age', 'आयु', 'उम्र'] },
  { key: 'gender', label: 'Gender', aliases: ['gender', 'sex', 'लिंग'] },
];

export const OPTIONAL_VOTER_COLUMNS = [
  { key: 'serialNumber', label: 'Serial Number', aliases: ['serial', 'serialnumber', 'serial_number', 'sr_no', 'srno', 'sl_no', 'slno', 'क्रम संख्या', 'क्रमांक'] },
  { key: 'relationName', label: 'Relation Name (Father / Husband / Mother)', aliases: ['relation', 'relationname', 'relation_name', 'relative_name', 'father_name', 'husband_name', 'पिता/पति का नाम', 'संबंधी का नाम'] },
  { key: 'relationType', label: 'Relation Type', aliases: ['relationtype', 'relation_type', 'संबंध'] },
  { key: 'houseNumber', label: 'House Number', aliases: ['house', 'houseno', 'house_no', 'housenumber', 'house_number', 'मकान संख्या', 'गृह संख्या'] },
];

export const ALL_SUPPORTED_COLUMNS = [
  ...REQUIRED_VOTER_COLUMNS,
  ...OPTIONAL_VOTER_COLUMNS,
];

/**
 * Normalize and validate voter gender strictly and case-insensitively.
 * Supported:
 * M / MALE / पुरुष -> 'M'
 * F / FEMALE / महिला / स्त्री -> 'F'
 * O / OTHER / अन्य / तृतीय लिंग -> 'O'
 * Returns null for blank, unknown, or unrecognized values (never defaults silently to 'M').
 */
export function normalizeGender(raw: string | undefined | null): 'M' | 'F' | 'O' | null {
  if (!raw) return null;
  const clean = raw.trim().toUpperCase();
  if (!clean) return null;

  if (clean === 'M' || clean === 'MALE' || clean === 'पुरुष') {
    return 'M';
  }
  if (clean === 'F' || clean === 'FEMALE' || clean === 'महिला' || clean === 'स्त्री') {
    return 'F';
  }
  if (clean === 'O' || clean === 'OTHER' || clean === 'OTHERS' || clean === 'T' || clean === 'TRANSGENDER' || clean === 'अन्य' || clean === 'तृतीय लिंग') {
    return 'O';
  }
  return null;
}

/**
 * CSV / Tabular Parser Result
 */
export interface TabularParseResult {
  success: boolean;
  parseResult?: ParseRollResult;
  error?: string;
  missingColumns?: string[];
  totalRows?: number;
}

/**
 * Parse CSV text into array of rows (handling quotes, commas, newlines)
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some((f) => f.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Minimal zero-dependency OpenXML (.xlsx) reader
 */
export function parseXlsxRows(buffer: Buffer): string[][] {
  // 1. Unzip relevant XML parts from XLSX zip container
  const entries: Record<string, string> = {};
  let offset = 0;

  while (offset < buffer.length - 4) {
    const sig = buffer.readUInt32LE(offset);
    if (sig === 0x04034b50) {
      // Local file header
      const compression = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const nameLen = buffer.readUInt16LE(offset + 26);
      const extraLen = buffer.readUInt16LE(offset + 28);
      const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLen);
      const dataStart = offset + 30 + nameLen + extraLen;
      const dataEnd = dataStart + compressedSize;

      if (dataEnd <= buffer.length) {
        const rawData = buffer.subarray(dataStart, dataEnd);
        let content: Buffer | null = null;
        if (compression === 0) {
          content = rawData;
        } else if (compression === 8) {
          try {
            content = zlib.inflateRawSync(rawData);
          } catch {
            content = null;
          }
        }
        if (content && (name.includes('sheet') || name.includes('sharedStrings'))) {
          entries[name] = content.toString('utf8');
        }
      }
      offset = dataEnd;
    } else {
      offset++;
    }
  }

  // 2. Extract shared strings table
  const sharedStrings: string[] = [];
  const ssXml = entries['xl/sharedStrings.xml'] || Object.entries(entries).find(([k]) => k.endsWith('sharedStrings.xml'))?.[1];
  if (ssXml) {
    const siMatches = ssXml.match(/<si>[\s\S]*?<\/si>/g) || [];
    for (const si of siMatches) {
      const tMatches = si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || [];
      const text = tMatches.map((t) => t.replace(/<[^>]+>/g, '')).join('');
      sharedStrings.push(
        text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
      );
    }
  }

  // 3. Find primary sheet XML (sheet1.xml)
  const sheetXmlKey = Object.keys(entries).find((k) => k.includes('worksheets/sheet1.xml')) || Object.keys(entries).find((k) => k.includes('sheet'));
  if (!sheetXmlKey || !entries[sheetXmlKey]) {
    throw new Error('Invalid XLSX file: Worksheet data could not be located in spreadsheet archive.');
  }

  const sheetXml = entries[sheetXmlKey];
  const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || [];
  const rows: string[][] = [];

  for (const rowXml of rowMatches) {
    const cellMatches = rowXml.match(/<c\b[^>]*>[\s\S]*?<\/c>|<c\b[^>]*\/>/g) || [];
    const cellMap: Record<string, string> = {};
    let maxColIdx = -1;

    for (const cellXml of cellMatches) {
      const refMatch = cellXml.match(/\br="([A-Z]+)(\d+)"/);
      if (!refMatch) continue;
      const colLetters = refMatch[1];
      let colIdx = 0;
      for (let i = 0; i < colLetters.length; i++) {
        colIdx = colIdx * 26 + (colLetters.charCodeAt(i) - 64);
      }
      colIdx -= 1; // 0-based
      if (colIdx > maxColIdx) maxColIdx = colIdx;

      const isString = /t="s"/.test(cellXml);
      const isInlineStr = /t="inlineStr"/.test(cellXml);
      let val = '';

      if (isString) {
        const vMatch = cellXml.match(/<v>(\d+)<\/v>/);
        if (vMatch) {
          const sIdx = parseInt(vMatch[1], 10);
          val = sharedStrings[sIdx] || '';
        }
      } else if (isInlineStr) {
        const tMatch = cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        if (tMatch) val = tMatch[1].replace(/<[^>]+>/g, '');
      } else {
        const vMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
        if (vMatch) val = vMatch[1];
      }

      cellMap[colIdx] = val
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();
    }

    if (maxColIdx >= 0) {
      const rowArr: string[] = [];
      for (let c = 0; c <= maxColIdx; c++) {
        rowArr.push(cellMap[c] || '');
      }
      if (rowArr.some((c) => c.length > 0)) {
        rows.push(rowArr);
      }
    }
  }

  return rows;
}

/**
 * Match column header name to canonical key
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
}

export function mapColumns(headerRow: string[]): {
  keyToIndex: Record<string, number>;
  missingRequired: string[];
} {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const keyToIndex: Record<string, number> = {};

  for (const col of ALL_SUPPORTED_COLUMNS) {
    const foundIdx = normalizedHeaders.findIndex((h) =>
      col.aliases.some((alias) => normalizeHeader(alias) === h || h.includes(normalizeHeader(alias)))
    );
    if (foundIdx !== -1) {
      keyToIndex[col.key] = foundIdx;
    }
  }

  const missingRequired: string[] = [];
  for (const req of REQUIRED_VOTER_COLUMNS) {
    if (keyToIndex[req.key] === undefined) {
      missingRequired.push(req.label);
    }
  }

  return { keyToIndex, missingRequired };
}

/**
 * Validate and parse tabular rows (CSV or XLSX) into structured ParsedVoterRow items
 */
export function parseTabularVoterRows(
  rows: string[][],
  existingEpicsInDb: Set<string> = new Set()
): TabularParseResult {
  if (rows.length === 0) {
    return {
      success: false,
      error: 'The uploaded file is empty and contains no voter records or headers.',
    };
  }

  const headerRow = rows[0];
  const { keyToIndex, missingRequired } = mapColumns(headerRow);

  if (missingRequired.length > 0) {
    return {
      success: false,
      missingColumns: missingRequired,
      error: `Missing required column(s): ${missingRequired.join(', ')}. Please include ${missingRequired.join(', ')} in the first row.`,
    };
  }

  const voters: ParsedVoterRow[] = [];
  const seenEpicsInImport = new Map<string, number>();
  let globalSerial = 1;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((c) => !c || c.trim().length === 0)) continue;

    const epicRaw = (row[keyToIndex['epicNumber']] || '').trim().toUpperCase();
    const fullName = (row[keyToIndex['fullName']] || '').trim();
    const ageRaw = (row[keyToIndex['age']] || '').trim();
    const genderRaw = (row[keyToIndex['gender']] || '').trim().toUpperCase();

    const serialRaw = keyToIndex['serialNumber'] !== undefined ? (row[keyToIndex['serialNumber']] || '').trim() : '';
    const relationName = keyToIndex['relationName'] !== undefined ? (row[keyToIndex['relationName']] || '').trim() : '';
    const relationTypeRaw = keyToIndex['relationType'] !== undefined ? (row[keyToIndex['relationType']] || '').trim().toUpperCase() : '';
    const houseNumber = keyToIndex['houseNumber'] !== undefined ? (row[keyToIndex['houseNumber']] || '').trim() : '';

    // Normalize Relation Type
    let relationType: 'FATHER' | 'HUSBAND' | 'MOTHER' | 'OTHER' = 'OTHER';
    if (/FATHER|पिता/i.test(relationTypeRaw)) relationType = 'FATHER';
    else if (/HUSBAND|पति/i.test(relationTypeRaw)) relationType = 'HUSBAND';
    else if (/MOTHER|माता/i.test(relationTypeRaw)) relationType = 'MOTHER';
    else if (relationName && !relationTypeRaw) relationType = 'FATHER'; // Default to father if name given

    // Normalize Gender strictly: M/MALE -> M, F/FEMALE -> F, O/OTHER -> O
    const normalizedGender = normalizeGender(genderRaw);
    const gender: 'M' | 'F' | 'O' = normalizedGender || 'O';

    // Normalize Age
    const age = parseInt(ageRaw, 10) || 0;
    const serialNumber = parseInt(serialRaw, 10) || globalSerial++;

    // Validation checks
    const validationErrors: string[] = [];
    let status: 'VALID' | 'LOW_CONFIDENCE' | 'DUPLICATE_SUSPECT' | 'INVALID' = 'VALID';

    if (!epicRaw) {
      validationErrors.push(`Row ${r + 1}: Missing EPIC number / Voter ID`);
      status = 'INVALID';
    }
    if (!fullName || fullName.length < 2) {
      validationErrors.push(`Row ${r + 1}: Missing or invalid voter name`);
      status = 'INVALID';
    }
    if (age < 18 || age > 125) {
      validationErrors.push(`Row ${r + 1}: Invalid age (${age}). Must be between 18 and 125`);
      if (status === 'VALID') status = 'LOW_CONFIDENCE';
    }
    if (!normalizedGender) {
      validationErrors.push(
        `Row ${r + 1}: Invalid or missing gender "${genderRaw || '(blank)'}". Expected MALE (M), FEMALE (F), or OTHER (O).`
      );
      status = 'INVALID';
    }

    if (epicRaw) {
      if (existingEpicsInDb.has(epicRaw)) {
        validationErrors.push(`Row ${r + 1}: EPIC ${epicRaw} already exists in database`);
        status = 'DUPLICATE_SUSPECT';
      } else if (seenEpicsInImport.has(epicRaw)) {
        validationErrors.push(`Row ${r + 1}: Duplicate EPIC ${epicRaw} in current upload`);
        status = 'DUPLICATE_SUSPECT';
      }
      seenEpicsInImport.set(epicRaw, voters.length);
    }

    const nameConf = fullName.length >= 2 ? 1.0 : 0.4;
    const epicConf = /^[A-Z0-9_-]{5,20}$/.test(epicRaw) ? 1.0 : 0.5;
    const ageConf = age >= 18 && age <= 125 ? 1.0 : 0.5;
    const genderConf = normalizedGender ? 1.0 : 0.0;
    const rowConfidence = Number(((nameConf + epicConf + ageConf + genderConf) / 4).toFixed(3));

    voters.push({
      serialNumber,
      epicNumber: epicRaw,
      fullName,
      relationName,
      relationType,
      houseNumber,
      age: age || 18,
      gender,
      confidence: rowConfidence,
      fieldConfidences: {
        name: nameConf,
        epic: epicConf,
        relation: relationName ? 1.0 : 0.6,
        houseNumber: houseNumber ? 1.0 : 0.6,
        age: ageConf,
        gender: genderConf,
      },
      sourceSnippet: `Row ${r + 1}: ${row.join(' | ')}`,
      sourcePage: 1,
      status,
      validationErrors,
    });
  }

  const lowConfidenceCount = voters.filter((v) => v.status === 'LOW_CONFIDENCE' || v.status === 'INVALID').length;
  const duplicateCount = voters.filter((v) => v.status === 'DUPLICATE_SUSPECT').length;
  const totalExtracted = voters.length;
  const confidenceAvg = totalExtracted > 0
    ? Number((voters.reduce((acc, v) => acc + v.confidence, 0) / totalExtracted).toFixed(3))
    : 0;

  return {
    success: true,
    totalRows: voters.length,
    parseResult: {
      voters,
      totalExtracted,
      confidenceAvg,
      lowConfidenceCount,
      duplicateCount,
    },
  };
}

/**
 * Generate standard CSV template string
 */
export function getSampleCsvTemplate(): string {
  return [
    'Serial Number,EPIC Number,Full Name,Relation Name,Relation Type,House Number,Age,Gender',
    '1,UP1234567,Aarav Sharma,Ramesh Sharma,FATHER,101-A,34,M',
    '2,UP1234568,Pooja Sharma,Aarav Sharma,HUSBAND,101-A,31,F',
    '3,UP1234569,Vikram Singh,Rajesh Singh,FATHER,204-B,45,M',
  ].join('\n');
}
