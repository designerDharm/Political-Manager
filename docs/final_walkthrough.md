# Final Walkthrough — CampaignOps AI

## 1. Executive Summary
CampaignOps AI is a full-stack, responsive, multi-tenant political campaign operations platform. It adheres strictly to:
1. **Single Source of Truth (SSoT)**: All data across Super Admin, Campaign Admin, and Political Agent apps flows through dynamic database records managed by Prisma ORM.
2. **Zero Hardcoding Policy**: Configurations, labels, operational statuses, and geographic subdivisions originate dynamically from backend definitions.
3. **Strict Product Boundary / Non-Inference Policy**: The system exclusively tracks operational field signals (visited, contacted, verified, follow-up required, issue raised, VIS issued, turnout aggregate). It never infers or scores individual political preferences or persuadability.

---

## 2. Implemented Screen Inventory & Verifications

All 15 screens in the `UI:UX screens/` directory have been analyzed and built into responsive React + Next.js components:

1. **Login Page (`/login`)**:
   - Reference: `Login page.png`
   - Split layout with blue-and-orange rally hero panel ("Stronger People Stronger Democracy") and sign-in card.
   - Includes demo role-selector pills for one-click authentication as `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, or `POLITICAL_AGENT`.

2. **Super Admin Dashboard (`/super-admin`)**:
   - Reference: `Dashboard.png`
   - Dark navy sidebar (`#0B132B`), top search bar with role badge.
   - 6 Metric cards (Total Clients, Active Campaigns, Total Users, Storage Used, AI Processing Jobs, System Health).
   - Monthly activity trend line chart (Active, Completed, Scheduled).
   - Recent Activities feed with timestamps and status indicators.

3. **Campaign Setup Wizard (`/campaigns/new`)**:
   - Reference: `Campaign.png`
   - 4-step progress stepper: Basic Info, Constituency, Campaign Goals, Review.
   - Form fields: Campaign Name, Political Party, Candidate Name, Election Level (State Assembly), Year, Date, Description (character counter), and Candidate photo preview box.

4. **Voter Data Upload (`/campaigns/[id]/voters/upload`)**:
   - Reference: `Voter data.png`
   - Drag-and-drop file upload zone (PDF, Scanned PDF, CSV, Excel).
   - Upload file queue with live status chips (`Processing` with spinner, `Queued`, `Pending`), file sizes, and clear actions.

5. **AI Processed Voter Directory (`/campaigns/[id]/voters`)**:
   - Reference: `Voter data _ voter list.png`
   - Breadcrumb navigation, Ward 12 selector.
   - 3 Summary cards with circular 100% processed indicator.
   - Search bar, gender segmentation filters (`All`, `Male`, `Female`, `Others`), filter button.
   - Tabular directory with serials, names, ages, EPIC numbers, household IDs (`H-001`), and status badges.

6. **Household Detail (`/campaigns/[id]/households/[hid]`)**:
   - Reference: `Voter data _.png`
   - Header with verification status and AI confidence badge (`91%`).
   - Primary Contact card with head of household details and normalized address.
   - Member roster with familial roles (`Head`, `Spouse`, `Son`, `Daughter`).
   - Action buttons: `Edit Household`, `Move Voter`, `Add Note`.
   - Interaction history timeline.

7. **Political Agent Mobile Home (`/agent`)**:
   - Reference: `dashboard _ Mobile view.png`
   - Mobile-first layout with greeting and date.
   - Today's Assigned Area card (`Ward 12 • Booth 118`).
   - 3 Quick metric chips (Households: 124, Completed: 67, Pending: 57).
   - Prominent `Start Visit` primary action button.
   - Today's Tasks list and fixed bottom navigation (Home, Tasks, Search, Map, Profile).

8. **Mobile Household Visit & Check-in (`/agent/visit/[hid]`)**:
   - Reference: `e69b1194-f2eb-4e85-9553-935a39c31df0.png`
   - Household card with AI confidence chip.
   - Interactive member checklist with "Select All" toggle.
   - Radio buttons for operational visit statuses (`Visited`, `No One Available`, `Follow-up Required`, `Do Not Contact / Declined`).
   - Bottom action bar with `Add Note` and `Save`.

9. **Campaign Admin Mobile View (`/campaigns/[id]`)**:
   - Reference: `ce06c285-d1e1-4a2d-a559-9a5eb357fb22.png`
   - 67% Household completion progress bar.
   - Quick action grid for field navigation.

10. **Team Management & Agent Assignment (`/campaigns/[id]/team`)**:
    - Reference: `1ee65c9e-e416-4965-8287-43d031225e0a.png`
    - Metric cards for Admins, Booth Managers, and Agents.
    - Team member directory with role badges and active statuses.
    - Right-side panel for assigning areas (Ward, Booth, Households) to field agents.

11. **Issue Management & Resolution (`/campaigns/[id]/issues`)**:
    - Reference: `c19c3e78-7ee8-4b10-a5dd-96dcfdfd5d6b.png`
    - 4 Metric cards (Total, Open, Resolved, High Priority).
    - Category and status filters with search.
    - Ticket list and right-hand issue detail drawer with timeline, notes, and quick resolution buttons.

12. **Ward & Booth Coverage Map (`/campaigns/[id]/map`)**:
    - Reference: `cc6de557-fe85-429e-8638-44bb00954025.png`
    - Interactive SVG GIS map with polygonal booths (101-118) colored by operational progress (`Not Visited`, `Partial`, `Good`, `Completed`).
    - Right panel with booth search and individual coverage progress bars.

13. **Campaign Analytics & Insights (`/campaigns/[id]/analytics`)**:
    - Reference: `fa401604-1cfb-44f4-bc6a-d7936fb35e57.png`
    - Ward-wise coverage bar charts.
    - Daily booth completion trend curves.
    - AI-generated key operational insights cards.

14. **Election Day — Live Monitoring (`/campaigns/[id]/election-day`)**:
    - Reference: `2ab5a2d0-912a-478a-ab7d-66285c875371.png`
    - Semi-circular turnout gauge (63.0%).
    - Hourly turnout bar chart (7 AM - 6 PM).
    - System status indicators and incident tally.
    - Live booth status checklist table.

15. **Voter Information Slip Issuance (`/campaigns/[id]/vis`)**:
    - Reference: `cdfd46f4-e4e8-4e6f-b65b-51609ca9b751.png`
    - Multi-mode search (`By Name`, `By EPIC`, `By House No.`, `By Mobile`).
    - Selected voter card with polling station details.
    - One-click VIS generation, assistance marking, and issuance history log.

---

## 3. How to Run Locally

```bash
# 1. Install dependencies
pnpm install

# 2. Synchronize database schema and generate Prisma client
pnpm prisma:push

# 3. Seed synthetic demo database
pnpm prisma:seed

# 4. Build and start application
pnpm build
pnpm start
# Open http://localhost:3000 in your browser
```
