# @logscopeai/logscope

> Supported beta
>
> `@logscopeai/logscope` is the supported Node.js SDK for the current Logscope release-stage
> onboarding path. Treat version changes deliberately before production rollouts; this is not yet
> presented as a GA stability promise.

`@logscopeai/logscope` is the official Node.js SDK for Logscope.

It enables Node.js applications to capture logs, normalize them, enrich them with execution context, and send them asynchronously to the Logscope Ingestion API for downstream processing.

For the full customer onboarding order, start with Logscope Core:

- `/docs/first-value-journey`
- `logscope-core-web-app/docs/customer-onboarding-guide.md`

This README owns package/runtime specifics only.

---

## Local Development and Linked Workspace Mode

For local workspace development, `@logscopeai/logscope` is expected to be executed locally using:

```
npm link
```

This allows the SDK to be developed and tested inside a consuming service before being published to npm.

The intended import pattern is:

```ts
import { Logscope } from '@logscopeai/logscope';
```

Compatibility with `npm link` is a design requirement.

---

## What This Package Does

- Captures logs from:
  - `console.log`, `console.info`, `console.warn`, `console.error` (opt-in)
  - Manual SDK logging API
  - Pino (via explicit transport)
  - Winston (via explicit transport)

- Normalizes logs to the Logscope ingestion contract
- Applies optional client-side filtering
- Batches logs (max 50 per request)
- Sends logs asynchronously to the Logscope Ingestion API
- Never throws into user code

---

## What This Package Does Not Do

- Store logs
- Query logs
- Render dashboards
- Perform AI analysis
- Persist logs to disk
- Replace structured logging frameworks

---

## Installation

```
npm install @logscopeai/logscope
```

Or during development:

```
npm link @logscopeai/logscope
```

---

## Basic Usage (Class API)

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

For development/testing, override `ingestionBaseUrl` explicitly:

```ts
const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'http://your-ingestion-origin',
});
```

Compatibility API (`createLogscopeClient`) remains available:

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

Manual API calls (`trace`/`debug`/`info`/`warn`/`error`/`fatal`) normalize logs and enqueue them for asynchronous batching (max 50 entries per request, interval flush fallback).

---

## Validation and Safety Guards

Runtime guards are applied before delivery:

- Required config fields are validated:
  - Client: `apiKey`
  - Pino transport: `apiKey`, `endpoint`, `source`
  - Winston transport: `apiKey`, `endpoint`, `source`
- Invalid required config triggers a single safe warning and switches to a no-op fallback pipeline.
- Warning diagnostics never include secret values such as API keys.
- `ingestionBaseUrl` is optional in SDK client config. Missing or invalid values fallback to the production default.
- `context.source` is optional; when omitted, emitted logs use deterministic fallback source value `unknown`.
- The SDK does not expose an `environment` routing field. Tenant/environment ownership is resolved by API key scope on the ingestion side.

Normalization enforces ingestion constraints:

- `message` is deterministically truncated to `<= 2048` characters.
- `metadata` is normalized to JSON-safe content and dropped if serialized size is `> 2048` bytes.

All guard paths are fail-safe and never throw into user code.

---

## Public Types and Utilities

The root entrypoint also exports shared contracts and normalization utilities:

```ts
import { Logscope, normalizeLog } from '@logscopeai/logscope';
import type {
  IngestionLogEntry,
  LogLevel,
  LogscopeClient,
  LogscopeConfig,
  LogscopeInitConfig,
} from '@logscopeai/logscope';
```

`normalizeLog` converts SDK log input into ingestion-safe entries using `{ source, level, timestamp, message, metadata? }`.

---

## Filtering Logs

Users may restrict which logs are sent to Logscope:

```ts
logFilter: {
  levels: ['warn', 'error'],
}
```

If no filter is configured, all logs are sent.

If `logFilter.levels` is configured as an empty array (`[]`), all logs are filtered out.

---

## Runtime Delivery Configuration

Runtime batching and retry quantities are configurable through `runtime` on client config:

```ts
runtime: {
  maxBatchSize?: number; // default: 50 (bounded to ingestion contract max)
  flushIntervalMs?: number; // default: 2000
  maxRetries?: number; // default: 3
  retryBaseDelayMs?: number; // default: 250
  retryMaxDelayMs?: number; // default: 2000
}
```

Invalid runtime quantity overrides are ignored safely and fallback to defaults without throwing.

---

## Console Capture

`captureConsole` is disabled by default.

When set to `true`, the SDK wraps:

- `console.log` (mapped to `info`)
- `console.info` (mapped to `info`)
- `console.warn` (mapped to `warn`)
- `console.error` (mapped to `error`)

Wrapped methods keep original console output and arguments, and captured entries are forwarded through the same filtering and batching pipeline used by the manual client API.

---

## Using Logscope with Pino

Logscope does not intercept pino automatically.

Instead, it provides an explicit transport:

```ts
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      {
        target: '@logscopeai/logscope/pino',
        options: {
          apiKey: process.env.LOGSCOPE_API_KEY,
          endpoint: 'http://your-ingestion-origin',
          source: 'billing-api',
        },
      },
    ],
  },
});
```

The transport maps standard pino levels (`10/20/30/40/50/60`) to Logscope levels (`trace/debug/info/warn/error/fatal`), applies `logFilter.levels` before enqueueing, and sends through the same batch/retry pipeline.

---

## Using Logscope with Winston

Logscope does not patch Winston automatically.

Instead, it provides an explicit transport:

```ts
import { createLogger, format } from 'winston';
import { createWinstonTransport } from '@logscopeai/logscope/winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp()),
  transports: [
    createWinstonTransport({
      apiKey: process.env.LOGSCOPE_API_KEY!,
      endpoint: 'http://your-ingestion-origin',
      source: 'billing-api',
      logFilter: {
        levels: ['warn', 'error'],
      },
    }),
  ],
});
```

The Winston transport maps default npm levels (`error/warn/info/http/verbose/debug/silly`) to Logscope levels (`error/warn/info/info/debug/debug/trace`), applies `logFilter.levels` before enqueueing, and forwards through the same batch/retry pipeline.

---

## API Contract

Logs are sent to:

```
POST /api/logs/ingest
```

Using header:

```
x-api-key: <LOGSCOPE_API_KEY>
```

The request body must follow the ingestion API contract defined in the Logscope specification.

Transport status handling is classified as:

- `202` -> success
- `400` / `413` -> drop
- `401` -> unauthorized warning path
- `429` / `500` -> retry with backoff
- retriable batches are dropped after max retries

---

## Status

This SDK is currently:

- Supported beta for the current Core onboarding path
- Under active development
- Intended for deliberate versioned rollouts rather than a blanket GA promise
- Subject to API changes with explicit review recommended before production upgrades

---

## Testing Conventions

Unit tests must be co-located with the files they validate.

Use either `.test.ts` or `.spec.ts` next to the implementation file, for example:

```text
src/
  dirA/
    file.ts
    file.spec.ts
  dirB/
    otherFile.ts
    otherFile.test.ts
```

Run tests with:

```bash
npm test
```

Run the explicit coverage gate locally with:

```bash
npm run test:coverage
```

---

## Additional Documentation

- Hardening and coverage matrix: `docs/hardening-and-testing.md`
- Formatting and lint workflow: `docs/linting.md`

## Local usage with `npm link`

To run the package locally in other repositories, use `npm link`:

Steps:

1. In this repository:

```
npm link
npm run build -- --watch
```

2. In the consuming repository:

```
npm link @logscopeai/logscope
```
