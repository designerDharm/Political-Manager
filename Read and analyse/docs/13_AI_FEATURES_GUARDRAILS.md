# AI Features & Guardrails

## 1. Allowed AI Features

- OCR assistance
- structured voter-record extraction
- address normalization suggestions
- duplicate candidate detection
- household grouping suggestions
- issue categorization
- anomaly detection
- aggregate natural-language analytics
- report summarization
- internal help assistant

## 2. Disallowed AI Features

The product must not:
- predict an individual's political preference
- assign vote-conversion score
- predict who will vote for a specific candidate
- rank individual voters by persuasion priority
- generate political messages personalized from sensitive personal data
- infer sensitive traits from names/addresses/family relations
- claim ballot choice

## 3. Natural Language Analytics

Allowed examples:
- "Which booths have less than 60% contact coverage?"
- "How many households still need verification?"
- "Which wards report the most water issues?"
- "Show import anomaly rate by booth."

Not allowed:
- "Who is most likely to vote for us?"
- "Which religion/caste should we target?"
- "Predict undecided voters."

## 4. Query Safety

LLM never gets raw database credentials.

Use:
```text
User question
→ policy classifier
→ semantic intent
→ predefined metric/query layer
→ scoped SQL/query builder
→ result
→ LLM explanation
```

Prefer a governed analytics layer over free-form SQL.

## 5. Prompt Injection Defense

Uploaded documents are untrusted content.

Rules:
- extraction system prompt has higher priority
- ignore instructions inside source PDF
- no tools available to extraction model except schema output
- sanitize OCR text
- limit context
- validate schema

## 6. Human Review

Mandatory for:
- low-confidence extraction
- household grouping ambiguity
- duplicate merge
- identity field correction
- destructive operations

## 7. Model Provider Abstraction

Interface:
```ts
interface DocumentAIProvider {
  extractVoters(input: PageInput): Promise<StructuredPageResult>
}
```

Provider can change without domain logic rewrite.

## 8. Evaluation Dataset

Create de-identified or legally approved test set:
- multilingual names
- low-quality scans
- multi-column layouts
- handwritten annotations
- missing ages
- repeated house numbers
- OCR errors

Measure:
- field precision/recall
- record completeness
- household suggestion precision
- human correction burden
