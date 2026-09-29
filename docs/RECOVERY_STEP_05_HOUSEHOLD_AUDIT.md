# RECOVERY STEP 5 — HOUSEHOLD / FAMILY GROUPING AUDIT

**Date:** 2026-09-28
**Scope:** Household & Family Grouping Engine, Suggestion Review, Manual Correction, and PostgreSQL Persistence.

---

## 1. Current State Matrix

| Feature | UI | API | DB | Status | Persistence | RBAC | Problem |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Household Listing** | Voters page counter / Household card | `GET /api/v1/households` | `Household` table | Real | PostgreSQL | Campaign & Booth Scoped | No standalone household list screen or filter; only accessible via voters table |
| **Household Dossier** | `/campaigns/[id]/households/[hid]` | `GET /api/v1/households/[hid]` | `Household` + `Voter` | Real | PostgreSQL | Campaign & Booth Scoped | Works, but member actions (move, split, merge) were static or missing APIs |
| **Household Grouping Engine** | Static UI mock in imports review tab | None | Not implemented | Mock / Missing | None | None | Grouping was not executed during or after voter import; voters remained unlinked (`householdId = null`) |
| **Manual Correction (Move/Split/Merge)** | Review modal | Missing backend endpoints | Not modeled | Missing | None | None | No atomic transactional APIs for moving member, splitting household, or merging households |
| **Explainable Evidence** | Mock signals in review tab | None | `evidenceSignals` JSON field exists on `Household` | Mock | None | None | Signal reasons were hardcoded mock strings rather than real computed provenance |
| **Field Visit Mutation** | `/agent/visit/[hid]` | `POST /api/v1/sync` | `Interaction` table | Real | PostgreSQL | Agent booth-scoped | Handled visit notes and status, but lacked agent household member correction flow |
| **Manual Precedence** | None | None | Missing flags | Missing | None | None | Rerunning grouping could overwrite manual edits if not explicitly tracked |

---

## 2. Target Architecture for Recovery Step 5

1. **Deterministic Grouping Engine (`src/lib/households/groupingEngine.ts`)**:
   - Reads authoritative PostgreSQL `Voter` records for a campaign (or specific booth).
   - Conservative House Number Normalization (trims, standardizes Devanagari numerals, preserves suffixes e.g. `12` vs `12-A`).
   - Grouping Rules:
     - **STRONG Evidence**: Same campaign + same booth + same normalized house number + spouse match OR parent/child guardian match.
     - **MEDIUM Evidence**: Same campaign + same booth + same normalized house number (no direct relation match).
     - **SINGLE PERSON**: Single elector at house number becomes valid single-person household.
     - Ambiguous cases marked `NEEDS_REVIEW` (confidence 65-80%).
     - Safe deterministic cases marked `CONFIRMED` or `SUGGESTED` (confidence 90-95%).
   - Preserves manual corrections: If a voter has `householdSource = 'MANUAL_CORRECTION'`, grouping rerun leaves them untouched!
2. **Comprehensive Household & Grouping APIs**:
   - `POST /api/v1/households/grouping/run`: Triggers deterministic grouping on unlinked/suggested voters.
   - `GET /api/v1/households/suggestions`: Lists suggested household clusters with explainable evidence signals and counts.
   - `POST /api/v1/households/[hid]/confirm`: Confirms a suggested household cluster.
   - `POST /api/v1/households/[hid]/move-member`: Atomically moves a voter to another household or creates a new one.
   - `POST /api/v1/households/[hid]/split`: Splits selected voters into a brand-new household.
   - `POST /api/v1/households/[hid]/merge`: Merges two households within same booth.
   - `PATCH /api/v1/households/[hid]`: Updates operational address or primary contact.
3. **UI Integration**:
   - Dedicated Household Review Center tab at `/campaigns/[id]/imports/review` and `/campaigns/[id]/households`.
   - Household Dossier `/campaigns/[id]/households/[hid]` wired with working member move, split, and edit actions.
