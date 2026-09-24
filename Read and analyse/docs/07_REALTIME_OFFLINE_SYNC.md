# Realtime & Offline Sync

## 1. Goal

All authorized users should see operational changes quickly while preserving PostgreSQL as the final source of truth.

## 2. Realtime Event Pattern

Use transactional outbox:

```text
API mutation
→ DB transaction
   → write domain change
   → write outbox event
→ commit
→ dispatcher publishes
→ websocket clients receive
```

Example event:
```json
{
  "type": "HOUSEHOLD_VISIT_UPDATED",
  "campaignId": "...",
  "scope": {"boothId": "..."},
  "entityId": "...",
  "version": 18,
  "occurredAt": "..."
}
```

Never include unnecessary personal data in websocket payloads.

## 3. Client Cache

Use query cache for performance, but server remains authoritative.

On realtime event:
- invalidate relevant query
- refetch
- do not blindly trust event payload as complete state

## 4. Offline PWA

Agent can continue:
- open downloaded assigned task list
- mark visit outcome
- add correction
- create issue
- queue follow-up

Local data:
- minimum necessary
- encrypted where platform support permits
- scoped to current assignments
- short TTL
- remote logout revokes future sync

## 5. Offline Mutation Envelope

```json
{
  "mutationId": "uuid",
  "deviceId": "uuid",
  "userId": "uuid",
  "entityType": "household",
  "entityId": "uuid",
  "baseVersion": 17,
  "operation": "UPDATE_VISIT_STATUS",
  "payload": {},
  "clientOccurredAt": "...",
  "queuedAt": "..."
}
```

## 6. Conflict Resolution

Server compares `baseVersion`.

Cases:
- version same → apply
- non-overlapping fields → safe merge if policy allows
- conflicting fields → conflict queue
- permission changed → reject
- assignment revoked → reject

Never "last write wins" for critical voter/household corrections.

## 7. Time

Store:
- server_received_at
- client_occurred_at
- device clock offset if known

Audit uses server time as authority.

## 8. Sync UX

States:
- Synced
- Saving
- Offline — queued
- Syncing
- Conflict needs review
- Rejected due to access change

Agent must never think data is saved when it is only local.
