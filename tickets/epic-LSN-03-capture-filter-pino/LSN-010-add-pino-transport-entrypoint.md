# LSN-010: Add Pino Transport Entrypoint

## Context

Spec section 9 requires a pino transport at `@logscopeai/logscope/pino` that maps pino levels, applies filtering, and forwards to the same batching pipeline.

## Objective

Deliver a dedicated pino transport module compatible with pino transport configuration and local `npm link` usage.

## Scope

### In Scope

- Expose transport subpath `@logscopeai/logscope/pino`.
- Parse pino log payloads and map levels to SDK `LogLevel`.
- Forward normalized logs through shared filter + batch + retry pipeline.
- Keep pino behavior unchanged and avoid stdout interception.

### Out of Scope

- Replacing pino internals.
- Non-pino logger integrations.

## Acceptance Criteria

1. Transport module resolves from `@logscopeai/logscope/pino` after build.
2. Level mapping is correct for standard pino numeric levels.
3. Parsed logs use the same ingestion schema and pipeline as manual/console logs.
4. Invalid payloads are handled safely without process crashes.
5. Transport path does not intercept stdout or alter pino output semantics.

## Implementation Notes

- Expected files/modules: `src/pino/transport.ts`, `src/pino/map-pino-level.ts`, package export map updates.
- Reuse core pipeline primitives to avoid behavior drift.
- Keep transport startup overhead minimal.

## Testing Requirements

- Unit tests for level mapping and payload parsing.
- Unit tests verifying filter application and batching integration.
- Compatibility test for module resolution via built package path.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- README/docs include pino transport usage example.
