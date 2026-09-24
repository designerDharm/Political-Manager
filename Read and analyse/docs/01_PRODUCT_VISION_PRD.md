# Product Requirements Document (PRD)

## 1. Product Name

Working name: **CampaignOps AI**

## 2. Product Vision

Build a secure, responsive, AI-assisted political campaign operations platform that converts electoral-roll documents into an auditable operational database and enables campaign teams to coordinate field work, verify households, manage issues, track campaign coverage, and operate election-day logistics from a shared real-time source of truth.

## 3. Primary Outcomes

The platform should help a campaign:

- set up election and constituency structure
- import voter-roll PDFs or spreadsheets
- extract and normalize voter records
- suggest household groupings with confidence scores
- let authorized humans correct AI suggestions
- assign areas and households to agents
- record field visits and verification outcomes
- manage constituency issues and follow-ups
- show real-time campaign coverage
- operate a controlled election-day command center
- maintain strong access controls, auditability, backups, and recovery

## 4. User Roles

### Super Admin
Owns platform configuration, tenants, system health, support, backups, security controls, and feature flags.

### Campaign Admin
Creates and manages a campaign, election hierarchy, team, imports, assignments, dashboards, issues, and reports.

### Political Agent
Works only within assigned geographic/data scope. Primarily mobile/PWA experience.

## 5. Campaign Setup Fields

### Basic
- campaign name
- election name
- election year
- election date
- party name (optional)
- candidate name
- election level
- campaign status

### Election Level
- village/panchayat
- municipality/city
- district/local body
- state assembly
- parliament/national
- custom

### Geography
- country
- state
- district
- constituency
- block/tehsil
- municipality/panchayat
- ward
- village/locality
- booth/part

### Counts
- estimated registered voters
- wards
- villages/cities where applicable
- polling booths
- candidates, when a party campaign manages multiple candidates

### Goals
Use operational goals, not individual persuasion predictions:
- contact coverage target
- household verification target
- issue resolution target
- volunteer coverage target
- booth readiness target
- internal campaign planning target / safe-margin scenario

## 6. Core Functional Modules

1. Authentication & tenant management
2. Campaign setup
3. Geography & booth hierarchy
4. Electoral-roll import
5. AI extraction & normalization
6. Household suggestion & verification
7. Voter/household directory
8. Team & agent management
9. Assignments & task engine
10. Door-to-door field mode
11. Issue/request management
12. Campaign analytics
13. Maps
14. Search
15. Election-day mode
16. Notifications
17. Reports/exports
18. Audit logs
19. Backup/recovery
20. Platform administration

## 7. Explicit Non-Goals

The product must not:
- infer a voter's political preference
- generate a "vote probability" for an individual
- rank voters by persuadability
- target people based on protected/sensitive characteristics
- claim that a VIS issuance means a vote was cast
- claim that a vote was cast for a specific candidate
- bypass election law, privacy law, platform rules, or access controls

## 8. Success Metrics

Operational:
- import completion rate
- extraction accuracy after review
- household verification rate
- percentage of constituency assigned
- agent task completion
- coverage by booth/ward
- data correction turnaround
- issue resolution rate
- sync success rate
- API latency
- backup success
- security incident count

Quality:
- duplicate rate
- orphan voter rate
- household false-grouping correction rate
- OCR confidence distribution
- import reconciliation variance against source counts

## 9. Non-Functional Requirements

- responsive desktop + mobile
- PWA installability
- offline field queue
- real-time updates
- multi-tenant isolation
- horizontal scalability
- immutable audit log
- encryption at rest/in transit
- MFA for privileged users
- zero-trust authorization on every request
- deterministic database migrations
- disaster recovery
- accessibility target WCAG 2.2 AA
- localization-ready architecture
