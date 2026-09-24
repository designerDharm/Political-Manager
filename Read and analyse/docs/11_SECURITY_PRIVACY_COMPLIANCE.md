# Security, Privacy & Compliance

## 1. Security Posture

Treat voter and field-operation data as high-risk personal data.

Use:
- least privilege
- defense in depth
- zero-trust request authorization
- encryption
- strong auditability
- short-lived access
- purpose limitation
- data minimization

## 2. Authentication

- MFA mandatory for Super Admin
- MFA mandatory for Campaign Admin
- optional/step-up MFA for agents based on risk
- secure OIDC/OAuth2
- short access tokens
- rotating refresh tokens
- session revocation
- device/session list
- suspicious login alerts

## 3. Authorization

Every query must be tenant scoped.
Every mutation must be permission scoped.
Never trust IDs supplied by client without ownership validation.

## 4. Encryption

### In Transit
TLS 1.2+; prefer TLS 1.3.

### At Rest
- database encryption
- object storage encryption
- encrypted backups
- KMS-managed secrets/keys

### Field Level
Consider application-level encryption for:
- phone
- sensitive notes
- external voter identifiers where required

## 5. Secrets

Never commit:
- API keys
- DB passwords
- OAuth secrets
- service-account keys

Use secret manager.

## 6. File Security

Uploads:
- content type + magic number validation
- antivirus/malware scanning
- private bucket
- signed URLs
- short expiry
- filename sanitization
- SHA-256
- no public object ACL

## 7. Privacy Controls

- define lawful purpose before collection
- collect minimum necessary fields
- purpose-tag exports
- configurable retention
- correction history
- access logging
- data deletion/archival workflows where legally applicable
- data principal request workflow if applicable
- vendor/subprocessor inventory

## 8. Political Data Guardrails

Never infer:
- political preference
- persuadability
- ideology
- vote probability
- intended ballot choice

Never derive targeting from:
- caste
- religion
- health
- ethnicity
- other sensitive characteristics

Do not represent:
- VIS issued = voted
- contact made = support
- turnout = vote for candidate

## 9. India DPDP Readiness

As of the current framework, the DPDP Act and notified Rules create obligations around lawful processing, notices/consent where applicable, security safeguards, breach handling, data rights, and governance. Implementation timelines should be tracked with legal counsel.

Engineering must support:
- notice/purpose versioning
- consent or legal-basis record where required
- withdrawal/rights workflows where applicable
- retention policy
- breach response
- processor/vendor controls
- audit evidence

This document is an engineering checklist, not legal advice.

## 10. Audit

Audit:
- login
- MFA
- permission changes
- imports
- voter correction
- household correction
- exports
- election-day events
- break-glass
- backup
- restore
- deletion/archival
- security configuration

## 11. Security Testing

- SAST
- dependency scanning
- secret scanning
- DAST
- authorization tests
- tenant isolation tests
- rate limit tests
- file upload tests
- OWASP ASVS-oriented review
- penetration test before production
