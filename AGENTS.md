# AGENTS

Rules for contributors working on **`@logscopeai/logscope`**.

This repository owns the supported-beta Node.js SDK for sending application logs to the Logscope
Ingestion API. Keep contributor workflow and tracking aligned with the shared workspace governance
model.

## Context

- Package: `@logscopeai/logscope`
- Runtime: Node.js
- Language: TypeScript
- Status: Supported beta
- Role: Client SDK that sends logs to Logscope Ingestion API

The authoritative behavioral reference is `logscope-spec.md`.

---

## Non-Negotiables

1. **Keep README and docs accurate**
   - Update `README.md` and relevant docs when SDK behavior, runtime configuration, or support
     posture changes.
   - For large features, SDK-surface changes, contract changes, or major maturity-status changes,
     also review the root workspace docs:
     - `../README.md`
     - `../project-docs/current-state.md`
     - `../project-docs/roadmap.md`
     - `../project-docs/capability-model.md`
     - `../context.md`
     - `../integration-annotations.md`

2. **The ingestion API contract must be respected.**

3. **Security first**
   - Never log secrets, especially API keys.

4. **SDK safety contract stays intact**
   - SDK must never throw into user code.
   - Filtering must occur before batching.

5. **No generated artifacts in git**
   - Do not commit `.env`, `dist/`, `node_modules/`, logs, or temp files.

6. **Tests required** for new or modified behavior.

7. **Unit test coverage must remain > 90%.**

8. **No git commit or push without explicit request.**

9. **All docs, tickets, comments, and UI copy in English.**

10. **When requested to perform a git commit make sure to follow the instructions provided in the file `.github/commit-message-instructions.md`**

11. **When finished working on a ticket from the dir `tickets/` make sure to update the status of the ticket in the `tickets/ticket_registry.md` file and the ticket itself (checklist, status, comments, etc.).**

12. **When finished implementing a feature from an epic, make sure to create a new markdown file in the corresponding directory in `tickets/epics/<<epic>>/<<feature>>/<<feature>>_pr.md` with a suggested PR description and title, both description and title should be descriptive, verbose and accurately reflect the changes made in the development, for tracking purposes please try to include the number of the feature and epic in the generated title of the PR so when checking the PR list anyone can see the relationship.** This rule does not apply to a technical-debt epic if such an exception is explicitly documented.

13. **Expected and preferred ticket structure is as follows:** `tickets/epics/<<epic-name>>/<<feature-name>>/<<ticket-name>>`. Prefer small tickets and granular features. Historical ticket layouts remain valid legacy content, but new work should use feature-grouped organization whenever practical.

14. **Prefer one PR per feature, even if multiple tickets are required to complete that feature.**

15. **For substantial work handoffs, explicitly state whether the root workspace docs were reviewed and whether updates were made or were not needed.**

---

## Architectural Principles

- Explicit over implicit.
- No hidden global side effects.
- No synchronous I/O.
- No disk persistence in the current supported-beta phase.
- Fail silently and safely.

---

## Core Responsibilities

The SDK must:

- Capture logs (manual API, optional console, pino transport, winston transport).
- Normalize logs to ingestion schema.
- Apply optional level-based filtering.
- Batch logs.

The SDK must not:

- Validate API keys semantically.
- Perform heavy processing.
- Implement storage or analytics.
- Introduce blocking behavior.

---

## Error Handling

- Never throw into user code.
- `401` -> warn once.
- `429` / `500` -> retry with backoff.
- Drop batch after max retries.

---

## Testing

- Framework: Vitest
- Coverage target: > 90%

---

## Workflow

- Setup: `npm ci`
- Test: `npm test`
- Build: `npm run build`
- Format: `npm run format`
- Format check: `npm run format:check`
- Pre-commit hook: `npx lint-staged` through Husky

Ensure clean build and passing tests before handoff.

---

## Handoff

When completing work:

- State scope covered.
- Provide test and coverage evidence.
- List any contract risks.
- State whether root workspace docs were reviewed and whether updates were made or were not needed.
