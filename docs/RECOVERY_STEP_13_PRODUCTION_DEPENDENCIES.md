# RECOVERY STEP 13 — PRODUCTION DEPENDENCIES SPECIFICATION
# CAMPAIGNOPS AI INFRASTRUCTURE & EXTERNAL SERVICES

## 1. System Architecture Overview
CampaignOps AI is designed as a cloud-native, self-contained campaign management platform. It depends on standardized open-source services and system binaries to ensure zero vendor lock-in.

---

## 2. Infrastructure & Service Inventory

| Component / Service | Required Version | Purpose / Role | Fallback / Behavior if Unavailable | Production Recommended Provider |
|---|---|---|---|---|
| **Node.js Runtime** | `>= 20.10.0 LTS` | Main Application Server (Next.js 14) | Cannot start application | Alpine / Ubuntu LTS Docker container |
| **PostgreSQL Database** | `>= 15.0` (Recommended: `16.2`) | Authoritative Single Source of Truth (SSoT) | System goes read-only or errors on startup | Managed PostgreSQL (RDS, Cloud SQL, Supabase, Neon) |
| **Poppler Utilities (`pdftotext`)** | `>= 22.0.0` | Native extraction from digital electoral roll PDFs | PDF import fails with `PopplerBinaryNotFound` | Host package (`apt install poppler-utils` or `brew install poppler`) |
| **OCR Engine (`tesseract` / OCRmyPDF)** | `>= 5.0.0` | OCR for scanned bitmap voter roll PDFs | Flags import batch as `ScannedPdfOcrRequired` | Host package (`apt install tesseract-ocr`) or Cloud Vision API |
| **Database Tooling (`pg_dump` / `pg_restore`)**| `>= 15.0` | Production disaster recovery & automated snapshots | Backup/restore endpoint returns 500 error | Host PostgreSQL Client Tools (`postgresql-client-16`) |
| **Persistent Storage Volume** | Block or Object Storage (S3/GCS) | Storage for PDF roll files, staging assets, and DB backups | Files lost on container recreation | AWS S3, Google Cloud Storage, or MinIO |
| **Reverse Proxy / Ingress** | Nginx or Cloudflare | SSL termination, HTTP/2, SSE buffer disabling | Direct HTTP exposure without buffering control | Nginx with `proxy_buffering off;` for `/api/v1/realtime` |

---

## 3. Environment Variables Reference

| Variable Name | Required | Default / Format | Description |
|---|---|---|---|
| `DATABASE_URL` | YES | `postgresql://user:pass@host:5432/dbname?schema=public` | Authoritative PostgreSQL connection string |
| `NODE_ENV` | YES | `production` | Enforces production optimizations, HTTPS cookies, and error masks |
| `NEXTAUTH_SECRET` / `SESSION_SECRET` | YES | 32+ random hex characters | Cryptographic key for session signing and auth token hashing |
| `NEXT_PUBLIC_APP_URL` | YES | `https://campaign.example.com` | Base URL used for redirection, PWA manifests, and CORS validation |
| `PDF_STORAGE_PATH` | OPTIONAL | `./uploads/pdf` | Local filesystem path or mounted persistent volume for PDF files |
| `BACKUP_STORAGE_PATH` | OPTIONAL | `./backups` | Storage directory for encrypted `pg_dump` archive files |
| `ENABLE_AUTOMATIC_BACKUPS` | OPTIONAL | `true` | Enables daily cron trigger for automated database snapshots |
| `SUPER_ADMIN_INITIAL_EMAIL` | OPTIONAL | `superadmin@campaignops.local` | Seed email used during `npm run prisma db seed` |
| `SUPER_ADMIN_INITIAL_PASSWORD` | OPTIONAL | Strong password string | Initial seed password (must be rotated upon first login) |

---

## 4. Production Readiness Checklist for Infrastructure
- [x] Connection Pooling configured via Prisma or PgBouncer.
- [x] PostgreSQL connection requires TLS (`sslmode=require`).
- [x] Database indexes created on `voters(campaignId, boothId, epicNumber)` and `households(campaignId, boothId)`.
- [x] Host environment has `pdftotext` installed and executable in `$PATH`.
- [x] Production deployment Dockerfile includes `poppler-utils` and `postgresql-client`.
