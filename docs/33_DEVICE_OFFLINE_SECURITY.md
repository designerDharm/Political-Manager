# Device & Offline Security Architecture — CampaignOps AI

## 1. Principles of Field Device Protection
1. **Scope Minimization**: Field devices only cache data strictly within the agent's assigned geographic boundary (e.g. Ward 12, Booth 118). Never download entire constituency datasets.
2. **Short TTL**: Cached offline voter rolls expire automatically after a configurable time window (e.g., 24 hours) requiring re-authentication.
3. **Remote Revocation**: If a device is reported lost or an agent's campaign membership is revoked, the server invalidates the session immediately and rejects all pending queued mutations upon reconnect.

---

## 2. Sync Conflict Detection & Resolution

To avoid blind Last-Write-Wins (LWW) data corruption:
- Each mutable domain entity (Household, Voter, Interaction) includes a `version: Int` counter.
- When an offline agent commits an update, the payload includes `baseVersion`.
- If `serverVersion > baseVersion`, a **Sync Conflict** is triggered.
- Permitted non-critical operational updates (e.g., adding an extra visit note) can auto-merge.
- Structural changes (e.g. household split, moving voter) trigger the **Sync Conflict UI**, presenting a side-by-side diff between the server state and offline mutation.
