# Observability Storage Pipeline

This document defines the target storage pipeline for Cymops observability data.

## Goal

Replace the current interim PostgreSQL event storage with a Grafana-style LGTM architecture.

## Target Backends

- Metrics -> Prometheus or Mimir
- Logs -> Loki
- Traces -> Tempo

## Current State

Today Cymops uses PostgreSQL as an interim event store for ingested telemetry.

That is acceptable for the prototype, but not for SaaS scale.

## Why This Change Is Needed

- PostgreSQL is not a time-series backend
- Metrics series cardinality will grow quickly
- Log volume and trace volume need purpose-built backends
- Query latency and storage cost will degrade as tenants grow

## Pipeline Design

### 1. Ingest Layer

Cymops receives telemetry from customer agents or collectors.

Inputs:
- metrics
- logs
- traces

Each event is labeled with:
- projectId
- tenant label
- environment
- service

### 2. Adapter Layer

Adapters convert Cymops telemetry payloads into backend-specific writes.

Planned adapters:
- Prometheus remote_write adapter for metrics
- Loki push adapter for logs
- Tempo OTLP adapter for traces

### 3. Storage Layer

- Prometheus / Mimir stores metrics
- Loki stores logs
- Tempo stores traces

### 4. Query Layer

Cymops dashboard and APIs read from the observability backends using project-scoped labels.

## Tenant Isolation Rules

- Every record must include projectId
- Every backend write must include tenant labels
- Queries must be filtered by tenant/project scope
- No cross-project reads or writes are allowed

## Backend Configuration Plan

Cymops backend will expose configuration for:

- Prometheus remote write URL
- Loki push URL
- Tempo OTLP endpoint
- Tenant header name for shared-platform routing

## Migration Path

1. Keep current PostgreSQL event storage as a fallback during development
2. Add adapter implementations for Prometheus, Loki, and Tempo
3. Route metrics/logs/traces through those adapters
4. Keep PostgreSQL only for audit metadata, key management, and short-term operational records
5. Remove direct telemetry event storage from PostgreSQL once LGTM backends are fully in place

## Operational Defaults

- Metrics retention should live in Prometheus/Mimir, not PostgreSQL
- Logs retention should live in Loki
- Trace retention should live in Tempo
- Project-level quotas and rate limits still apply at ingest time

## Next Implementation Steps

- Implement a metrics adapter using remote_write
- Implement a logs adapter using Loki push format
- Implement a traces adapter using OTLP export
- Add health checks for each observability backend
- Add retry/backoff and dead-letter handling for adapter failures
