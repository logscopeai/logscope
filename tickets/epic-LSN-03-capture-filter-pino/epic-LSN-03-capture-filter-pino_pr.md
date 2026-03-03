# Suggested PR Title

`feat(epic-lsn-03): implement shared pre-batch filtering with opt-in console capture and pino transport ingestion path`

# Suggested PR Description

## Summary

This PR completes `EPIC-LSN-03` by unifying manual logs, console-captured logs, and pino transport logs through the same pre-batch filtering and batching pipeline.

The implementation introduces:

- shared pre-batch level filtering with deterministic behavior when filters are missing or empty;
- opt-in console capture that preserves original console behavior while forwarding mapped logs;
- a pino transport entrypoint that parses structured payloads, maps pino levels, applies filtering before enqueueing, and forwards through existing batching/retry delivery logic.

## Tickets Included

- `LSN-008` Add Pre-Batch Level Filtering
- `LSN-009` Add Opt-In Console Capture
- `LSN-010` Add Pino Transport Entrypoint

## Behavioral Outcomes

- Filtering now consistently happens before enqueueing for all supported ingestion paths.
- `captureConsole` remains disabled by default and, when enabled, wraps only `console.log/info/warn/error` with explicit level mapping and preserved original output semantics.
- `logscope/pino` now provides a functional transport module that:
  - maps standard pino levels (`10/20/30/40/50/60`);
  - safely ignores invalid payloads;
  - forwards valid payloads to the same ingestion schema and pipeline used by the core client.

## Validation

- Unit tests were added/updated for:
  - level filter evaluator behavior and full `LogLevel` regression coverage;
  - shared ingress pre-batch filtering behavior;
  - console capture mapping, argument preservation, restore lifecycle, and safe failure handling;
  - pino level mapping, payload parsing, invalid payload safety, filter interaction, and export compatibility checks.
- Test suite passes with coverage above required threshold (`> 90%`).
- TypeScript build passes successfully.

## Risks and Notes

- No API key values are logged in new warning paths.
- Transport and capture wrappers follow safe-failure behavior to avoid throwing into user code.
- The epic introduces explicit lifecycle handling for console patching internals; future client lifecycle APIs may expose explicit teardown hooks if needed.
