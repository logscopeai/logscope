# @logscopeai/logscope

> Stable `1.0` Node.js SDK for sending application logs to the Logscope Ingestion API.
>
> `@logscopeai/logscope` is the official Node.js SDK for Logscope producers. The documented public
> contract is now stable `1.0` and is maintained with a conservative, fail-safe posture.

`@logscopeai/logscope` lets Node.js applications capture logs, normalize them to the ingestion
schema, apply optional client-side filtering, batch delivery asynchronously, and forward logs to
Logscope without throwing into user code.

## Stable 1.0 Posture

- Stable `1.0` means the documented SDK contract is intended for real integrations and deliberate
  long-lived usage.
- Stable `1.0` does not mean every future feature already exists:
  - no disk persistence or local buffering;
  - no sampling, tracing, or OpenTelemetry surface;
  - no hidden global patching of pino or winston.
- Documented public behavior remains compatibility-sensitive and requires deliberate review before
  it changes.

See `docs/stable-1.0-policy.md` for the stability and change policy, and
`docs/compatibility-contract.md` for the stable `1.0` contract baseline.

## What This Package Does

- Captures logs from:
  - the manual SDK API;
  - optional console capture;
  - pino via `@logscopeai/logscope/pino`;
  - winston via `@logscopeai/logscope/winston`.
- Normalizes logs to the ingestion schema.
- Applies optional level-based filtering before batching.
- Batches logs in memory and sends them asynchronously.
- Retries retriable delivery failures with backoff.
- Avoids throwing into user code.

## What This Package Does Not Do

- Validate API keys semantically against server-side policy.
- Persist logs to disk.
- Provide storage, analytics, dashboarding, or querying.
- Replace structured logging frameworks.
- Provide hosted-service SLA guarantees by itself.

## Installation

```bash
npm install @logscopeai/logscope
```

For workspace development and local package iteration, `npm link` remains supported. See
`docs/local-development.md` for the canonical SDK-side standalone-vs-integrated local-topology
guidance.

## Quick Start (`Logscope`)

```ts
import { Logscope } from '@logscopeai/logscope';

const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
});

logscope.info('Service started');
logscope.error('Payment failed', { orderId: 123 });
```

`new Logscope({ apiKey })` uses this default ingestion URL:

```text
https://ingestion.logscopeai.com
```

For development or local validation, override `ingestionBaseUrl` explicitly:

```ts
const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'https://dev.ingestion.logscopeai.com',
});
```

```ts
const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'http://localhost:3000',
});
```

If `ingestionBaseUrl` is omitted, the SDK also honors `LOGSCOPE_INGESTION_URL` before falling
back to the production default:

```bash
LOGSCOPE_INGESTION_URL=http://localhost:3000 node app.js
```

For example:

```ts
const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  // `ingestionBaseUrl` remains the stable root-client override field.
  ingestionBaseUrl: 'http://localhost:3000',
});
```

`Logscope` exposes these manual log methods:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

## Client Configuration

Client config highlights:

- `apiKey` is required.
- `ingestionBaseUrl` is the canonical root-client override for local, development, and test
  routing.
- `LOGSCOPE_INGESTION_URL` is the optional environment fallback when `ingestionBaseUrl` is
  omitted.
- `captureConsole` is opt-in and disabled by default.
- Root-client logs always use the deterministic fallback source `unknown`.
- `runtime` controls batching and retry quantities through validated safe defaults.

Runtime delivery knobs:

```ts
runtime: {
  maxBatchSize?: number; // default: 50, bounded to ingestion contract max
  flushIntervalMs?: number; // default: 2000
  maxRetries?: number; // default: 3
  retryBaseDelayMs?: number; // default: 250
  retryMaxDelayMs?: number; // default: 2000
}
```

Invalid runtime overrides are ignored safely and fallback to defaults without throwing.

## Validation And Safety Guarantees

Runtime guards are applied before delivery:

- Required config fields are validated before pipeline creation.
- Invalid required config or invalid root-client/transport endpoint input triggers a safe warning and
  switches the client or transport into no-op fallback behavior.
- Warning diagnostics never include secret values such as API keys.
- Root-client endpoint resolution order is `ingestionBaseUrl`, then `LOGSCOPE_INGESTION_URL`,
  then `https://ingestion.logscopeai.com`.
- Pino and Winston transport endpoint resolution order is `endpoint`, then
  `LOGSCOPE_INGESTION_URL`, then `https://ingestion.logscopeai.com`.
- Root-client endpoint validation accepts only `https://*.logscopeai.com`,
  `http://localhost:<port>`, and `http://127.0.0.1:<port>`.
- Invalid endpoint overrides do not silently reroute to production.
- The SDK does not expose a client-owned `environment` routing field.

Normalization enforces the ingestion constraints before an entry is queued, so a single bad
entry cannot cost the whole batch a `400`:

| Field                | Ingestion rule                               | SDK normalization                                                                                                        |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `source`             | trimmed, `2..100` characters                 | trimmed; shorter than `2` falls back to `unknown`; longer than `100` is truncated                                        |
| `message`            | trimmed, `1..2048` characters                | trimmed and truncated to `2048`; empty after trimming becomes `[empty message]` so the entry and its metadata still ship |
| `metadata`           | `<= 50` top-level keys, `<= 2048` JSON bytes | first `50` keys kept (insertion order); dropped entirely if still `> 2048` bytes                                         |
| `metadata.requestId` | trimmed, `<= 160` characters                 | trimmed, removed when empty, truncated to `160`                                                                          |
| batch                | `1..50` entries                              | `maxBatchSize` is capped at `50`                                                                                         |

Lengths are counted in UTF-16 code units (JavaScript `string.length`), the same unit the API uses.

Fail-safe expectations:

- The SDK must never throw into user code.
- Filtering happens before batching.
- `401` results warn once.
- `429` and `500` results retry with backoff.
- Batches are dropped after max retries are exhausted.
- A `400` whose `details` name specific entries (`"logs.<index>.<field>" …`) drops only those
  entries, resends the rest once, and warns with the positions and the first details. A `400`
  that is not attributable to entries, or a second `400` on the resend, drops the batch.

## Public Types And Utilities

The root entrypoint exports the class API, shared types, constants, and normalization utility:

```ts
import { Logscope, normalizeLog } from '@logscopeai/logscope';
import type {
  IngestionLogEntry,
  LogLevel,
  LogscopeClient,
  LogscopeInitConfig,
} from '@logscopeai/logscope';
```

`normalizeLog` converts SDK log input into ingestion-safe entries using:

```ts
{
  source,
  level,
  timestamp,
  message,
  metadata?,
}
```

## Filtering Logs

`logFilter.levels` restricts which levels enter the delivery pipeline:

```ts
logFilter: {
  levels: ['warn', 'error'],
}
```

- If no filter is configured, all logs are sent.
- If `logFilter.levels` is an empty array, all logs are filtered out.

## Console Capture

`captureConsole` is disabled by default.

When enabled, the SDK wraps:

- `console.log` -> `info`
- `console.info` -> `info`
- `console.warn` -> `warn`
- `console.error` -> `error`

Original console behavior is preserved, and captured entries flow through the same filtering and
batching pipeline used by the manual client API.

## Pino Integration

Logscope does not intercept pino automatically. Use the explicit transport subpath:

```ts
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      {
        target: '@logscopeai/logscope/pino',
        options: {
          apiKey: process.env.LOGSCOPE_API_KEY,
          source: 'billing-api',
        },
      },
    ],
  },
});
```

Pino transport notes:

- transport option name remains `endpoint`, but it is now optional;
- when `endpoint` is omitted, the transport resolves the target exactly like the root client:
  `LOGSCOPE_INGESTION_URL`, then `https://ingestion.logscopeai.com`;
- `source` is required on the transport surface;
- pino levels `10/20/30/40/50/60` map to Logscope levels
  `trace/debug/info/warn/error/fatal`;
- filtering still happens before batching.

## Winston Integration

Logscope does not patch winston globally. Use the explicit transport subpath:

```ts
import { createLogger, format } from 'winston';
import { createWinstonTransport } from '@logscopeai/logscope/winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp()),
  transports: [
    createWinstonTransport({
      apiKey: process.env.LOGSCOPE_API_KEY!,
      source: 'billing-api',
      logFilter: {
        levels: ['warn', 'error'],
      },
    }),
  ],
});
```

Winston transport notes:

- transport option name remains `endpoint`, but it is now optional;
- when `endpoint` is omitted, the transport resolves the target exactly like the root client:
  `LOGSCOPE_INGESTION_URL`, then `https://ingestion.logscopeai.com`;
- `source` is required on the transport surface;
- default npm levels map to Logscope levels
  `error/warn/info/info/debug/debug/trace`;
- filtering still happens before batching.

## Ingestion Contract Summary

The SDK sends logs to:

```text
POST /api/logs/ingest
```

Using header:

```text
x-api-key: <LOGSCOPE_API_KEY>
```

Response handling:

- `202` -> success
- `400` with entry-scoped `details` -> drop the named entries, resend the rest once, warn
- `400` (otherwise) / `413` -> drop batch
- `401` -> unauthorized warning path
- `429` / `500` -> retry with backoff
- retriable batches are dropped after max retries

## Current Limits And Non-Goals

- Stable `1.0` SDK contract, not a hosted-service SLA promise.
- No disk persistence or local buffering.
- No sampling, tracing, or OpenTelemetry surface.
- No hidden global patching of pino or winston.
- No synchronous I/O.

## Testing And Build

Run the standard verification flow from a clean checkout:

```bash
nvm use # Node 26.8.2; use npm 11.19.1 for tooling
npm ci
npm run format:check
npm run test:release
npm test
npm run build
npm run verify:package
```

Unit tests are co-located with the files they validate and coverage is enforced through Vitest.
The published SDK supports Node >=20. Source manifests use `0.0.0-development`; CI stamps
stable release versions. See [contributor guidance](CONTRIBUTING.md) and the
[release runbook](docs/release-verification.md) for squash metadata and publishing prerequisites.

## Additional Documentation

- Stability and change policy: `docs/stable-1.0-policy.md`
- Stable SDK contract: `docs/compatibility-contract.md`
- Local development and `npm link` guidance: `docs/local-development.md`
- Release verification checklist: `docs/release-verification.md`
- Hardening and coverage matrix: `docs/hardening-and-testing.md`
- Formatting and lint workflow: `docs/linting.md`
