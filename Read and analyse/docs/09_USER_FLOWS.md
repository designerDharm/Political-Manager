# User Flows

## Flow A — Super Admin Onboards Client

```text
Login + MFA
→ Organizations
→ Create Organization
→ Create Initial Campaign Admin
→ Assign plan/features
→ Send activation
→ Audit log
```

## Flow B — Campaign Setup

```text
Campaign Admin Login
→ Create Campaign
→ Election Details
→ Geography
→ Targets
→ Team
→ Import
→ Preflight
→ Activate
```

## Flow C — Electoral Roll Import

```text
Import Center
→ Select Booth/Part
→ Upload PDF
→ Validation
→ OCR/AI Processing
→ Structured Preview
→ Reconciliation
→ Review Low Confidence
→ Review Household Suggestions
→ Publish
```

## Flow D — Agent Assignment

```text
Team
→ Select Agent
→ Choose Ward/Booth/Household Range
→ Set Task Type
→ Assign
→ Agent receives notification
→ Appears in mobile task list
```

## Flow E — Door-to-Door Visit

```text
Open Today
→ Select Task
→ Household
→ Review Members
→ Record Contact Outcome
→ Correct Data if Needed
→ Add Issue/Follow-up
→ Save
→ Realtime dashboard refresh
```

## Flow F — Household Correction

```text
Open Household
→ Edit Members
→ Move/Add/Remove Membership Link
→ Select Reason
→ Confirm
→ Version check
→ Save Correction Event
→ Audit
```

Original voter source record remains intact.

## Flow G — Issue

```text
Household/Voter
→ Add Issue
→ Category
→ Description
→ Priority
→ Optional attachment
→ Assign
→ Status updates
→ Resolution
```

## Flow H — Election Day VIS

```text
VIS Desk
→ Search
→ Confirm identity against permitted data
→ Show booth/polling info
→ Issue VIS
→ Record VIS event
```

Do not mark "voted for us."

## Flow I — Offline

```text
Network unavailable
→ app shows OFFLINE
→ worker completes permitted tasks
→ mutation queued
→ network restored
→ sync
→ version conflicts reviewed
```

## Flow J — Backup Restore

```text
Super Admin
→ Backups
→ Select Restore Point
→ Re-authenticate MFA
→ Impact Preview
→ Enter confirmation phrase
→ Execute controlled restore
→ Verification
→ Security + audit event
```
