# RECOVERY STEP 12 — SECURITY CONTROLS SPECIFICATION

**Document Date:** September 29, 2026  
**Status:** PRODUCTION HARDENED  

---

## 1. Authentication & Session Architecture

1. **Stateful PostgreSQL Sessions:** Session identifiers are cryptographically generated (32 bytes entropy), SHA-256 hashed, and stored in the PostgreSQL `Session` table with `expiresAt` (24h TTL) and `revokedAt`.
2. **HttpOnly Cookie Delivery:** Session tokens are delivered solely via `campaignops_session` cookie configured with `HttpOnly; SameSite=Lax; Path=/` and `Secure` in production environments. Tokens are never stored in client `localStorage`.
3. **Immediate Revocation on Logout:** Calling `POST /api/v1/auth/logout` sets `revokedAt` in PostgreSQL and overwrites cookie with `Max-Age=0`. Old tokens are rejected immediately with `401 Unauthorized`.
4. **Active Account Verification:** Every authenticated request checks `user.status === 'ACTIVE'` and `user.lockedUntil`. Deactivated users are blocked in real-time.

---

## 2. Password Security & Brute Force Defense

1. **Hashing Algorithm:** Uses Node.js native `crypto.scrypt` with a 16-byte random salt and recommended parameters (64-byte key length).
2. **Timing-Safe Verification:** Password verification uses `crypto.timingSafeEqual` to prevent timing side-channel attacks.
3. **Lockout Policy:** Accounts are temporarily locked for 15 minutes after 5 consecutive failed login attempts. Generic error responses (`INVALID_CREDENTIALS`) prevent username enumeration.
4. **Zero Production Plaintext:** Dev seeds are protected with an explicit environment guard in `scripts/seed.mjs` preventing execution when `NODE_ENV === 'production'`.

---

## 3. Scope Isolation & Anti-IDOR Protections

1. **Multi-Tenant Campaign Isolation:** Campaign Admins are scoped to their authorized campaigns via `requireCampaignAccess`. Attempts to query or mutate another campaign's data yield `403 Forbidden`.
2. **Agent Booth Scoping:** Political Agents are strictly constrained to their assigned polling booths via `getAgentBoothScope`. Attempts to search, visit, report issues, or issue VIS for unassigned booths are rejected with `403 Forbidden`.
3. **Privilege Escalation Prevention:** In `/api/v1/users`, non-Super Admins attempting to create or assign users with `role: "SUPER_ADMIN"` are automatically capped to `POLITICAL_AGENT`.
4. **Anti-Mass-Assignment:** Model update routes explicitly whitelist accepted fields (e.g. `PATCH /campaigns/[id]` and `PATCH /households/[hid]`). Direct spreading of request body into Prisma mutations is forbidden.

---

## 4. Source Document & File Upload Security

1. **Upload Size Limiting:** Voter electoral-roll PDF uploads are strictly capped at 50 MB (HTTP 413).
2. **Magic Byte Signature Inspection:** Uploaded files must match `%PDF` magic bytes (HTTP 415). Extension spoofing is rejected.
3. **Private File Storage:** Electoral rolls are stored under `uploads/imports` (outside the `public/` web root).
4. **Authenticated PDF Proxy:** Access to original electoral roll files requires session authentication and campaign access via `GET /api/v1/imports/[id]/document`. Path traversal is defended using `path.resolve` boundary checks.

---

## 5. Security Headers & Defense-in-Depth

`next.config.js` injects standard HTTP response headers:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
- `X-Frame-Options: DENY`: Prevents UI redressing and clickjacking.
- `Referrer-Policy: strict-origin-when-cross-origin`: Minimizes referrer leakage.
- `Permissions-Policy: camera=(self), microphone=(), geolocation=(self)`: Constrains browser APIs.
