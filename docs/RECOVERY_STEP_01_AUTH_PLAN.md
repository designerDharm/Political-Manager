# RECOVERY STEP 1 — AUTHENTICATION & SESSION PLAN
**Project:** CampaignOps AI  
**Date:** 2026-09-28  

## 1. Objectives
- Remove fake `setTimeout` and email-matching login in `src/app/login/page.tsx`.
- Connect login UI to real `POST /api/v1/auth/login`.
- Seed cryptographic password hashes for development users in PostgreSQL.
- Issue secure HTTP-only cookies (`campaignops_session`).
- Store hashed session tokens in PostgreSQL `Session` table.
- Implement server-side route protection via Next.js `middleware.ts`.
- Verify `POST /api/v1/auth/logout` revokes session and clears cookie.
- Ensure protected APIs enforce session verification (no fallback to Super Admin).

## 2. Execution Steps
1. **Password Seeding**: Run Node.js script using Prisma Client and `crypto.scrypt` to seed `passwordHash` for `admin@campaignops.ai`, `campaign.admin@campaignops.ai`, and `agent@campaignops.ai`.
2. **Login Form Integration**: Refactor `src/app/login/page.tsx` to handle state (Idle, Submitting, Invalid Credentials, Server Error), call `/api/v1/auth/login`, and redirect based on server-returned role.
3. **Middleware Route Protection**: Create `src/middleware.ts` to check `campaignops_session` cookie on protected route paths (`/super-admin/:path*`, `/campaigns/:path*`, `/agent/:path*`) and redirect unauthenticated users to `/login`.
4. **API Route Guards**: Ensure `/api/v1/campaigns`, `/api/v1/voters`, `/api/v1/tasks`, and `/api/v1/admin/*` require an active session.
5. **Verification**: Direct PostgreSQL queries, curl tests for 401 unauthenticated responses, and session persistence checks.
