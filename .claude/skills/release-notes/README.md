# Release Notes Skill

Generate or update release notes for EasyPlatform features.

## Trigger Keywords

- "release notes", "changelog", "release documentation"
- "add release note", "update release notes"
- "document changes", "PR summary"

## Input Sources

1. **PR Branch Comparison**: Compare changes between branches
2. **Feature Documentation**: Use feature docs as source
3. **User Instructions**: Manual feature investigation

## Output Location

- Directory: `docs/release-notes/`
- Filename Format: `YYMMDD-<feature-slug>.md`
- Example: `250103-kudos-feature.md`

## Usage

```bash
/release-notes kudos --source=docs/business-features/TextSnippet/detailed-features/README.KudosFeature.md
/release-notes employee-export --compare=develop:main
/release-notes authentication --investigate
```

## Release Note Structure

```markdown
# Release Notes: [Feature Name]
Date: YYYY-MM-DD
Version: X.Y.Z

## Summary
Brief description of what's new.

## New Features
- Feature 1
- Feature 2

## Improvements
- Improvement 1

## Bug Fixes
- Fix 1

## Breaking Changes
- Breaking change (if any)

## Migration Guide
Steps if migration needed.

## Technical Details
- Backend: Changes summary
- Frontend: Changes summary
- Database: Migrations

## Related Documentation
- [Feature Doc](link)
- [API Doc](link)

## Contributors
- @contributor1
```

## Guidelines

| Principle | Practice |
|-----------|----------|
| User-focused | Write for end-users, not developers |
| Concise | One sentence per change |
| Categorized | Group by type (features/fixes/improvements) |
| Linked | Reference related docs/issues |
| Dated | Always include date in filename |
