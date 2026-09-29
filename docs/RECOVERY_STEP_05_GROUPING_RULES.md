# RECOVERY STEP 5 — HOUSEHOLD GROUPING RULES & ENGINE SPECIFICATION
**CampaignOps AI — Deterministic Voter-Roll Household Grouping**

## 1. Objectives & Principles
In electoral roll processing, voters residing in the same household/dwelling must be grouped together to enable family-level canvassing, operational visit logging, and outreach coordination.
The grouping engine in CampaignOps AI operates under the following ironclad principles:
1. **Deterministic & Explainable**: No black-box machine learning or hallucinated entities. Grouping decisions are based purely on normalized house numbers, geographic booth boundaries, and relational ties (husband, father, mother).
2. **Zero Inferences on Demographics/Preferences**: Never infer caste, religion, political preference, income, or persuasion from names or voter data.
3. **Suggested vs Confirmed State**: Automated grouping produces *suggestions* with clear evidence signals (`EXACT_HOUSE_NO`, `SHARED_FAMILY_GUARDIAN`, `COHABITATION_MATCH`).
4. **Single-Person Households**: Electors residing alone at an address are preserved as standalone 1-person households, marked `CONFIRMED` (confidence `0.90`), and NOT discarded.
5. **Ambiguous Large Clusters**: Any house cluster exceeding 6 adult members without shared family guardians or consistent surnames/relations is flagged as `NEEDS_REVIEW` (confidence `0.50`) to prompt field validation.
6. **Strict Manual Precedence**: When a human editor (Campaign Admin or scoped Field Agent) confirms a household, moves a member, splits, or merges units, the system flags `isManuallyCorrected = true` and `householdSource = 'MANUAL_CORRECTION'`. Future automated grouping runs MUST NEVER overwrite or dissolve human-corrected clusters.

---

## 2. Address & House Number Normalization
House numbers in Indian electoral rolls often contain formatting discrepancies, Devanagari numerals, OCR noise, and sub-dwelling suffixes.
The `normalizeHouseNumber` utility (`src/lib/households/groupingEngine.ts`) implements:
- **Devanagari to Western Digit Mapping**:
  `०-९` $\rightarrow$ `0-9`
- **Prefix / Noise Stripping**:
  Removes boilerplate strings like `म.नं.`, `म.क्र.`, `मकान नं.`, `Flat No.`, `Plot No.`, `H.No.`, `#`.
- **Character Cleaning**:
  Removes special symbols except hyphens, forward slashes, and alphanumeric suffixes (e.g. `12-A`, `45/2`, `B-104`).
- **Whitespace Collapsing**:
  Normalizes spaces and standardizes capitalization (`12 a` $\rightarrow$ `12-A`).

---

## 3. Evidence Scoring & Signal Rules
Every generated household cluster is evaluated with `evaluateHouseholdEvidence`:
1. **Signal: `EXACT_HOUSE_NO`**:
   Assigned when all members share the exact normalized house number within the same polling booth.
2. **Signal: `SHARED_FAMILY_GUARDIAN`**:
   Assigned when multiple members reference the same relative name (e.g. siblings sharing father name, or children sharing father name with a mother sharing husband name).
3. **Signal: `COHABITATION_MATCH`**:
   Assigned when husband-wife or parent-child relational ties match with consistent age deltas (e.g. parent is $\ge 15$ years older than child; spouses have plausible generational alignment).
4. **Signal: `SINGLE_PERSON_HOUSEHOLD`**:
   Assigned when exactly one registered voter resides at the dwelling. Marked status `CONFIRMED`.
5. **Signal: `HIGH_DENSITY_CLUSTER`**:
   Triggered when $> 6$ voters share a house number without shared guardian ties. Flagged status `NEEDS_REVIEW`.

### Confidence Score Calculation
- Base Score: `0.70`
- If `SHARED_FAMILY_GUARDIAN`: `+0.20`
- If `COHABITATION_MATCH`: `+0.10`
- If `SINGLE_PERSON_HOUSEHOLD`: Score set to `0.90`, Status: `CONFIRMED`
- If `HIGH_DENSITY_CLUSTER`: Score capped at `0.50`, Status: `NEEDS_REVIEW`
- High Confidence ($\ge 0.85$): Status: `CONFIRMED`
- Medium Confidence ($0.60 - 0.84$): Status: `SUGGESTED`
- Low Confidence ($< 0.60$): Status: `NEEDS_REVIEW`

---

## 4. Manual Correction & Atomic Operations
All human edits are executed inside PostgreSQL database transactions (`prisma.$transaction`) with full `VoterFieldProvenance` records and `AuditEvent` logging:
1. **Confirm Household**:
   - Status transitions to `CONFIRMED`.
   - `isManuallyCorrected` set to `true`.
   - Logs `HOUSEHOLD_CONFIRMED`.
2. **Move Member**:
   - Target voter reassigned to destination household (or auto-creates a new unit if requested).
   - `householdSource` updated to `'MANUAL_CORRECTION'`.
   - Creates provenance entry: `fieldName = 'householdId'`.
   - If previous household becomes empty, it is automatically cleaned up.
   - Logs `HOUSEHOLD_MEMBER_MOVED`.
3. **Split Household**:
   - Takes selected members from an existing household and spawns a new household in the same booth.
   - Updates `VoterFieldProvenance` for each moved member.
   - Marks both origin and new household with `isManuallyCorrected = true`.
   - Logs `HOUSEHOLD_SPLIT`.
4. **Merge Households**:
   - Reassigns all members, interactions, and issues from source household into destination household.
   - Enforces that both households belong to the **exact same polling booth** and campaign.
   - Deletes redundant source household.
   - Logs `HOUSEHOLD_MERGED`.
5. **Address Correction**:
   - Allows updating operational address, house number, and primary contact name.
   - Updates `isManuallyCorrected = true`.
   - Logs `HOUSEHOLD_ADDRESS_CORRECTED`.
