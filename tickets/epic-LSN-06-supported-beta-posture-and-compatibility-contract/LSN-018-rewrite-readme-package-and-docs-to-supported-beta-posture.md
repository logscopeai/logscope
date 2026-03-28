# LSN-018: Rewrite README, Package, and Docs to Supported-Beta Posture

## Context

The public repo posture still describes the SDK as an early-stage POC and experimental package,
which is incompatible with the intended production-release story.

## Objective

Rewrite SDK-facing docs and metadata so they accurately present the package as supported beta.

## Scope

### In Scope

- Update `README.md`, package metadata, and any repo-visible docs that describe maturity.
- Remove obsolete experimental wording that conflicts with the supported-beta decision.
- Preserve explicit limitations and fail-safe non-goals.
- Align install and usage examples with current package identity.

### Out of Scope

- New runtime behavior changes.
- Cross-repo docs outside the SDK repo itself.

## Acceptance Criteria

1. Repo-visible maturity language consistently reflects supported beta.
2. Explicit limitations remain documented and honest.
3. Usage examples and package identity are current.
4. No remaining customer-facing copy presents the SDK as experimental.

## Implementation Notes

- Keep the tone precise: supported beta is not GA, but it is no longer a casual experiment.

## Status

Implemented

## Checklist

- [x] Update README and package-facing maturity language.
- [x] Remove stale experimental wording.
- [x] Keep fail-safe limits explicit.
- [x] Align examples with current package identity.

## Comments

- Completed on 2026-03-27.
- Rewrote `README.md` around the supported-beta posture, current package identity, and explicit
  fail-safe guarantees.
- Updated `package.json`, `docs/hardening-and-testing.md`, and `logscope-spec.md` to remove stale
  experimental/POC wording that conflicted with the intended release posture.
