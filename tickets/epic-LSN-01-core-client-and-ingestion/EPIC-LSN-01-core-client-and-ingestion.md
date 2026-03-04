# EPIC-LSN-01: Core Client and Ingestion

## Context

This epic delivers Spec Milestone 1 (`logscope-spec.md` section 13): basic client, manual logging API, ingestion POST delivery, and unit-test baseline.

## Goal

Create the first runnable `@logscopeai/logscope` implementation that can be linked locally, accept manual log calls, normalize logs, and send them to `/api/logs/ingest` without throwing into user code.

## Included Tickets

- `LSN-001` Bootstrap TypeScript SDK tooling
- `LSN-002` Define core types and normalization
- `LSN-003` Build ingestion HTTP sender
- `LSN-004` Implement manual client API

## Exit Criteria

- Milestone 1 behavior is implemented and test-covered with Vitest.
- `npm ci`, `npm run build`, and `npm test` are available and passing.
