# EPIC-LSN-07: SDK 1.0 Stable Contract Cut

## Context

The SDK already has real runtime behavior and supported-beta documentation, but `1.0` now requires
cutting the public contract to a stable posture and removing the compatibility-only surfaces that no
longer belong in the release.

## Goal

Turn `@logscopeai/logscope` from supported beta into a stable `1.0` public SDK contract with one
canonical local topology story and no pre-release root-client compatibility residue.

## Included Tickets

- `LSN-022` Define stable 1.0 SDK public contract and explicit removal list for pre-1.0
  compatibility surfaces
- `LSN-023` Rewrite README, package, and docs from supported-beta to stable 1.0 posture
- `LSN-024` Remove deprecated root-client aliases and compatibility-only config surfaces
- `LSN-025` Publish final standalone-vs-integrated local topology guidance and remove stale
  workspace path references
- `LSN-026` Close stable 1.0 release verification, regression matrix, and root-doc sync

## Exit Criteria

- SDK docs describe a stable `1.0` contract instead of supported beta.
- Deprecated pre-release root-client compatibility surfaces are removed.
- Local topology guidance aligns with the wider workspace `1.0` plan.
- Release verification covers the stable public contract.
