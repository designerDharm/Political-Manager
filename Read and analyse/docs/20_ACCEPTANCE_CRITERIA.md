# Acceptance Criteria

## Authentication
- privileged roles require MFA
- revoked sessions stop working
- cross-tenant requests return denied/not-found safely

## Campaign Setup
- admin can create campaign
- hierarchy validates ownership
- activation blocked when required setup incomplete

## Import
- original file stored privately
- duplicate upload detected
- extraction result schema validated
- low-confidence items reviewed
- source record remains immutable
- reconciliation shown

## Households
- suggested grouping has confidence
- human can correct
- correction is audited
- source voter data not destroyed

## Agent
- sees only assigned scope
- can complete visit
- can create issue/follow-up
- dashboard updates near realtime

## Offline
- queued mutation visibly marked
- duplicate retry is idempotent
- conflict is not silently overwritten
- revoked permission rejects queued sync

## Election Day
- VIS event recorded
- booth lookup works
- no "voted for us" state
- turnout is aggregate
- incidents tracked

## Security
- no secrets in repo
- no public voter file URLs
- export audited
- backup encrypted
- restore MFA protected

## AI
- structured outputs
- provider abstraction
- no direct DB authority
- no individual political preference prediction
- prohibited analytics queries rejected

## UX
- mobile usable at 360px
- desktop usable at 1440px
- loading/error/empty states
- keyboard accessible admin UI
