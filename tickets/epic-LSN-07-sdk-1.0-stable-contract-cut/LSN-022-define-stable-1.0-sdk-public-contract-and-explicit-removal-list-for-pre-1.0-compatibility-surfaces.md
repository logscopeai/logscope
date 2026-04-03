# LSN-022: Define Stable 1.0 SDK Public Contract and Explicit Removal List for Pre-1.0 Compatibility Surfaces

## Context

The SDK already documents a supported-beta compatibility baseline, but `1.0` needs one explicit
stable contract and one explicit list of surfaces that will be removed before the cut.

## Objective

Define the stable `1.0` SDK contract and the removal list for compatibility-only pre-release
surfaces.

## Scope

### In Scope

- Define the stable `1.0` public SDK contract.
- List which supported-beta surfaces are intentionally removed for `1.0`.
- Keep fail-safe guarantees and public transport boundaries explicit.

### Out of Scope

- New SDK feature work.
- Ingestion-side contract changes.

## Acceptance Criteria

1. Stable `1.0` SDK contract is documented explicitly.
2. The removal list for compatibility-only surfaces is explicit.
3. The resulting contract can be referenced by Core, Ingestion, and payload-gen without ambiguity.

## Status

Backlog
