---
name: changelog-update
description: Update CHANGELOG.md [Unreleased] section with business-focused entries
---

# Changelog Update (Manual)

## Context
You are updating the project changelog with business-focused entries during development.

**Note**: For automated release notes from conventional commits, use the `release-notes` skill instead. This skill is for manual, business-focused entries in the [Unreleased] section.

## Steps

1. **Find changelog**: Check root `./CHANGELOG.md` first, then `./docs/CHANGELOG.md`

2. **Gather changes**: Use git to identify changed files
   ```bash
   git diff origin/develop...HEAD --name-only
   ```

3. **Create temp notes**: `.ai/workspace/changelog-notes-{date}.md`
   - List all changed files
   - Review each systematically
   - Note business impact per file
   - Categorize: Added/Changed/Fixed/Deprecated/Removed/Security

4. **Generate entry**: Use Keep a Changelog format
   - Focus on business value, not technical details
   - Use [Unreleased] section
   - Group by feature/module if multiple changes

5. **Update changelog**: Insert entry, maintain format

6. **Cleanup**: Delete temp notes file

## Business Focus Guidelines

Transform technical changes to business value:
- ❌ "Added Pipeline entity" → ✅ "Added hiring pipeline management"
- ❌ "Created StageController" → ✅ "Added stage configuration endpoints"
- ❌ "Fixed null reference in GetById" → ✅ "Fixed pipeline loading error"

## Output Format

```markdown
## [Unreleased]

### {Module}: {Feature Name}

**Feature/Fix**: {One-line business description}

#### Added
- {Business-focused items}

#### Changed
- {Behavior changes}

#### Fixed
- {Issues resolved}
```
