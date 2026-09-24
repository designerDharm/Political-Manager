# AI Evaluation Plan & Model Governance — CampaignOps AI

## 1. Principles
1. **Never Trust Uncalibrated Confidence Scores**: Raw OCR or LLM confidence values must be benchmarked against synthetic and de-identified ground-truth datasets.
2. **Deterministic Schemas**: All AI extraction and suggestion pipelines use strict structured output validation (Zod schemas).
3. **Prompt Injection Defense**: Text extracted from scanned PDFs is treated as untrusted user input, quarantined in an isolated extraction worker sandbox with no direct database write permissions.

---

## 2. Evaluation Metrics

| Benchmark Task | Target Precision | Target Recall | Failure Action |
|---|---|---|---|
| **Electoral Roll Name Extraction** | > 97% | > 99% | Send to Low-Confidence Review Queue |
| **EPIC Number Extraction** | 99.8% | 99.8% | Regex validation failure flags manual entry |
| **Household Grouping Suggestion** | > 92% | > 88% | Tag as "Suggested" with explicit evidence checklist |
| **Duplicate Candidate Detection** | > 95% | > 95% | Route to Duplicate Resolution Center |

---

## 3. Provenance & Version Tracking

Every AI extraction run records:
- `provider`: e.g., `gemini-1.5-flash`, `tesseract`, or `mock-provider`.
- `modelVersion`: Specific provider model tag.
- `promptTemplateVersion`: Versioned prompt commit hash.
- `extractorVersion`: Parser pipeline release version.
- `processingDurationMs`: Latency tracking.
