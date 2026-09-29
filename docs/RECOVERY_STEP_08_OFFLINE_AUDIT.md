# RECOVERY STEP 8 — OFFLINE & PWA IMPLEMENTATION AUDIT
**Project:** CampaignOps AI  
**Date:** 2026-09-29  
**Target:** Political Agent Offline Field Operations & Safe PostgreSQL Synchronization

---

## 1. Audit Summary Table

| Component | Current State | Real / Stub / Missing | Risk | Required Changes |
| :--- | :--- | :--- | :--- | :--- |
| **Web App Manifest** | None | **Missing** | App not installable as PWA on mobile browsers | Create `public/manifest.json` with brand icons, standalone display mode, and link in root `layout.tsx` |
| **Service Worker** | None | **Missing** | Network loss yields blank browser error; static assets & app shell not cached | Implement `public/sw.js` with Cache-First for static assets, Stale-While-Revalidate for app shell, and register in client |
| **IndexedDB Store** | None | **Missing** | Field actions cannot be performed without continuous internet connection | Build type-safe IndexedDB wrapper (`src/lib/offline/db.ts`) with versioned stores: `metadata`, `assignments`, `tasks`, `households`, `voters`, `pendingMutations`, `syncResults` |
| **Sync Endpoint (`/api/v1/sync`)** | Exists, accepts mutation batch | **Real (Partial)** | Lacks idempotency store, missing transaction isolation, and lacks `AuditEvent` generation | Enhance `/api/v1/sync` to check for processed `mutationId`, enforce RBAC/booth-scope revalidation, execute atomic transactions, bump version, and emit `AuditEvent` for Step 7 SSE propagation |
| **Client Sync Queue** | None | **Missing** | No local queuing mechanism, no automatic flush on reconnect | Implement `src/lib/offline/syncManager.ts` managing stable `mutationId`, `deviceId`, auto-sync on `online` event, and manual sync trigger |
| **Offline Visit UI** | Calls `fetch('/api/v1/households/[hid]')` immediately | **Online Only** | Fails with network error when offline; throws unhandled exception | Update `src/app/agent/visit/[hid]/page.tsx` to read cached household when offline, enqueue mutation in IndexedDB, show "Saved on device / Pending Sync" |
| **Offline Tasks UI** | Server component rendering directly from Prisma | **Online Only** | Cannot render offline after page refresh or app restart | Create client component wrapper with IndexedDB fallback when offline |
| **Offline Search** | Calls `/api/v1/voters?q=...` | **Online Only** | Search fails completely when disconnected | Add client-side IndexedDB query fallback over authorized cached records (Name, EPIC, House #) |
| **Pending Sync Badge** | Static or missing | **Missing** | Agent cannot see whether field visits are saved to server or pending local sync | Add responsive, persistent sync status indicator (`Online`, `Offline`, `Pending Sync: N`, `Syncing`, `Sync Failed`) |
| **Session & Logout Safety** | No clear-cache or queue protection | **Missing** | Unsynced work could be lost on logout, or sensitive voter data could remain cached | Implement queue warning on logout, clear non-pending cached data on confirmed logout |

---

## 2. Source of Truth & Zero Hardcoding Guarantee

1. **PostgreSQL as Single Source of Truth**: IndexedDB stores are strictly a localized operational cache. They do not constitute final authority.
2. **Re-Authorization on Sync**: The server does NOT trust client authorization snapshots. Upon receiving queued mutations, `/api/v1/sync` re-verifies session validity, active campaign membership, and assigned polling booth scope.
3. **Optimistic Versioning & Concurrency**: Each mutation carries `baseVersion`. If an admin has altered the entity concurrently, the mutation is flagged as `CONFLICT` rather than silently overwriting server data.
4. **Append-Only Interactions**: Door-to-door visits create new `Interaction` rows, preventing destructive overwrite of field logs.
