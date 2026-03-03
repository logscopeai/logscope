# Suggested PR Title

feat(core): deliver milestone 1 client sdk with tooling, normalization, transport, and manual api

# Suggested PR Description

## Summary

This PR completes EPIC-LSN-01 (Core Client and Ingestion) by delivering Milestone 1 behavior for `logscope`.

The implementation now includes:

- TypeScript SDK tooling bootstrap with stable build/test scripts and npm-link friendly exports.
- Shared domain types and reusable log normalization utilities aligned with ingestion schema.
- Ingestion HTTP sender with explicit status classification and safe, non-throwing transport outcomes.
- Manual client API (`createLogscopeClient`) exposing `trace/debug/info/warn/error/fatal` methods wired to normalization and transport.

## Detailed Changes

### LSN-001 Bootstrap TypeScript SDK Tooling

- Configured package exports for root and `logscope/pino` entrypoints.
- Added TypeScript compiler config and dist output layout.
- Added Vitest configuration with coverage gate greater than 90%.
- Added lockfile support (`package-lock.json`) and runnable scripts for build/test/format.
- Added smoke tests and co-located test convention support.

### LSN-002 Define Core Types and Normalization

- Added shared core contracts (`LogLevel`, `LogscopeConfig`, `LogscopeClient`, `IngestionLogEntry`).
- Implemented deterministic normalization producing `{ source, level, timestamp, message, metadata? }`.
- Added JSON-safe metadata normalization behavior, including safe handling for edge cases.
- Added comprehensive unit tests for level pass-through, timestamp behavior, metadata normalization, and metadata omission.

### LSN-003 Build Ingestion HTTP Sender

- Added transport request/result contracts for ingestion delivery.
- Implemented sender to `POST /api/logs/ingest` with required headers and payload shape.
- Added explicit mapping for statuses `202`, `400`, `401`, `413`, `429`, and `500`.
- Added safe fallback outcomes for invalid endpoints and network/runtime failures without throwing.
- Added tests for request construction, status classification, and safe error handling.

### LSN-004 Implement Manual Client API

- Implemented `createLogscopeClient(config)` runtime behavior for all six manual log methods.
- Added client modules to separate factory and log-method wiring for future pipeline reuse.
- Wired each manual call to normalize one log and dispatch immediately through transport.
- Added minimal unauthorized warning channel with no secret leakage and no-throw guarantees.
- Added tests for all log levels, sender-failure no-throw behavior, warn-once behavior, and config propagation (`context.source`, `endpoint`, `apiKey`).

## Validation

The following commands pass:

- `npm ci`
- `npm run build`
- `npm test`
- `npm run format:check`

Coverage remains above 90%.

## Contract and Risk Notes

- The SDK never throws into user code for transport/client paths covered in Milestone 1.
- API keys are not emitted by internal warnings.
- Batching, retry orchestration, console interception, and pino runtime transport behavior remain out of scope for this epic and are covered by later milestones.
