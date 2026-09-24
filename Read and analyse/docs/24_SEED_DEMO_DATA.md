# Seed & Demo Data Plan

## Purpose

Development should never depend on real voter data.

Create synthetic demo data only.

## Demo Campaign

```text
Organization: Demo Civic Campaign
Campaign: Sample Assembly Campaign
Constituency: Demo Constituency
Wards: 5
Booths: 20
Households: 1,000 synthetic
Voters: 3,250 synthetic
Agents: 25
Issues: 120
```

## Synthetic Voter Generation

Generate fictional:
- names
- house numbers
- ages
- guardian relations
- addresses
- booth assignments

Do not use actual electoral-roll names.

## Demo Scenarios

Include:
- ambiguous household
- duplicate candidate
- low-confidence OCR
- missing age
- field correction
- offline mutation conflict
- revoked agent
- VIS issuance
- turnout snapshot

## Demo Accounts

Use environment-driven seeded passwords or magic-link local auth; never hardcode production-style credentials in repository.
