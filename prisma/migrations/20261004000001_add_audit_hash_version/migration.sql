-- Migration: add_audit_hash_version
-- Adds explicit provenance versioning to AuditEvent.
--
-- hashVersion NULL  = legacy record (existed before SHA-256 chain migration).
--                     These records are preserved unchanged; their absence of
--                     a hashVersion is itself the provenance marker.
-- hashVersion 1     = current SHA-256 chained record written by logAuditEvent().
--
-- Existing rows (181 records) will have hashVersion = NULL automatically —
-- no UPDATE needed, preserving historical records unchanged.

ALTER TABLE "AuditEvent"
  ADD COLUMN IF NOT EXISTS "hashVersion" INTEGER;
