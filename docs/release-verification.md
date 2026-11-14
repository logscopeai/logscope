# Release Verification

This is the canonical release and recovery procedure for `@logscopeai/logscope` in
[logscopeai/logscope](https://github.com/logscopeai/logscope). Automatic publication requires
reviewed merge and the separate LS-100 activation checks; preparing LS-99 does not certify live
publication or provenance.

## Release contract

Only pushes to `main` in the canonical repository can publish. The release workflow waits for
both instances of the reusable checks, serializes runs without cancelling an active release,
and fetches all history/tags. It uses Node 26.8.2/npm 11.19.1, npm Trusted Publishing/OIDC and
`GITHUB_TOKEN`; only the release job has `contents: write` and `id-token: write`. PRs, forks,
other branches and reusable checks have no publishing permissions. GitHub issue/PR release
comments are disabled, so no issue/PR write permission is required.

Conventional Commits determine the greatest required change since the last reachable stable
`v<version>` tag:

| Squash commit                                            | Release |
| -------------------------------------------------------- | ------- |
| Breaking change (`!` and migration footer)               | Major   |
| `feat`                                                   | Minor   |
| `fix`, `perf`                                            | Patch   |
| Nonbreaking `docs`, `refactor`, `test`, `chore`, `infra` | None    |

Use the PR title as squash subject and the PR description as body. Breaking PRs require both
`!` and a final `BREAKING CHANGE: <consumer migration>` footer. The metadata check runs on
opened/reopened/synchronize/edited events; its category describes that PR alone. Older
unpublished commits can raise the aggregate result. See [contributing](../CONTRIBUTING.md).

The source manifest and lockfile use `0.0.0-development`. The npm plugin writes the calculated
version only in CI, publishes the root package with compiled `dist`, and creates stable `latest`
publication, a `v${version}` tag and generated GitHub Release notes. It does not commit version
updates, a changelog or build artifacts. The existing npm `beta` channel is preserved. The SDK's
consumer engine remains Node >=20, independently of release tooling.

## Verify a candidate

Use a clean checkout and `nvm use`, then ensure `npm --version` is `11.19.1`:

```bash
npm ci
npm run format:check
npm run test:release
npm test
npm run build
npm run verify:package
npm run release:analyze
```

The nonmutating format check, unchanged four 91% coverage gates, release/metadata tests, clean
TypeScript build and external tarball consumption must all pass. Reusable checks perform the
same verification for PRs (including `dev`) and releases. CI installs tooling on Node 26, then
also runs SDK coverage and tarball consumption on Node 20. To reproduce the consumer leg after
building, select Node 20 and run `npm test` and `npm run verify:package`; do not install the
Node-26-only release dependencies under Node 20.

The verifier accepts exactly the compiled JS/maps/declarations, README, LICENSE and manifest.
It installs the tarball without SDK development dependencies or workspace links, imports the
root/pino/winston exports through ESM and CommonJS, reads the package-manifest export, and
compiles an external TypeScript consumer. The compiler comes from the checkout; Node types
are installed solely for the temporary consumer. Archives/consumers stay outside Git and are
removed on success or failure.

`release:analyze` is a read-only preview using the configured analyzer and notes generator. It
requires full history and tags; it never authenticates, prepares, tags, pushes or publishes.
At the verified initial baseline, `v1.0.2` is
`c44ee9bc896aaea92c089fec8cebd09c61f67676`, matching npm 1.0.2's `gitHead`. Keep that history;
let the current analyzer determine the next version instead of prescribing a patch or moving
an old tag. The preview is not proof of OIDC or a live release.

Review README, stable policy, compatibility contract, local-development guidance, hardening
matrix and spec for affected behavior. In particular preserve fail-safe behavior, filtering
before batching, transport exports, `ingestionBaseUrl`/`endpoint` routing and standalone
`:3000` versus integrated `:3001` ingestion. Both transports require `source`; `endpoint` is
optional and uses the documented environment/production fallback. SDK `1.0` stability does
not promise hosted-service SLA, disk persistence, semantic key validation, tracing or sampling.
Review the six workspace documents required by AGENTS.md and edit only material drift.

## Activation order (LS-105 and LS-106)

1. Prepare the LS-99 implementation PR with passing checks. Leave it open for required review.
2. Under LS-105, configure squash-only merge, title/description squash defaults and protected
   `main` with required review and the actual emitted metadata/Node-20/Node-26 check names.
   Recheck repository settings; current workflow code does not configure protection.
3. Configure the npm Trusted Publisher for organization/user `logscopeai`, repository `logscope`,
   workflow `release.yml`, using GitHub-hosted runners. Configure close to the explicitly
   authorized merge: npm requires the first publication within two days of setup. Do not add
   a persistent npm token or setup-node `registry-url`; token placeholders can interfere with OIDC.
4. After setup and required review, obtain explicit merge authorization. The resulting main
   push runs verification and calculates the aggregate version from retained history.
5. LS-106 verifies the workflow, npm version/`latest`/`gitHead`/provenance, matching tag and
   GitHub Release notes, unchanged `beta`, and published tarball consumption. Record concise
   links/results in Jira. A ready PR or successful local preview does not complete activation.

See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and
[semantic-release on GitHub Actions](https://semantic-release.org/recipes/ci-configurations/github-actions/).

## Reruns and partial-failure recovery

Inspect all three stores before retrying. Record the intended version, original release SHA,
workflow run, tag SHA, npm `gitHead`/integrity and GitHub Release state. Read-only examples:

```bash
git fetch origin --tags
# Set VERSION to the intended version recorded in the failed run.
git rev-parse "v${VERSION}^{commit}"
npm view "@logscopeai/logscope@${VERSION}" version gitHead dist.integrity --json
npm view @logscopeai/logscope dist-tags --json
gh release view "v${VERSION}" --repo logscopeai/logscope
```

| Observed state                                          | Recovery                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Failure before a version tag and before npm publication | Correct the cause, repeat required checks and rerun the authorized main workflow. Recheck registry state first.                                                                                                                                                                                                                                                |
| Tag exists, intended npm version absent                 | Stop automatic retries. semantic-release can treat the tag as released and skip that version. Preserve the tag and verify its exact SHA, intended notes and package. Use an explicitly authorized, reviewed recovery execution in the trusted `release.yml` context to finish that exact version through OIDC; do not move/delete the tag as a retry shortcut. |
| npm version exists, GitHub Release absent               | Do not republish. Verify npm provenance/integrity and tag SHA against the original checked commit. Recreate only the missing GitHub Release using the original generated notes and existing tag.                                                                                                                                                               |
| Tag, npm version and GitHub Release agree               | Rerunning the same completed commit has no new qualifying commits and creates no publication. Later qualifying main commits can release normally.                                                                                                                                                                                                              |
| Conflicting SHA, integrity, provenance or channel       | Stop and reconcile with the owner. Preserve published history; fix through a new reviewed release when needed.                                                                                                                                                                                                                                                 |

For a tag-only recovery, the authorized recovery job must check out the recorded SHA with full
history, use the pinned toolchain, repeat required verification and confirm the registry version
is still absent. Stamp the intended version with `npm version "$VERSION" --no-git-tag-version`,
rebuild and rerun `npm run verify:package`, then finish `npm publish --tag latest --provenance`
using OIDC in the approved workflow context. This is a reviewed recovery change, not a blind
semantic-release rerun or a local token publication. Restore normal workflow code afterward.

For a missing GitHub Release, retain/reconstruct the original generated notes from the failed
run at the exact SHA and use `gh release create "v${VERSION}" --verify-tag --notes-file <notes-file>`
with the canonical repo selected. This requires separate authorization for recovery writes.
The ordinary release workflow intentionally has no manual publication entry point.

A published npm version is immutable: never overwrite or reuse it, and do not unpublish to retry.
If npm publication succeeded with an incorrect package, coordinate a new reviewed version and
any necessary deprecation. After any recovery, verify all stores, provenance, `latest`, unchanged
`beta` and consumption; record the smallest useful evidence in Jira/PR.
