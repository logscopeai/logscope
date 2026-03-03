> Human note: to apply these rules in GitHub Copilot, add in your global settings JSON:

```json
"github.copilot.chat.commitMessageGeneration.instructions": [
  { "file": ".github/commit-message-instructions.md" }
]
```

# Commit Message Guidelines

Use Conventional Commits:
`<type>(<scope>): <description>`

Allowed `type` values only:
`feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `infra`.
Do not add new types unless explicitly agreed.

Scope rules:

- Include scope when relevant (required in multi-layer/monorepo changes).
- Use lowercase, short, meaningful domain/layer names (for example: `backend`, `frontend`, `api`, `auth`, `users`, `infra`, `docs`).

Description rules:

- Prefer clarity over brevity; explain what changed and why.
- Use imperative verbs (`add`, `fix`, `prevent`, `remove`, etc).
- Describe behavior/outcome, not implementation detail.
- The intent/impact should be understandable without opening the diff.
- When relevant, include details on tickets or stories (for example: `docs: add ticket <<number/name>> about feature X`).

Commit composition:

- One commit = one logical, cohesive change.
- Split unrelated work (for example feature + refactor, code + major docs).

Do not include:

- File paths.
- Obvious context already covered by scope.
- Low-level internal implementation details.
- Emojis, jokes, or casual language.

Write for `git log --oneline` readability:

- Message should quickly show affected area, functional change, and whether impact is user-facing, behavioral, or internal.

Automation/AI expectations:

- Keep messages deterministic, machine-parseable, and changelog-friendly.
- Avoid ambiguity and unnecessary style variation.

Defaults unless stated otherwise:

- Language: English.
- Tone: professional and neutral.
- Scope required when multiple layers exist.
- Add a breaking-change footer only when there is an actual breaking change.
