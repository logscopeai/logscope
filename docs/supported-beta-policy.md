# Supported Beta Policy

`@logscopeai/logscope` is in a supported-beta posture.

This means the SDK is no longer treated as a casual experiment or throwaway proof-of-concept
package, but it is also not yet a general-availability commitment.

## What supported beta means

- The package is intended for real Node.js integrations that need the current ingestion client
  behavior.
- Maintainers treat documented public behavior as compatibility-sensitive and require deliberate
  review before changing it.
- The SDK remains conservative and fail-safe:
  - it must not throw into user code;
  - it must not log secrets;
  - filtering must occur before batching;
  - the ingestion API contract remains the governing external contract.
- Internal refactors, implementation details, and non-documented helpers may still change when they
  do not alter the documented public contract.

## Compatibility-sensitive areas

The following areas require compatibility review before they change:

- Package identity and public entrypoints:
  - `@logscopeai/logscope`
  - `@logscopeai/logscope/pino`
  - `@logscopeai/logscope/winston`
- Root SDK APIs and exported types that are documented for consumers.
- Documented configuration fields, defaults, deprecations, and safe fallbacks.
- Fail-safe delivery guarantees such as no-throw behavior, filtering-before-batching, bounded batch
  sizes, and retry/drop classification.
- Integration behavior that other repos or customer code can reasonably depend on, especially pino
  and winston transport behavior.

The per-surface compatibility baseline is documented in `docs/compatibility-contract.md`.

## Deprecation policy

When a documented public field, alias, export, or behavior needs to change, maintainers should use
the following default policy:

1. Mark the surface as deprecated in repo-visible docs and, where applicable, in TypeScript API
   comments.
2. Keep the deprecated surface working for at least one subsequent beta release when it is safe to
   do so.
3. Document the preferred replacement in the same change that introduces the deprecation.
4. Only remove the deprecated surface after explicit compatibility review.

Immediate removal without a deprecation window is reserved for security, secret-handling, or severe
correctness issues where keeping the old behavior would be riskier than breaking compatibility.

## What is not part of the compatibility promise

The supported-beta promise does not freeze:

- internal module layout;
- private helper functions or internal warnings that are not documented API;
- test-only utilities;
- future integrations that are not yet published as public entrypoints;
- packaging or repository ergonomics that do not change the documented package identity.

## Cross-repo wording boundary

Core and ingestion docs may mirror this posture using the same terms:

- `supported beta`, not experimental;
- explicit compatibility review for documented SDK behavior;
- deprecations preferred over silent removals;
- fail-safe behavior remains non-negotiable.
