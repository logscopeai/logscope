# LSN-023: Rewrite README, Package, and Docs From Supported-Beta to Stable 1.0 Posture

## Context

The repo currently presents `@logscopeai/logscope` as supported beta. That is no longer the target
release posture.

## Objective

Rewrite repo-visible maturity language so the SDK is presented as stable `1.0`.

## Scope

### In Scope

- Update README, package metadata, and repo-visible maturity docs.
- Replace supported-beta wording with stable `1.0` contract language where appropriate.
- Keep honest non-goals and limitations explicit.

### Out of Scope

- Runtime behavior changes that are not required by the stable cut.

## Acceptance Criteria

1. Repo-visible maturity language consistently reflects stable `1.0`.
2. Supported-beta wording is removed from SDK-owned public posture docs.
3. Remaining limits are still documented clearly.

## Status

Implemented

## Checklist

- [x] Update README and package-facing maturity language.
- [x] Replace supported-beta wording with stable `1.0` posture language.
- [x] Keep remaining limits and non-goals explicit.

## Comments

- Completed on 2026-04-03.
- Rewrote `README.md` around the stable `1.0` SDK posture, current package identity, and explicit
  fail-safe limitations.
- Updated `package.json` and `package-lock.json` to version `1.0.0` and replaced the repo-visible
  package description with stable `1.0` wording.
- Replaced `docs/supported-beta-policy.md` with `docs/stable-1.0-policy.md` and updated
  `docs/release-verification.md`, `docs/hardening-and-testing.md`, `logscope-spec.md`, and
  `AGENTS.md` so SDK-owned posture docs no longer describe the package as supported beta.
