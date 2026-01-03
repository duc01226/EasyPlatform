---
agent: 'ask'
description: 'Generate conventional commit message from staged changes'
---

# Generate Commit Message

Analyze the staged changes and generate a commit message following EasyPlatform conventions.

## Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

## Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no feature/fix) |
| `docs` | Documentation changes |
| `test` | Adding/updating tests |
| `chore` | Build, config, dependencies |
| `perf` | Performance improvement |
| `style` | Code style (formatting, semicolons) |

## Scopes (EasyPlatform Services)

| Scope | Service |
|-------|---------|
| `textsnippet` | TextSnippet example service |
| `accounts` | Accounts service |
| `platform` | Easy.Platform framework |
| `webv2` | Angular frontend (WebV2) |
| `web` | Legacy Angular frontend |

## Rules

1. **Subject line**: Max 72 characters
2. **Imperative mood**: "Add feature" not "Added feature"
3. **No period** at end of subject
4. **Body**: Explain "what" and "why", not "how"
5. **Reference tickets**: Include ticket ID if available

## Examples

### Simple feature
```
feat(textsnippet): add snippet export functionality
```

### Bug fix with body
```
fix(textsnippet): resolve search pagination issue

The search was returning incorrect results when filtering by multiple
categories. Fixed by correcting the query builder expression composition.

Fixes #1234
```

### Refactoring
```
refactor(platform): extract validation helpers to utility class

Moved common validation logic from command handlers to a shared
ValidationHelper class to reduce code duplication.
```

### Multiple changes
```
feat(webv2): implement snippet dashboard

- Add snippet overview component
- Create dashboard store with statistics
- Integrate with textsnippet API service
- Add loading and error states

Related to #5678
```

## Instructions

1. Run `git diff --staged` to see changes
2. Identify the primary type of change
3. Determine the affected scope
4. Write a clear, concise description
5. Add body if changes need explanation
6. Include ticket references if available
