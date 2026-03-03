# Suggested PR Title

Align SDK v1 initialization and configuration behavior with apiKey-first bootstrap, deterministic source fallback, and centralized runtime delivery knobs

# Suggested PR Description

## Summary

This PR completes **EPIC-LSN-05 (v1 Initialization and Configurability Alignment)** by delivering:

- `LSN-013` Add `Logscope` class API with apiKey-only bootstrap
- `LSN-014` Deprecate client-managed `context.source` and avoid SDK environment config surface
- `LSN-015` Externalize runtime batching/retry knobs as validated client configuration
- `LSN-016` Sync docs and regression coverage for config-driven SDK behavior

The result is a configuration surface that is more ergonomic for consumers, while preserving fail-safe behavior and ingestion contract guarantees.

## What changed

### 1) Public bootstrap alignment (`Logscope` + compatibility factory)

- Added a new public `Logscope` class entrypoint and exported it from the root package.
- Enabled apiKey-first initialization (`new Logscope({ apiKey })`) with a centralized production ingestion URL default.
- Preserved `createLogscopeClient` compatibility and aligned it with the same apiKey-first defaults and safe behavior.
- Kept explicit `ingestionBaseUrl` override support for local development and test workflows.

### 2) Source and environment ownership alignment

- Updated client config to treat `context.source` as optional/deprecated input.
- Ensured emitted ingestion entries always include `source` via deterministic fallback (`unknown`) when caller input is absent.
- Explicitly kept SDK configuration free of client-owned `environment` routing context.
- Clarified that tenant/environment ownership is resolved server-side through API key scope.

### 3) Runtime batching and retry configurability

- Introduced typed `runtime` client config quantities:
  - `maxBatchSize`
  - `flushIntervalMs`
  - `maxRetries`
  - `retryBaseDelayMs`
  - `retryMaxDelayMs`
- Centralized runtime default values and normalization in a dedicated resolver.
- Enforced safe bounds/fallback behavior for invalid overrides (no throws).
- Wired resolved runtime config into batching pipeline creation to avoid hidden literal drift.

### 4) Regression coverage and documentation sync

- Expanded tests for:
  - default vs override ingestion URL behavior;
  - apiKey-only bootstrap through both class and compatibility factory;
  - deterministic source fallback behavior;
  - runtime default/override/invalid quantity paths.
- Updated `README.md` and `logscope-spec.md` to match implemented contracts and defaults.
- Verified root entrypoint/type exports remain coherent after config-surface expansion.

## Validation

- `npm test` passes with coverage above project thresholds.
- `npm run build` passes.
- All EPIC-LSN-05 tickets are marked implemented in `tickets/ticket_registry.md` and updated with status/checklist/comments.

## Risk and compatibility notes

- Existing consumers that pass `context.source` remain compatible.
- Deprecated aliases (`endpoint`, optional source input) remain supported for migration safety.
- Runtime override validation intentionally prioritizes safe fallback over hard failure to preserve the non-throw guarantee.
