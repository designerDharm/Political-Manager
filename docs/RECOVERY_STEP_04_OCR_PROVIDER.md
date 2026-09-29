# RECOVERY STEP 4 — OCR EXTENSION & EXTRACTION ENGINE DOCUMENTATION

**Date:** 2026-09-28
**Component:** `src/lib/ocr/provider.ts` and `src/lib/ocr/electoralRollParser.ts`

---

## 1. Architecture Overview

The electoral roll ingestion architecture is decoupled into two primary components:

```
[Uploaded PDF Document]
          │
          ▼
┌─────────────────────────────────┐
│       OCR Provider Layer        │
│    (src/lib/ocr/provider.ts)    │
│  - Poppler pdftotext extractor  │
│  - Pluggable OCR adapter hooks  │
└─────────────────────────────────┘
          │
          ▼ Extracted Pages with Layout & Density
┌──────────────────────────────────────────────┐
│       Structured Electoral Roll Parser       │
│  (src/lib/ocr/electoralRollParser.ts)        │
│  - Devanagari & English Script Preservation  │
│  - EPIC Regex Identification ([A-Z]{3}[0-9]{7})
│  - Relation & Household extraction           │
│  - Duplicate Collision Detection vs DB & Batch
│  - Field-level Confidence Scoring            │
└──────────────────────────────────────────────┘
          │
          ▼ Staged Records
┌──────────────────────────────────────────────┐
│        Prisma Model: ImportRecord            │
│  - In-database audit trail & review queue    │
└──────────────────────────────────────────────┘
```

---

## 2. Script & Language Preservation

- **Exact Devanagari Script Support**: Electoral rolls in Rajasthan and northern Indian states use Hindi Devanagari text (`ररजज ननरररचन आजयग`, `नाम / नरम`, `पिता / पति का नाम`, `मकान संख्या`, `आयु`, `लिंग: पुरुष / महिला`).
- The parser preserves the native Devanagari strings without lossy automatic machine translation.
- Watermarks such as `Photo is Available` or `Photo Not Available` are cleaned without truncating elector names.

---

## 3. Confidence Metrics & Flagging

Each extracted voter record is assigned a composite confidence score:

$$\text{Confidence} = \frac{\text{conf}_{\text{name}} + \text{conf}_{\text{epic}} + \text{conf}_{\text{rel}} + \text{conf}_{\text{house}} + \text{conf}_{\text{age}} + \text{conf}_{\text{gender}}}{6}$$

- Any row with confidence $< 85\%$ or missing required fields (`fullName`, `age`, `houseNumber`) is flagged as `LOW_CONFIDENCE`.
- Any row with an EPIC that already exists in the campaign or earlier in the same document is flagged as `DUPLICATE_SUSPECT`.
- Only records marked as `VALID` or manually approved through the Review Center are published into the authoritative `Voter` registry.
