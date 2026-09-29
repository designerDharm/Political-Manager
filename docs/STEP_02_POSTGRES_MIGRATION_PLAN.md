# STEP 02 — POSTGRESQL MIGRATION PLAN

**Date:** 2026-09-25  
**Scope:** Engine Migration from SQLite to PostgreSQL (Zero Data Loss)  

---

## 1. Migration Architecture
```mermaid
flowchart LR
    A["SQLite Source<br/>(dev.db)"] --> B["Migration Script<br/>(scripts/migrate-sqlite-to-postgres.mjs)"]
    B --> C["PostgreSQL Target<br/>(campaignops db)"]
    D["prisma/schema.prisma<br/>provider = 'postgresql'"] --> E["Prisma Baseline Migration<br/>(prisma/migrations)"]
    E --> C
```

---

## 2. Step-by-Step Execution Sequence
1. **Pre-Migration Safety & Backup (COMPLETED):**
   - Verified 31 models in SQLite.
   - Database backed up to `backups/pre-postgres-migration/dev.db`.
2. **PostgreSQL Setup & Connection Verification (COMPLETED):**
   - PostgreSQL 16 running on port `5432`.
   - Created database `campaignops` and user `campaignops`.
   - Verified connection string: `postgresql://campaignops:campaignops_dev_secret@localhost:5432/campaignops?schema=public`.
3. **Prisma Provider Switch:**
   - Update `prisma/schema.prisma` datasource provider from `"sqlite"` to `"postgresql"`.
4. **Prisma Baseline Migration Generation:**
   - Run `npx prisma migrate dev --name init_postgresql` to create authoritative PostgreSQL DDL tables with primary keys, foreign keys, and unique indexes.
5. **Entity Data Transfer in Dependency Order:**
   - Execute custom automated migration script `scripts/migrate-sqlite-to-postgres.mjs`.
   - Transfer:
     1. `Organization`
     2. `User`
     3. `Campaign`
     4. `Ward`
     5. `Booth`
     6. `Household`
     7. `Voter`
     8. `Assignment`
     9. `Interaction`
     10. `AuditEvent`
6. **Data Reconciliation:**
   - Validate 100% exact match between SQLite counts and PostgreSQL counts.
7. **Runtime Cutover & Regression Testing:**
   - Set `.env` `DATABASE_URL` to PostgreSQL.
   - Start application and verify all workflows live.
8. **Rollback Plan:**
   - If PostgreSQL connection fails, change `provider = "sqlite"` and restore `.env` to `DATABASE_URL="file:./dev.db"` using untouched `backups/pre-postgres-migration/dev.db`.
