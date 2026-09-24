# Observability, Audit & Operations

## 1. Three Pillars

- logs
- metrics
- traces

Use OpenTelemetry-compatible instrumentation.

## 2. Request Context

Every request:
- request_id
- trace_id
- actor_id where authenticated
- campaign_id where applicable
- endpoint
- latency
- status

Do not log raw sensitive payloads.

## 3. Metrics

### Application
- request rate
- p50/p95/p99
- error rate
- websocket connections
- queue depth

### Imports
- pages/minute
- extraction failures
- confidence distribution
- reconciliation variance

### Sync
- queued offline mutations
- conflict rate
- rejected mutations

### Security
- failed login
- MFA failure
- forbidden access
- export attempts
- break-glass events

## 4. Alerts

P1:
- database unavailable
- tenant isolation anomaly
- widespread auth failure
- backup failure during election-day window

P2:
- queue stuck
- AI provider failure
- high API error rate
- websocket degradation

## 5. Audit vs Logs

Audit events are business/security records.
Logs are operational telemetry.

Audit events:
- append-only
- retention controlled
- searchable by authorized users
- not overwritten by log rotation

## 6. Admin Health Page

Show:
- API
- database
- Redis
- queue
- object storage
- AI provider
- last backup
- realtime gateway
