# LSN-008: Add Pre-Batch Level Filtering

## Context

Spec section 7 requires filtering before enqueueing for manual logs, console logs, and pino transport logs.

## Objective

Implement shared level-based filtering so excluded logs are rejected before they reach batching.

## Scope

### In Scope

- Implement filter evaluator for `logFilter.levels`.
- Apply filtering at pipeline entrypoint before enqueue.
- Define behavior when filter is missing or empty.
- Share same filtering logic across all log source adapters.

### Out of Scope

- Console monkey-patching mechanics.
- Pino transport parsing mechanics.

## Acceptance Criteria

1. When `logFilter.levels` is undefined, all levels are allowed.
2. When configured, only listed levels are enqueued.
3. Filtered-out logs are never added to queue/batches.
4. Filtering behavior is consistent across manual, console, and pino paths.

## Implementation Notes

- Expected files/modules: `src/filter/level-filter.ts`, shared pipeline ingress function.
- Keep filtering checks O(1) using precomputed set where possible.
- Ensure logic stays side-effect free.

## Testing Requirements

- Unit tests for configured and non-configured filters.
- Unit tests asserting filtered logs do not increase queue size.
- Regression tests covering all `LogLevel` values.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Docs updated if filter semantics changed.
