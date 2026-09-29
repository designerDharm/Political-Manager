# CURRENT FEATURE FLOW MATRIX
**Audit Date:** 2026-09-28  

| Core Workflow | User Journey Flow | Frontend Status | Backend Status | Database Status | Overall Status | Blocking Causes |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Authentication & Session** | Form submission -> API -> Hash verify -> Cookie -> Route redirection | PARTIAL | WORKING | WORKING | **PARTIAL** | Login UI form uses client-side routing; needs fetch to `/api/v1/auth/login`. |
| **Super Admin Platform Ops** | View tenants, users, system settings, audit logs, political parties | WORKING | WORKING | WORKING | **WORKING** | None. Fully wired to PostgreSQL. |
| **Political Party & Symbols** | Create party, specify symbol, select Independent Candidate | WORKING | WORKING | WORKING | **WORKING** | None. Super Admin managed with live DB link. |
| **Campaign Provisioning** | Multi-level election selection, party choice, create campaign | WORKING | WORKING | WORKING | **WORKING** | None. Persists to Postgres `Campaign`. |
| **Voter Roll AI Review** | View extracted voters, resolve low confidence, resolve dupes, publish SSoT | WORKING | WORKING | WORKING | **WORKING** | Reads & writes to Postgres `Voter`, `Household`, `Ward`, `Booth`. |
| **Voter Directory & Pagination** | Search by name/EPIC/house, filter by gender, paginate 10/25/50/100, edit/delete | WORKING | WORKING | WORKING | **WORKING** | Fully responsive, reactive, and persistent in Postgres. |
| **Household Dossier & Notes** | View members, relations, add field visit notes, native print trigger | WORKING | WORKING | WORKING | **WORKING** | Fully interactive client component linked to DB. |
| **Agent Mobile Tasks** | View assigned booth/ward tasks, navigate to household, record field visit | WORKING | WORKING | WORKING | **WORKING** | Reads from `Assignment`, records to `Interaction`. |
| **Community Issues** | File grievance, assign priority, track status, update notes | WORKING | WORKING | WORKING | **WORKING** | Real-time CRUD on Postgres `Issue` table. |
| **Governed AI Analytics** | Operational inquiries, turnout review, strict non-inference guardrail block | WORKING | WORKING | WORKING | **WORKING** | Rejects persuasion/caste queries; aggregates Postgres data. |
| **Election Day & VIS** | View hourly turnout, record polling snapshots, issue non-partisan VIS | WORKING | WORKING | WORKING | **WORKING** | Independent metrics; decoupled from ballot choices. |
| **Voter Roll PDF OCR Engine** | Upload raw PDF, extract tabular columns via OCR engine, parse voter blocks | PROTOTYPE | MOCK | N/A | **PROTOTYPE** | `/api/v1/imports` returns synthetic metadata; no real OCR worker connected. |
| **GIS Boundary Maps** | Interactive booth/ward polygons, heatmaps, route planning | PROTOTYPE | N/A | N/A | **PROTOTYPE** | Static SVG mockups; no PostGIS GeoJSON endpoints queried. |
| **Offline IndexedDB Sync** | Agent offline data entry, offline mutation queue, auto-reconnect sync | PROTOTYPE | WORKING | WORKING | **PARTIAL** | `/api/v1/sync` works, but frontend client lacks offline queue worker. |
