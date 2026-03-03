# Logscope Node SDK — Functional Specification

## 1. Document Purpose

This document defines the functional and technical specification for `logscope`.

This specification targets a Proof of Concept implementation intended to validate:

- SDK architecture
- Ingestion API contract compatibility
- Developer experience
- Filtering behavior
- Batch delivery mechanics

This is not a production-ready specification.

---

## 2. Package Definition

Package name: `logscope`  
Distribution: npm  
Runtime target: Node.js  
Language: TypeScript

During early phases, the SDK must support execution via `npm link` and work seamlessly inside local development environments.

---

## 3. Public API

Primary v1 entry point:

```ts
new Logscope(config: LogscopeConfig): LogscopeClient
```

Compatibility entry point (supported as alias during migration):

```ts
createLogscopeClient(config: LogscopeConfig): LogscopeClient
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
import { Logscope } from 'logscope';

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
  endpoint?: string; // deprecated alias maintained for compatibility
  captureConsole?: boolean;
  context?: {
    source?: string; // deprecated caller input; SDK fallback is applied when omitted
  };
  logFilter?: LogFilterConfig;
  runtime?: LogscopeRuntimeConfig;
}
```

Rules:

- SDK initialization is runtime-config based and must not require direct environment-variable readers inside the package.
- If `ingestionBaseUrl` is omitted, SDK uses a centralized production default.
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
- `source` remains required in emitted ingestion entries; SDK must provide a deterministic fallback when caller input is omitted

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

## 9. Pino Transport

Path:

```
logscope/pino
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

No disk persistence in POC.

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
- Ingestion request builder

---

## 13. Development Path (POC Milestones)

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

### Milestone 4

- Hardening
- Validation guards
- Improved type safety

---

## 14. Non-Goals (POC Phase)

- Disk buffering
- Sampling
- OpenTelemetry
- Backpressure strategies
- Distributed tracing
- Production SLA guarantees

---

## 15. Objective

Deliver a functional, test-covered base implementation of `logscope` that:

- Respects the ingestion API contract
- Supports local development via npm link
- Enables filtering
- Supports pino via transport
- Is architecturally extensible

This specification defines the baseline for development stories and task planning.
