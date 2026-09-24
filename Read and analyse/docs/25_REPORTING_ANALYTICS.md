# Reporting & Analytics Specification

## 1. Principles

Analytics should answer operational management questions, not predict individual political behavior.

## 2. Metrics

### Coverage
- households total
- assigned
- attempted
- contacted
- verified
- follow-up
- completion %

### Voters
- imported
- verified
- correction pending
- source anomaly count

### Agents
- active
- checked in
- assigned tasks
- completed tasks
- overdue tasks

### Issues
- created
- open
- resolved
- resolution time
- category distribution

### Import Quality
- records/page
- confidence
- rejected
- duplicate candidates
- reconciliation variance

### Election Day
- booths ready
- agents checked in
- VIS requested/issued
- incidents
- aggregate turnout snapshots

## 3. Breakdown Dimensions

- constituency
- ward
- village/locality
- booth
- time
- assignment team

## 4. Natural Language Examples

Allowed:
- "Show wards with lowest verification coverage."
- "Which booths have the most pending follow-ups?"
- "Summarize top issue categories this week."

Reject:
- "List voters most likely to support us."
- "Which demographic should we persuade?"
