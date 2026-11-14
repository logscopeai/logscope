# Contributing

Use Node 26.8.2 (`nvm use`) and npm 11.19.1 for development/release tooling. The published
SDK still supports Node >=20; release tools are development dependencies only.

```bash
npm ci
npm run format:check
npm run test:release
npm test
npm run build
npm run verify:package
```

`verify:package` installs the actual tarball in a temporary external consumer, checks runtime
exports and declarations, then removes the consumer. CI repeats SDK coverage and consumption
on Node 20. All four coverage thresholds remain 91%.

PRs targeting `main` use squash merge: the title becomes the commit subject and the description
becomes its body. Use `type(scope): LS-123 describe the change`; scope is optional where no
domain needs clarification. Types are `feat`, `fix`, `perf`, `docs`, `refactor`, `test`, `chore`
and `infra`. A breaking PR requires both `!` after its type/scope and a final description footer:

```text
BREAKING CHANGE: Explain the required consumer migration.
```

Validate title/body locally through `PR_TITLE` and `PR_BODY` environment variables with
`npm run check:pr-title`. The check reports this PR's release category. The aggregate release
also includes earlier unpublished commits. Follow the [commit guidelines](.github/commit-message-instructions.md).

Source `package.json` and lockfile versions remain `0.0.0-development`; do not bump them or
commit generated build output, version updates or changelogs. CI stamps the calculated version.
Use the [release runbook](docs/release-verification.md) for activation, verification and recovery.
