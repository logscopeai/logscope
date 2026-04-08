# Logscope Node SDK — Functional Specification

## 1. Document Purpose

This document defines the functional and technical specification for `@logscopeai/logscope`.

This specification targets the stable `1.0` implementation and documents the behavior customers
and internal consumers can currently rely on:

- SDK architecture
- ingestion API contract compatibility
- developer experience
- filtering behavior
- batch delivery mechanics
- fail-safe delivery guarantees

This is a stable `1.0` SDK specification, not a hosted-service SLA commitment.

---

## 2. Package Definition

Package name: `@logscopeai/logscope`  
Distribution: npm  
Runtime target: Node.js  
Language: TypeScript

During stable `1.0`, the SDK must support execution via `npm link` and work seamlessly inside
local development environments.

---

## 3. Public API

Primary v1 entry point:

```ts
new Logscope(config: LogscopeInitConfig): LogscopeClient
```

### LogscopeClient Interface

```ts
interface LogscopeClient {
  trace(message: string, metadata?: unknown): void;
  debug(message: string, metadata?: unknown): void;
  info(message: string, metadata?: unknown): void;
  warn(message: string, metadata?: unknown): void;
  error(message: string, metadata?: unknown): void;
  fatal(message: string, metadata?: unknown): void;
}
```

Initialization example:

```ts
import { Logscope } from '@logscopeai/logscope';

const logscope = new Logscope({
  apiKey: 'ls_live_xxx',
});
```

---

## 4. Configuration Contract

```ts
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogFilterConfig {
  levels?: LogLevel[];
}

interface LogscopeRuntimeConfig {
  maxBatchSize?: number; // default 50, bounded to ingestion contract max
  flushIntervalMs?: number; // default 2000
  maxRetries?: number; // default 3
  retryBaseDelayMs?: number; // default 250
  retryMaxDelayMs?: number; // default 2000
}

interface LogscopeConfig {
  apiKey: string;
  ingestionBaseUrl?: string; // optional override for local/dev/testing
  captureConsole?: boolean;
  logFilter?: LogFilterConfig;
  runtime?: LogscopeRuntimeConfig;
}
```

Rules:

- SDK initialization is runtime-config based. `ingestionBaseUrl` remains the primary root-client
  override field.
- SDK may optionally read `LOGSCOPE_INGESTION_URL` when `ingestionBaseUrl` is omitted, but
  environment-variable usage is not required for integrations.
- If `ingestionBaseUrl` is omitted and `LOGSCOPE_INGESTION_URL` is unset, SDK defaults to
  `https://ingestion.logscopeai.com`.
- Root-client endpoint validation accepts only `https://*.logscopeai.com`,
  `http://localhost:<port>`, and `http://127.0.0.1:<port>`.
- Invalid root-client endpoint input must not silently fall back to another host.
- SDK must not expose a client-owned `environment` routing parameter.
- Environment/application/organization ownership is resolved server-side from API key scope.

---

## 5. Log Normalization

All logs must conform to ingestion API schema:

```ts
interface IngestionLogEntry {
  source: string;
  level: LogLevel;
  timestamp: string; // ISO-8601
  message: string;
  metadata?: Record<string, unknown>;
}
```

Constraints:

- message length <= 2048
- metadata JSON size <= 2048 bytes
- max 50 logs per batch
- minimum 1 log per request
- `source` remains required in emitted ingestion entries; root-client logs use the deterministic fallback `unknown`

---

## 6. Ingestion API Contract

Endpoint:

```
POST /api/logs/ingest
```

Header:

```
x-api-key: <LOGSCOPE_API_KEY>
Content-Type: application/json
```

Body:

```ts
{
  logs: IngestionLogEntry[]
}
```

Batch size:

- minItems: 1
- maxItems: 50

Accepted response:

```ts
{
  ingestionId: string;
  queuedCount: number;
}
```

SDK behavior:

- On 202 → success
- On 400 → drop batch
- On 401 → emit warning (once)
- On 413 → drop batch
- On 429 → retry with backoff
- On 500 → retry with backoff

---

## 7. Client-Side Filtering

Filtering occurs before enqueueing.

If `logFilter.levels` is defined:

```
Only send logs whose level is included.
```

If undefined:

```
Send all logs.
```

Filtering applies to:

- console logs
- manual API logs
- pino transport logs
- winston transport logs

---

## 8. Console Capture

If `captureConsole === true`:

Intercept:

- console.log → info
- console.info → info
- console.warn → warn
- console.error → error

Original console behavior must be preserved.

---

## 9. Logger Transports

### Pino Transport

Path:

```
@logscopeai/logscope/pino
```

Responsibilities:

- Receive structured pino JSON logs
- Map pino levels to LogLevel
- Apply filtering
- Forward to same batching pipeline

Must not:

- Intercept stdout
- Modify pino behavior
- Degrade performance significantly

### Winston Transport

Path:

```
@logscopeai/logscope/winston
```

Responsibilities:

- Receive structured winston `info` objects
- Map default npm winston levels to LogLevel
- Apply filtering
- Forward to same batching pipeline

Must not:

- Patch winston globally
- Modify winston behavior
- Degrade performance significantly

---

## 10. Batching Strategy

- In-memory queue
- Default max batch size: 50 (configurable via `runtime.maxBatchSize`)
- Flush conditions:
  - configured `runtime.maxBatchSize` reached
  - configured `runtime.flushIntervalMs` elapsed (default 2000 ms)
- Retry behavior is configurable via:
  - `runtime.maxRetries` (default 3)
  - `runtime.retryBaseDelayMs` (default 250)
  - `runtime.retryMaxDelayMs` (default 2000)
- Invalid runtime quantity overrides must fallback safely to defaults.

No disk persistence in stable `1.0`.

---

## 11. Error Handling Rules

- SDK must never throw into user code
- Misconfiguration warnings logged once
- Network errors handled internally
- After max retries, batch dropped

---

## 12. Testing Strategy

Framework: Vitest

Coverage target: > 90%

Required coverage areas:

- Normalization
- Filtering
- Batching
- Retry logic
- Console interception
- Pino transport mapping
- Winston transport mapping
- Ingestion request builder

---

## 13. Development Milestones

### Milestone 1

- Basic client
- Manual logging API
- Ingestion POST
- No batching
- Unit tests

### Milestone 2

- Batching
- Retry logic
- Coverage >90%

### Milestone 3

- Console interception
- Filtering
- Pino transport
- Winston transport

### Milestone 4

- Hardening
- Validation guards
- Improved type safety

---

## 14. Non-Goals (Stable 1.0 Phase)

- Disk buffering
- Sampling
- OpenTelemetry
- Backpressure strategies
- Distributed tracing
- Production SLA guarantees

---

## 15. Objective

Deliver a functional, test-covered stable `1.0` implementation of `@logscopeai/logscope` that:

- Respects the ingestion API contract
- Supports local development via npm link
- Enables filtering
- Supports pino and winston via transport
- Is architecturally extensible

This specification defines the baseline for development stories and task planning.
