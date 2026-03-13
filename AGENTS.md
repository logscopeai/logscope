# AGENTS

Rules for contributors working on `@logscopeai/logscope`.

## Context

- Package: `@logscopeai/logscope`
- Runtime: Node.js
- Language: TypeScript
- Status: Early-stage POC
- Role: Client SDK that sends logs to Logscope Ingestion API

The authoritative behavioral reference is `logscope-spec.md`.

---

## Non-Negotiables

1. The ingestion API contract must be respected.
2. Never log secrets (especially API keys).
3. SDK must never throw into user code.
4. Filtering must occur before batching.
5. Documentation must be in English.
6. All new or modified functionality requires unit tests.
7. Unit test coverage must remain > 90%.
8. Do not commit `.env`, `dist/`, `node_modules/`, logs, or temp files.
9. No `git commit` or `git push` without explicit authorization.
10. Follow `.github/commit-message-instructions.md` when committing.
11. When finished working on an epic, make sure to create a new markdown file in the corresponding directory in `tickets/<<epic-name>>/<<epic-name>>_pr.md` with a suggested PR description and title, both description and title should be descriptive, verbose and accurately reflect the changes made in the epic. This rule does not apply to the tech debt epic (if such epic exists).
12. When finished working on a ticket from the dir `tickets/` make sure to update the status of the ticket in the `tickets/ticket_registry.md` file and the ticket itself (checklist, status, comments, etc.).
13. For large features, SDK-surface changes, contract changes, or major maturity/status changes, also review the root workspace docs in `/home/ubuntu/Documents/logscope-project` and update them if needed.
14. In substantial-work handoffs, explicitly state whether the root workspace docs were reviewed and whether updates were made or were not needed.

---

## Architectural Principles

- Explicit over implicit.
- No hidden global side effects.
- No synchronous I/O.
- No disk persistence (POC phase).
- Fail silently and safely.

---

## Core Responsibilities

The SDK must:

- Capture logs (manual API, optional console, pino transport).
- Normalize logs to ingestion schema.
- Apply optional level-based filtering.
- Batch logs.

The SDK must not:

- Validate API keys.
- Perform heavy processing.
- Implement storage or analytics.
- Introduce blocking behavior.

---

## Error Handling

- Never throw into user code.
- 401 → warn once.
- 429 / 500 → retry with backoff.
- Drop batch after max retries.

---

## Testing

Framework: Vitest  
Coverage target: > 90%

---

## Workflow

Setup:

```
npm ci
```

Test:

```
npm test
```

Build:

```
npm run build
```

Ensure clean build before handoff.

---

## Handoff

When completing work:

- State scope covered.
- Provide test/coverage evidence.
- List any contract risks.
