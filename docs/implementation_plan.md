# Implementation Plan — CampaignOps AI

## 1. Architecture Overview
- **Workspace Architecture**: Modern pnpm monorepo containing:
  - `apps/web`: Next.js 14+ (App Router) + React + TypeScript + Tailwind CSS. Provides unified responsive application:
    - Super Admin Portal
    - Campaign Admin Control Center
    - Political Agent Mobile Field PWA
  - `apps/api`: NestJS or Next.js integrated API routes with Prisma ORM and SQLite/PostgreSQL driver support.
  - `packages/ui`: Shared design system components, icons, badges, charts, modal shells.
  - `packages/types`: Shared domain interfaces, Enums, DTOs, API contracts.
  - `packages/validation`: Zod schemas for validation across client and server.
- **Single Source of Truth**: Relational database (PostgreSQL with fallback to local SQLite for isolated execution when external ports are restricted).
- **Zero Hardcoding**: All labels, status categories, and dynamic UI data originate from backend API and dynamic database models.

---

## 2. Phased Development Roadmap

### Phase 0: Workspace & Foundation Setup
- Initialize root `package.json`, pnpm workspace config, and turbo/nx or direct script links.
- Create packages (`types`, `validation`, `ui`) and apps (`web`).
- Configure Tailwind CSS with precise design tokens extracted from UI screenshots:
  - Navy sidebar: `#0F172A` / `#0A1128`
  - Primary blue: `#2563EB` / `#1D4ED8`
  - Neutral surfaces: `#F8FAFC` background, `#FFFFFF` cards, `#E2E8F0` borders
  - Status tokens: Green `#10B981`, Yellow `#F59E0B`, Red `#EF4444`, Cyan `#06B6D4`
- Set up Prisma schema matching `Read and analyse/docs/05_DATABASE_SCHEMA.md` with:
  - Users, Organizations, Campaigns, Campaign Memberships
  - Geography: Constituencies, Wards, Booths
  - Voters, VoterSourceSnapshots, VoterCorrections
  - Households, HouseholdMembers
  - Assignments, Interactions, Issues, IssueEvents
  - VIS events, Turnout snapshots, Audit events
- Implement comprehensive synthetic seed generator producing realistic demo data for immediate end-to-end verification.

### Phase 1: Authentication, Tenancy & RBAC
- Auth session management with credentials and demo shortcuts (`SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT`).
- Tenant resolution and scoped access control.
- Role-based route guards and permission checks.

### Phase 2: Design System & Core UI Shells
- Core layout components:
  - `AppShell`, `AdminSidebar`, `TopHeader` with notifications and profile dropdown.
  - `MobileHeader`, `MobileBottomNavigation` for field agents.
  - Stat cards, data tables, filter bars, search inputs, badges, progress rings.
- Login screen matching `Login page.png` with visual rally panel and sign-in card.

### Phase 3: Super Admin & Campaign Admin Dashboards
- Super Admin Platform Overview matching `Dashboard.png` (clients, active campaigns, users, storage, line chart, activity feed).
- Campaign Admin Dashboard matching `ce06c285-d1e1-4a2d-a559-9a5eb357fb22.png` and desktop view.
- Campaign Creation Wizard matching `Campaign.png` with 4-step progress stepper and photo uploader.

### Phase 4: Voter Roll Import & AI Processing Pipeline
- Voter Data Upload screen matching `Voter data.png` with drag-and-drop queue, status indicators, and progress tracker.
- Mockable/Pluggable extraction pipeline producing structured voter entities from uploaded files.
- Immutable source snapshot preservation and anomaly reconciliation.

### Phase 5 & 6: Voter Directory & Household Grouping
- AI Processed Voter List matching `Voter data _ voter list.png` (Ward selector, summary metrics, gender filters, data table, pagination).
- Household Detail view matching `Voter data _.png` (House metadata, AI confidence badge, primary contact, member roster with family roles, interaction timeline, edit and move actions).

### Phase 7 & 9: Political Agent Field App & Offline Mode
- Mobile Home Dashboard matching `dashboard _ Mobile view.png` (Today's area, statistics, Start Visit CTA, task list, bottom navigation).
- Mobile Household Visit screen matching `e69b1194-f2eb-4e85-9553-935a39c31df0.png` (Member checklist, visit status radio buttons, notes, offline queue with IndexedDB synchronization).

### Phase 10: Team Management & Area Assignment
- Team Management screen matching `1ee65c9e-e416-4965-8287-43d031225e0a.png` (Member list, role filters, right assignment panel for Ward/Booth/Household scoping).

### Phase 11 & 12: Issue Management & Geospatial Coverage Map
- Issue Management dashboard matching `c19c3e78-7ee8-4b10-a5dd-96dcfdfd5d6b.png` (Category cards, status filters, ticket list, detail drawer with timeline, follow-up scheduler).
- Ward & Booth Coverage Map matching `cc6de557-fe85-429e-8638-44bb00954025.png` (SVG/Canvas/MapLibre polygon map of booths colored by operational coverage, booth list panel).

### Phase 13 & 14: Analytics & AI Assistant
- Campaign Analytics dashboard matching `fa401604-1cfb-44f4-bc6a-d7936fb35e57.png` (Ward-wise coverage bars, completion trend, issue donut chart, team performance ranking, AI key insights cards).
- Aggregated question answering engine strictly adhering to political non-inference rules.

### Phase 15: Election Day Command Center & VIS Issuance
- Live Monitoring dashboard matching `2ab5a2d0-912a-478a-ab7d-66285c875371.png` (Turnout semi-circle gauge, hourly bars, booth readiness table, incidents summary).
- VIS Issuance module matching `cdfd46f4-e4e8-4e6f-b65b-51609ca9b751.png` (Search voter, print slip modal, log issuance and assistance).

### Phase 16 to 20: Reports, Security, Audit & Verification
- Export generator for coverage and booth readiness.
- Audit logging for all actions.
- Full browser verification and responsive testing at standard viewports (390px, 768px, 1440px).
