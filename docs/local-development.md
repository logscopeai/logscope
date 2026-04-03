# Local Development Guide

This document defines the canonical local-link and local-endpoint guidance owned by the SDK
repository.

It is intentionally scoped to SDK-side usage. It does not replace:

- the full customer onboarding journey owned by Logscope Core;
- the ingestion service bring-up steps owned by `logscope-ingestion-api`;
- repo-specific tooling defaults owned by payload generators or simulators.

## Canonical local ingestion target for SDK consumers

When you are validating `@logscopeai/logscope` against a locally running ingestion service, use:

```text
http://localhost:3000
```

SDK-side local delivery target:

```text
POST http://localhost:3000/api/logs/ingest
```

This matches the current local bring-up guidance in `logscope-ingestion-api/README.md`, where the
API service listens on port `3000`.

## Root client local override

The root SDK client currently defaults to `https://dev.ingestion.logscopeai.com`. Override
`ingestionBaseUrl` explicitly for local validation:

```ts
import { Logscope } from '@logscopeai/logscope';

const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'http://localhost:3000',
});
```

`ingestionBaseUrl` is the only root-client URL override. Root-client source input is not
configurable.

## Pino and winston local overrides

Transport subpaths keep `endpoint` as the transport option name:

```ts
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      {
        target: '@logscopeai/logscope/pino',
        options: {
          apiKey: process.env.LOGSCOPE_API_KEY!,
          endpoint: 'http://localhost:3000',
          source: 'billing-api',
        },
      },
    ],
  },
});
```

The same local endpoint applies to `createWinstonTransport`.

## Canonical `npm link` flow

From this repository:

```bash
npm ci
npm run build
npm link
```

From the consuming repository:

```bash
npm link @logscopeai/logscope
```

If you are actively iterating on SDK changes while consuming it from another workspace repo,
rerun:

```bash
npm run build
```

or:

```bash
npm run build -- --watch
```

after local edits so the linked consumer sees fresh `dist/` output.

## Ownership boundary

Use the following ownership split to avoid documentation drift:

- Logscope Core owns the canonical customer onboarding journey and account/app/environment setup
  order.
- `logscope-ingestion-api` owns the local ingestion service runtime bring-up.
- This repository owns SDK package linking, SDK-side config examples, and the canonical SDK target
  URL to use once the local ingestion API is running.

## Note on repo-local defaults elsewhere

Some other workspace tooling still carries repo-local convenience defaults that do not define the
SDK contract.

In particular, `logscope-payload-gen` currently documents its own local default URL separately. For
SDK validation, do not infer that repo-local default as the canonical SDK endpoint. Override tools
explicitly to the active ingestion URL when you need consistent end-to-end local runs.
