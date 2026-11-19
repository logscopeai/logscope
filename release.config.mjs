export const commitTypes = ['feat', 'fix', 'perf', 'docs', 'refactor', 'test', 'chore', 'infra'];

export const analyzerOptions = {
  preset: 'conventionalcommits',
  releaseRules: [
    { breaking: true, release: 'major' },
    { type: 'feat', release: 'minor' },
    { type: 'fix', release: 'patch' },
    { type: 'perf', release: 'patch' },
  ],
};

export const notesOptions = { preset: 'conventionalcommits' };

export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', analyzerOptions],
    ['@semantic-release/release-notes-generator', notesOptions],
    ['@semantic-release/npm', { pkgRoot: '.' }],
    // Disable issue/PR comments so the release only needs contents:write and OIDC.
    ['@semantic-release/github', { successCommentCondition: false, failCommentCondition: false }],
  ],
};
