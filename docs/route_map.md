# Application Route Map — CampaignOps AI

| URL Route | Role Required | Screen Name | Screen Reference | Description |
|---|---|---|---|---|
| `/login` | Public | Login Screen | `Login page.png` | Email/phone & password login, remember me, OAuth shortcuts, tenant discovery. |
| `/super-admin` | `SUPER_ADMIN` | Platform Overview Dashboard | `Dashboard.png` | Global platform metrics, client count, active campaigns, AI jobs, system health, recent platform activities. |
| `/super-admin/organizations` | `SUPER_ADMIN` | Organizations Management | Specification | List and onboard political client organizations and parties. |
| `/super-admin/campaigns` | `SUPER_ADMIN` | Global Campaigns Directory | Specification | Oversee all active and archived campaigns. |
| `/super-admin/users` | `SUPER_ADMIN` | Global Users & Access | Specification | Platform-wide user management, sessions, MFA enforcement. |
| `/super-admin/ai-jobs` | `SUPER_ADMIN` | AI Processing Pipeline | Specification | Queue monitor for OCR, text extraction, household inference runs. |
| `/super-admin/system-logs` | `SUPER_ADMIN` | System Audit Logs | Specification | Immutable audit trail of administrative actions. |
| `/super-admin/backups` | `SUPER_ADMIN` | Backup & Recovery | Specification | Automated backups, restore drills, snapshot storage status. |
| `/super-admin/security` | `SUPER_ADMIN` | Security Controls | Specification | Global security parameters, failed login rate limits, IP policies. |
| `/super-admin/settings` | `SUPER_ADMIN` | Platform Settings | Specification | Remote config, feature flags, storage keys. |
| `/campaigns` | `CAMPAIGN_ADMIN` | Campaign Switcher / Directory | Specification | List user's accessible campaigns. |
| `/campaigns/new` | `CAMPAIGN_ADMIN` | Create Campaign Wizard | `Campaign.png` | 4-step wizard: Basic info, Candidate details, Geography, Operational goals, Review & Activate. |
| `/campaigns/[id]` | `CAMPAIGN_ADMIN` | Campaign Admin Dashboard | `ce06c285-d1e1-4a2d-a559-9a5eb357fb22.png` | Main campaign control dashboard (desktop + mobile adaptive). |
| `/campaigns/[id]/voters/upload` | `CAMPAIGN_ADMIN` | Voter Data Upload | `Voter data.png` | Electoral roll file upload (PDF/Excel), parsing queue, review steps. |
| `/campaigns/[id]/voters` | `CAMPAIGN_ADMIN` | AI Processed Voter List | `Voter data _ voter list.png` | Searchable, filterable voter list by Ward/Booth with household IDs and status. |
| `/campaigns/[id]/households/[hid]` | `CAMPAIGN_ADMIN` | Household Detail | `Voter data _.png` | Member roster, primary contact, AI confidence, human verification, timeline. |
| `/campaigns/[id]/vis` | `CAMPAIGN_ADMIN` / `AGENT` | Voter Information Slip (VIS) | `cdfd46f4-e4e8-4e6f-b65b-51609ca9b751.png` | Search voter by Name/EPIC/House/Mobile, issue VIS slips, print slips, log assistance. |
| `/campaigns/[id]/team` | `CAMPAIGN_ADMIN` | Team Management & Assignment | `1ee65c9e-e416-4965-8287-43d031225e0a.png` | Member list, roles, area assignment form (Ward/Booth/Households), active status. |
| `/campaigns/[id]/issues` | `CAMPAIGN_ADMIN` | Issue Management | `c19c3e78-7ee8-4b10-a5dd-96dcfdfd5d6b.png` | Category-based issue tracking, assignee, household link, follow-up timeline. |
| `/campaigns/[id]/map` | `CAMPAIGN_ADMIN` | Ward & Booth Coverage Map | `cc6de557-fe85-429e-8638-44bb00954025.png` | Interactive GIS coverage map, booth status list, operational progress visualization. |
| `/campaigns/[id]/analytics` | `CAMPAIGN_ADMIN` | Campaign Analytics & Insights | `fa401604-1cfb-44f4-bc6a-d7936fb35e57.png` | Ward-wise charts, completion trends, issue breakdown, agent productivity, AI insights. |
| `/campaigns/[id]/election-day` | `CAMPAIGN_ADMIN` | Election Day Live Monitoring | `2ab5a2d0-912a-478a-ab7d-66285c875371.png` | Real-time turnout gauge, hourly bars, booth checklist, agent check-ins, incidents. |
| `/campaigns/[id]/reports` | `CAMPAIGN_ADMIN` | Operational Reports & Exports | Specification | Exportable coverage, booth-level readiness, and issue resolution summaries. |
| `/campaigns/[id]/settings` | `CAMPAIGN_ADMIN` | Campaign Configuration | Specification | Tenant settings, custom categories, operational targets. |
| `/agent` | `POLITICAL_AGENT` | Mobile Agent Home | `dashboard _ Mobile view.png` | Today's assigned area (Ward/Booth), quick stats, "Start Visit" CTA, today's tasks. |
| `/agent/tasks` | `POLITICAL_AGENT` | Agent Task Directory | `dashboard _ Mobile view.png` | List of assigned household ranges and follow-up visits. |
| `/agent/visit/[hid]` | `POLITICAL_AGENT` | Household Visit & Check-in | `e69b1194-f2eb-4e85-9553-935a39c31df0.png` | Member checklist, operational visit statuses, notes, offline queue support. |
| `/agent/search` | `POLITICAL_AGENT` | Rapid Voter Lookup | Specification | Quick search for field inquiries by name or serial. |
| `/agent/map` | `POLITICAL_AGENT` | Mobile Area Map | Specification | Mobile-optimized route and booth boundaries. |
| `/agent/profile` | `POLITICAL_AGENT` | Agent Profile & Sync Status | Specification | Device sync status, pending mutations queue, logout. |
