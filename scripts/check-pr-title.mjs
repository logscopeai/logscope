import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { analyzeCommits } from '@semantic-release/commit-analyzer';
import createPreset from 'conventional-changelog-conventionalcommits';
import { CommitParser } from 'conventional-commits-parser';
import { analyzerOptions, commitTypes } from '../release.config.mjs';

const header =
  /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9][a-z0-9-]*)\))?(?<breaking>!)?: (?<summary>\S[^\r\n]*)$/u;

export async function checkPullRequest({ title, body = '' }) {
  const errors = [];
  const match = /[\r\n]/u.test(title) ? null : header.exec(title);
  body = body.replace(/\r\n/gu, '\n');
  if (!match) {
    errors.push('Use "<type>(<scope>): <summary>", e.g. "fix(sdk): LS-123 handle retries".');
  } else {
    const { type, breaking } = match.groups;
    if (!commitTypes.includes(type)) errors.push(`Use one of: ${commitTypes.join(', ')}.`);
    const { parser } = await createPreset();
    const { notes } = new CommitParser(parser).parse(`chore: probe\n\n${body}`);
    const breakingNotes = notes.filter((note) =>
      ['BREAKING CHANGE', 'BREAKING-CHANGE'].includes(note.title),
    );
    const hasMigration = breakingNotes.some(
      (note) => note.title === 'BREAKING CHANGE' && note.text.trim().length > 0,
    );
    if (breaking && !hasMigration) {
      errors.push('A title with "!" requires a "BREAKING CHANGE: <migration guidance>" footer.');
    }
    if (!breaking && breakingNotes.length) {
      errors.push('A BREAKING CHANGE footer requires "!" after the type or scope in the title.');
    }
  }
  const release = errors.length
    ? null
    : ((await analyzeCommits(analyzerOptions, {
        cwd: process.cwd(),
        logger: { log() {} },
        commits: [{ hash: '0', message: `${title}\n\n${body}` }],
      })) ?? null);
  return { errors, release };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { errors, release } = await checkPullRequest({
    title: process.env.PR_TITLE ?? '',
    body: process.env.PR_BODY ?? '',
  });
  const output = errors.length
    ? errors.map((error) => `- ${error}`).join('\n')
    : `This PR's squash commit requests: ${release ?? 'no release'}. Earlier unpublished commits may raise the aggregate release.`;
  console.log(output);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${output}\n`);
  if (errors.length) process.exitCode = 1;
}
