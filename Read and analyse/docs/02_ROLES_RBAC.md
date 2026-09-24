# Roles, Permissions & Access Control

## 1. Model

Use **RBAC + scope-based authorization**.

A role alone is not enough. Every permission must also be constrained by:
- organization
- campaign
- constituency
- ward
- booth
- assignment
- data sensitivity

## 2. Roles

### Super Admin
Platform-wide administration.

Default access:
- manage organizations
- manage plans/feature flags
- system health
- backup and restore
- audit/security events
- support tooling

Voter-level access should be **denied by default** and only available through an audited support/break-glass flow.

### Campaign Admin
Campaign-scoped authority.

Can:
- create/update campaign
- manage campaign users
- configure geography
- import electoral rolls
- review AI suggestions
- assign agents
- view campaign analytics
- export permitted reports
- manage issue taxonomy
- manage election-day operations

### Political Agent
Assignment-scoped field access.

Can:
- see assigned tasks/areas
- search only permitted voters/households
- update visit status
- verify/correct household information
- create issue/follow-up
- use election-day operational features granted to the role

Cannot:
- bulk export voter data
- change campaign settings
- access other campaigns
- manage users
- restore backups

## 3. Permission Naming Convention

```text
resource.action.scope
```

Examples:
```text
campaign.read.current
campaign.update.current
voter.read.assigned
voter.correct.assigned
household.verify.assigned
assignment.manage.campaign
import.create.campaign
import.review.campaign
report.export.campaign
audit.read.campaign
backup.manage.platform
```

## 4. Policy Evaluation

Each request checks:

1. user authenticated
2. session valid
3. organization membership active
4. campaign membership active
5. role includes permission
6. resource belongs to tenant
7. geographic/assignment scope matches
8. record not restricted
9. action passes contextual rules
10. audit event written when required

## 5. Break-Glass Access

For high-privilege troubleshooting:
- reason required
- MFA re-authentication
- limited time window
- case/ticket reference
- visible audit trail
- notification to authorized campaign owner
- automatic expiry

## 6. Data Export Controls

Exports require:
- explicit permission
- purpose
- data-scope preview
- row count
- watermark/export ID
- encryption
- expiration for generated files
- audit trail

## 7. Recommended Authorization Pattern

Do not rely only on frontend route hiding.

Authorization must exist:
- UI capability layer
- API guard
- service/business layer
- query tenant filters
- database constraints where possible
