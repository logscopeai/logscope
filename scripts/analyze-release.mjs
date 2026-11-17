// Read-only history analysis: no authentication, preparation, tags, pushes or publication.
import { execFileSync } from 'node:child_process';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import semver from 'semver';
import { analyzerOptions, notesOptions } from '../release.config.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('rev-parse', '--is-shallow-repository') !== 'false') {
  throw new Error(
    'Fetch full history and tags before release analysis (git fetch --unshallow --tags).',
  );
}
const tags = git('tag', '--merged', 'HEAD')
  .split('\n')
  .filter((tag) => /^v\d+\.\d+\.\d+$/u.test(tag) && semver.valid(tag.slice(1)))
  .sort((a, b) => semver.rcompare(a.slice(1), b.slice(1)));
const gitTag = tags[0];
if (!gitTag)
  throw new Error('No reachable stable v<version> baseline; do not restart release history.');
const raw = git('log', `${gitTag}..HEAD`, '--format=%H%x00%B%x00');
const parts = raw.split('\0');
const commits = [];
for (let i = 0; i + 1 < parts.length; i += 2) {
  commits.push({ hash: parts[i].trim(), message: parts[i + 1].trim() });
}
const context = {
  cwd: process.cwd(),
  logger: { log() {} },
  options: { repositoryUrl: 'https://github.com/logscopeai/logscope.git' },
  commits,
  lastRelease: { gitTag, version: gitTag.slice(1) },
};
const type = await analyzeCommits(analyzerOptions, context);
const version = type ? semver.inc(context.lastRelease.version, type) : null;
console.log(
  JSON.stringify({ baseline: gitTag, commits: commits.length, type: type ?? null, version }),
);
if (version) {
  console.log(
    await generateNotes(notesOptions, {
      ...context,
      nextRelease: { type, version, gitTag: `v${version}` },
    }),
  );
}
