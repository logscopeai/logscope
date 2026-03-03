# LSN-015: Externalize Runtime Batching and Retry Knobs

## Context

Batching/retry behavior is currently tuned primarily by internal defaults. Integrators need controlled overrides for runtime tradeoffs.

## Objective

Expose validated client configuration for batching/retry quantities while preserving safe defaults and fail-safe non-throwing behavior.

## Scope

### In Scope

- Add typed optional config fields for runtime quantities (for example: batch size cap, flush interval, max retry attempts, retry backoff base).
- Validate bounds and fallback behavior on invalid values.
- Keep existing default behavior when overrides are not provided.
- Add regression tests for default/override/invalid cases.

### Out of Scope

- Transport protocol redesign.
- Persistent queueing on disk.
- Runtime metrics exporter integrations.

## Acceptance Criteria

1. Public SDK config supports runtime quantity overrides for batching/retry.
2. Invalid overrides are handled safely and do not throw into user code.
3. Defaults remain unchanged when overrides are omitted.
4. Tests cover quantity-bound validation and behavior changes.
5. README documents each configurable runtime quantity and default.

## Implementation Notes

- Configurability requirement:
  - Runtime quantities must be sourced from a single typed config surface.
  - No duplicated hardcoded fallback values spread across pipeline modules.

## Status

Implemented

## Checklist

- [x] Add typed client runtime config surface for batching/retry quantities.
- [x] Centralize default values and runtime quantity validation/fallback logic.
- [x] Keep defaults unchanged when runtime overrides are omitted.
- [x] Add regression tests for default, override, and invalid runtime quantity paths.
- [x] Document configurable runtime quantities and defaults in README.

## Comments

- Completed on 2026-02-24.
- Introduced `runtime` client config with validated quantity overrides (`maxBatchSize`, `flushIntervalMs`, `maxRetries`, `retryBaseDelayMs`, `retryMaxDelayMs`).
- Wired resolved runtime config into batching pipeline creation to keep behavior centralized and testable.
