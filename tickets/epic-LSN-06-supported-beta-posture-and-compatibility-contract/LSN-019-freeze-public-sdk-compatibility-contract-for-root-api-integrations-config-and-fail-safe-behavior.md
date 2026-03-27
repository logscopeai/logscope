# LSN-019: Freeze Public SDK Compatibility Contract for Root API, Integrations, Config, and Fail-Safe Behavior

## Context

The supported-beta promise needs one explicit list of the public SDK behavior that customers and
dependent repos are allowed to rely on.

## Objective

Define the public compatibility contract for the SDK surface most likely to affect customers or
other repos.

## Scope

### In Scope

- Define compatibility-sensitive behavior for the root API and exported types.
- Define compatibility-sensitive behavior for pino/winston integrations and configuration.
- Keep fail-safe behavior, filtering-before-batching, and no-throw guarantees explicit.
- Document what remains intentionally outside the compatibility contract.

### Out of Scope

- New feature work for additional integrations.
- Ingestion API contract changes.

## Acceptance Criteria

1. Public SDK contract is documented for root API, integrations, config, and fail-safe behavior.
2. Non-goals and non-contract internals are explicitly distinguished.
3. Core and payload-gen can depend on the documented contract without ambiguity.
4. Future changes have a clear baseline for compatibility review.

## Implementation Notes

- The contract should be narrow enough to keep the package maintainable and broad enough to protect
  customer integrations.

## Status

Backlog

## Checklist

- [ ] Document root API compatibility expectations.
- [ ] Document integration/config compatibility expectations.
- [ ] Keep fail-safe guarantees explicit.
- [ ] Distinguish public contract from internal implementation detail.

## Comments

- Planning ticket only.
