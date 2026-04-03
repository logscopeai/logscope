# LSN-024: Remove Deprecated Root-Client Aliases and Compatibility-Only Config Surfaces

## Context

The root SDK client still retains pre-`1.0` compatibility surfaces such as `endpoint` and root
`context.source`, even though those do not belong in the intended stable contract.

## Objective

Remove deprecated root-client compatibility surfaces before the stable `1.0` cut.

## Scope

### In Scope

- Remove root-client `endpoint`.
- Remove root-client `context.source` compatibility behavior.
- Align docs, types, and tests with the reduced stable surface.

### Out of Scope

- Transport option naming changes that are intentionally retained outside the root-client API.
- New configuration features.

## Acceptance Criteria

1. Root-client `endpoint` no longer exists in the supported SDK surface.
2. Root-client `context.source` compatibility behavior is removed.
3. Docs and tests describe only the stable `1.0` root-client API.

## Status

Implemented

## Checklist

- [x] Remove root-client `endpoint`.
- [x] Remove root-client `context.source` compatibility behavior.
- [x] Align docs, types, and tests with the reduced stable surface.

## Comments

- Completed on 2026-04-03.
- Removed root-client `endpoint` handling and caller-provided `context.source` from the supported
  root SDK surface. Root-client logs now always emit the deterministic fallback source `unknown`.
- Removed `createLogscopeClient` from the public package entrypoint so the root package no longer
  exposes the pre-`1.0` compatibility factory.
- Updated `README.md`, `docs/compatibility-contract.md`, `docs/local-development.md`, and
  `logscope-spec.md` to describe only the reduced root-client API while preserving transport-side
  `endpoint`/`source` configuration for pino and winston.
- Validation completed with `npm test` and `npm run build`.
