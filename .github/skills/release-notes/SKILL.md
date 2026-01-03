---
name: release-notes
description: Generate or update release notes for features from PR branch comparison, feature documentation, or investigation.
---

# Release Notes Generation for EasyPlatform

## Trigger Conditions

Use this skill when:
- Creating release notes for a new feature
- Updating existing release notes
- Generating changelog entries
- Documenting PR changes
- Summarizing feature documentation for end users

## Input Sources

### 1. Feature Documentation
```
Source: docs/business-features/<service>/<feature>/README.<Feature>.md
```

### 2. Branch Comparison
```bash
git log origin/<base>...origin/<head> --oneline
git diff origin/<base>...origin/<head> --stat
```

### 3. Investigation Mode
Manual codebase exploration and analysis.

## Output Structure

### File Location
```
docs/release-notes/YYMMDD-<feature-slug>.md
```

### Template
```markdown
# Release Notes: [Feature Name]

**Date:** YYYY-MM-DD
**Version:** X.Y.Z
**Status:** Draft | Released

---

## Summary
[End-user focused description]

## New Features
- **[Feature]**: [Description]

## Improvements
- **[Improvement]**: [Description]

## Bug Fixes
- **[Fix]**: [Description]

## Breaking Changes
- [Description and migration path]

## Technical Details

### Backend
- Service: [changes]
- API: [endpoints]

### Frontend
- Components: [changes]
- Pages: [changes]

## Related Documentation
- [Feature Docs](link)

---
*Generated with Claude Code*
```

## Generation Guidelines

| Principle | Description |
|-----------|-------------|
| User-Focused | Write for end-users, not developers |
| Concise | One sentence per item |
| Categorized | Group by type (features/fixes/improvements) |
| Linked | Reference related documentation |
| Dated | Always include date prefix in filename |

## Category Definitions

| Category | Use When |
|----------|----------|
| New Features | Entirely new capability |
| Improvements | Enhancement to existing feature |
| Bug Fixes | Correction of incorrect behavior |
| Breaking Changes | Changes requiring user action |
| Technical Details | Implementation info for developers |

## Filename Convention

```
YYMMDD-feature-slug.md

Examples:
- 250103-kudos-feature.md
- 250115-employee-export.md
- 250201-survey-analytics.md
```

## Discovery Checklist

When investigating a feature:

- [ ] Domain entities identified
- [ ] Commands/Queries mapped
- [ ] API endpoints documented
- [ ] UI components listed
- [ ] Cross-service interactions noted
- [ ] Breaking changes identified
- [ ] Migration requirements checked

## Integration with Workflow

This skill integrates with:
- `/plan` - Plan release note structure
- `/docs/update` - Update related documentation
- `/git/pr` - Link to PR descriptions
- `/feature-docs` - Cross-reference feature documentation
