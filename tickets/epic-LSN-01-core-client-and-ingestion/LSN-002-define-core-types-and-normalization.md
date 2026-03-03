# LSN-002: Define Core Types and Normalization

## Context

Spec sections 3, 4, and 5 define the public API, configuration contract, and ingestion log schema. No runtime types or normalization modules currently exist.

## Objective

Implement shared domain types and deterministic log normalization used by all ingestion sources.

## Scope

### In Scope

- Define `LogLevel`, `LogscopeConfig`, `LogscopeClient`, and `IngestionLogEntry` types.
- Implement normalization from SDK log input to ingestion schema.
- Ensure ISO-8601 timestamp generation.
- Normalize optional metadata into JSON-safe object form.

### Out of Scope

- Network delivery, batching, retries, console interception, and pino transport behavior.

## Acceptance Criteria

1. Public TypeScript types match the spec contracts.
2. Normalizer outputs `{ source, level, timestamp, message, metadata? }`.
3. Timestamp format is ISO-8601.
4. Normalization logic is reusable by manual API, console capture, and pino transport.

## Implementation Notes

- Expected files/modules: `src/types.ts`, `src/normalization/normalize-log.ts`, `src/constants.ts`.
- Keep API explicit; avoid hidden globals.
- Leave validation-hardening details (length/size guards) for Milestone 4 ticket(s).

## Testing Requirements

- Unit tests for level mapping pass-through, timestamp format, metadata normalization, and optional metadata omission.
- Tests must run in Vitest and avoid real network dependencies.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Public type exports are documented when changed.
