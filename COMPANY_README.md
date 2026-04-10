# Company Onboarding README

This guide explains how a new company is onboarded to Cymops for shared-platform observability (Grafana Cloud style).

## Purpose

- Onboard a company quickly
- Isolate telemetry by company scope (project)
- Ingest metrics and logs securely with API keys

## Tenant Model

Current tenant boundary is **Project**.

- Each company is mapped to one or more projects
- API and WebSocket observability access is project-scoped
- Ingestion keys are tied to a single project

## Storage Strategy

### Current state

Cymops currently stores ingested telemetry events in PostgreSQL as an interim implementation.

- Ingest keys are stored hashed in PostgreSQL
- Ingested metrics/logs are written as event records in PostgreSQL
- This is acceptable for the current prototype and low volume

### Target state

For SaaS scale, the observability data path should move to the Grafana LGTM stack:

- Metrics -> Prometheus / Mimir
- Logs -> Loki
- Traces -> Tempo

Why this matters:

- PostgreSQL is not a time-series backend
- High-cardinality metric series will degrade query and write performance
- Logs and traces need dedicated backends with labels, retention, and query patterns designed for observability

### Recommended production flow

1. Customer agents export metrics, logs, and traces
2. Cymops ingest API validates payload and quotas
3. Cymops enqueues telemetry to Redis Streams
4. Background workers consume queue records and persist or relay them to observability backends
5. Cymops UI queries observability data from those backends
6. Project labels enforce tenant isolation in every query

Queue model:

`Ingest API -> Redis Stream Queue -> Worker -> Storage / Backend Adapter`

This decouples ingest request latency from storage write latency and prevents spikes from destabilizing API response times.

## Prerequisites

Platform side:

1. Backend running with Flyway migrations applied
2. Frontend running with authenticated users
3. PostgreSQL available

Customer side:

1. Backend service and database running
2. Telemetry agent/collector (custom script or OTel Collector)
3. Network route to Cymops backend ingestion endpoints

## Admin Onboarding Steps

### 1. Create a project for the company

Create project in UI/API. Example: `Acme Production`.

### 2. Add company users to the project

Invite or add users so they can access project-scoped observability.

### 3. Generate ingestion key (Admin only)

Request:

```http
POST /api/ingest/keys
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "projectId": 42,
  "label": "acme-prod-agent"
}
```

Response:

```json
{
  "id": 101,
  "projectId": 42,
  "label": "acme-prod-agent",
  "ingestKey": "cymops_ing_xxxxxxxxxxxxxxxxx"
}
```

Notes:

- Store this key in a secret manager
- Backend stores hash only
- Rotate key if leaked

## Customer Agent Setup

### Metrics ingestion

```http
POST /api/ingest/metrics
X-INGEST-KEY: <company_ingest_key>
Content-Type: application/json

{
  "source": "acme-k8s-prod",
  "payload": {
    "service": "backend-api",
    "env": "prod",
    "timestamp": "2026-04-03T10:00:00Z",
    "latencyP95Ms": 143,
    "errorRatePercent": 1.2,
    "requestsPerMinute": 320
  }
}
```

### Logs ingestion

```http
POST /api/ingest/logs
X-INGEST-KEY: <company_ingest_key>
Content-Type: application/json

{
  "source": "acme-k8s-prod",
  "payload": {
    "service": "backend-api",
    "env": "prod",
    "level": "ERROR",
    "message": "DB connection timeout",
    "timestamp": "2026-04-03T10:00:00Z"
  }
}
```

Required payload fields:

- `service`
- `env`
- `timestamp`

If any of these fields are missing, Cymops rejects the event with `400 Bad Request`.

## What Company Users See

1. User logs in
2. User selects project in Dashboard/Grafana
3. Frontend calls observability APIs with `projectId`
4. WebSocket connects with JWT + `projectId`
5. Backend enforces project access and returns scoped data only

## Isolation Guarantees

1. REST APIs check project access by member or creator scope
2. WebSocket handshake checks JWT + project scope
3. Ingestion keys are tied to a single project
4. Ingested data is labeled by project and can be routed to per-tenant observability storage later

## Validation Checklist

1. `POST /api/ingest/metrics` returns accepted response
2. `POST /api/ingest/logs` returns accepted response
3. Dashboard `golden-signals` and `db-audit` load for selected project
4. Grafana page shows live stream connected

## Common Errors

### 403 on `/api/observability/*`

Cause:

- Missing `projectId`
- User lacks project access

Fix:

- Include `projectId` in request
- Confirm user is a member or creator of the project

### 401 on `/api/ingest/*`

Cause:

- Missing or invalid ingest key

Fix:

- Regenerate key and update collector config

### 400 on ingest payload

Cause:

- Missing required payload fields (`service`, `env`, `timestamp`)

Fix:

- Add the required fields to the payload

### Flyway migration error (`type "clob" does not exist`)

Cause:

- PostgreSQL does not support `CLOB`

Fix:

- Use `TEXT` type in migrations

## Recommended Security Operations

1. Rotate ingestion keys every 60-90 days
2. Use separate key per environment (dev/stage/prod)
3. Add endpoint-level rate limiting for ingestion
4. Add key revoke endpoint and audit logs for key actions
5. Apply retention policy for ingest events

## Future Improvements

1. Add first-class Tenant/Organization entity
2. Add tenant labels to all metrics/logs/traces
3. Push metrics to Prometheus / Mimir, logs to Loki, traces to Tempo
4. Add per-tenant quotas and usage analytics
