# LSN-005: Build In-Memory Batching Pipeline

## Context

Spec section 10 defines an in-memory queue with max batch size `50` and flush conditions (size limit or interval). Filtering must happen before enqueueing (section 7), so queue boundaries are central.

## Objective

Implement asynchronous batching infrastructure that receives normalized logs, queues them, and flushes by size or timer.

## Scope

### In Scope

- Create in-memory queue module.
- Enforce max `50` logs per outbound batch.
- Flush when queue reaches `50` or interval elapses.
- Ensure minimum request size of `1` log.
- Keep implementation non-blocking and disk-free.

### Out of Scope

- Retry policy (handled by `LSN-006`).
- Level filtering policy implementation.
- Console/pino source integrations.

## Acceptance Criteria

1. Queue flushes immediately when `50` items are reached.
2. Timer flush sends pending logs when interval elapses.
3. No request is sent with empty `logs` array.
4. Batches never exceed `50` log entries.
5. Pipeline handles concurrent enqueue calls safely without throwing.

## Implementation Notes

- Expected files/modules: `src/pipeline/batch-queue.ts`, `src/pipeline/flush-scheduler.ts`, `src/pipeline/pipeline.ts`.
- Expose explicit lifecycle hooks if needed (`flushNow`, `stop`) for predictable tests.
- Keep all timers internal and cleanable.

## Testing Requirements

- Vitest unit tests with fake timers for interval-based flush.
- Unit tests for boundary cases (`49`, `50`, `51` entries).
- Unit tests for empty queue no-op flush.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Docs updated if batching defaults are user-visible.
