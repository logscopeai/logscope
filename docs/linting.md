# Auto Linting for logscope

This repository keeps formatting simple: Prettier is the single source of truth, with local scripts in `package.json`, Husky pre-commit integration, and a CI format gate in `.github/format-check.yml`.

## 1) Prettier as the canonical formatter

- The root `.prettierrc` is the configuration Prettier consumes. It contains the following settings:

```json
{
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all"
}
```

- Keep this file in sync with any tooling that formats other file types (e.g., upcoming IDE or CI wrappers).

## 2) Running Prettier locally

- Format everything in the repo with:

  ```bash
  npx prettier --config .prettierrc --write .
  ```

- Verify formatting before pushing with:

  ```bash
  npx prettier --config .prettierrc --check .
  ```

Equivalent npm scripts are also available:

```bash
npm run format
npm run format:check
```

## 3) Husky + lint-staged pre-commit hook

- The Husky hook at `.husky/pre-commit` runs `npx lint-staged`.
- The lint-staged configuration lives in `package.json` and targets the same file types that rely on Prettier:

```json
{
  "*.{ts,js,tsx,jsx,html,css,scss,json,md}": "npx prettier --config .prettierrc --write"
}
```

- With that configuration in place, staging changes and running `git commit` will automatically format those files before the commit is finalized.

## 4) CI formatting guard

- Pull requests run `.github/format-check.yml`, which executes:
  - `npm ci`
  - `npm run format:check`
- Run `npm run format:check` locally before opening or updating a PR to avoid CI failures.

This document reflects the current layout: Prettier config at the root, npm format scripts, Husky + lint-staged for pre-commit formatting, and a CI format-check workflow.
