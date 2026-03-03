# LSN-013: Add `Logscope` Class API with apiKey-Only Bootstrap

## Context

Product usage expects a direct SDK initializer based on API key input, for example `new Logscope({ apiKey })`, without forcing env-variable readers inside the package.

## Objective

Expose a class-based public API that supports apiKey-only initialization, uses a production ingestion URL default, and allows explicit URL override for development/testing.

## Scope

### In Scope

- Add `Logscope` class entrypoint in public API.
- Support `new Logscope({ apiKey })` as first-class initialization path.
- Keep existing functional API (`createLogscopeClient`) for compatibility or alias it under the new model.
- Use a centralized default ingestion base URL (production).
- Allow explicit `ingestionBaseUrl` override when needed for development/test workflows.
- Keep fail-safe behavior (no throws into user code).
- Emit safe warnings on missing/invalid required initialization fields.

### Out of Scope

- Direct SDK env-variable loading helpers.
- Secret management product integrations.
- Changes to ingestion API contract.

## Acceptance Criteria

1. SDK exposes a documented `Logscope` class API with apiKey-only bootstrap.
2. `new Logscope({ apiKey })` routes logs to the centralized production ingestion URL default.
3. `ingestionBaseUrl` override is supported and documented for development/testing.
4. Invalid initialization input is handled without throwing into user code.
5. Unit tests cover default URL behavior, override behavior, and invalid init paths.

## Implementation Notes

- Configurability requirement:
  - Default ingestion URL must be centralized and override-capable.
  - No duplicated hardcoded defaults across modules.

## Status

Implemented

## Checklist

- [x] Add `Logscope` class entrypoint in public API.
- [x] Support `new Logscope({ apiKey })` with centralized production ingestion URL default.
- [x] Support explicit `ingestionBaseUrl` override for development/testing workflows.
- [x] Preserve fail-safe behavior and invalid-init no-throw behavior.
- [x] Add unit tests for default URL, override URL, and invalid init paths.

## Comments

- Completed on 2026-02-24.
- Added `src/logscope.ts` and exported `Logscope` from root entrypoint.
- Centralized the default ingestion URL in `src/constants.ts` and covered behavior with regression tests.
