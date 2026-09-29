# RECOVERY STEP 4 — VOTER ROLL PDF IMPORT + OCR + REVIEW + PUBLISH AUDIT

**Date:** 2026-09-28
**Scope:** Voter list import, OCR/extraction engine, Review Center, and PostgreSQL publishing pipeline.

---

## 1. Current State Assessment

### 1.1 Existing Flaws & Mock Implementations
1. **Mock Upload Ingestion (`src/app/api/v1/imports/route.ts`)**:
   - Hardcoded synthetic stats: `totalExtracted: 2840, totalHouseholds: 892, confidenceAvg: 0.964, lowConfidenceCount: 2`.
   - Never reads actual uploaded multipart PDF content.
   - Fake pages (1 to 4) created statically.
2. **Mock Staging Model Missing**:
   - `prisma/schema.prisma` has `ElectoralRollImport` and `ImportPage`, but lacked an `ImportRecord` model to stage individually extracted voter rows before publishing.
3. **Hardcoded Publish Endpoint (`src/app/api/v1/imports/publish/route.ts`)**:
   - Directly created 5 hardcoded mock households (`H-001` through `H-005`) and 10 mock voters (`Rajesh Kumar`, `Sunita Devi`, etc.) assigned to arbitrary booths (118, 101).
   - Ignored the real staged import records.
4. **Mocked Review UI (`src/app/campaigns/[id]/imports/review/page.tsx`)**:
   - Client-side static state with 2 low-confidence mock items, 1 fake duplicate pair, and 3 hardcoded household clusters.
   - Did not fetch or mutate real database staged records.

---

## 2. Target Architecture for Step 4

1. **Prisma Staging Model (`ImportRecord`)**:
   - Fields: `id`, `importId`, `campaignId`, `wardId`, `boothId`, `serialNumber`, `epicNumber`, `fullName`, `relationName`, `relationType`, `houseNumber`, `age`, `gender`, `status`, `confidence`, `fieldConfidences`, `sourceSnippet`, `sourcePage`, `reviewed`, `corrected`, `validationErrors`.
2. **Extensible OCR / Text Extraction Provider (`src/lib/ocr/provider.ts`)**:
   - Uses local Poppler `pdftotext` extraction preserving Indian Devanagari script and English alphanumeric text.
   - Modular structure allowing pluggable OCR services (Tesseract / Cloud Vision / PDF extraction).
3. **Indian Electoral Roll Parser (`src/lib/ocr/electoralRollParser.ts`)**:
   - Parses official Election Commission / State Election Commission formats:
     - Record boxes: Serial number, EPIC (`[A-Z]{3}[0-9]{7}`), Full Name (`नाम / नरम`), Relation (`पिता / पति / माता का नाम`), House No (`मकान संख्या`), Age (`आयु`), Gender (`लिंग: पुरुष / स्त्री / M / F`).
     - Script preservation: preserves exact Devanagari / English characters without translation.
     - Confidence calculation based on field completeness and valid regex.
     - Duplicate suspect detection against both existing database `Voter` records and intra-import duplicate EPICs.
4. **Multipart File Upload & Storage**:
   - Accepts multipart/form-data: `file`, `campaignId`, `wardId`, `boothId`.
   - Saves source PDF into `uploads/imports/` with SHA-256 hash provenance.
5. **Review Center API & UI**:
   - `GET /api/v1/imports/[id]`: Returns import job, stats, and staged records filtered by status (`ALL`, `LOW_CONFIDENCE`, `DUPLICATE_SUSPECT`, `VALID`).
   - `PATCH /api/v1/imports/[id]/records/[recordId]`: Allows Campaign Admin to correct OCR-extracted fields.
6. **Idempotent Publish Endpoint**:
   - Transactionally transfers approved/valid `ImportRecord` rows to `Voter` table with strict foreign key links to `Campaign`, `Ward`, and `Booth`.
   - Populates `VoterFieldProvenance` for auditability.
   - Marks import as `Completed` / `PUBLISHED`.
   - Enforces RBAC: Super Admin & Campaign Admin allowed; Political Agents denied (403); cross-campaign isolated.
