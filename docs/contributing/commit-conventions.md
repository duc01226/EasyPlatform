# Commit Message Conventions

EasyPlatform uses [Conventional Commits](https://www.conventionalcommits.org/) for consistent, parseable commit history that enables automated release notes generation.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Quick Reference

| Type | Use For | In Release Notes |
|------|---------|------------------|
| `feat` | New feature | Yes - "What's New" |
| `fix` | Bug fix | Yes - "Bug Fixes" |
| `docs` | Documentation | Yes (if user-facing) |
| `perf` | Performance improvement | Yes - "Improvements" |
| `refactor` | Code restructuring | Technical only |
| `test` | Adding/updating tests | No |
| `chore` | Maintenance tasks | No |
| `ci` | CI/CD changes | No |
| `build` | Build system | Technical only |
| `style` | Code formatting | No |
| `revert` | Revert commit | Depends on reverted type |

## Examples

### New Feature
```
feat(api): add employee export endpoint

Implements CSV and Excel export for employee data.
Supports filtering by department and date range.

Closes #123
```

### Bug Fix
```
fix(frontend): resolve date picker timezone issue

Date picker now correctly converts to UTC before API calls.
```

### Breaking Change (Method 1: ! suffix)
```
feat(auth)!: migrate to OAuth 2.1

BREAKING CHANGE: Legacy JWT tokens no longer accepted.
Migration guide: docs/migrations/oauth-2.1.md
```

### Breaking Change (Method 2: Footer)
```
feat(api): update response format for /users endpoint

BREAKING CHANGE: Response now returns { data: [], meta: {} } instead of array
```

### Documentation
```
docs(api): add OpenAPI specs for employee endpoints
```

### Performance
```
perf(persistence): optimize employee list query

Reduced query time from 2s to 200ms using index hints.
```

### Chore (Internal)
```
chore(deps): update Angular to v19.1

ci: add parallel test execution
```

## Scopes

Use scope to indicate the affected area. Common scopes for EasyPlatform:

### Backend
- `api` - API controllers/endpoints
- `domain` - Domain entities/logic
- `application` - CQRS handlers
- `persistence` - Database/repository
- `platform` - Easy.Platform framework
- `jobs` - Background jobs

### Frontend
- `frontend` - General frontend
- `ui` - UI components
- `store` - State management
- `core` - Platform-core library

### Cross-cutting
- `deps` - Dependencies
- `config` - Configuration
- `auth` - Authentication
- `release` - Release-related

### AI Tooling
- `ai-tools` - Claude/Copilot skills
- `skills` - Skill definitions
- `prompts` - Prompt templates

## Validation

Commits are validated by commitlint via husky pre-commit hook. Invalid commits will be rejected with an error message.

### Valid Examples
```bash
git commit -m "feat(api): add user search endpoint"
git commit -m "fix: resolve null pointer in auth flow"
git commit -m "docs: update README installation steps"
```

### Invalid Examples
```bash
# Missing type
git commit -m "add new feature"

# Wrong type
git commit -m "feature: add login"

# Uppercase description
git commit -m "feat: Add new feature"

# Period at end
git commit -m "fix: resolve bug."
```

## Emergency Bypass

For critical hotfixes only:

```bash
git commit --no-verify -m "emergency fix for production outage"
```

**Warning:** Bypassed commits should be squash-merged with proper format in PR.

## Why Conventional Commits?

1. **Automated Release Notes** - Commits categorized automatically
2. **Semantic Versioning** - `feat` = minor, `fix` = patch, `!` = major
3. **Clear History** - Easy to scan commit log
4. **Team Consistency** - Everyone follows same format
5. **CI Integration** - Automated version bumps possible

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [commitlint Documentation](https://commitlint.js.org/)
- [EasyPlatform commitlint.config.js](../../commitlint.config.js)
