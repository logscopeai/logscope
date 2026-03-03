# Suggested PR Title

Harden SDK runtime safety with config validation guards, deterministic normalization limits, typed delivery outcomes, and full Milestone 4 test/documentation coverage

# Suggested PR Description

## Summary

This PR completes **EPIC-LSN-04 (Hardening and Type Safety)** by delivering both included tickets:

- `LSN-011` Add validation guards and safe fallbacks
- `LSN-012` Complete hardening tests and docs

The SDK now enforces stronger runtime guardrails while preserving core non-negotiables:

- no throws into user code
- no API key leakage in diagnostics
- filtering before batching
- test coverage above 90%

## What changed

### 1) Configuration hardening and safe fallbacks

- Added dedicated guard module for client and pino transport configuration validation.
- Required field checks now explicitly validate:
  - client: `apiKey`, `endpoint`, `context.source`
  - pino transport: `apiKey`, `endpoint`, `source`
- Invalid required config triggers safe warnings and uses no-op pipeline fallback.
- Warnings remain secret-safe and avoid exposing API keys.

### 2) Normalization hardening for ingestion constraints

- Added deterministic message truncation to enforce `message <= 2048` characters.
- Added metadata-size guard to drop metadata when normalized JSON exceeds `2048` bytes.
- Preserved fail-safe behavior for malformed values and serialization edge cases.

### 3) Type-safety improvements for delivery outcomes

- Refined ingestion delivery result typing into a discriminated union, improving action/error-path correctness for internal transport and pipeline flows.
- Kept behavior backward-compatible at runtime while clarifying internal contracts.

### 4) Hardening regression tests and coverage reinforcement

- Expanded tests for malformed configuration branches, warning safety, and no-throw guarantees.
- Added edge-case regression tests for exact-boundary message/metadata limits.
- Reinforced coverage across spec section 12 areas:
  - normalization
  - filtering
  - batching
  - retry/status handling
  - console interception
  - pino mapping/transport
  - request building
  - validation guards

### 5) Documentation updates

- Updated `README.md` with hardening behavior and additional documentation links.
- Added `docs/hardening-and-testing.md` with:
  - runtime hardening summary
  - ingestion contract reference (`POST /api/logs/ingest`, `x-api-key`)
  - section-12 coverage matrix
  - clean-checkout verification workflow (`npm ci`, `npm test`, `npm run test:coverage`, `npm run build`)
  - known limitations and non-goals

## Verification and quality gates

- Full test suite passes.
- Coverage remains above project threshold (>90%).
- Build succeeds.
- Ticket registry updated to mark Milestone 4 tickets as implemented.

## Risk and compatibility notes

- Runtime behavior remains fail-safe and backward-compatible for public APIs.
- Metadata overflow policy is explicit: metadata is dropped when above size limit.
- No new non-POC features were introduced.
