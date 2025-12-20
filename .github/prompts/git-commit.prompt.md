---
description: "Git commit workflow with conventional commit format"
---

# Git Commit Prompt

## Overview

Create well-structured git commits following conventional commit format and best practices.

## Workflow

### Step 1: Review Changes

```bash
# Check current status
git status

# Review staged changes
git diff --staged

# Review unstaged changes
git diff
```

### Step 2: Stage Changes

```bash
# Stage specific files
git add <file>

# Stage all changes (use with caution)
git add .

# Interactive staging
git add -p
```

### Step 3: Craft Commit Message

Follow **Conventional Commits** format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix | `fix(api): handle null response` |
| `docs` | Documentation | `docs(readme): update install steps` |
| `style` | Formatting (no code change) | `style: fix indentation` |
| `refactor` | Code restructure (no behavior change) | `refactor(user): extract validation` |
| `perf` | Performance improvement | `perf(query): add index hint` |
| `test` | Adding/updating tests | `test(auth): add login tests` |
| `chore` | Maintenance tasks | `chore(deps): update packages` |
| `build` | Build system changes | `build: update webpack config` |
| `ci` | CI/CD changes | `ci: add coverage step` |

#### Scope

Optional, indicates area of codebase:
- `auth`, `api`, `ui`, `db`, `config`, etc.
- Use lowercase, keep consistent

#### Subject

- Imperative mood ("add" not "added")
- No capitalization at start
- No period at end
- Max 50 characters

#### Body (Optional)

- Explain **what** and **why** (not how)
- Wrap at 72 characters
- Separate from subject with blank line

#### Footer (Optional)

- Breaking changes: `BREAKING CHANGE: <description>`
- Issue references: `Fixes #123`, `Closes #456`

### Step 4: Commit

```bash
git commit -m "type(scope): subject"

# Or with body
git commit -m "type(scope): subject" -m "Body explaining why"
```

## Examples

### Simple Feature
```
feat(employee): add department filter to list

Users can now filter employees by department on the list page.
Implements dropdown with department options.

Closes #234
```

### Bug Fix
```
fix(validation): handle empty date range

Previously, empty date range caused null reference exception.
Now returns validation error with clear message.

Fixes #567
```

### Breaking Change
```
feat(api): change response format for pagination

BREAKING CHANGE: Pagination response now uses `items` instead of `data`
and includes `totalPages` field.

Migration: Update all API consumers to use new field names.
```

### Refactoring
```
refactor(auth): extract token validation to service

Moved token validation logic from middleware to dedicated service
for better testability and reuse.
```

## Commit Guidelines

### Do

- ✅ Make atomic commits (one logical change)
- ✅ Write meaningful messages
- ✅ Reference issues when applicable
- ✅ Review changes before committing
- ✅ Keep commits focused and small

### Don't

- ❌ Commit incomplete work
- ❌ Mix unrelated changes
- ❌ Use vague messages ("fix stuff", "updates")
- ❌ Commit secrets or credentials
- ❌ Commit generated files (unless necessary)

## Pre-Commit Checklist

Before committing:

- [ ] Changes build successfully
- [ ] Tests pass
- [ ] Lint passes
- [ ] No secrets in code
- [ ] No debug code left
- [ ] Commit message follows convention

## Important

- Keep commits atomic and focused
- Write for future readers (including yourself)
- Reference issues to maintain traceability
- Never commit secrets or credentials

**IMPORTANT:** A good commit message explains WHY, not just WHAT.
