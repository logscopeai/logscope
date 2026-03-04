# LSN-001: Bootstrap TypeScript SDK Tooling

## Context

Spec sections 2, 12, and 13 (Milestone 1) require a TypeScript Node SDK with Vitest coverage. Current repository state has no `src/` tree, no lockfile, no build script, and no real test runner in `package.json`.

## Objective

Establish a working TypeScript package foundation that supports local development (`npm link`), build, and test execution.

## Scope

### In Scope

- Configure `package.json` for `@logscopeai/logscope` package semantics and exports.
- Add TypeScript compiler configuration and source/output layout.
- Add Vitest baseline configuration and runnable test scripts.
- Add lockfile support so `npm ci` works.
- Ensure root and future `@logscopeai/logscope/pino` subpath exports are defined.

### Out of Scope

- Implementing ingestion, batching, retries, filtering, console capture, or pino behavior.

## Acceptance Criteria

1. `npm ci` succeeds on a clean clone.
2. `npm run build` compiles TypeScript output.
3. `npm test` executes Vitest successfully.
4. Package exports include `@logscopeai/logscope` and `@logscopeai/logscope/pino` entrypoints.
5. The package remains consumable via `npm link` from a separate local project.

## Implementation Notes

- Expected files/modules: `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, and placeholder `src/pino.ts`.
- Keep scripts aligned with `.github/format-check.yml` and `docs/linting.md`.
- Do not introduce synchronous I/O.

## Testing Requirements

- Add at least one Vitest smoke test that imports the root entrypoint.
- Verify scripts in CI/local shell: `npm ci`, `npm run build`, `npm test`.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%` (or threshold setup is enforced for subsequent tickets).
- Build passes.
- Documentation and scripts are updated if tooling commands changed.
