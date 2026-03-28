# LSN-021: Add Release Verification and Docs Closure

## Context

Supported-beta posture requires explicit closure work so documentation, compatibility expectations,
and verification do not drift apart over time.

## Objective

Close the SDK maturity epic with synchronized docs and release verification steps.

## Scope

### In Scope

- Update the repo docs with the final supported-beta posture and compatibility contract.
- Add or document the verification steps required before SDK release.
- Coordinate any required root-doc updates in the workspace.
- Record remaining maturity limits or follow-up work explicitly.

### Out of Scope

- New SDK features beyond maturity closure.
- External release automation redesign.

## Acceptance Criteria

1. Final supported-beta posture and compatibility contract are documented in the repo.
2. Release verification steps are explicit and repeatable.
3. Root workspace docs were reviewed and updated if needed.
4. Remaining maturity limits or follow-ups are explicit.

## Implementation Notes

- Closure should make it obvious that the SDK is supported beta, not GA and not experimental.

## Status

Implemented

## Checklist

- [x] Sync final supported-beta docs and compatibility notes.
- [x] Document release verification steps.
- [x] Review root workspace docs for maturity/status changes.
- [x] Record remaining limits or follow-ups.

## Comments

- Completed on 2026-03-27.
- Added `docs/release-verification.md` and the epic PR draft to close supported-beta docs and
  release guidance.
- Reviewed root workspace docs and updated `project-docs/current-state.md`,
  `project-docs/roadmap.md`, `context.md`, and `integration-annotations.md` where the SDK posture
  and local-guidance wording had drifted.
- Validation completed with `npm run format`, `npm test`, and `npm run build`.
- Remaining follow-up stays outside this repo: payload-generator/local-default cleanup and broader
  cross-repo endpoint consistency.
