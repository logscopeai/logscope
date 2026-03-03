# LSN-007: Enforce Vitest Coverage Gate

## Context

Spec section 12 and AGENTS non-negotiables require unit tests with coverage above `90%`. Current repo does not enforce coverage thresholds in scripts or CI.

## Objective

Make coverage enforcement automatic in local and CI workflows.

## Scope

### In Scope

- Configure Vitest coverage provider and global thresholds (`> 90%`).
- Add/align scripts (`test`, `test:coverage`, optional `test:watch`).
- Add CI workflow checks for test and coverage.
- Ensure format workflow references valid scripts.

### Out of Scope

- New product behavior unrelated to test tooling.

## Acceptance Criteria

1. Running `npm run test:coverage` fails when coverage drops below threshold.
2. CI runs coverage checks on pull requests.
3. Coverage thresholds are explicit and version-controlled.
4. Contributor docs explain how to run tests and coverage locally.

## Implementation Notes

- Expected files/modules: `vitest.config.ts`, `package.json`, `.github/workflows/*`, `docs/` updates.
- Thresholds must include branches, functions, lines, and statements.
- Keep commands compatible with `npm ci` and local `npm link` workflows.

## Testing Requirements

- Validate coverage command in CI and local shell.
- Add tests as required to satisfy thresholds after enabling gates.

## Definition of Done

- Tests pass.
- Coverage remains `> 90%` and is enforced automatically.
- Build passes.
- Documentation is updated in English.
