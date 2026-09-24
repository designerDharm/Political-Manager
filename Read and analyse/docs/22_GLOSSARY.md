# Glossary

**SSoT** — Single Source of Truth.

**Campaign** — Tenant-scoped election operation.

**Campaign Admin** — Authorized client/candidate/campaign manager.

**Political Agent** — Field worker with limited assignment-scoped access.

**Booth/Part** — Polling/electoral-roll subdivision configured for the campaign.

**Voter Source Snapshot** — Immutable record of extracted source values.

**Normalized Voter** — Structured operational record derived from source.

**Verified Correction** — Human-confirmed correction preserved separately from source.

**Household Suggestion** — AI/rule-based proposed grouping, not authoritative fact.

**Primary Household Contact** — Operational contact selected by authorized human; not assumed legal "family head."

**VIS** — Voter Information Slip / voter assistance slip event tracked operationally.

**Transactional Outbox** — DB pattern ensuring events are published only after successful domain transaction.

**Optimistic Locking** — Version comparison used to prevent silent overwrite.

**Idempotency** — Same operation can be retried without unintended duplicate effect.

**Break-Glass Access** — Temporary, audited privileged access for exceptional support/security needs.

**PWA** — Progressive Web App.

**RPO** — Recovery Point Objective.

**RTO** — Recovery Time Objective.
