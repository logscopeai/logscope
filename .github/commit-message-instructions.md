> Note for human users (if you are an AI Agent you can ignore this): in order for these guidelines to be followed by GitHub Copilot you must add a new key to your global settings file and link it to this file (`ctrl`+`shift`+`p` -> `Preferences: Open Settings (JSON)`):

```json
  "github.copilot.chat.commitMessageGeneration.instructions": [
    { "file": ".github/commit-message-instructions.md" }
  ]
```

# Commit Message Guidelines

These guidelines define the standard for writing commit messages in this repository.  
They are intended to be clear, consistent, automation-friendly, and suitable for both humans and AI agents.

---

## 1. Follow Conventional Commits

All commit messages **must** follow the Conventional Commits format:

```
<type>(<scope>): <description>
```

Examples:

```
feat(backend): add email-based two-factor authentication flow
fix(auth): prevent login when account is locked
refactor(frontend): simplify dropdown state handling
```

---

## 2. Use Clear and Consistent Types

Use the following commit types:

- `feat` – New functionality
- `fix` – Bug fixes
- `refactor` – Code changes that neither add features nor fix bugs
- `test` – Adding or updating tests
- `docs` – Documentation-only changes
- `chore` – Maintenance, tooling, configuration, or cleanup
- `perf` – Performance improvements
- `infra` – Infrastructure or deployment-related changes

Do not introduce new types unless explicitly agreed upon.

---

## 3. Always Include a Scope When Relevant

When working in a monorepo or a multi-layer system, a scope **must** be included.

Common scopes include:

- `backend`
- `frontend`
- `api`
- `auth`
- `users`
- `infra`
- `docs`

Rules for scopes:

- Lowercase
- Short and meaningful
- Represents the affected layer or domain

Examples:

```
feat(backend): add admin endpoint to manage user two-factor authentication
fix(api): handle expired verification tokens correctly
```

---

## 4. Prefer Descriptive and Detailed Messages Over Brevity

**Descriptiveness is preferred over brevity.**

A commit message should clearly explain **what changed and why**, even if this results in a longer message.  
It is acceptable—and encouraged—for commit messages to be longer if that improves clarity.

Avoid overly brief or generic messages such as:

```
feat: update auth
```

Prefer:

```
feat(backend): add admin endpoint to enable or disable two-factor authentication for users
```

A reader should understand the intent and impact of the change **without opening the diff**.

---

## 5. Write Clear, Action-Oriented Descriptions

The description should:

- Use the **imperative mood** (e.g., “add”, “fix”, “prevent”, “remove”)
- Describe **what the change does**, not how it was implemented
- Avoid vague wording like “update”, “adjust”, or “misc changes”

---

## 6. One Commit = One Logical Change

Each commit should represent a **single, cohesive unit of work**.

If a change includes:

- A feature and a refactor → consider separate commits
- Code changes and significant documentation updates → separate commits
- Multiple unrelated changes → split them

---

## 7. Avoid Redundant or Low-Value Information

Do not include:

- File paths
- Obvious context already implied by the scope
- Internal implementation details
- Emojis, jokes, or casual language

The message should remain professional and focused.

---

## 8. Optimize for `git log` Readability

Assume commit history will be read via:

```
git log --oneline
```

From the commit message alone, a reader should be able to determine:

- Which part of the system was affected
- What functional change occurred
- Whether the change is user-facing, behavioral, or internal

---

## 9. Be Automation- and AI-Friendly

Commit messages should be:

- Deterministic
- Machine-parseable
- Suitable for changelog generation
- Clear enough to be used as context for AI agents

Avoid ambiguity and unnecessary stylistic variations.

---

## 10. Default Assumptions

Unless explicitly stated otherwise:

- Language: **English**
- Tone: **professional and neutral**
- Scope is required when multiple layers exist
- No breaking-change footer unless a breaking change is introduced
