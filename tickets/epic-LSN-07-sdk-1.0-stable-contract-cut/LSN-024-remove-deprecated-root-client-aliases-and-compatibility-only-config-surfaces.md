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

Backlog
