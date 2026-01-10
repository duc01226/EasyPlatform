---
description: "Smart git commit with auto-generated conventional commit message"
---

# Smart Git Commit

Create a well-structured git commit with auto-generated conventional commit message.

## Workflow

### Step 1: Analyze Changes

```bash
git status
git diff --staged
git diff
```

### Step 2: Stage Changes

```bash
# Stage all changes
git add .
```

### Step 3: Generate Commit Message

Analyze staged changes and generate message following **Conventional Commits**:

```
<type>(<scope>): <subject>
```

#### Type Detection

| Change Pattern | Type |
|----------------|------|
| New file/feature | `feat` |
| Bug fix, error handling | `fix` |
| Code restructure | `refactor` |
| Documentation only | `docs` |
| Tests only | `test` |
| Dependencies, config | `chore` |
| Performance improvement | `perf` |
| Formatting only | `style` |

#### Scope

Extract from file paths:
- `src/auth/` → `auth`
- `libs/platform-core/` → `platform-core`
- Multiple areas → omit scope

#### Subject Rules

- Imperative mood ("add" not "added")
- Lowercase start
- No period at end
- Max 50 characters

### Step 4: Commit

```bash
git commit -m "type(scope): subject"
```

## Examples

```
feat(employee): add department filter to list
fix(validation): handle empty date range
refactor(auth): extract token validation to service
chore(deps): update Angular to v19
```

## Important

- **DO NOT push** to remote unless explicitly requested
- Review staged changes before committing
- Never commit secrets or credentials
