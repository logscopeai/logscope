# LSN-006: Implement Retry and Status Handling

## Context

Spec sections 6 and 11 define response behavior: `401` warn once, `429/500` retry with backoff, `400/413` drop, and drop after max retries. SDK must never throw to user code.

## Objective

Add deterministic retry/backoff and terminal outcome behavior for flushed batches.

## Scope

### In Scope

- Implement retry scheduler for retriable outcomes (`429`, `500`, and network errors).
- Implement warn-once behavior for `401` per client instance.
- Drop non-retriable batches (`400`, `413`) immediately.
- Drop retriable batches after max retries.
- Guarantee errors remain internal (no throw to caller).

### Out of Scope

- Advanced resilience features (disk persistence, backpressure, sampling).
- External metrics/telemetry backends.

## Acceptance Criteria

1. `202` marks batch success.
2. `400` and `413` drop batch without retry.
3. `401` drops batch and emits warning once per client lifecycle.
4. `429` and `500` retry with backoff until max retries reached.
5. Batch is dropped after max retries with safe internal warning/error signal.
6. API keys are never logged in warnings/errors.

## Implementation Notes

- Expected files/modules: `src/retry/retry-policy.ts`, `src/retry/backoff.ts`, `src/pipeline/delivery-runner.ts`.
- Keep retry policy configurable via internal defaults to support future tuning.
- Make warn-once state explicit and testable.

## Testing Requirements

- Vitest unit tests for each status code path.
- Fake timer tests for backoff progression and max-retry cutoff.
- Tests proving warn-once semantics on repeated `401` responses.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Behavior notes added to docs where user-visible.
