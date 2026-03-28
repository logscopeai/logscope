# Hardening and Test Matrix

This document records how `@logscopeai/logscope` satisfies its supported-beta hardening goals and
test coverage expectations from spec section 12.

## Runtime hardening summary

- Required configuration fields are guarded before pipeline creation.
- Invalid required configuration falls back to a no-op pipeline.
- Warnings are emitted safely and never throw into user code.
- Warning messages do not include API key values.
- Normalization enforces ingestion constraints:
  - `message` length is capped at `2048` characters by deterministic truncation.
  - `metadata` is dropped when normalized JSON size exceeds `2048` bytes.

## Ingestion contract reference

SDK delivery targets:

```http
POST /api/logs/ingest
```

Required header:

```http
x-api-key: <LOGSCOPE_API_KEY>
```

## Coverage matrix by required area

| Spec area                                | Primary test files                                                                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normalization                            | `src/normalization/normalize-log.test.ts`                                                                                                             |
| Filtering                                | `src/filter/level-filter.test.ts`, `src/pipeline/pipeline-ingress.test.ts`, `src/client/create-logscope-client.test.ts`                               |
| Batching                                 | `src/pipeline/batch-queue.test.ts`, `src/pipeline/flush-scheduler.test.ts`, `src/pipeline/pipeline.test.ts`                                           |
| Retry logic and status handling          | `src/retry/backoff.test.ts`, `src/retry/retry-policy.test.ts`, `src/pipeline/delivery-runner.test.ts`, `src/transport/send-ingestion-request.test.ts` |
| Console interception                     | `src/console/capture-console.test.ts`, `src/client/create-logscope-client.test.ts`                                                                    |
| Pino level mapping and transport flow    | `src/pino/map-pino-level.test.ts`, `src/pino/transport.test.ts`, `src/pino.test.ts`                                                                   |
| Winston level mapping and transport flow | `src/winston/map-winston-level.test.ts`, `src/winston/transport.test.ts`, `src/winston.test.ts`                                                       |
| Ingestion request builder                | `src/transport/send-ingestion-request.test.ts`                                                                                                        |
| Validation guards and safe fallbacks     | `src/config/config-guards.test.ts`, `src/client/create-logscope-client.test.ts`, `src/pino/transport.test.ts`, `src/winston/transport.test.ts`        |

## Local verification workflow (clean checkout)

Run these commands in order:

```bash
npm ci
npm test
npm run test:coverage
npm run build
```

Coverage thresholds are enforced in `vitest.config.ts`:

- lines: `91`
- statements: `91`
- functions: `91`
- branches: `91`

## Local development (`npm link`)

Local-link workflow remains supported:

```bash
npm link
```

Then consume from another project with:

```bash
npm link @logscopeai/logscope
```

See `docs/local-development.md` for the canonical SDK-side local endpoint and ownership boundary.

## Known limitations and non-goals

- Supported beta, not GA.
- No disk persistence or buffering.
- No API key semantic validation against server.
- No storage, analytics, dashboard, or querying capabilities.
- No OpenTelemetry or sampling features in this milestone.
