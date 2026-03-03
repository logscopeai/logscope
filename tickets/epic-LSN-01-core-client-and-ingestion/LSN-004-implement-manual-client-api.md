# LSN-004: Implement Manual Client API

## Context

Spec section 3 and Milestone 1 require `createLogscopeClient` with `trace/debug/info/warn/error/fatal` methods. Current repo has no runtime implementation.

## Objective

Deliver the public client factory and manual logging methods wired to normalization and ingestion sender (without batching yet).

## Scope

### In Scope

- Implement `createLogscopeClient(config)` and all six log-level methods.
- Normalize each manual log call and send immediately.
- Enforce no-throw behavior across client methods.
- Provide minimal internal warning channel that avoids secrets.

### Out of Scope

- Batching and flush intervals.
- Retry/backoff.
- Console interception.
- Pino transport entrypoint.

## Acceptance Criteria

1. Client exposes all required methods with `void` return type.
2. Each method sends one normalized log entry per call.
3. No client method throws, even when sender fails.
4. Root entrypoint exports `createLogscopeClient`.
5. Implementation supports local `npm link` consumption.

## Implementation Notes

- Expected files/modules: `src/client/create-logscope-client.ts`, `src/client/log-methods.ts`, `src/index.ts`.
- Keep source-of-truth path shared with future batching pipeline to reduce rewrites.
- Keep behavior fail-safe and non-blocking.

## Testing Requirements

- Unit tests for each log level method.
- Unit tests that simulate sender failure and assert non-throw behavior.
- Unit tests for config propagation (`context.source`, endpoint, apiKey usage in sender).

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Usage docs updated if public API shape changed.
