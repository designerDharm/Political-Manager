# Electoral Roll, OCR & AI Data Processing Pipeline

## 1. Objective

Convert electoral-roll files into a reviewable, auditable dataset without allowing AI to silently overwrite authoritative source data.

## 2. Accepted Inputs

- text PDF
- scanned PDF
- image-based PDF
- CSV
- XLSX

Reject:
- executable files
- password-protected files unless explicitly supported
- oversized files above configured limits
- MIME/signature mismatch

## 3. Processing Pipeline

```text
Upload
→ Malware/File Validation
→ SHA-256 fingerprint
→ Encrypted Object Storage
→ Page Split
→ Text Extraction/OCR
→ Layout Detection
→ Structured Voter Extraction
→ Schema Validation
→ Normalization
→ Duplicate Detection
→ Household Candidate Generation
→ Reconciliation
→ Human Review
→ Publish to Operational DB
```

## 4. Idempotency

Same SHA-256 + campaign + booth should trigger:
- duplicate warning
- no silent second import
- option to intentionally create new version

## 5. Structured Extraction Contract

AI/OCR result must conform to schema:

```json
{
  "page": 12,
  "records": [
    {
      "serial": "432",
      "name": "Example Name",
      "guardian_name": "Example Guardian",
      "relationship": "father|husband|mother|other|unknown",
      "house_number": "12A",
      "age": 42,
      "gender": "M|F|Other|Unknown",
      "address": "raw source string",
      "confidence": {
        "name": 0.97,
        "guardian_name": 0.92,
        "age": 0.99
      }
    }
  ]
}
```

No free-text-only AI responses.

## 6. Confidence Rules

Suggested thresholds:
- >= 0.95 auto-stage as high confidence
- 0.80–0.949 review queue
- < 0.80 mandatory human review

Thresholds must be configurable and validated against real samples.

## 7. Normalization

Deterministic code handles:
- Unicode normalization
- whitespace
- punctuation
- common abbreviations
- house number standardization
- address tokenization

AI may suggest normalization but deterministic functions should produce final normalized forms.

## 8. Duplicate Detection

Signals:
- same electoral reference
- same booth + serial
- normalized name similarity
- guardian similarity
- house number
- age proximity

Never merge automatically solely from fuzzy similarity.

## 9. Household Suggestion Engine

Signals:
- exact/near house number
- normalized address
- guardian/spouse relation strings
- surname/token overlap
- plausible age relation
- serial proximity as weak signal

Output:
```text
household_candidate_id
member_voter_ids[]
confidence
evidence[]
warnings[]
```

Rules:
- AI suggestion is not fact
- human confirmation required for ambiguous groups
- no inference of political preference
- no use of sensitive traits for political targeting

## 10. Reconciliation

Before import is "Ready":
- source declared count if available
- extracted record count
- duplicate count
- rejected rows
- missing serials
- suspicious age distribution
- empty names
- booth mismatch

The import UI must show variance.

## 11. Correction Model

Preserve:
1. source snapshot
2. normalized record
3. field-verified correction

Correction never destroys source snapshot.

## 12. AI Observability

Store:
- provider
- model/version
- prompt/template version
- job ID
- input file/page reference
- token/cost metadata if available
- latency
- schema validation status
- confidence
- reviewer
- final disposition

Do not store unnecessary raw personal data in AI logs.
