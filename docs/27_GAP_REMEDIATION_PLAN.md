# Gap Remediation Plan — CampaignOps AI

## 1. Executive Summary & Audit Findings

Following an in-depth audit of the repository, data models, UI components, and existing documentation against the Gap Remediation & Production Hardening requirements, key remediation tracks were identified:

1. **Election Domain Normalization**:
   - *Current State*: Campaign stored candidate and party as simple string fields (`candidateName`, `partyName`).
   - *Required State*: Normalized `Election`, `Party`, `Candidate`, `CampaignCandidate`, `Constituency`, and `CandidateConstituency` models supporting multi-candidate party operations and multi-election reuse.
2. **Geography Versioning & Boundaries**:
   - *Current State*: Wards and Booths were campaign-scoped static entities.
   - *Required State*: Effective date ranges (`effectiveFrom`, `effectiveTo`), `boundaryVersion`, `geometryVersion`, GIS/GeoJSON polygon storage, and fallback centroid coordinates.
3. **Electoral Roll Data Import & AI Review Center**:
   - *Current State*: Basic upload queue and processed list.
   - *Required State*: Comprehensive 9-stage review pipeline: Upload → File Validation → OCR/Text Extraction → Structured Extraction → Low-Confidence Queue → Duplicate Review → Household Suggestion Queue → Reconciliation → Publish.
4. **Field-Level Data Provenance**:
   - *Current State*: Record-level status flags.
   - *Required State*: Field-level provenance tracking (`sourceType`, `sourcePage`, `ocrConfidence`, `verifiedBy`, `verifiedAt`, `previousValue`, `correctionReason`).
5. **Duplicate Resolution Center**:
   - *Current State*: No visual side-by-side comparison.
   - *Required State*: Candidate pair comparison UI with similarity scoring, human actions (`NOT_DUPLICATE`, `LINK_SAME_PERSON`, `MERGE_OPERATIONAL_RECORDS`), and reversible audit trails.
6. **Household Grouping Explainability & Primary Contact**:
   - *Current State*: Percentage confidence chip only.
   - *Required State*: Detailed evidence breakdown (House No., normalized address, guardian match, age plausibility, serial proximity) and human-configured Primary Household Contact (no inferred "family head").
7. **Election-Day & VIS Semantic Correction**:
   - *Current State*: Risk of conflating VIS issuance with votes cast.
   - *Required State*: Strict decoupling! Total Electors, Official Turnout, VIS Requested, VIS Issued, and Assistance Requests are distinct metrics. VIS Issued NEVER means voter voted or voted for a specific candidate. Neutral legal VIS template with zero candidate photos or campaign propaganda.
8. **Privacy Governance, Purpose Registry & Retention**:
   - *Current State*: High-level documentation.
   - *Required State*: Super Admin Privacy Governance Center with Purpose Registry, Retention Policy Engine (Active, Archived, Hold, Purged), Data Subject Rights workflow, and Cybersecurity Incident Management.
9. **Maker-Checker & Audit Hardening**:
   - *Current State*: Basic audit table.
   - *Required State*: Append-only audit logs with tamper-evident hash chaining and Maker-Checker approvals for high-risk actions (bulk corrections, exports, restores).
10. **Device Management & Offline Field Security**:
    - *Current State*: Single-device assumption.
    - *Required State*: Active session tracking, remote device revocation, minimized assignment-scoped cache, TTL expiration, and sync conflict resolution UI with version checking.

---

## 2. Remediation Matrix

| Gap | Current State | Required State | Affected DB | Affected API | Affected UI | Migration Needed | Tests Needed | Status |
|---|---|---|---|---|---|---|---|---|
| **Election & Candidate Normalization** | Single strings in `Campaign` | `Election`, `Party`, `Candidate`, `CampaignCandidate`, `Constituency` | `prisma/schema.prisma` | `/api/elections`, `/api/campaigns` | Campaign Setup Wizard, Dashboards | Backward-compatible schema migration | Domain relation tests | 🟡 In Progress |
| **Geography Versioning** | Booths attached directly to Campaign | Versioned constituencies, wards, booths with effective dates & GeoJSON | `Booth`, `Ward`, `Constituency` | `/api/geography` | Coverage Map, Booth list | Add versioning columns | Geo hierarchy tests | 🟡 In Progress |
| **AI Import Review Center** | Upload -> List | 9-stage Review Center: PDF viewer vs structured data, low-confidence queue | `ElectoralRollImport`, `ImportPage`, `ImportRecord` | `/api/imports/[id]/review` | `/campaigns/[id]/imports/review` | Add extraction models | Pipeline validation tests | 🟡 In Progress |
| **Field Provenance** | Whole record status | Field-level provenance table and popovers | `VoterFieldProvenance` | `/api/voters/[id]/provenance` | Voter detail, Household member rows | New relation table | Audit provenance tests | 🟡 In Progress |
| **Duplicate Resolution** | None | Side-by-side record comparison and non-destructive link/merge | `DuplicatePair` | `/api/voters/duplicates` | `/campaigns/[id]/duplicates` | New relation table | Reversibility tests | 🟡 In Progress |
| **Household Explainability** | "91% confidence" | Evidence checklists (address match, guardian match, age plausibility) | `HouseholdEvidence` | `/api/households/[id]` | Household Detail & Agent visit | Add evidence JSON/table | Confidence scoring tests | 🟡 In Progress |
| **Election Day Semantics** | VIS & Turnout mixed | Decoupled metrics: VIS ≠ Turnout; neutral VIS print template | `TurnoutSnapshot`, `VisEvent` | `/api/election-day`, `/api/vis` | Election Day Dashboard, VIS page | Update calculation services | Non-inference tests | 🟡 In Progress |
| **Privacy Governance** | Docs only | Purpose registry, retention engine, data rights requests, breach workflow | `PrivacyPurpose`, `RetentionPolicy`, `PrivacyRequest`, `SecurityIncident` | `/api/privacy` | `/super-admin/privacy` | New governance tables | Retention & breach tests | 🟡 In Progress |
| **Maker-Checker Approvals** | Direct execution | Two-person rule for exports, restores, bulk edits | `ApprovalRequest` | `/api/approvals` | Admin action modals | New approvals table | Dual-auth tests | 🟡 In Progress |
| **Device & Offline Security** | Basic session | Device registry, remote revoke, conflict resolution UI | `UserDevice`, `OfflineMutation` | `/api/devices`, `/api/sync` | `/agent/profile`, `/agent/sync-conflicts` | Add device tables | Conflict & revoke tests | 🟡 In Progress |
