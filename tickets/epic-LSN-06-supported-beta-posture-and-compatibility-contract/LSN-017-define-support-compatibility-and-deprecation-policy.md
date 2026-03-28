# LSN-017: Define Support, Compatibility, and Deprecation Policy

## Context

The SDK needs an explicit supported-beta policy so customers and internal contributors understand
what behavior is expected to remain stable and how changes will be introduced.

## Objective

Define the supported-beta support, compatibility, and deprecation policy for `@logscopeai/logscope`.

## Scope

### In Scope

- Define the supported-beta posture and what it means operationally.
- Define which public SDK behaviors are compatibility-sensitive.
- Define deprecation expectations for future SDK changes.
- Align policy language with Core and Ingestion docs.

### Out of Scope

- Implementation of new SDK features.
- Repository rename or package rename work.

## Acceptance Criteria

1. Supported-beta policy is documented in repo-visible docs.
2. Compatibility-sensitive public behavior is explicitly identified.
3. Deprecation posture is defined for future SDK surface changes.
4. Cross-repo wording can mirror the same policy without contradiction.

## Implementation Notes

- Keep the policy conservative: fail-safe guarantees and primary client contracts should be covered
  explicitly, but internal refactors should remain outside the compatibility promise.

## Status

Implemented

## Checklist

- [x] Document supported-beta posture and customer expectations.
- [x] Identify compatibility-sensitive public SDK behavior.
- [x] Define deprecation expectations for surface changes.
- [x] Align wording with Core and Ingestion maturity docs.

## Comments

- Completed on 2026-03-27.
- Added `docs/supported-beta-policy.md` to define the SDK's supported-beta posture, compatibility
  review boundary, and default deprecation policy.
- Policy wording now matches the wider workspace use of `supported beta`, fail-safe guarantees, and
  deliberate compatibility review.
