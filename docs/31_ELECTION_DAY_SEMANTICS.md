# Election-Day Operational Semantics & Decoupled Metrics — CampaignOps AI

## 1. Absolute Rule of Non-Inference

> [!CAUTION]
> **Voter Information Slip (VIS) Issuance DOES NOT EQUAL Voter Turnout.**
> - A citizen requesting or being handed a Voter Information Slip (location, polling booth, serial number) is an operational assistance activity. It does **not** signify that a ballot was cast, nor does it imply a ballot was cast for any candidate or party.
> - Any application dashboard or metric that computes `Turnout % = VIS Issued / Total Electors` or equates VIS to candidate votes is **strictly forbidden**.

---

## 2. Independent Operational Metrics

To prevent data corruption and legal exposure, CampaignOps AI decouples election-day indicators into independent, authoritative metrics:

### Metric A: Total Registered Electors
- **Definition**: Total valid registered voters imported and verified for the constituency or booth.
- **Source**: Electoral roll normalized database.

### Metric B: Official / Authorized Aggregate Turnout
- **Definition**: Aggregate turnout figures reported periodically (e.g. 9 AM, 11 AM, 1 PM, 3 PM, 5 PM, final) by authorized booth agents observing official polling numbers or authorized election authority releases.
- **Formula**: `Turnout % = (Reported Turnout Count / Total Electors) * 100`
- **Granularity**: Booth level or Ward level aggregate only. Never inferred per individual voter.

### Metric C: VIS Issued (Field / Help Desk Assistance)
- **Definition**: Total Voter Information Slips delivered door-to-door or printed at the campaign assistance desk outside the 100/200-meter legal perimeter.
- **Formula**: `Count of VisEvent WHERE eventType = 'ISSUED'`
- **Semantics**: Service assistance volume. Strictly independent of voting behavior.

### Metric D: Polling Assistance Requests
- **Definition**: Assistance logged for senior citizens, persons with disabilities (e.g., wheelchair assistance, queue navigation).
- **Semantics**: Civic support.

### Metric E: Booth Readiness & Agent Check-in
- **Definition**: Percentage of designated polling booths with an active, checked-in agent and active communication desk.

---

## 3. Legally Conservative Neutral VIS Print Template

In accordance with strict election laws and guidelines:
1. **Zero Campaign Propaganda**:
   - The default unofficial Voter Information Slip (VIS) **must not contain**:
     - Candidate photographs
     - Candidate names
     - Political party names
     - Party symbols or logos
     - Persuasive campaign slogans
2. **Permitted Operational Content Only**:
   - Voter Full Name
   - Relative / Guardian Name
   - Gender and Age
   - Electoral Roll Part / Booth Number and Name
   - Serial Number in Part
   - Polling Station Building and Room Address
   - Election Date and Polling Hours (e.g., 7:00 AM - 6:00 PM)
   - Mandatory notice: *"This slip is an unofficial voter guide to help locate your polling booth. It is not an identity card. Please bring your EPIC or approved Government Photo ID to the polling station."*
