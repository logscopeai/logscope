import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { analyzerOptions, commitTypes } from '../release.config.mjs';
import { checkPullRequest } from './check-pr-title.mjs';

for (const type of commitTypes) {
  for (const scope of ['', '(sdk)']) {
    test(`accepts ${type}${scope} and matches the real analyzer`, async () => {
      const title = `${type}${scope}: LS-99 improve delivery`;
      const result = await checkPullRequest({ title });
      assert.deepEqual(result.errors, []);
      const expected = await analyzeCommits(analyzerOptions, {
        cwd: process.cwd(),
        logger: { log() {} },
        commits: [{ hash: '0', message: title }],
      });
      assert.equal(result.release, expected ?? null);
    });
  }
}

for (const title of [
  '',
  'fix:',
  'fix: ',
  'fix:    ',
  'fix(): summary',
  'fix(SDK): summary',
  'fix: summary\nfeat: injected header',
  'fix: summary\n',
  'LS-99 fix: summary',
  'build: summary',
  'ci: summary',
  'style: summary',
  'Feat: summary',
]) {
  test(`rejects malformed or unsupported title ${JSON.stringify(title)}`, async () => {
    const result = await checkPullRequest({ title });
    assert.ok(result.errors.length);
    assert.equal(result.release, null);
  });
}

test('breaking title and migration footer together produce a major', async () => {
  assert.deepEqual(
    await checkPullRequest({
      title: 'infra(release)!: change the release contract',
      body: 'Explanation.\r\n\r\nBREAKING CHANGE: Migrate to the new interface.',
    }),
    { errors: [], release: 'major' },
  );
});

for (const [title, body] of [
  ['feat!: change the interface', ''],
  ['feat!: change the interface', 'BREAKING CHANGE:'],
  ['feat!: change the interface', 'BREAKING-CHANGE: Migrate first.'],
  ['feat: change the interface', 'BREAKING CHANGE: Migrate first.'],
  ['chore: update', 'BREAKING-CHANGE: Migrate first.'],
  ['feat!: change the interface', 'The words BREAKING CHANGE: in prose are insufficient.'],
]) {
  test(`rejects mismatched breaking metadata: ${title} / ${body}`, async () => {
    assert.ok((await checkPullRequest({ title, body })).errors.length);
  });
}

test('metadata is data, including shell syntax', () => {
  const result = spawnSync(process.execPath, ['scripts/check-pr-title.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, PR_TITLE: 'fix: handle $(exit 42) and `exit 43`', PR_BODY: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /patch/);
});

test('invalid CLI metadata fails with an actionable message', () => {
  const result = spawnSync(process.execPath, ['scripts/check-pr-title.mjs'], {
    encoding: 'utf8',
    env: { ...process.env, PR_TITLE: 'invalid', PR_BODY: '' },
  });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /<type>/);
});
