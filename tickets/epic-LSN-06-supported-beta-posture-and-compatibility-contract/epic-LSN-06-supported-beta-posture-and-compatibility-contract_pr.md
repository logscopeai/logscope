# Suggested PR Title

Close the supported-beta SDK posture epic with explicit support policy, compatibility contract, local development guidance, and release verification docs

# Suggested PR Description

## Summary

This PR completes **EPIC-LSN-06 (Supported Beta Posture and Compatibility Contract)** for
`@logscopeai/logscope` by delivering:

- `LSN-017` Define support, compatibility, and deprecation policy
- `LSN-018` Rewrite README, package, and repo-visible docs to supported-beta posture
- `LSN-019` Freeze the public SDK compatibility contract for root API, integrations, config, and
  fail-safe behavior
- `LSN-020` Publish canonical SDK-side local-link and local-port guidance
- `LSN-021` Add release verification closure and synchronize required root workspace docs

The result is a more explicit and conservative supported-beta SDK posture: the package is no longer
documented as experimental, the public compatibility boundary is written down, local SDK guidance
is canonicalized, and release verification is repeatable.

## What changed

### 1) Supported-beta support and deprecation policy

- Added `docs/supported-beta-policy.md`.
- Defined what supported beta means operationally for this SDK.
- Identified the categories of public behavior that require compatibility review.
- Documented the default deprecation path for future surface changes.

### 2) README, package, and repo-visible posture rewrite

- Rewrote `README.md` around supported-beta language instead of experimental/POC language.
- Updated `package.json` description to match the intended package identity and maturity.
- Updated `docs/hardening-and-testing.md` and `logscope-spec.md` so repo-visible maturity wording
  no longer contradicts the supported-beta decision.
- Kept fail-safe boundaries and non-goals explicit.

### 3) Public SDK compatibility contract

- Added `docs/compatibility-contract.md`.
- Documented the supported-beta contract for:
  - root entrypoints;
  - root config and exported consumer types;
  - pino and winston transport subpaths;
  - fail-safe delivery behavior and ingestion status handling.
- Explicitly distinguished the public contract from internal helpers, transitive exports, and other
  implementation details that are not frozen.

### 4) Canonical local development guidance

- Added `docs/local-development.md`.
- Defined `http://localhost:3000` as the canonical SDK-side local ingestion target when validating
  against a locally running ingestion API.
- Documented the canonical `npm link` flow for consumers of `@logscopeai/logscope`.
- Clarified which repository owns customer onboarding, ingestion bring-up, and SDK-side local usage
  notes.

### 5) Release verification and closure

- Added `docs/release-verification.md`.
- Documented the supported-beta release checklist covering docs sync, formatting, tests, build, and
  root-doc review.
- Reviewed and updated root workspace docs where this epic changed the documented SDK posture or
  local-integration guidance:
  - `project-docs/current-state.md`
  - `project-docs/roadmap.md`
  - `context.md`
  - `integration-annotations.md`
- Added this epic PR draft and marked all EPIC-LSN-06 tickets implemented in
  `tickets/ticket_registry.md`.

## Validation

- `npm run format`
- `npm test`
- `npm run build`

## Risk and compatibility notes

- This PR intentionally does not expand runtime behavior or add new integrations.
- The compatibility contract is deliberately narrower than "every exported symbol" so internal SDK
  evolution remains possible during beta.
- Cross-repo local-default cleanup outside this repository still remains follow-up work, especially
  in payload-generator tooling.
