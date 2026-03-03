# LSN-014: Deprecate Client `context.source` Input and Remove SDK Environment Config Surface

## Context

Current docs and contracts show tenant environment ownership is resolved by API key validation in Core/ingestion flows. SDK-side environment configuration should not be introduced as a source of truth.

## Objective

Deprecate consumer-managed `context.source` requirement and avoid introducing SDK-level `environment` config fields, while preserving ingestion schema compatibility (`source` field still required on emitted log entries).

## Scope

### In Scope

- Make `context.source` optional/deprecated in public SDK config.
- Define deterministic SDK-managed fallback source value when caller does not provide one.
- Ensure emitted ingestion entries still include `source` to satisfy current ingestion contract.
- Explicitly avoid adding an SDK config `environment` field as authoritative routing context.
- Add tests for deprecated/optional source behavior and fallback behavior.

### Out of Scope

- Ingestion-side schema redesign beyond agreed metadata contract.
- Full distributed tracing context model.

## Acceptance Criteria

1. SDK no longer requires caller-provided `context.source` for initialization.
2. Emitted ingestion entries always include a deterministic `source` value (provided or fallback).
3. SDK public config does not add an `environment` field for tenant/environment ownership.
4. Existing consumers that still pass `context.source` remain compatible.
5. README/spec docs are updated to clarify environment ownership via API key scope and source fallback behavior.

## Implementation Notes

- Configurability requirement:
  - Fallback source value must be centralized and configurable, not hardcoded in multiple modules.

## Status

Implemented

## Checklist

- [x] Make `context.source` optional/deprecated in public SDK config.
- [x] Preserve ingestion schema compatibility by always emitting a deterministic `source`.
- [x] Keep SDK config free of `environment` routing field.
- [x] Keep compatibility for existing callers that still pass `context.source`.
- [x] Add/adjust tests and docs for fallback source behavior and API-key-scoped environment ownership.

## Comments

- Completed on 2026-02-24.
- Updated client config guards to stop treating `context.source` as required.
- Confirmed runtime fallback source remains deterministic (`unknown`) when `context.source` is omitted.
