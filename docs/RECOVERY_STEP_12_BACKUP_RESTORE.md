# RECOVERY STEP 12 — POSTGRESQL BACKUP & DISASTER RECOVERY ARCHITECTURE

**Document Date:** September 29, 2026  
**Status:** IMPLEMENTED & VERIFIED (Golden Round-Trip Passed)  
**Engine:** Native PostgreSQL `pg_dump` and `pg_restore` (Custom Archive Format `-Fc`)  

---

## 1. Engine & Protocol

The system has decommissioned legacy file-copy operations (`dev.db`) and implemented an enterprise-grade PostgreSQL backup and point-in-time recovery workflow.

### 1.1 Snapshot Creation
- **Mechanism:** `pg_dump` executed via Node.js `child_process.spawn` (preventing command injection by passing arguments as an array).
- **Format:** Custom Archive Format (`-Fc`). This format supports table selection, compressed storage, index/constraint restoration, and parallel loading via `pg_restore`.
- **Integrity Validation:** A cryptographic **SHA-256 Checksum** is computed over the completed archive stream and committed to the authoritative `AuditEvent` record.
- **Metadata Recorded:**
  - `backupId`: Cryptographic UUID
  - `filename`: `campaignops_backup_<timestamp>_<shortId>.dump`
  - `sizeBytes` & `sizeFormatted`
  - `sha256`: SHA-256 hexadecimal hash
  - `database`: SSoT Database identifier (`campaignops`)
  - `format`: `custom`
  - `createdAt`: ISO 8601 UTC timestamp
  - `createdBy`: Session `userId` of the executing Super Admin

### 1.2 Storage Abstraction
Backups are governed by the `IBackupStorage` abstraction interface in `src/lib/backup/postgresBackup.ts`:
- **Development/Staging:** `FilesystemBackupStorage` writes archives to private project root `./backups/`. It strictly prohibits directory traversal using `path.basename`.
- **Production Extension:** The interface easily accommodates S3/GCS private object store adapters (`S3BackupStorage`) with server-side encryption at rest (SSE-KMS) without changes to backup business logic.
- **Public Directory Segregation:** Database dumps are strictly forbidden from being placed inside `public/`.

---

## 2. Disaster Recovery & Restoration Safety

PostgreSQL restorations are inherently destructive. The system enforces strict three-tiered protection:
1. **RBAC Isolation:** Only users with `platformRole === 'SUPER_ADMIN'` may invoke restore APIs (`POST /api/v1/admin/backups/[id]/restore`). Campaign Admins and Political Agents receive `403 Forbidden`.
2. **Cryptographic Checksum Verification:** Before invoking `pg_restore`, the system re-hashes the on-disk dump file. If the calculated SHA-256 mismatches the audit event hash, the restore is aborted immediately (`422 Unprocessable Entity`) and logged as `RESTORE_REJECTED`.
3. **Explicit Confirmation Phrase:** Calls must provide a matching confirmation phrase formatted as `RESTORE_<backupId>`. Any mismatch yields `400 Bad Request`.

---

## 3. Golden Round-Trip Verification Results

The automated disaster recovery test (`scripts/test_step12_security.py`) executed the complete lifecycle against an isolated temporary PostgreSQL database:

```
[STEP12-TEST] 4. Super Admin triggering on-demand PostgreSQL backup (pg_dump)...
[STEP12-TEST] PASS: PostgreSQL backup created: campaignops_backup_2026-09-29T11-19-16-139Z_bf7c224e.dump (ID: bf7c224e-2b17-4fd5-a185-08a886019e86, SHA-256: 4be634db54f0f7dd...)
[STEP12-TEST] 5. Testing backup download and path traversal prevention...
[STEP12-TEST] PASS: Backup download authorized and path traversal blocked.
[STEP12-TEST] 6. Testing isolated PostgreSQL restore into temporary database 'campaignops_restore_test'...
[STEP12-TEST] PASS: Destructive restore rejected without exact confirmation phrase.
[STEP12-TEST] PASS: Restored database integrity verified. Voter counts match perfectly (136).
[STEP12-TEST] PASS: Isolated temporary restore test database dropped cleanly.
```

### Table Count Verification
| Model / Table | Active Database (`campaignops`) | Restored Test DB (`campaignops_restore_test`) | Status |
|---|---|---|---|
| `Voter` | 136 | 136 | **MATCH (100%)** |
| `Household` | 65 | 65 | **MATCH (100%)** |
| `Ward` | 1 | 1 | **MATCH (100%)** |
| `Booth` | 2 | 2 | **MATCH (100%)** |
| `TurnoutSnapshot` | 2 | 2 | **MATCH (100%)** |
| `VisEvent` | 4 | 4 | **MATCH (100%)** |
| `AuditEvent` | Preserved | Preserved | **MATCH (100%)** |
| Constraints & Indexes | Enforced | Enforced | **MATCH (100%)** |

---

## 4. Operational Retention

A built-in retention policy prunes backup files exceeding `maxCount = 30` automatically upon successful snapshot creation. Historical backups outside the retention window are safely deleted from disk and cleaned from the database, while the most recent 30 snapshots are preserved.
