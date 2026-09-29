# RECOVERY STEP 11 — REPORT CATALOG SPECIFICATION
**CampaignOps AI Platform**
**Date:** September 2026

---

## 1. Catalog Overview
All reports and exports in CampaignOps AI are strictly operational, factual, and privacy-governed. No voter profiling, ideological categorization, or secret-ballot inferences are permitted.

---

## 2. Standard Operational Reports

### Report 1: Daily Voter Coverage & Contact Audit
- **Report Code**: `REP-OPERATIONAL-COVERAGE`
- **Purpose**: Field management audit of door-to-door campaign progress, mapping visited residences, verified family groups, and pending follow-ups.
- **Data Source**: `Household`, `Interaction`, `Booth`, `Ward`.
- **Supported Filters**: Campaign ID, Ward ID, Booth ID, Date Range.
- **Export Columns**:
  1. `ward_number`: Assigned Ward Number
  2. `ward_name`: Ward Name
  3. `booth_number`: Polling Station / Booth Number
  4. `booth_name`: Booth Name
  5. `household_code`: Unique Household Identifier (e.g., `H-001`)
  6. `house_number`: Physical Door / House Number
  7. `address`: Locality / Street Address
  8. `primary_contact`: Name of primary family contact
  9. `members_count`: Total registered voters in household
  10. `operational_status`: Field Status (`Pending`, `Contacted`, `Verified`, `Confirmed`)
  11. `last_visited_at`: Timestamp of most recent agent interaction
  12. `agent_name`: Name of assigned field agent
- **PII Level**: Low/Operational (Public voter list addresses and verification statuses).
- **Authorized Roles**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.
- **Export Formats**: CSV (`text/csv`), Printable Report View.

---

### Report 2: Booth-wise Voter Information Slip (VIS) Delivery Log
- **Report Code**: `REP-VIS-DELIVERY-LOG`
- **Purpose**: Statutory compliance register of non-partisan civic locator slips distributed to citizens to facilitate finding their polling station.
- **Data Source**: `VisEvent`, `Voter`, `Booth`, `User`.
- **Supported Filters**: Campaign ID, Booth ID, Channel (`IN_PERSON`, `PRINT`, `SMS`), Date Range.
- **Export Columns**:
  1. `reference_code`: Unique Slip Identifier (e.g. `VIS-YHT0229096-MUMHSWM3`)
  2. `epic_number`: Voter Electoral Photo Identity Card (EPIC) Number
  3. `voter_name`: Registered Voter Name (as per Electoral Roll)
  4. `serial_number`: Voter serial number in electoral roll
  5. `ward_number`: Ward Number
  6. `booth_number`: Polling Station Number
  7. `booth_name`: Polling Station Name
  8. `event_type`: Event (`ISSUED`, `REPRINTED`)
  9. `channel`: Delivery Channel (`IN_PERSON`, `PRINT`)
  10. `issued_at`: Timestamp of issuance
  11. `issued_by`: Authenticated Agent / Operator Name
- **Statutory Invariant**: Does NOT denote whether citizen voted. Zero secret-ballot correlation.
- **PII Level**: Medium (Electoral roll identification).
- **Authorized Roles**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.
- **Export Formats**: CSV (`text/csv`), Printable VIS Receipt.

---

### Report 3: Constituency Community Issues & Civic Grievance Register
- **Report Code**: `REP-ISSUES-REGISTER`
- **Purpose**: Log of reported local civic infrastructure grievances (water, road, sanitation, electricity) and operational campaign data correction requests.
- **Data Source**: `Issue`, `Booth`, `Household`, `User`.
- **Supported Filters**: Campaign ID, Status (`OPEN`, `IN_PROGRESS`, `RESOLVED`), Category, Priority.
- **Export Columns**:
  1. `issue_code`: Unique Tracking Code (e.g. `#ISS-2026-001`)
  2. `title`: Summary of Grievance
  3. `category`: Domain (`Water`, `Roads`, `Electricity`, `Sanitation`, `Data Correction`)
  4. `priority`: Priority Level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  5. `status`: Current Status (`OPEN`, `IN_PROGRESS`, `RESOLVED`)
  6. `ward_number`: Ward Number
  7. `booth_number`: Booth Number
  8. `household_code`: Associated Household Code (if applicable)
  9. `reported_by`: Reporting Field Agent
  10. `assigned_to`: Responsible Coordinator
  11. `created_at`: Date Logged
  12. `updated_at`: Date Last Updated
- **PII Level**: Low (Civic complaints and operational issues).
- **Authorized Roles**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`, `POLITICAL_AGENT` (scoped).
- **Export Formats**: CSV (`text/csv`).

---

### Report 4: Electoral Roll Ingestion & Data Quality Audit
- **Report Code**: `REP-INGESTION-AUDIT`
- **Purpose**: Data governance report verifying extraction confidence, duplicate detections, and parsing integrity from published electoral roll imports.
- **Data Source**: `ElectoralRollImport`, `ImportRecord`, `Ward`, `Booth`.
- **Supported Filters**: Campaign ID, Import Batch ID, Status.
- **Export Columns**:
  1. `import_id`: Electoral Roll Batch ID
  2. `filename`: Original PDF / Document Filename
  3. `ward_number`: Target Ward
  4. `booth_number`: Target Booth
  5. `total_extracted`: Total Electors Extracted
  6. `valid_records`: Confirmed Records Published
  7. `flagged_duplicates`: Suspected Duplicates Identified
  8. `average_confidence`: OCR / Parsing Confidence Rating (%)
  9. `status`: Lifecycle (`PROCESSING`, `REVIEW_READY`, `PUBLISHED`, `FAILED`)
  10. `published_at`: Publication Timestamp
  11. `uploaded_by`: Uploader Name
- **PII Level**: Low (Aggregate extraction metrics).
- **Authorized Roles**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.
- **Export Formats**: CSV (`text/csv`).

---

### Report 5: Election Day Polling Turnout Progression
- **Report Code**: `REP-TURNOUT-PROGRESSION`
- **Purpose**: Hourly aggregate voter turnout monitoring across polling booths as reported by authorized polling station observers.
- **Data Source**: `TurnoutSnapshot`, `Booth`, `Ward`.
- **Supported Filters**: Campaign ID, Ward ID, Booth ID.
- **Export Columns**:
  1. `ward_number`: Ward Number
  2. `booth_number`: Polling Station Number
  3. `booth_name`: Polling Station Name
  4. `total_electors`: Authoritative Registered Electors
  5. `turnout_hour`: Polling Interval (`7 AM`, `9 AM`, `11 AM`, `1 PM`, `3 PM`, `5 PM`, `6 PM`)
  6. `total_reported`: Observed Elector Count
  7. `turnout_percentage`: Bounded Turnout Percentage ($0 \le \% \le 100$)
  8. `source_classification`: Data Source (`OFFICIAL_ENTRY`, `AUTHORIZED_POLLING_AGENT`)
  9. `recorded_at`: Timestamp Recorded
- **Statutory Invariant**: Aggregate count only. No individual voter IDs. Not candidate votes.
- **PII Level**: None (Aggregate numbers only).
- **Authorized Roles**: `SUPER_ADMIN`, `CAMPAIGN_ADMIN`.
- **Export Formats**: CSV (`text/csv`).
