# Release Notes Skill

<!-- AUTO-GENERATED from .claude/config/release-notes-template.yaml -->
<!-- Do not edit directly. Run: node scripts/release-notes/generate-skills.cjs -->

Generate or update release notes for project features.

## Trigger Keywords

- "release notes", "changelog", "release documentation"
- "add release note", "update release notes"
- "document changes", "PR summary"

## Input Sources

1. **PR Branch Comparison**: Compare changes between branches
2. **Feature Documentation**: Use feature docs as source
3. **User Instructions**: Manual feature investigation

## Output Location (Auto-Save)

**Both files are saved automatically:**
1. Individual note: `docs/release-notes/YYMMDD-{slug}.md`
2. Aggregated log: `CHANGELOG.md` (prepended)

## Usage

```bash
/release-notes feature-name --source=docs/business-features/{Module}/detailed-features/README.{Feature}.md
/release-notes employee-export --compare=develop:main
/release-notes authentication --investigate
```

## Release Note Sections

- **Summary**: One paragraph end-user summary
- **New Features**: Entirely new capabilities
- **Improvements**: Enhancements to existing features
- **Bug Fixes**: Corrections of incorrect behavior
- **Breaking Changes**: Changes requiring user action
- **Technical Details**: Implementation info for developers
- **Related Documentation**: Links to feature docs, API refs

## Commit Type Mapping

| Commit Type | Category |
|-------------|----------|
| `feat` | features |
| `fix` | fixes |
| `refactor` | improvements |
| `perf` | improvements |
| `feature` | features |
| `platform` | features |
| `candidate_app` | fixes |
| `growth` | features |
| `talents` | features |
| `surveys` | features |
| `insights` | features |
| `accounts` | features |

## Guidelines

| Principle | Practice |
|-----------|----------|
| User-Focused | Write for end-users, not developers |
| Concise | One sentence per item |
| Categorized | Group by type (features/fixes/improvements) |
| Linked | Reference related documentation |
| Dated | Always include date in filename |

## Integration

This skill integrates with:
- `scripts/release-notes/parse-commits.cjs` - Commit parser
- `scripts/release-notes/generate-note.cjs` - Note generator
- `.claude/config/release-notes-template.yaml` - Template source

---
*Template version: 1.0.0*
