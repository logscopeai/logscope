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
   - local SDK docs distinguish standalone target `http://localhost:3000` from integrated
     workspace target `http://localhost:3001`.
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

## Stable 1.0 Regression Matrix

Use this matrix to confirm the stable `1.0` cut did not regress the supported SDK contract:

| Area                                 | Expected stable behavior                                                                                                                                           | Primary evidence                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Root client surface                  | Root package exposes `Logscope`; root package no longer exposes `createLogscopeClient`; root client accepts `ingestionBaseUrl` and emits fallback source `unknown` | `src/index.test.ts`, `src/logscope.test.ts`, `src/config/config-guards.test.ts`                                             |
| Manual filtering and console capture | `logFilter.levels` still filters before batching; console capture remains opt-in and preserves original console behavior                                           | `src/client/create-logscope-client.test.ts`, `src/console/capture-console.test.ts`, `src/pipeline/pipeline-ingress.test.ts` |
| Pino transport                       | `@logscopeai/logscope/pino` remains published; transport `endpoint` and `source` stay required; level mapping stays deterministic                                  | `src/pino.test.ts`, `src/pino/transport.test.ts`, `src/pino/map-pino-level.test.ts`                                         |
| Winston transport                    | `@logscopeai/logscope/winston` remains published; transport `endpoint` and `source` stay required; level mapping stays deterministic                               | `src/winston.test.ts`, `src/winston/transport.test.ts`, `src/winston/map-winston-level.test.ts`                             |
| Delivery contract                    | SDK still sends `POST /api/logs/ingest` with `x-api-key`; `202/400/413/401/429/500` remain classified per contract                                                 | `src/transport/send-ingestion-request.test.ts`, `src/pipeline/delivery-runner.test.ts`                                      |
| Local topology guidance              | SDK docs distinguish standalone ingestion on `:3000` from integrated Core + Ingestion local runs on `:3001`                                                        | `docs/local-development.md`                                                                                                 |

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
