# LSN-026: Close Stable 1.0 Release Verification, Regression Matrix, and Root-Doc Sync

## Context

The stable SDK cut changes public maturity posture, removal policy, and local-development guidance.
It needs an explicit closure ticket.

## Objective

Close the stable SDK epic with synchronized docs, release verification, and root-doc review.

## Scope

### In Scope

- Update SDK release verification for the stable `1.0` contract.
- Record the regression matrix required by the stable cut.
- Review and update root workspace docs where needed.

### Out of Scope

- New SDK feature implementation.

## Acceptance Criteria

1. Stable release verification steps are explicit and repeatable.
2. Regression expectations for the stable cut are documented.
3. Root workspace docs were reviewed and updated if needed.

## Status

Implemented

## Checklist

- [x] Update SDK release verification for the stable `1.0` contract.
- [x] Record the regression matrix required by the stable cut.
- [x] Review root workspace docs and update the ones that drifted.

## Comments

- Completed on 2026-04-03.
- Updated `docs/release-verification.md` so the stable `1.0` checklist now references the final SDK
  contract docs and includes a stable-cut regression matrix.
- Added `tickets/epic-LSN-07-sdk-1.0-stable-contract-cut/epic-LSN-07-sdk-1.0-stable-contract-cut_pr.md`
  with a suggested PR title and descriptive PR body for the completed epic.
- Reviewed root workspace docs:
  - Updated `../project-docs/current-state.md`
  - Updated `../project-docs/roadmap.md`
  - Updated `../context.md`
  - Updated `../integration-annotations.md`
  - Reviewed `../README.md` and no change was needed
  - Reviewed `../project-docs/capability-model.md` and no change was needed
- Validation completed with `npm run format:check`, `npm test`, and `npm run build`.
