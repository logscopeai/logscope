# Suggested PR Title

[EPIC-LSN-07] Cut `@logscopeai/logscope` to a stable 1.0 contract and remove pre-1.0 root-client compatibility surfaces

# Suggested PR Description

## Summary

This PR closes `EPIC-LSN-07` and cuts `@logscopeai/logscope` from the previous supported-beta
posture to a stable `1.0` SDK contract.

It does five things:

1. Defines the stable `1.0` SDK contract and one explicit removal list for pre-`1.0`
   compatibility-only root-client surfaces.
2. Rewrites the repo-visible posture, package metadata, and SDK-owned maturity docs around stable
   `1.0`.
3. Removes deprecated root-client compatibility surfaces from the supported runtime API:
   `createLogscopeClient`, root `endpoint`, and root `context.source`.
4. Publishes one explicit SDK-side local topology matrix for standalone ingestion (`:3000`) versus
   integrated Core + Ingestion local runs (`:3001`).
5. Closes release verification, regression expectations, ticket tracking, and root-doc sync for
   the SDK side of the stable cut.

## Ticket Coverage

- `LSN-022` Define stable `1.0` SDK public contract and explicit removal list for pre-`1.0`
  compatibility surfaces
- `LSN-023` Rewrite README, package, and docs from supported beta to stable `1.0` posture
- `LSN-024` Remove deprecated root-client aliases and compatibility-only config surfaces
- `LSN-025` Publish final standalone-vs-integrated local topology guidance and remove stale
  workspace-path references
- `LSN-026` Close stable `1.0` release verification, regression matrix, and root-doc sync

## Main Changes

### 1) Stable 1.0 contract cut

- Rewrote `docs/compatibility-contract.md` as the stable `1.0` contract artifact.
- Made the pre-`1.0` removal list explicit:
  - root-package `createLogscopeClient`
  - root-client `endpoint`
  - root-client `context.source`
- Kept pino and winston transport boundaries explicit, including retained transport-side
  `endpoint` and `source` fields.

### 2) Stable 1.0 repo posture

- Rewrote `README.md` around the stable `1.0` SDK posture.
- Bumped package metadata from `0.1.0-beta.4` to `1.0.0`.
- Replaced `docs/supported-beta-policy.md` with `docs/stable-1.0-policy.md`.
- Updated `docs/hardening-and-testing.md`, `docs/release-verification.md`, `logscope-spec.md`, and
  `AGENTS.md` so SDK-owned maturity docs no longer present the package as supported beta.

### 3) Root-client compatibility removal

- Removed the public root-package export `createLogscopeClient`.
- Removed root-client `endpoint` handling and caller-provided root `context.source`.
- Kept fail-safe behavior intact: root client still never throws, still validates safely, and still
  emits deterministic fallback source `unknown`.
- Updated tests to verify the removed legacy inputs no longer affect runtime behavior.

### 4) Local topology guidance

- Rewrote `docs/local-development.md` around one explicit matrix:
  - standalone ingestion validation -> SDK target `http://localhost:3000`
  - integrated Core + Ingestion local runs -> SDK target `http://localhost:3001`
- Added explicit `logscope-npm` sibling-path guidance for `npm link`.
- Confirmed SDK-owned docs no longer carry stale `../logscope` references.

### 5) Release closure and root-doc sync

- Added a stable `1.0` regression matrix to `docs/release-verification.md`.
- Updated ticket statuses and comments for every ticket in `EPIC-LSN-07`.
- Reviewed root workspace docs and updated:
  - `/home/ubuntu/Documents/logscope-project/project-docs/current-state.md`
  - `/home/ubuntu/Documents/logscope-project/project-docs/roadmap.md`
  - `/home/ubuntu/Documents/logscope-project/context.md`
  - `/home/ubuntu/Documents/logscope-project/integration-annotations.md`
- Reviewed but did not update:
  - `/home/ubuntu/Documents/logscope-project/README.md`
  - `/home/ubuntu/Documents/logscope-project/project-docs/capability-model.md`

## Validation

```bash
npm run format:check
npm test
npm run build
```

## Risk And Contract Notes

- The stable `1.0` root client still defaults to `https://dev.ingestion.logscopeai.com`; this PR
  documents that explicitly rather than changing the runtime default.
- Transport-side `endpoint` and `source` remain supported intentionally; the compatibility removal
  applies only to the root client surface.
- Cross-repo stable-cut work still remains in `logscope-ingestion-api` and `logscope-payload-gen`,
  but the SDK side of the contract cut is now explicit and closed.
