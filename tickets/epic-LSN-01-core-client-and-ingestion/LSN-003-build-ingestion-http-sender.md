# LSN-003: Build Ingestion HTTP Sender

## Context

Spec section 6 defines the ingestion API contract (`POST /api/logs/ingest`, `x-api-key` header, JSON body). The SDK must classify responses without throwing into user code.

## Objective

Implement a transport module that constructs and sends ingestion requests and returns structured delivery outcomes.

## Scope

### In Scope

- Build request URL using configured endpoint + `/api/logs/ingest` path.
- Send payload `{ logs: IngestionLogEntry[] }` with required headers.
- Map response statuses to internal result categories (success, drop, retry, unauthorized warning path).
- Catch network/runtime errors and return safe failure results.

### Out of Scope

- Queue batching logic.
- Retry/backoff scheduling policy.
- Console and pino ingestion sources.

## Acceptance Criteria

1. Requests always target `/api/logs/ingest`.
2. Headers include `x-api-key` and `Content-Type: application/json`.
3. Body contains `logs` array with normalized entries.
4. Status handling supports at least: `202`, `400`, `401`, `413`, `429`, `500`.
5. Sender never throws to callers.
6. No secret values (especially API keys) are emitted in logs/warnings.

## Implementation Notes

- Expected files/modules: `src/transport/send-ingestion-request.ts`, `src/transport/transport-types.ts`.
- Prefer dependency injection for `fetch` to simplify deterministic tests.
- Keep status mapping explicit and centrally documented in code.

## Testing Requirements

- Unit tests with mocked fetch assert URL, headers, payload, and status classification.
- Include network error test proving non-throw behavior.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- API contract docs are updated if transport behavior changes.
