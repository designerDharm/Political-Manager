export interface ParsedVoterRow {
  serialNumber: number;
  epicNumber: string;
  fullName: string;
  relationName: string;
  relationType: 'FATHER' | 'HUSBAND' | 'MOTHER' | 'OTHER';
  houseNumber: string;
  age: number;
  gender: 'M' | 'F' | 'O';
  confidence: number;
  fieldConfidences: {
    name: number;
    epic: number;
    relation: number;
    houseNumber: number;
    age: number;
    gender: number;
  };
  sourceSnippet: string;
  sourcePage: number;
  status: 'VALID' | 'LOW_CONFIDENCE' | 'DUPLICATE_SUSPECT' | 'INVALID';
  validationErrors: string[];
}

export interface ParseRollResult {
  voters: ParsedVoterRow[];
  totalExtracted: number;
  confidenceAvg: number;
  lowConfidenceCount: number;
  duplicateCount: number;
}

/**
 * Clean & normalize text while preserving Indian language Devanagari characters
 */
function cleanField(val: string): string {
  return val
    .replace(/Photo\s+is\s+Available/gi, '')
    .replace(/Photo\s+Not\s+Available/gi, '')
    .replace(/[\|\[\]\{\}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract structured voter records from Indian electoral roll text pages.
 * Handles both Hindi (ररजज ननरररचन आजयग / राज्य निर्वाचन आयोग) and English rolls.
 */
export function parseElectoralRollPages(
  pages: { pageNumber: number; text: string; confidence: number }[],
  existingEpicsInDb: Set<string> = new Set()
): ParseRollResult {
  const voters: ParsedVoterRow[] = [];
  const seenEpicsInImport = new Map<string, number>(); // epic -> index in voters array

  let globalSerial = 1;

  for (const page of pages) {
    const { pageNumber, text } = page;
    if (!text || text.trim().length === 0) continue;

    // Split page into voter card blocks based on EPIC regex: [A-Z]{3}[0-9]{7} or similar state voter IDs
    const epicRegex = /([A-Z]{3}[0-9]{7})/g;
    const blocks = text.split(/(?=[A-Z]{3}[0-9]{7})/);

    for (const rawBlock of blocks) {
      const epicMatch = rawBlock.match(/^([A-Z]{3}[0-9]{7})/);
      if (!epicMatch) continue;

      const epic = epicMatch[1].toUpperCase();

      // Full Name
      // Matches "नरम:", "नाम:", "Name:"
      const nameMatch = rawBlock.match(/(?:नरम|नाम|Name)\s*:\s*([^\n\r]+)/i);
      const fullName = nameMatch ? cleanField(nameMatch[1]) : '';

      // Relation (Father / Husband / Mother / Guardian)
      // Matches "नपतर", "पिता", "पनत", "पति", "मरतर", "माता", "Father", "Husband", "Mother"
      const relMatch = rawBlock.match(
        /(नपतर|पिता|पनत|पति|मरतर|माता|Father|Husband|Mother|Guardian)\s*(?:कर|का|के)?\s*(?:नरम|नाम|Name)?\s*:\s*([^\n\r]+)/i
      );

      let relationType: 'FATHER' | 'HUSBAND' | 'MOTHER' | 'OTHER' = 'OTHER';
      let relationName = '';

      if (relMatch) {
        const rawType = relMatch[1];
        relationName = cleanField(relMatch[2]);
        if (/नपतर|पिता|Father/i.test(rawType)) relationType = 'FATHER';
        else if (/पनत|पति|Husband/i.test(rawType)) relationType = 'HUSBAND';
        else if (/मरतर|माता|Mother/i.test(rawType)) relationType = 'MOTHER';
      }

      // House Number
      // Matches "मकरन सपखजर:", "मकान संख्या:", "House No:"
      const houseMatch = rawBlock.match(/(?:मकरन|मकान|House)\s*(?:सपखजर|संख्या|No\.?|Number)?\s*:\s*([^\n\r]+)/i);
      const houseNumber = houseMatch ? cleanField(houseMatch[1]) : '';

      // Age
      // Matches "आजच: 20", "आयु: 20", "Age: 20"
      const ageMatch = rawBlock.match(/(?:आजच|आयु|Age)\s*:\s*(\d{1,3})/i);
      const age = ageMatch ? parseInt(ageMatch[1], 10) : 0;

      // Gender
      // Matches "ललग: पचरष / सल", "लिंग: पुरुष / महिला / स्त्री", "Gender: Male / Female"
      const genderMatch = rawBlock.match(/(?:ललग|लिंग|Gender)\s*:\s*([^\n\r]+)/i);
      let gender: 'M' | 'F' | 'O' = 'O';
      if (genderMatch) {
        const rawGen = genderMatch[1];
        if (/पचरष|पुरुष|Male|M\b/i.test(rawGen)) gender = 'M';
        else if (/सल|स्त्री|महिला|Female|F\b/i.test(rawGen)) gender = 'F';
      }

      // Serial number detection from preceding context or incremental
      const serialMatch = rawBlock.match(/(?:^|\n)\s*(\d{1,4})\s+[A-Z]{3}[0-9]{7}/);
      const serialNumber = serialMatch ? parseInt(serialMatch[1], 10) : globalSerial++;

      // Field Confidences
      const nameConf = fullName.length >= 2 ? 0.95 : 0.40;
      const epicConf = /^[A-Z]{3}[0-9]{7}$/.test(epic) ? 0.99 : 0.50;
      const relConf = relationName.length >= 2 ? 0.94 : 0.50;
      const houseConf = houseNumber.length >= 1 ? 0.92 : 0.50;
      const ageConf = age >= 18 && age <= 125 ? 0.98 : (age > 0 ? 0.60 : 0.30);
      const genderConf = (gender === 'M' || gender === 'F') ? 0.98 : 0.50;

      const rowConfidence = Number(
        ((nameConf + epicConf + relConf + houseConf + ageConf + genderConf) / 6).toFixed(3)
      );

      // Validation Checks
      const validationErrors: string[] = [];
      let status: 'VALID' | 'LOW_CONFIDENCE' | 'DUPLICATE_SUSPECT' | 'INVALID' = 'VALID';

      if (!fullName || fullName.length < 2) {
        validationErrors.push('Missing or unclear voter name');
      }
      if (age < 18 || age > 125) {
        validationErrors.push(`Suspicious age: ${age}`);
      }
      if (!houseNumber) {
        validationErrors.push('Missing house number');
      }

      // Duplicate check (1. against database, 2. intra-import duplicate)
      if (existingEpicsInDb.has(epic)) {
        validationErrors.push(`EPIC ${epic} already exists in database`);
        status = 'DUPLICATE_SUSPECT';
      } else if (seenEpicsInImport.has(epic)) {
        validationErrors.push(`Duplicate EPIC ${epic} found in same document`);
        status = 'DUPLICATE_SUSPECT';
      } else if (validationErrors.length > 0 || rowConfidence < 0.85) {
        status = 'LOW_CONFIDENCE';
      }

      seenEpicsInImport.set(epic, voters.length);

      const snippet = rawBlock.slice(0, 300).trim();

      voters.push({
        serialNumber,
        epicNumber: epic,
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
          relation: relConf,
          houseNumber: houseConf,
          age: ageConf,
          gender: genderConf,
        },
        sourceSnippet: snippet,
        sourcePage: pageNumber,
        status,
        validationErrors,
      });
    }
  }

  const lowConfidenceCount = voters.filter((v) => v.status === 'LOW_CONFIDENCE' || v.status === 'INVALID').length;
  const duplicateCount = voters.filter((v) => v.status === 'DUPLICATE_SUSPECT').length;
  const totalExtracted = voters.length;
  const confidenceAvg = totalExtracted > 0
    ? Number((voters.reduce((acc, v) => acc + v.confidence, 0) / totalExtracted).toFixed(3))
    : 0;

  return {
    voters,
    totalExtracted,
    confidenceAvg,
    lowConfidenceCount,
    duplicateCount,
  };
}
