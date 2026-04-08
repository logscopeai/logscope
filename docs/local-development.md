# Local Development Guide

This document defines the canonical SDK-side local-topology guidance for
`@logscopeai/logscope`.

It is intentionally scoped to SDK usage. It does not replace:

- the full customer onboarding journey owned by Logscope Core;
- the ingestion service bring-up steps owned by `logscope-ingestion-api`;
- repo-specific tooling defaults owned by payload generators or simulators.

## Local Topology Matrix

Use this matrix to choose the correct SDK target during local validation:

| Topology             | When to use it                                                                       | Local services                        | SDK target              |
| -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- | ----------------------- |
| Standalone ingestion | You are validating the SDK directly against a locally running ingestion service only | Ingestion on `:3000`                  | `http://localhost:3000` |
| Integrated workspace | You are running Core and Ingestion together in the final local workspace topology    | Core on `:3000`, Ingestion on `:3001` | `http://localhost:3001` |

The SDK always sends to:

```text
POST <target>/api/logs/ingest
```

## Standalone Ingestion Validation

When you are validating `@logscopeai/logscope` against a locally running ingestion service without
Core in the same local runtime, use:

```text
http://localhost:3000
```

This matches the standalone local bring-up guidance in `logscope-ingestion-api/README.md`, where
the API service listens on port `3000`.

## Integrated Workspace Validation

When Core and Ingestion are both running locally in the final workspace topology, do not point the
SDK at Core's `:3000` origin. Point the SDK at the local ingestion origin instead:

```text
http://localhost:3001
```

Use this integrated topology when you need the full local workspace flow, such as:

- Core-owned customer onboarding or API key lifecycle;
- ingestion calling Core internal routes during local end-to-end validation;
- local cross-repo validation where Core and Ingestion both run as separate services.

## Root Client Local Override

The root SDK client defaults to `https://ingestion.logscopeai.com`. Override
`ingestionBaseUrl` explicitly with the target from the matrix above:

```ts
import { Logscope } from '@logscopeai/logscope';

const logscope = new Logscope({
  apiKey: process.env.LOGSCOPE_API_KEY!,
  ingestionBaseUrl: 'http://localhost:3000', // use :3001 for the integrated workspace topology
});
```

`ingestionBaseUrl` is the only root-client URL override. Root-client source input is not
configurable.

If you prefer environment-based local switching, `LOGSCOPE_INGESTION_URL` is honored when
`ingestionBaseUrl` is omitted. Invalid local overrides do not silently fall back to production.

## Pino And Winston Local Overrides

Transport subpaths keep `endpoint` as the transport option name. Point that field to the target
from the topology matrix:

```ts
import pino from 'pino';

const logger = pino({
  transport: {
    targets: [
      {
        target: '@logscopeai/logscope/pino',
        options: {
          apiKey: process.env.LOGSCOPE_API_KEY!,
          endpoint: 'http://localhost:3000', // use :3001 for the integrated workspace topology
          source: 'billing-api',
        },
      },
    ],
  },
});
```

The same target rule applies to `createWinstonTransport`.

## Canonical `npm link` Flow

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

If you are following workspace instructions, the sibling repository name is `logscope-npm`, not
`logscope`.

If you are actively iterating on SDK changes while consuming it from another workspace repo, rerun:

```bash
npm run build
```

or:

```bash
npm run build -- --watch
```

after local edits so the linked consumer sees fresh `dist/` output.

## Ownership Boundary

Use the following ownership split to avoid documentation drift:

- Logscope Core owns the canonical customer onboarding journey and account, app, and environment
  setup order.
- `logscope-ingestion-api` owns the local ingestion service runtime bring-up.
- This repository owns SDK package linking, SDK-side config examples, and the SDK target to use
  once the active ingestion origin is known.

## Note On Repo-Local Defaults Elsewhere

Some other workspace tooling still carries repo-local convenience defaults that do not define the
SDK contract.

In particular, `logscope-payload-gen` may still document its own local default URL separately. For
SDK validation, do not infer the SDK target from another repo's local default. Use the topology
matrix in this document and override tools explicitly to the active ingestion origin.
