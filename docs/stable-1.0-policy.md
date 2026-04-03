# Stable 1.0 Policy

`@logscopeai/logscope` now carries a stable `1.0` public SDK contract.

This means the SDK is no longer presented as a beta integration surface. The documented contract is
intended for real production-oriented Node.js integrations and requires deliberate review before it
changes.

## What Stable 1.0 Means

- The package is intended for real Node.js applications that need the current ingestion client
  behavior.
- Maintainers treat documented public behavior as compatibility-sensitive and review changes to that
  behavior deliberately.
- The SDK keeps its fail-safe guarantees:
  - it must not throw into user code;
  - it must not log secrets;
  - filtering must occur before batching;
  - the ingestion API contract remains the governing external contract.
- Internal refactors, implementation details, and non-documented helpers may still change when they
  do not alter the documented stable contract.

## Stability-Sensitive Areas

The following areas require stable-contract review before they change:

- Package identity and public entrypoints:
  - `@logscopeai/logscope`
  - `@logscopeai/logscope/pino`
  - `@logscopeai/logscope/winston`
- Root SDK APIs and exported types that are documented for consumers.
- Documented configuration fields, defaults, and safe fallbacks.
- Fail-safe delivery guarantees such as no-throw behavior, filtering-before-batching, bounded batch
  sizes, and retry or drop classification.
- Integration behavior that other repos or customer code can reasonably depend on, especially pino
  and winston transport behavior.

The per-surface stable baseline is documented in `docs/compatibility-contract.md`.

## Change And Deprecation Policy

When a documented public field, alias, export, or behavior needs to change, maintainers should use
the following default policy:

1. Prefer additive changes over silent breaking replacement whenever practical.
2. Document deprecations clearly in repo-visible docs and, where applicable, in TypeScript API
   comments.
3. Keep deprecated surfaces working for a reasonable transition window when safety and correctness
   allow it.
4. Only remove a documented surface after explicit stable-contract review.

Immediate removal without a deprecation window is reserved for security, secret-handling, or severe
correctness issues where keeping the old behavior would be riskier than breaking compatibility.

## What Stable 1.0 Does Not Promise

Stable `1.0` does not imply:

- disk buffering or local persistence;
- sampling, tracing, or OpenTelemetry support;
- hidden framework patching beyond the documented console-capture opt-in;
- hosted-service uptime or support-policy guarantees outside the SDK code contract;
- freezing internal module layout or undocumented helpers.

## Cross-Repo Wording Boundary

Core, ingestion, payload-generator, and simulator docs may mirror this posture using the same
terms:

- `stable 1.0`, not `supported beta`;
- explicit contract review for documented SDK behavior;
- deprecations preferred over silent removals when safe;
- fail-safe behavior remains non-negotiable.
