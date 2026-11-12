# AGENTS

Rules for contributors working on **`@logscopeai/logscope`**.

This repository owns the stable `1.0` Node.js SDK for sending application logs to the Logscope
Ingestion API. Keep contributor workflow and tracking aligned with the shared workspace governance
model.

## Context

- Package: `@logscopeai/logscope`
- Runtime: Node.js
- Language: TypeScript
- Status: Stable `1.0`
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

8. **All docs, tickets, comments, and UI copy in English.**

9. **When requested to perform a git commit make sure to follow the instructions provided in the file `.github/commit-message-instructions.md`**

10. **Prefer one PR per feature, even if multiple tickets are required to complete that feature.**

11. **For substantial work handoffs, explicitly state whether the root workspace docs were reviewed and whether updates were made or were not needed.**

12. **Use the `logscopeDev` GitHub identity for this SDK.** Follow the checks below before committing, pushing, or creating PRs.

### GitHub Identity

This SDK belongs to `logscopeai/logscope`. Use `logscopeDev` for pushes, PRs, and other GitHub write operations.

Before a GitHub CLI write operation, record the active account, then select and verify the SDK account:

```bash
previous_account=$(gh api user --jq .login)
gh auth switch --hostname github.com --user logscopeDev
gh api user --jq .login
```

The returned login must be `logscopeDev`. If switching or verification fails, stop the operation and report the issue. Browser sessions and GitHub connectors have separate authentication; verify their acting account too. An SSH identity does not select the account used to create PRs.

Before an authorized commit, configure the repository-local author and verify both effective identities:

```bash
git config --local user.name "Logscope Dev"
git config --local user.email "dev@logscopeai.com"
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
```

Both identities must use `Logscope Dev <dev@logscopeai.com>`; resolve any environment overrides before committing.

Before pushing, verify `git remote get-url --push origin` returns `git@github-logscope:logscopeai/logscope.git`. The local SSH alias `github-logscope` must authenticate as `logscopeDev` (`ssh -T git@github-logscope` prints `Hi logscopeDev!` and normally exits with status 1). Push SDK branches explicitly to `origin`; keep `personal-fork` as a reference, not a publication target.

Preserve other accounts' credentials, SSH keys, and global Git identity. `gh auth switch` changes the active account for all of `github.com`. Retain the captured `previous_account` login across tool calls and restore it when finished:

```bash
gh auth switch --hostname github.com --user "$previous_account"
```

### Agent Commit and PR Rules

When an AI agent is asked to implement a phase or feature, it must create multiple focused commits instead of one milestone-sized commit whenever the work includes more than one layer or concern.

The agent should announce the intended commit breakdown before committing.

Examples of acceptable commit boundaries:

- Configure project tooling.
- Add Electron shell.
- Add initial renderer screen.
- Add domain validation and tests.
- Update documentation.

A single commit is acceptable only for small changes that affect one concern.

Do not create one large commit for an entire phase, feature, or milestone if it touches multiple concerns.

**Pull Requests must be clear and descriptive**

- Titles and descriptions must be written in English.
- Prefer descriptive and explicit wording, even if verbose.
- Keep titles neutral and professional (avoid prefixes, tags or stylistic signatures added by tools or agents).

---

## Architectural Principles

- Explicit over implicit.
- No hidden global side effects.
- No synchronous I/O.
- No disk persistence in the current stable `1.0` phase.
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
