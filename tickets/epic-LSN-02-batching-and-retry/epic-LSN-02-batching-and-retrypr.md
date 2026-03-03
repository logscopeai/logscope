# Suggested PR Title

feat(pipeline): deliver milestone 2 batching, retry handling, and enforced vitest coverage gate

# Suggested PR Description

## Summary

This PR completes EPIC-LSN-02 (Batching and Retry Delivery) for `logscope` by delivering:

- In-memory batch queuing with max-50 boundaries and interval-based flush.
- Deterministic delivery retry/backoff behavior aligned with ingestion response handling.
- Automated coverage gating in local and CI workflows with explicit thresholds above 90%.

## Detailed Changes

### LSN-005 Build In-Memory Batching Pipeline

- Added internal queue and flush scheduler modules to support non-blocking in-memory batching.
- Implemented pipeline flush triggers for:
  - queue size reached (`50`)
  - flush interval elapsed
- Enforced batch size boundaries (`1..50`) and no-op behavior for empty flushes.
- Added explicit internal lifecycle hooks (`flushNow`, `stop`) for deterministic tests.
- Integrated manual client log flow with enqueue-based batch dispatch.

### LSN-006 Implement Retry and Status Handling

- Added retry policy module with safe defaults and policy normalization.
- Added exponential backoff module with cap handling.
- Implemented delivery runner to:
  - treat `202` as terminal success
  - drop immediately on non-retriable outcomes (`400`, `413`)
  - retry retriable outcomes (`429`, `500`, and network/runtime delivery errors)
  - drop with safe internal result after max retries
- Preserved once-only unauthorized warning behavior (`401`) at client level.
- Added once-only warning for retry exhaustion without exposing secrets.

### LSN-007 Enforce Vitest Coverage Gate

- Kept coverage thresholds explicit and version-controlled in `vitest.config.ts`.
- Set global coverage thresholds (`branches`, `functions`, `lines`, `statements`) to `91`.
- Added explicit `npm run test:coverage` script.
- Updated CI workflow to run the coverage gate command on pull requests.
- Updated contributor-facing README test instructions to include local coverage command.

## Validation

The following commands pass:

- `npm run test:coverage`
- `npm test`
- `npm run build`

Coverage is enforced above 90% by threshold configuration and CI execution.

## Contract and Risk Notes

- SDK continues to avoid throwing into user code for batching/retry paths.
- API keys are not logged by internal warning paths.
- Retry policy is currently internal and not yet exposed as a public client configuration surface.
