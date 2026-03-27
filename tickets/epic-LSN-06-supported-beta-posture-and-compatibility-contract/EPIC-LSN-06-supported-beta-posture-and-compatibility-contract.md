# EPIC-LSN-06: Supported Beta Posture and Compatibility Contract

## Context

The SDK already provides the core ingestion client behavior needed for production-minded usage, but
its public posture and cross-repo documentation still understate or contradict that reality.

## Goal

Graduate `@logscopeai/logscope` to a supported-beta posture with explicit compatibility and
deprecation expectations, while keeping the SDK fail-safe and conservative.

## Included Tickets

- `LSN-017` Define support, compatibility, and deprecation policy
- `LSN-018` Rewrite README, package, and docs to supported-beta posture
- `LSN-019` Freeze public SDK compatibility contract for root API, integrations, config, and
  fail-safe behavior
- `LSN-020` Publish canonical local-link and local-port guidance
- `LSN-021` Add release verification and docs closure

## Exit Criteria

- SDK documentation no longer describes the package as experimental.
- Supported-beta guarantees and deprecation posture are explicit.
- Public SDK behavior that customers depend on is documented as the compatibility contract.
- Local linking and topology guidance is consistent with the wider workspace.
- Release verification covers the supported-beta contract.
