# Election-Day Mode

## 1. Purpose

Provide operational coordination without claiming knowledge of a person's secret ballot choice.

## 2. Activation

Campaign status transitions to `ELECTION_DAY` through:
- scheduled date/time + admin confirmation, or
- manual authorized action

Freeze risky configuration changes.

## 3. Control Room Dashboard

- total booths
- booth readiness
- active agents
- agent check-ins
- VIS requests
- VIS issued
- incidents open
- aggregate turnout snapshots from permitted sources
- system health
- sync health

## 4. VIS Module

Search:
- name
- electoral serial
- house number
- permitted voter reference

Result:
- name
- booth
- serial
- polling station information if configured

Actions:
- VIS requested
- VIS issued
- reprint
- unable to locate

Do not include:
- "voted for us"
- inferred ballot choice
- claimed party vote count from VIS activity

## 5. Turnout

Store official or manually entered **aggregate** turnout snapshots per booth/time.

Fields:
```text
booth
reported_total
reported_at
source
entered_by
verification_status
```

Keep campaign operational metrics separate from official turnout.

## 6. Incidents

Categories:
- logistics
- volunteer absence
- technology
- queue/help desk
- data mismatch
- other lawful campaign operational category

Severity:
- low
- medium
- high
- critical

## 7. High Load

Election day requires:
- prewarming
- autoscaling
- read replicas if necessary
- cache for non-sensitive aggregates
- queue backpressure
- graceful degradation
- load testing at expected peak x2

## 8. Offline

VIS issuance offline should be disabled unless product has robust duplicate prevention and legal/operational approval. Prefer online verification for election-day identity lookup.

## 9. Post Election

At campaign close:
- stop field edits
- export permitted operational reports
- retain according to policy
- archive
- revoke temporary accounts
