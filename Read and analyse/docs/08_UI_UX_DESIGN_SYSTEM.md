# UI/UX & Responsive Design System

## 1. UX Strategy

Two different density modes:

### Campaign Admin Desktop
- data-rich
- filters
- maps
- charts
- split panels
- bulk operations
- command-center feel

### Political Agent Mobile
- task-first
- large tap targets
- minimal typing
- offline-safe
- clear sync state
- location/booth context always visible

## 2. Breakpoints

```text
mobile: 320–767
tablet: 768–1199
desktop: 1200+
wide: 1440+
```

## 3. Navigation

### Campaign Admin
```text
Dashboard
Campaign
Voters
Households
Map
Booths
Team
Assignments
Issues
Analytics
Election Day
Reports
Settings
```

### Agent Mobile
```text
Home
Tasks
Search
Map
Updates
Profile
```

## 4. Key Screens

### Super Admin
- platform overview
- organizations
- campaigns
- security
- backups
- AI/job health
- support/break-glass
- feature flags

### Campaign Admin
- setup wizard
- import center
- voter directory
- household review
- team
- assignment planner
- coverage dashboard
- issues dashboard
- booth dashboard
- election-day control room
- reports
- audit

### Agent
- today
- assigned areas
- household list
- household detail
- voter detail
- correction flow
- issue form
- follow-up
- sync center
- election-day VIS lookup if permitted

## 5. Dashboard KPIs

Operational only:
- total voters
- total households
- imported/verified
- assigned households
- contacted
- follow-up required
- issues open/resolved
- active agents
- coverage %
- booths ready

## 6. Tables

Must support:
- sticky header
- column preferences
- server pagination
- filters
- search
- export only when permitted
- mobile card transformation

## 7. Household Card

```text
[Household ID]
Address
Registered voters: 4
Verification: Field Verified
Last visit: 2 days ago
Assigned agent: ...
[Open]
```

## 8. Household Detail

Sections:
- summary
- members
- source data
- verified corrections
- interactions
- issues
- tasks
- audit history

## 9. Import UX

Wizard:
1. choose geography
2. upload file
3. processing
4. extraction summary
5. review anomalies
6. household suggestions
7. reconciliation
8. publish

## 10. Accessibility

- WCAG 2.2 AA target
- keyboard navigation
- focus indicators
- semantic headings
- no color-only status
- 44px mobile touch target
- screen-reader labels
- high contrast for outdoor field use

## 11. Visual Language

Recommended:
- neutral professional base
- one primary brand accent
- semantic status colors
- no visually manipulative political persuasion patterns
- dense charts balanced with whitespace
- map legends explicit

## 12. Motion

Use motion for:
- state transitions
- successful save/sync
- panel navigation
- progress indication

Avoid distracting animation in field workflows.
