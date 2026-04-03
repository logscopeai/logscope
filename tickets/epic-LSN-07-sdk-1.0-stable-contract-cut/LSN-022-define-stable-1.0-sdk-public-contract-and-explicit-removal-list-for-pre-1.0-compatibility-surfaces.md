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

Implemented

## Checklist

- [x] Define the stable `1.0` public SDK contract.
- [x] Make the removal list for compatibility-only pre-release surfaces explicit.
- [x] Keep fail-safe guarantees and transport boundaries clear for cross-repo references.

## Comments

- Completed on 2026-04-03.
- Rewrote `docs/compatibility-contract.md` as the stable `1.0` contract artifact for the SDK.
- The contract now defines the supported root API, transport surfaces, fail-safe delivery
  guarantees, and one explicit removal list for pre-`1.0` compatibility-only root-client
  surfaces.
- The explicit removal list now covers the root-package `createLogscopeClient` export, the
  root-client `endpoint` alias, and root-client `context.source`.
