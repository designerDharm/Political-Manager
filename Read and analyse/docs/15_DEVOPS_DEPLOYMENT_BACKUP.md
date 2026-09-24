# DevOps, Deployment, Backup & Recovery

## 1. Environments

```text
local
development
staging
production
```

Production data must never be copied to development without approved de-identification.

## 2. CI Pipeline

On pull request:
- install
- typecheck
- lint
- unit tests
- integration tests
- build
- dependency scan
- secret scan

On protected merge:
- build immutable image
- SBOM
- sign artifact
- deploy staging
- smoke tests
- approval gate
- production deploy

## 3. Database Migrations

Use Prisma migrations.
Rules:
- forward-compatible where possible
- no destructive migration without backup
- large-table migration plan
- rollback strategy
- migration lock

## 4. Deployment

Prefer:
- stateless app containers
- autoscaling
- health endpoints
- readiness/liveness
- zero-downtime rolling deploy

## 5. Backup

### Database
- continuous/PITR if supported
- daily automated
- weekly verified snapshot
- retention tiers

### Object Storage
- versioning
- lifecycle policy
- replication if required

### Config
- IaC in git
- secrets in secret manager, not backup plaintext

## 6. Restore

Every restore:
- privileged permission
- MFA step-up
- reason
- restore target preview
- audit
- post-restore integrity verification

## 7. Recovery Targets

Set after business review.

Suggested starting objectives:
- RPO: <= 15 minutes for database
- RTO: <= 2 hours for critical production recovery

Election-day may require stricter objectives.

## 8. Disaster Recovery Drill

Quarterly:
- restore DB
- restore object metadata
- verify login
- verify campaign dashboard
- verify import records
- verify audit chain
