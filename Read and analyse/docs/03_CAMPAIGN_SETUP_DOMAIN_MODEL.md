# Campaign Setup & Domain Model

## 1. Core Hierarchy

```text
Platform
└── Organization
    └── Campaign
        ├── Candidate(s)
        ├── Constituency
        │   ├── Zone/Block/Tehsil
        │   ├── Ward
        │   ├── Village/Locality
        │   └── Booth/Part
        ├── Households
        │   └── Voters
        ├── Team
        ├── Assignments
        ├── Interactions
        ├── Issues
        └── Election-Day Operations
```

## 2. Campaign Lifecycle

```text
DRAFT
→ SETUP
→ DATA_IMPORT
→ READY
→ ACTIVE
→ ELECTION_DAY
→ CLOSED
→ ARCHIVED
```

Transitions must be validated and audited.

## 3. Campaign Setup Wizard

### Step 1 — Campaign Identity
- name
- client/organization
- candidate
- party
- election date
- election type

### Step 2 — Geography
- state
- district
- constituency
- sub-regions
- wards
- villages/localities
- booths

### Step 3 — Planning Counts
- voters
- booths
- wards
- villages/localities
- optional multi-candidate count

### Step 4 — Operational Targets
- household coverage %
- voter contact %
- verification %
- issue closure %
- volunteer target
- booth readiness %

### Step 5 — Team
- campaign managers
- ward managers
- booth agents
- field agents

### Step 6 — Data Import
- upload roll files
- map files to geography
- extraction preview
- reconciliation

### Step 7 — Go Live
Preflight checks:
- RBAC valid
- booth structure complete
- import reconciled
- agents assigned
- policies accepted
- backup baseline created

## 4. Voter Record States

```text
IMPORTED
NORMALIZED
REVIEW_REQUIRED
VERIFIED
CORRECTED
INACTIVE
ARCHIVED
```

Never delete original source facts during routine correction. Use versioning.

## 5. Household States

```text
AI_SUGGESTED
REVIEW_REQUIRED
HUMAN_CONFIRMED
FIELD_VERIFIED
CORRECTED
```

## 6. Interaction Status

Use operational status:

```text
NOT_VISITED
ATTEMPTED
CONTACTED
NO_ONE_AVAILABLE
FOLLOW_UP_REQUIRED
DECLINED_CONTACT
DATA_CORRECTION_REQUIRED
VERIFIED
```

Do not encode inferred voting preference.

## 7. Task Types

- household visit
- voter verification
- address correction
- household correction
- issue follow-up
- booth readiness check
- volunteer check-in
- VIS desk duty
- election-day incident
