# Field-Level Data Provenance — CampaignOps AI

## 1. Requirement
Record-level status alone is inadequate for electoral operational data. Changes to a voter's spelling, age, guardian relation, or address must be auditable at the granular field level, distinguishing:
- What was extracted from the original government document (and at what OCR confidence).
- What was verified or corrected by an agent on the ground.
- What was modified by an administrator.

---

## 2. Provenance Architecture

Each voter entity maintains a collection of `VoterFieldProvenance` records:

```json
{
  "field_name": "name",
  "current_value": "Rajesh Kumar",
  "source_type": "ELECTORAL_ROLL_OCR",
  "source_record_id": "rec_091823",
  "source_page": 12,
  "confidence": 0.98,
  "verified_by": null,
  "verified_at": null,
  "modified_by": null
}
```

When an agent in the field confirms an address correction:
```json
{
  "field_name": "address",
  "current_value": "House No. 12, Gandhi Nagar",
  "previous_value": "12 G Nagar",
  "source_type": "FIELD_AGENT_VERIFIED",
  "verified_by": "agent_rakesh_yadav",
  "verified_at": "2026-09-24T10:30:00Z",
  "reason": "House number and street verified in person during door-to-door visit"
}
```

In the user interface, hover popovers and audit tabs clearly indicate the exact provenance and confidence for every individual field.
