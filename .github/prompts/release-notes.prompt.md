---
agent: agent
description: Generate or update release notes for a feature from branch comparison, feature docs, or investigation
tools: ['read', 'search', 'edit', 'execute']
---

# Generate Release Notes

Create or update release notes for EasyPlatform features.

## Input Parameters

${input:feature} - Feature name or description
${input:source} - Source type: "docs" | "branch" | "investigate"

## Workflow

### Step 1: Determine Source Type

Based on `${input:source}`:

**docs**: Use feature documentation as source
**branch**: Compare git branches for changes
**investigate**: Manual codebase investigation

### Step 2: Gather Information

#### Source: Documentation
```bash
# Find and read feature documentation
find docs/ -name "*.md" | xargs grep -l "${input:feature}"
```

Extract from docs:
- Feature overview
- Key capabilities
- Technical implementation
- API endpoints
- UI components

#### Source: Branch Comparison
```bash
git fetch origin
git log origin/main...origin/HEAD --oneline
git diff origin/main...origin/HEAD --stat
```

Categorize changes:
- New features (new files, new functions)
- Improvements (modified logic)
- Bug fixes (fix-related commits)
- Breaking changes (removed/renamed APIs)

#### Source: Investigation
1. Search for feature-related files
2. Analyze entity definitions
3. Review commands/queries
4. Check frontend components

### Step 3: Generate Release Note

**Output Location:** `docs/release-notes/YYMMDD-<feature-slug>.md`

**Template:**
```markdown
# Release Notes: [Feature Name]

**Date:** [Today's Date]
**Version:** [Version if known]
**Status:** Draft

---

## Summary

[One paragraph summary of the feature for end users]

## New Features

- **[Feature]**: Description

## Improvements

- **[Improvement]**: Description

## Bug Fixes

- **[Fix]**: Description

## Breaking Changes

- None | [Description with migration path]

## Technical Details

### Backend
- [Changes]

### Frontend
- [Changes]

## Related Documentation

- [Link to feature docs]

---

*Generated with Claude Code*
```

### Step 4: Validate

- [ ] All sections filled appropriately
- [ ] User-focused language (not developer jargon)
- [ ] Breaking changes clearly marked
- [ ] Related docs linked

## Output

Return the path to the created/updated release note file.

## Examples

### From Feature Docs
```
Feature: kudos
Source: docs
```
Result: Reads README.KudosFeature.md, generates `docs/release-notes/YYMMDD-kudos.md`

### From Branch
```
Feature: employee-export
Source: branch
```
Result: Compares branches, generates release notes from diff

### Investigation
```
Feature: authentication
Source: investigate
```
Result: Searches codebase, generates release notes from analysis
