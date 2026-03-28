# @logscopeai/logscope

> Supported beta for the Logscope ingestion SDK.
>
> `@logscopeai/logscope` is the official Node.js SDK for sending application logs to the Logscope
> Ingestion API. The package is pre-GA, but its documented public behavior is treated as
> compatibility-sensitive and is maintained with a conservative, fail-safe posture.

`@logscopeai/logscope` lets Node.js applications capture logs, normalize them to the ingestion
schema, apply optional client-side filtering, batch delivery asynchronously, and forward logs to
Logscope without throwing into user code.

## Supported Beta Posture

- Supported beta means the SDK is intended for real integrations, not only disposable local demos.
- Supported beta does not mean GA:
  - internal implementation may still evolve;
  - future beta releases may add or refine surface area;
  - users should still pin versions deliberately and validate upgrades.
- Public behavior that is documented for consumers is treated as compatibility-sensitive.

See `docs/supported-beta-policy.md` for the support and deprecation policy, and
`docs/compatibility-contract.md` for the supported-beta compatibility baseline.

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
- Offer GA/SLA guarantees.

## Installation

```bash
npm install @logscopeai/logscope
```

For workspace development and local package iteration, `npm link` remains supported. See
`docs/local-development.md` for the canonical SDK-side local link and endpoint guidance.

## Quick Start (`Logscope`)

```ts
import { Logscope } from '@logscopeai/logscope';

const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
});

logscope.info('Service started');
logscope.error('Payment failed', { orderId: 123 });
```

`new Logscope({ apiKey })` uses the production ingestion URL default:

```text
https://ingestion.logscopeai.com
```

For local or test environments, override `ingestionBaseUrl` explicitly:

```ts
const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'http://localhost:3000',
});
```

## Compatibility Factory (`createLogscopeClient`)

The compatibility entrypoint remains available:

```ts
import { createLogscopeClient } from '@logscopeai/logscope';

const logscope = createLogscopeClient({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  captureConsole: true,
  context: {
    source: 'billing-api',
  },
  logFilter: {
    levels: ['warn', 'error'],
  },
  runtime: {
    maxBatchSize: 25,
    flushIntervalMs: 1_000,
    maxRetries: 5,
    retryBaseDelayMs: 200,
    retryMaxDelayMs: 4_000,
  },
});
```

`createLogscopeClient` and `Logscope` expose the same manual log methods:

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

## Client Configuration

Client config highlights:

- `apiKey` is required.
- `ingestionBaseUrl` is the canonical client override for local/dev/test routing.
- `endpoint` is still accepted on the root client as a deprecated compatibility alias.
- `captureConsole` is opt-in and disabled by default.
- `context.source` is optional and deprecated as required caller input; omitted values fall back to
  deterministic source `unknown`.
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
- Invalid required config triggers a safe warning and switches the client/transport into no-op
  fallback behavior.
- Warning diagnostics never include secret values such as API keys.
- `ingestionBaseUrl` is optional on the root client and falls back to the production default when
  omitted or invalid.
- The SDK does not expose a client-owned `environment` routing field.

Normalization enforces ingestion constraints:

- `message` is deterministically truncated to `<= 2048` characters.
- `metadata` is normalized to JSON-safe content and dropped if serialized size is `> 2048` bytes.

Fail-safe expectations:

- The SDK must never throw into user code.
- Filtering happens before batching.
- `401` results warn once.
- `429` and `500` results retry with backoff.
- Batches are dropped after max retries are exhausted.

## Public Types And Utilities

The root entrypoint exports the class API, compatibility factory, shared types, constants, and
normalization utility:

```ts
import { Logscope, createLogscopeClient, normalizeLog } from '@logscopeai/logscope';
import type {
  IngestionLogEntry,
  LogLevel,
  LogscopeClient,
  LogscopeConfig,
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
          endpoint: 'http://localhost:3000',
          source: 'billing-api',
        },
      },
    ],
  },
});
```

Pino transport notes:

- transport option name remains `endpoint`;
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
      endpoint: 'http://localhost:3000',
      source: 'billing-api',
      logFilter: {
        levels: ['warn', 'error'],
      },
    }),
  ],
});
```

Winston transport notes:

- transport option name remains `endpoint`;
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
- `400` / `413` -> drop batch
- `401` -> unauthorized warning path
- `429` / `500` -> retry with backoff
- retriable batches are dropped after max retries

## Current Limits And Non-Goals

- Supported beta, not GA.
- No disk persistence or local buffering.
- No sampling, tracing, or OpenTelemetry surface.
- No hidden global patching of pino or winston.
- No synchronous I/O.

## Testing And Build

Run the standard verification flow from a clean checkout:

```bash
npm ci
npm test
npm run build
```

Unit tests are co-located with the files they validate and coverage is enforced through Vitest.

## Additional Documentation

- Support and deprecation policy: `docs/supported-beta-policy.md`
- SDK compatibility contract: `docs/compatibility-contract.md`
- Local development and `npm link` guidance: `docs/local-development.md`
- Release verification checklist: `docs/release-verification.md`
- Hardening and coverage matrix: `docs/hardening-and-testing.md`
- Formatting and lint workflow: `docs/linting.md`
