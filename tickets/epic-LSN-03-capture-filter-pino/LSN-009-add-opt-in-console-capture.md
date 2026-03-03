# LSN-009: Add Opt-In Console Capture

## Context

Spec section 8 requires optional interception of `console.log/info/warn/error` with level mapping and preserved original console behavior.

## Objective

Implement opt-in console capture adapter that forwards logs into the shared pipeline without breaking existing console output.

## Scope

### In Scope

- Wrap `console.log`, `console.info`, `console.warn`, `console.error` when `captureConsole === true`.
- Map levels (`log/info -> info`, `warn -> warn`, `error -> error`).
- Preserve original console function behavior and arguments.
- Route captured logs through shared filter + batching pipeline.

### Out of Scope

- Intercepting stdout/stderr streams directly.
- Capturing additional console methods outside spec.

## Acceptance Criteria

1. Console capture is disabled by default.
2. Enabling capture forwards mapped logs while preserving original console output.
3. Captured logs obey pre-batch level filtering.
4. Wrapper failures do not throw to user code.
5. No API key or secret leakage in console-related warnings.

## Implementation Notes

- Expected files/modules: `src/console/capture-console.ts`, client initialization wiring.
- Keep monkey-patch lifecycle explicit and reversible when possible.
- Avoid hidden global side effects when capture is disabled.

## Testing Requirements

- Unit tests with spies verifying original console methods are called with original args.
- Unit tests for level mapping and filter interaction.
- Unit tests verifying capture disabled path leaves console untouched.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%`.
- Build passes.
- Docs updated with `captureConsole` behavior and caveats.
