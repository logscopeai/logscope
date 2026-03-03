# EPIC-LSN-05: v1 Initialization and Configurability Alignment

## Context

v1 requires the SDK to remain fail-safe while aligning initialization ergonomics with product usage: API-key-first bootstrap, production ingestion URL defaults, and configurable runtime quantities.

## Goal

Align SDK public API with product usage expectations while keeping configurable runtime behavior centralized and testable.

## Included Tickets

- `LSN-013` Add `Logscope` class API with apiKey-only bootstrap and production URL default
- `LSN-014` Deprecate client-managed `context.source` requirement and avoid SDK environment config surface
- `LSN-015` Externalize runtime batching/retry knobs as validated client configuration
- `LSN-016` Sync docs and regression coverage for updated initialization/config contracts

## Exit Criteria

- SDK supports apiKey-first bootstrap through a stable public API.
- SDK does not require direct env-variable readers to initialize correctly.
- Environment ownership is documented as Core/API-key scoped rather than SDK-config scoped.
- Runtime quantities are configurable with validated safe defaults.
- Documentation and tests cover config-driven behavior.
