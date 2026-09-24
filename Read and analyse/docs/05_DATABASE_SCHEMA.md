# Database Design

## 1. Principles

- UUID primary keys
- UTC timestamps
- `created_at`, `updated_at`
- soft delete only where required
- immutable original import snapshots
- optimistic version for mutable field records
- tenant IDs indexed
- foreign keys mandatory
- audit events append-only
- JSONB only for flexible metadata, not core relational structure

## 2. Core Tables

### organizations
```text
id uuid pk
name text
slug text unique
status enum
settings jsonb
created_at timestamptz
```

### users
```text
id uuid pk
email citext unique
phone text nullable
display_name text
status enum
mfa_enabled bool
last_login_at timestamptz
```

### organization_memberships
```text
id uuid pk
organization_id fk
user_id fk
role_id fk
status enum
```

### campaigns
```text
id uuid pk
organization_id fk
name text
election_name text
election_level enum
election_date date
candidate_name text nullable
party_name text nullable
status enum
estimated_voters int nullable
planning_targets jsonb
version int
```

### campaign_memberships
```text
id uuid pk
campaign_id fk
user_id fk
role_id fk
scope_type enum
scope_ids uuid[]
active bool
```

## 3. Geography

### constituencies
### wards
### localities
### booths

Common fields:
```text
id
campaign_id
parent_id nullable
code
name
official_reference nullable
geometry geography nullable
metadata jsonb
```

## 4. Imports

### electoral_roll_imports
```text
id
campaign_id
booth_id nullable
source_file_id
status
parser_version
total_pages
source_declared_count nullable
extracted_count
accepted_count
rejected_count
started_at
completed_at
created_by
```

### source_files
```text
id
campaign_id
storage_key
original_filename
mime_type
sha256
size_bytes
encrypted bool
```

### import_pages
```text
id
import_id
page_number
ocr_status
ocr_confidence
raw_text_storage_key nullable
```

### import_records
Contains immutable source-extracted candidate data.

## 5. Voter Tables

### voters
```text
id uuid pk
organization_id
campaign_id
booth_id
source_import_record_id
electoral_serial text nullable
external_voter_reference text nullable
name text
guardian_name text nullable
relationship_type enum nullable
age int nullable
gender text nullable
house_number text nullable
address_raw text nullable
address_normalized text nullable
status enum
verification_status enum
data_version int
created_at
updated_at
```

Sensitive identifiers should be encrypted/tokenized based on legal need.

### voter_source_snapshots
Immutable original values.

### voter_corrections
```text
id
voter_id
field_name
old_value_encrypted
new_value_encrypted
reason
source enum
created_by
created_at
approved_by nullable
```

## 6. Households

### households
```text
id
campaign_id
booth_id
house_number_normalized
address_normalized
primary_contact_voter_id nullable
status
ai_confidence nullable
human_verified_at nullable
version int
```

### household_members
```text
household_id
voter_id
membership_source enum
confidence nullable
verified_by nullable
verified_at nullable
primary key (household_id, voter_id)
```

## 7. Field Operations

### assignments
```text
id
campaign_id
assignee_user_id
scope_type
scope_id
task_type
status
priority
due_at nullable
created_by
```

### interactions
```text
id
campaign_id
voter_id nullable
household_id nullable
agent_user_id
interaction_type
outcome
notes_encrypted nullable
occurred_at
location_quality enum nullable
offline_mutation_id nullable
```

### followups
### issues
### issue_categories
### issue_events

## 8. Election Day

### election_day_desks
### agent_checkins
### vis_events
```text
id
campaign_id
voter_id
booth_id
event_type enum  // REQUESTED, ISSUED, REPRINTED
agent_user_id
occurred_at
```

### turnout_snapshots
Aggregate only:
```text
id
campaign_id
booth_id
source
reported_total
reported_at
```

### incidents
- booth
- category
- severity
- status
- description
- assigned_to
- timestamps

## 9. Security / Audit

### audit_events
```text
id bigserial
organization_id
campaign_id nullable
actor_user_id nullable
event_type
resource_type
resource_id nullable
request_id
ip_hash nullable
device_id nullable
metadata jsonb
created_at
```

### security_events
### sessions
### trusted_devices
### export_jobs
### backup_records

## 10. Required Indexes

At minimum:
- `(campaign_id, booth_id)`
- voter normalized name trigram
- house number + booth
- guardian name trigram
- task assignee/status
- interaction household/occurred_at
- audit campaign/created_at
- outbox unpublished/created_at

## 11. Constraints

- age sensible range
- campaign ownership consistent
- no household member from another campaign
- booth belongs to campaign
- assignment target belongs to campaign
- unique offline mutation ID per client/device
