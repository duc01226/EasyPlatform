# Generate Release Notes: $ARGUMENTS

Generate or update release notes for a feature or PR.

## Phase 1: Determine Source

Parse input from: $ARGUMENTS

**Source Options:**
1. `--source=<path>` - Use feature documentation file
2. `--compare=<base>:<head>` - Compare git branches
3. `--investigate` - Manual investigation mode

If no option specified, prompt for source.

## Phase 2: Gather Information

### Option A: From Feature Documentation
```bash
# Read the feature documentation
cat <source-path>
```

Extract:
- Feature name and description
- Key capabilities
- Technical implementation
- API endpoints
- UI components

### Option B: From Branch Comparison
```bash
# Fetch latest
git fetch origin

# Get commits between branches
git log origin/<base>...origin/<head> --oneline

# Get file changes
git diff origin/<base>...origin/<head> --stat

# Get detailed diff
git diff origin/<base>...origin/<head>
```

Extract:
- Changed files
- New features
- Bug fixes
- Breaking changes

### Option C: Investigation Mode
1. Ask user for feature scope
2. Search codebase for relevant files
3. Analyze implementation

## Phase 3: Generate Release Note

Create file at: `docs/release-notes/YYMMDD-<feature-slug>.md`

**Filename Format:**
- YY = 2-digit year
- MM = 2-digit month
- DD = 2-digit day
- feature-slug = kebab-case feature name

**Template:**
```markdown
# Release Notes: [Feature Name]

**Date:** YYYY-MM-DD
**Version:** X.Y.Z (if applicable)
**Status:** Draft | Released

---

## Summary

[One paragraph describing the feature and its value to users]

## New Features

- **[Feature 1]**: Brief description
- **[Feature 2]**: Brief description

## Improvements

- **[Improvement 1]**: Brief description

## Bug Fixes

- **[Fix 1]**: Brief description

## Breaking Changes

> **Warning**: Breaking changes require migration

- [Breaking change description and migration path]

## Technical Details

### Backend
- [Service changes]
- [API changes]

### Frontend
- [Component changes]
- [UI changes]

### Database
- [Migration info]

## Related Documentation

- [Feature Documentation](../business-features/...)
- [API Reference](../api/...)

## Contributors

- @contributor

---

*Generated with [Claude Code](https://claude.com/claude-code)*
```

## Phase 4: Review & Finalize

1. Present the generated release note
2. Ask for any corrections or additions
3. Save the file

## Examples

```bash
# From feature docs
/release-notes kudos --source=docs/business-features/TextSnippet/detailed-features/README.KudosFeature.md

# From branch comparison
/release-notes employee-export --compare=feature/employee-export:develop

# Investigation mode
/release-notes authentication --investigate
```
