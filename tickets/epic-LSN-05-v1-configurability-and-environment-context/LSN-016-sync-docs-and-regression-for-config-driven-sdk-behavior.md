# LSN-016: Sync Docs and Regression for Config-Driven SDK Behavior

## Context

Adding class-based apiKey bootstrap, source-deprecation behavior, and runtime knobs changes the public SDK contract and requires synchronized documentation plus regression protection.

## Objective

Update docs and tests so configuration-driven SDK behavior is explicit, stable, and verified.

## Scope

### In Scope

- Update `README.md` with new config fields and examples.
- Add/refresh unit tests for class bootstrap defaults/overrides, source fallback behavior, and runtime quantity overrides.
- Verify non-goals and safety guarantees remain accurate.
- Ensure type exports and entrypoints stay coherent after config surface expansion.

### Out of Scope

- New SDK feature domains unrelated to configuration.
- Ingestion API behavior changes.

## Acceptance Criteria

1. README and docs accurately describe all new configuration fields and defaults.
2. Regression tests cover key config-driven paths and safety behavior.
3. Build/test workflow passes with updated configuration features.
4. Public type exports remain consistent and documented.
5. Known limits and non-goals are still clearly stated.

## Implementation Notes

- Configurability requirement:
  - Documentation must clearly identify configurable quantities and default values so future changes (limits, plan assumptions) are made via config, not hidden literals.

## Status

Implemented

## Checklist

- [x] Sync README/spec docs with class bootstrap defaults, optional source behavior, and runtime knobs.
- [x] Add regression tests for class/bootstrap default/override behavior and config-driven runtime paths.
- [x] Keep fail-safe guarantees and non-goals explicit in docs.
- [x] Verify root entrypoint exports and type surface remain coherent.
- [x] Validate full project test and build workflows.

## Comments

- Completed on 2026-02-24.
- Documentation now reflects API-key-first bootstrap for both `Logscope` and compatibility factory.
- Regression coverage was expanded for config-driven initialization/runtime behavior and validated through full suite/build.
