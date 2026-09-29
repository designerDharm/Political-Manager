# RECOVERY STEP 7 — REALTIME SSE & FIELD OPERATIONS SYNCHRONIZATION AUDIT
**CampaignOps AI — Realtime Architecture & Gap Analysis**

## 1. Executive Summary
Currently, CampaignOps AI has a skeletal SSE route at `/api/v1/realtime/route.ts` that queries `AuditEvent` globally, but:
1. **Unauthenticated / No Session Gating**: It lacks session authentication (`requireAuth`), allowing any unauthenticated connection.
2. **No Campaign Isolation**: It queries `AuditEvent` globally across all campaigns and all organizations without checking `campaignId` or tenant scope.
3. **No Agent Scope Enforcement**: Political agents listening to the stream would receive audit notices from unauthorized booths or other agents.
4. **Missing Unique Event IDs & Framing**: The SSE messages use `event: mutation` with ad-hoc payloads instead of proper `id: <audit.id>`, standard `event: <action>`, and minimal payload.
5. **No Frontend Consumers**: No pages (`/campaigns/[id]/field`, `/agent`, `/agent/tasks`, `/campaigns/[id]/households/[hid]`) consume the SSE stream; changes require manual page refresh.

---

## 2. Realtime Audit Findings Matrix

| Component / Feature | Current Implementation | Requirement | Gap / Defect |
|---|---|---|---|
| SSE Endpoint | `GET /api/v1/realtime` | Authenticated, campaign-scoped stream | Unauthenticated; no campaign parameter verification; leaks global events |
| Authentication | None | Validate HTTP-only session cookie via `requireAuth` | Missing session check; allows public connection |
| Campaign Scoping | Global `prisma.auditEvent.findMany` | Scoped to requested `campaignId` with `requireCampaignAccess` | No campaign isolation; Admin A could observe Campaign B |
| Agent Booth Scoping | Not checked | Restrict Political Agents to events in assigned `boothId` | Agent receives notifications for precincts they are not assigned to |
| Event IDs & Last-Event-ID | None (No `id:` header) | Provide persistent `id: <audit.id>` and support `Last-Event-ID` on reconnect | Missed event replay and duplicate prevention not supported |
| Heartbeat Framing | Sends `event: ping\ndata: ...` every 3s | Send comment/ping frame every 15s to keep connection alive | 3s polling is overly aggressive and causes unnecessary DB hits |
| Connection Cleanup | `req.signal.addEventListener('abort')` | Clear timers, close stream on disconnect | Basic abort listener exists, needs robust error handling |
| Reusable Client Hook | None | Provide `useCampaignRealtime(campaignId, onEvent)` | Zero frontend consumers exist |
| Campaign Admin Field Console | Server component, loads on request | Live update on field visits, verified counts, and tasks | Requires manual browser reload |
| Agent Mobile Home | Server component | Live update when Admin creates/updates assignments | Requires manual reload |
| Agent Tasks View | Server component | Live update when tasks are assigned, modified, or cancelled | Requires manual reload |
| Household Detail Dossier | Client component with local state | Live update when members or visits are updated | Does not update when another agent/admin updates household |

---

## 3. Architecture for Recovery Step 7
1. **SSoT Principle**: PostgreSQL remains the Single Source of Truth. Realtime events are purely invalidation/notification signals that trigger authoritative API refetching (`event -> invalidate/refetch`).
2. **Authenticated SSE Transport**:
   - `GET /api/v1/realtime?campaignId=<id>`
   - Authenticates session via `requireAuth(req)`.
   - Validates access via `requireCampaignAccess(principal, campaignId)`.
   - Resolves Agent booth scope (`getAgentBoothScope`) to filter out-of-scope events.
3. **SSE Event Framing**:
   ```
   id: <auditEvent.id>
   event: <action>
   data: {"eventId":"...","type":"...","campaignId":"...","entityType":"...","entityId":"...","changedAt":"..."}
   ```
4. **Heartbeat**: Every 15 seconds, comment or ping frame (`: ping\n\n`) to prevent proxy timeout without triggering data reloads.
5. **Frontend Hook**: `useCampaignRealtime({ campaignId, onEvent, enabled })` with deduplication of event IDs, reconnect management, connection status (`Live`, `Reconnecting`, `Disconnected`), and debounced refetch triggers.
