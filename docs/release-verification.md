# Release Verification

This document defines the supported-beta release verification flow for `@logscopeai/logscope`.

Use it before publishing or otherwise promoting a new SDK release candidate.

## Verification checklist

1. Confirm supported-beta docs are synchronized.
   - Review `README.md`.
   - Review `docs/supported-beta-policy.md`.
   - Review `docs/compatibility-contract.md`.
   - Review `docs/local-development.md`.
   - Review `docs/hardening-and-testing.md`.
   - Review `logscope-spec.md`.
2. Confirm repo-visible copy does not regress to experimental or POC posture.
3. Run formatting:

```bash
npm run format
```

4. Run the full test suite with coverage gate:

```bash
npm test
```

5. Run the TypeScript build:

```bash
npm run build
```

6. Verify package surface assumptions:
   - package name remains `@logscopeai/logscope`;
   - root package export remains available;
   - `./pino` and `./winston` subpath exports remain published;
   - root client default ingestion URL remains the production endpoint;
   - local SDK docs still use `http://localhost:3000` as the canonical local ingestion target.
7. If the release changes a documented contract surface, update:
   - `docs/compatibility-contract.md`;
   - `docs/supported-beta-policy.md` when deprecation posture changes;
   - README examples and limitations;
   - root workspace docs when cross-repo understanding changes.
8. Review root workspace docs for drift:
   - `/home/ubuntu/Documents/logscope-project/README.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/current-state.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/roadmap.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/capability-model.md`
   - `/home/ubuntu/Documents/logscope-project/context.md`
   - `/home/ubuntu/Documents/logscope-project/integration-annotations.md`

## Remaining supported-beta limits

These limits should stay explicit in release notes and docs closure:

- supported beta is not GA;
- no disk persistence or local buffering;
- no semantic API-key validation inside the SDK itself;
- no OpenTelemetry, tracing, or sampling surface;
- pino and winston remain explicit transports rather than global patches;
- cross-repo local-default cleanup outside this repository may still require deliberate override
  care.

## Closure expectation

Release closure is complete only when:

- repo docs, ticket metadata, and epic PR draft stay synchronized;
- root-doc review has been completed and updates were made where needed;
- test coverage remains above project thresholds;
- the build succeeds from the current branch state.
