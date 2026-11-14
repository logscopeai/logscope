import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import config, { analyzerOptions, commitTypes, notesOptions } from '../release.config.mjs';

const logger = { log() {} };
export const context = {
  cwd: process.cwd(),
  logger,
  options: { repositoryUrl: 'https://github.com/logscopeai/logscope.git' },
  lastRelease: { version: '1.0.2', gitTag: 'v1.0.2' },
  nextRelease: { version: '2.0.0', gitTag: 'v2.0.0' },
};

for (const type of commitTypes) {
  test(`${type} uses the configured release category`, async () => {
    const expected = { feat: 'minor', fix: 'patch', perf: 'patch' }[type] ?? null;
    const release = await analyzeCommits(analyzerOptions, {
      ...context,
      commits: [{ hash: 'abc1234', message: `${type}(sdk): LS-99 improve delivery` }],
    });
    assert.equal(release ?? null, expected);
  });
  for (const message of [
    `${type}!: replace the old interface`,
    `${type}: replace the old interface\n\nBREAKING CHANGE: Migrate to the new interface.`,
  ]) {
    test(`breaking ${type} produces a major: ${message.split('\n')[0]}`, async () => {
      assert.equal(
        await analyzeCommits(analyzerOptions, {
          ...context,
          commits: [{ hash: 'abc1234', message }],
        }),
        'major',
      );
    });
  }
}

test('the actual notes generator preserves breaking migration guidance', async () => {
  const notes = await generateNotes(notesOptions, {
    ...context,
    commits: [
      {
        hash: 'abc1234',
        message:
          'feat(sdk)!: replace the interface\n\nBREAKING CHANGE: Migrate to the new interface.',
      },
    ],
  });
  assert.match(notes, /Migrate to the new interface/);
  assert.match(notes, /BREAKING CHANGES/);
});

test('only main is released, with stable tags and the root package', () => {
  assert.deepEqual(config.branches, ['main']);
  assert.equal(config.tagFormat, 'v${version}');
  assert.deepEqual(config.plugins.find(([name]) => name === '@semantic-release/npm')[1], {
    pkgRoot: '.',
  });
});
