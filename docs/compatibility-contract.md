# Stable 1.0 SDK Contract

This document defines the stable `1.0` public contract for `@logscopeai/logscope`.

It is intentionally narrower than "everything that can be imported from the package today". The
goal is to protect customer integrations and cross-repo dependencies without freezing internal
implementation details that are not part of the supported SDK surface.

## Contract scope

Changes to the following documented surfaces require explicit contract review:

- the root package identity `@logscopeai/logscope`;
- the logger transport subpaths `@logscopeai/logscope/pino` and
  `@logscopeai/logscope/winston`;
- documented root SDK APIs, config fields, and exported types;
- documented integration factories and transport option shapes;
- documented fail-safe behavior and ingestion delivery classification.

Undocumented exports, internal helper plumbing, and module layout are not automatically part of the
stable `1.0` contract only because they are currently reachable from TypeScript output.

## Root API contract

The stable `1.0` root API contract includes:

- `Logscope` as the root client entrypoint;
- manual log methods `trace`, `debug`, `info`, `warn`, `error`, and `fatal`;
- `normalizeLog` as the documented normalization utility;
- documented consumer types from the root package, including:
  - `LogLevel`;
  - `LogFilterConfig`;
  - `LogscopeRuntimeConfig`;
  - `LogscopeInitConfig`;
  - `LogscopeClient`;
  - `IngestionLogEntry`;
  - `NormalizeLogInput`;
  - `NormalizeLogOptions`.

Stable `1.0` root behavior:

- `apiKey` remains the only required root-client field.
- `ingestionBaseUrl` remains the only root-client URL override.
- Root-client logs always emit the deterministic fallback source `unknown`.
- Root-client runtime defaults remain documented and bounded:
  - `maxBatchSize`: `50`
  - `flushIntervalMs`: `2000`
  - `maxRetries`: `3`
  - `retryBaseDelayMs`: `250`
  - `retryMaxDelayMs`: `2000`
- `new Logscope({ apiKey })` defaults to `https://ingestion.logscopeai.com` when no root-client
  override is provided.
- Root-client endpoint resolution order is `ingestionBaseUrl`, then `LOGSCOPE_INGESTION_URL`,
  then the production default.
- Root-client endpoint validation accepts only `https://*.logscopeai.com`,
  `http://localhost:<port>`, and `http://127.0.0.1:<port>`.
- The SDK does not expose a client-owned `environment` routing parameter.

## Integration contract

The stable `1.0` integration contract includes:

- the published pino subpath `@logscopeai/logscope/pino`;
- the published winston subpath `@logscopeai/logscope/winston`;
- the named factories `createPinoTransport` and `createWinstonTransport`;
- the default export of each subpath remaining equivalent to its named factory;
- the documented transport option interfaces:
  - `apiKey`
  - `endpoint`
  - `source`
  - optional `logFilter`
  - optional `flushIntervalMs`
  - optional `retryPolicy`

Integration behavior that is compatibility-sensitive:

- pino and winston integrations remain explicit opt-in transports; they do not patch frameworks
  globally;
- transport `source` remains required input on the integration surface;
- transport `endpoint` remains the documented URL field on the integration surface;
- log level mapping remains deterministic:
  - pino `10/20/30/40/50/60` -> `trace/debug/info/warn/error/fatal`
  - winston `error/warn/info/http/verbose/debug/silly` ->
    `error/warn/info/info/debug/debug/trace`
- transport logs still flow through the same filtering, normalization, batching, and retry
  pipeline semantics as the root client.

## Fail-safe behavior contract

The stable `1.0` fail-safe contract includes:

- the SDK must not throw into user code;
- the SDK must not log secrets such as API keys in warnings;
- filtering occurs before batching for manual, console, pino, and winston inputs;
- logs are normalized to the ingestion schema before delivery;
- batch size remains bounded by the ingestion contract maximum of `50`;
- message truncation remains bounded to `2048` characters;
- metadata remains JSON-safe and is dropped when normalized payload size exceeds `2048` bytes;
- invalid required configuration falls back safely instead of hard failing into caller code;
- invalid root-client endpoint overrides warn and switch the client into no-op behavior instead of
  silently rerouting to another host.

Delivery classification that is compatibility-sensitive:

- `POST /api/logs/ingest` remains the ingestion path used by the SDK;
- `x-api-key` remains the authentication header used by the SDK;
- `202` is treated as success;
- `400` and `413` cause the batch to be dropped;
- `401` triggers the unauthorized warning path;
- `429` and `500` trigger retry with backoff;
- batches are dropped after max retries are exhausted.

## Explicit Removal List For Stable 1.0

The following pre-`1.0` compatibility-only root-client surfaces are intentionally removed from the
stable contract:

- the root-package export `createLogscopeClient`;
- the root-client URL alias `endpoint`;
- the root-client input `context.source`.

These removals do not change the transport-side contract. Pino and winston integrations still use
their documented `endpoint` and `source` fields.

## Outside The Stable 1.0 Contract

The following are intentionally outside the stable `1.0` contract unless they become documented
later:

- internal file/module structure;
- batching queue implementation details;
- timer scheduling internals;
- exact warning message text;
- exact retry-delay math beyond the documented defaults and retry/drop classification;
- undocumented constants or helpers exported transitively from the root package;
- `createPinoTransportInternal`, `createWinstonTransportInternal`, transport dependency injection
  helpers, and mapper helpers exported for advanced/testing use.

## Change Expectations

Future changes should use this baseline:

1. Preserve documented behavior when possible.
2. Prefer additive expansion over silent breaking replacement.
3. Deprecate before removal when it is safe to do so.
4. Treat any change to this document as a stable-contract review event.
