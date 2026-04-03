# Release Verification

This document defines the stable `1.0` release verification flow for `@logscopeai/logscope`.

Use it before publishing or otherwise promoting a new SDK release candidate.

## Verification Checklist

1. Confirm stable `1.0` docs are synchronized.
   - Review `README.md`.
   - Review `docs/stable-1.0-policy.md`.
   - Review `docs/compatibility-contract.md`.
   - Review `docs/local-development.md`.
   - Review `docs/hardening-and-testing.md`.
   - Review `logscope-spec.md`.
2. Confirm repo-visible copy does not regress to beta, experimental, or POC posture.
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
   - root client default ingestion URL remains `https://dev.ingestion.logscopeai.com`;
   - local SDK docs still use `http://localhost:3000` as the canonical standalone local ingestion
     target.
7. If the release changes a documented contract surface, update:
   - `docs/compatibility-contract.md`;
   - `docs/stable-1.0-policy.md` when stability or deprecation posture changes;
   - README examples and limitations;
   - root workspace docs when cross-repo understanding changes.
8. Review root workspace docs for drift:
   - `/home/ubuntu/Documents/logscope-project/README.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/current-state.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/roadmap.md`
   - `/home/ubuntu/Documents/logscope-project/project-docs/capability-model.md`
   - `/home/ubuntu/Documents/logscope-project/context.md`
   - `/home/ubuntu/Documents/logscope-project/integration-annotations.md`

## Remaining Stable 1.0 Limits

These limits should stay explicit in release notes and docs closure:

- stable `1.0` SDK contract does not imply a hosted-service SLA;
- no disk persistence or local buffering;
- no semantic API-key validation inside the SDK itself;
- no OpenTelemetry, tracing, or sampling surface;
- pino and winston remain explicit transports rather than global patches;
- cross-repo local-topology cleanup outside this repository may still require deliberate override
  care.

## Closure Expectation

Release closure is complete only when:

- repo docs, ticket metadata, and epic PR draft stay synchronized;
- root-doc review has been completed and updates were made where needed;
- test coverage remains above project thresholds;
- the build succeeds from the current branch state.
