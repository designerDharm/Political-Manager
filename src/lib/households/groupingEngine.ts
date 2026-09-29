import { prisma } from '@/lib/prisma';

export interface GroupingEvidence {
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0 - 100
  status: 'CONFIRMED' | 'SUGGESTED' | 'NEEDS_REVIEW';
  signals: string[];
}

export interface VoterForGrouping {
  id: string;
  campaignId: string;
  wardId: string;
  boothId: string;
  name: string;
  guardianName: string | null;
  relationshipType: string | null;
  age: number;
  gender: string;
  epicNumber: string;
  houseNumber: string;
  householdId: string | null;
  householdSource?: string | null;
}

/**
 * Conservative house number normalization:
 * - Trims whitespace
 * - Converts Devanagari numerals (०-९) to Latin digits (0-9)
 * - Standardizes safe separators (- / .)
 * - Preserves meaningful alphabetic suffixes (e.g. "12-A" vs "12/A" vs "12")
 */
export function normalizeHouseNumber(rawHouseNumber: string | null | undefined): string {
  if (!rawHouseNumber) return 'UNKNOWN';

  let s = String(rawHouseNumber).trim();

  // Strip OCR artifacts like "मकरन सपखजर:" or "मकान संख्या:" or "Photo is"
  s = s.replace(/Photo\s+is\s+Available/gi, '');
  s = s.replace(/(?:मकरन|मकान|House)\s*(?:सपखजर|संख्या|No\.?|Number)?\s*:\s*/gi, '');
  s = s.replace(/रररर\s*(?:नप\.?)?\s*/gi, ''); // remove ward prefixes like "रररर नप. 5"
  s = s.replace(/[\|\[\]\{\}]/g, '');

  // Convert Devanagari numerals (० = 0x0966 to ९ = 0x096F) to standard digits
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  for (let i = 0; i < 10; i++) {
    s = s.split(devanagariDigits[i]).join(String(i));
  }

  // Normalize separators: remove leading zeroes from numbers e.g. "05" -> "5"
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\b0+(\d+)/g, '$1');

  // Standardize common patterns
  s = s.replace(/\s*[-\/]\s*/g, '-').toUpperCase();

  return s || 'UNKNOWN';
}

/**
 * Clean & normalize person names for comparison
 */
export function normalizePersonName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/Photo\s+is\s+Available/gi, '')
    .replace(/Photo\s+Not\s+Available/gi, '')
    .replace(/[\|\[\]\{\}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Deterministic evidence computation between members of a proposed household cluster
 */
export function evaluateHouseholdEvidence(
  members: VoterForGrouping[],
  normalizedHouseNo: string,
  boothId: string
): GroupingEvidence {
  const signals: string[] = [];

  // Single person household
  if (members.length === 1) {
    signals.push(`Single elector at normalized house number: ${normalizedHouseNo}`);
    signals.push('Isolated resident without co-located family members');
    return {
      confidenceLevel: 'HIGH',
      confidenceScore: 92,
      status: 'CONFIRMED',
      signals,
    };
  }

  signals.push(`Exact normalized house number: ${normalizedHouseNo}`);
  signals.push(`Same polling booth context`);

  let spouseMatchCount = 0;
  let sharedGuardianMatchCount = 0;
  let directParentChildMatchCount = 0;

  const namesSet = new Set(members.map((m) => normalizePersonName(m.name)));
  const guardiansMap = new Map<string, number>();

  for (const m of members) {
    const gName = normalizePersonName(m.guardianName);
    if (gName) {
      guardiansMap.set(gName, (guardiansMap.get(gName) || 0) + 1);

      // Check if guardian is one of the household members (e.g. Father/Husband is in the same group)
      if (namesSet.has(gName)) {
        if (m.relationshipType === 'HUSBAND') {
          spouseMatchCount++;
        } else if (m.relationshipType === 'FATHER' || m.relationshipType === 'MOTHER') {
          directParentChildMatchCount++;
        }
      }
    }
  }

  // Check if multiple members share the same guardian (siblings / children)
  for (const [gName, count] of Array.from(guardiansMap.entries())) {
    if (count >= 2) {
      sharedGuardianMatchCount += count;
      signals.push(`Shared family guardian across ${count} members (${gName})`);
    }
  }

  if (spouseMatchCount > 0) {
    signals.push(`Direct husband-wife cohabitation match detected (${spouseMatchCount} link)`);
  }

  if (directParentChildMatchCount > 0) {
    signals.push(`Direct parent-child relational match detected (${directParentChildMatchCount} link)`);
  }

  // Strong deterministic condition: House No + Booth + (Spouse link OR Direct Parent/Child link OR Shared Guardian)
  if (spouseMatchCount > 0 || directParentChildMatchCount > 0 || sharedGuardianMatchCount > 0) {
    const score = Math.min(99, 90 + spouseMatchCount * 3 + directParentChildMatchCount * 2);
    return {
      confidenceLevel: 'HIGH',
      confidenceScore: score,
      status: 'CONFIRMED',
      signals,
    };
  }

  // Medium condition: Same House No + Booth, but no direct relational names matched (e.g. joint family / unlinked guardians)
  if (members.length <= 6) {
    signals.push('Co-located at identical house number without explicit relational match');
    return {
      confidenceLevel: 'MEDIUM',
      confidenceScore: 78,
      status: 'SUGGESTED',
      signals,
    };
  }

  // Large ambiguous clusters (> 6 electors with different guardians at same house number)
  signals.push(`Large multi-family or shared residential cluster (${members.length} electors) requiring human verification`);
  return {
    confidenceLevel: 'LOW',
    confidenceScore: 68,
    status: 'NEEDS_REVIEW',
    signals,
  };
}

/**
 * Deterministic Household Grouping Service for a Campaign
 *
 * Rules:
 * 1. Scope: Same Campaign + Same Polling Booth
 * 2. Precedence: Never overwrite voters with `householdSource = 'MANUAL_CORRECTION'`
 * 3. Group by normalized house number
 * 4. Create real PostgreSQL `Household` and connect `Voter.householdId`
 * 5. Idempotent: Can be run multiple times safely
 */
export async function runCampaignHouseholdGrouping(
  campaignId: string,
  boothIdFilter?: string
): Promise<{
  votersEvaluated: number;
  householdsCreated: number;
  householdsUpdated: number;
  highConfidenceCount: number;
  needsReviewCount: number;
  singlePersonCount: number;
}> {
  // Fetch voters in campaign (or specific booth)
  const where: any = { campaignId };
  if (boothIdFilter) where.boothId = boothIdFilter;

  const voters = await prisma.voter.findMany({
    where,
    orderBy: { serialNumber: 'asc' },
    select: {
      id: true,
      campaignId: true,
      wardId: true,
      boothId: true,
      name: true,
      guardianName: true,
      relationshipType: true,
      age: true,
      gender: true,
      epicNumber: true,
      houseNumber: true,
      householdId: true,
      householdSource: true,
    },
  });

  if (voters.length === 0) {
    return {
      votersEvaluated: 0,
      householdsCreated: 0,
      householdsUpdated: 0,
      highConfidenceCount: 0,
      needsReviewCount: 0,
      singlePersonCount: 0,
    };
  }

  // Fetch existing households in campaign to maintain sequential codes (H-001, H-002, etc.)
  const existingHouseholds = await prisma.household.findMany({
    where: { campaignId },
    select: { id: true, code: true, houseNumber: true, boothId: true, isManuallyCorrected: true },
  });

  let maxCodeNum = 0;
  for (const h of existingHouseholds) {
    const match = h.code.match(/H-(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxCodeNum) maxCodeNum = n;
    }
  }

  // Group candidate voters by (boothId + normalizedHouseNumber)
  // Skip voters that have already been manually corrected by Campaign Admin or Agent!
  const groups = new Map<string, { boothId: string; normalizedHouseNo: string; rawHouseNo: string; voters: VoterForGrouping[] }>();

  for (const v of voters) {
    if (v.householdSource === 'MANUAL_CORRECTION') {
      continue; // Human correction has strict precedence!
    }

    const normHouse = normalizeHouseNumber(v.houseNumber);
    const key = `${v.boothId}::${normHouse}`;

    if (!groups.has(key)) {
      groups.set(key, {
        boothId: v.boothId,
        normalizedHouseNo: normHouse,
        rawHouseNo: v.houseNumber,
        voters: [],
      });
    }
    groups.get(key)!.voters.push(v);
  }

  let householdsCreated = 0;
  let householdsUpdated = 0;
  let highConfidenceCount = 0;
  let needsReviewCount = 0;
  let singlePersonCount = 0;

  for (const [, group] of Array.from(groups.entries())) {
    const { boothId, normalizedHouseNo, rawHouseNo, voters: groupVoters } = group;

    const evidence = evaluateHouseholdEvidence(groupVoters, normalizedHouseNo, boothId);

    if (evidence.confidenceLevel === 'HIGH') highConfidenceCount++;
    if (evidence.status === 'NEEDS_REVIEW') needsReviewCount++;
    if (groupVoters.length === 1) singlePersonCount++;

    // Check if a household already exists for this booth & normalized house number
    let existingHh = existingHouseholds.find(
      (h) => h.boothId === boothId && normalizeHouseNumber(h.houseNumber) === normalizedHouseNo
    );

    // If existing household was manually corrected, don't overwrite its attributes
    if (existingHh && existingHh.isManuallyCorrected) {
      continue;
    }

    const primaryContact = groupVoters[0]?.name || null;
    const primaryContactId = groupVoters[0]?.id || null;

    if (!existingHh) {
      maxCodeNum++;
      const code = `H-${String(maxCodeNum).padStart(3, '0')}`;

      const created = await prisma.household.create({
        data: {
          campaignId,
          boothId,
          code,
          houseNumber: rawHouseNo,
          address: `House ${rawHouseNo}, Booth Area`,
          primaryContactName: primaryContact,
          primaryContactId: primaryContactId,
          aiConfidence: evidence.confidenceScore,
          status: evidence.status,
          evidenceSignals: JSON.stringify(evidence.signals),
          version: 1,
        },
      });

      // Link voters to new household
      await prisma.voter.updateMany({
        where: {
          id: { in: groupVoters.map((v) => v.id) },
        },
        data: {
          householdId: created.id,
          householdSource: evidence.status === 'CONFIRMED' ? 'CONFIRMED' : 'SUGGESTED',
          householdConfidence: evidence.confidenceScore / 100,
        },
      });

      householdsCreated++;
    } else {
      // Update existing suggested household
      await prisma.household.update({
        where: { id: existingHh.id },
        data: {
          aiConfidence: evidence.confidenceScore,
          status: evidence.status,
          evidenceSignals: JSON.stringify(evidence.signals),
        },
      });

      await prisma.voter.updateMany({
        where: {
          id: { in: groupVoters.map((v) => v.id) },
          householdId: null, // only link unlinked
        },
        data: {
          householdId: existingHh.id,
          householdSource: evidence.status === 'CONFIRMED' ? 'CONFIRMED' : 'SUGGESTED',
          householdConfidence: evidence.confidenceScore / 100,
        },
      });

      householdsUpdated++;
    }
  }

  return {
    votersEvaluated: voters.length,
    householdsCreated,
    householdsUpdated,
    highConfidenceCount,
    needsReviewCount,
    singlePersonCount,
  };
}
