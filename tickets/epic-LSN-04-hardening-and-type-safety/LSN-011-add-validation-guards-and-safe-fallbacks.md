# LSN-011: Add Validation Guards and Safe Fallbacks

## Context

Spec sections 5 and 11 plus Milestone 4 require stronger validation and fail-safe behavior. Constraints include message length, metadata size, and never throwing into user code.

## Objective

Implement runtime guards and type-safe fallbacks for malformed config/input while preserving SDK stability.

## Scope

### In Scope

- Add config validation guards for required fields (`apiKey`, `endpoint`, `context.source`) with safe warning behavior.
- Enforce message length limit (`<= 2048`) via deterministic truncation strategy.
- Enforce metadata size limit (`<= 2048` bytes JSON) via safe drop/truncation strategy.
- Improve internal typing for delivery outcomes and error paths.
- Keep API key values redacted in diagnostics.

### Out of Scope

- API key semantic validation against server.
- New non-POC features (disk buffering, sampling, OpenTelemetry).

## Acceptance Criteria

1. Invalid or incomplete config does not throw into user code.
2. Oversized messages are safely normalized according to documented policy.
3. Oversized metadata is handled safely without crashes.
4. Warnings/errors redact secrets and are emitted at most once where specified.
5. Public API remains backward-compatible with prior milestone behavior.

## Implementation Notes

- Expected files/modules: config guard module, normalization guard logic, typed result/error unions.
- Guard behavior must be explicit and covered by tests.
- Preserve asynchronous and non-blocking runtime behavior.

## Testing Requirements

- Unit tests for each guard branch (valid/invalid config, oversized message, oversized metadata).
- Regression tests confirming no-throw behavior across client methods under invalid inputs.
- Tests confirming no secret leakage in warning messages.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Guard behavior is documented in English.
