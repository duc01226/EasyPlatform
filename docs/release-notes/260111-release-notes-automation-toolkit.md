# Release Notes: Release Notes Automation Toolkit

**Date:** 2026-01-11
**Version:** 1.0.0
**Status:** Ready for Review

---

## Summary

Introduces a comprehensive release notes automation system with Node.js CLI scripts for parsing commits, generating structured notes, validating quality, and transforming for different audiences. Includes version tracking infrastructure for all BravoSUITE services.

## New Features

**Commit Parsing** (`parse-commits.cjs`): Parse conventional commits, legacy `[Type]` format, and Azure DevOps merged PR format into categorized JSON structure.

**Note Generation** (`generate-note.cjs`): Generate structured markdown release notes from parsed commits with configurable templates.

**Skill Generation** (`generate-skills.cjs`): Single-source YAML template regenerates Claude and Copilot skill files for consistency.

**Quality Validation** (`validate-notes.cjs`): Score release notes 0-100 against quality criteria (structure, content, formatting).

**Version Bumping** (`bump-version.cjs`): Semantic versioning based on commit types with PR tracking.

**Audience Transformation** (`transform-llm.cjs`, `generate-audience.cjs`): Generate business/executive/end-user variants via Claude API or template-based fallback.

**Version Tracking** (`versions/*.json`): Service-specific version files for Platform, bravoGROWTH, bravoTALENTS, bravoSURVEYS, bravoINSIGHTS.

## Improvements

- Consolidated configuration in `.claude/config/release-notes-template.yaml` (single source of truth)
- Simplified skill files - reduced redundancy by extracting common logic to shared config
- Modular library structure (`lib/cli-args.cjs`, `lib/yaml-config.cjs`) for reuse

## Technical Details

### Backend

- Pure Node.js (no external dependencies except YAML parser for config)
- Supports stdin piping for integration with git log
- 30-second timeout on API calls, 100KB input limit

### Version Strategy

- `feat` commits → minor version bump (1.0.0 → 1.1.0)
- `fix` commits → patch version bump (1.0.0 → 1.0.1)
- Breaking changes → major version bump (1.0.0 → 2.0.0)

### File Structure

```
scripts/release-notes/
├── lib/
│   ├── cli-args.cjs      # CLI argument parsing
│   └── yaml-config.cjs   # YAML config loader
├── parse-commits.cjs     # Parse commit messages
├── generate-note.cjs     # Generate markdown notes
├── generate-skills.cjs   # Regenerate skill files
├── validate-notes.cjs    # Quality validation
├── bump-version.cjs      # Version management
├── transform-llm.cjs     # Claude API transformation
├── generate-audience.cjs # Template-based variants
└── README.md             # Documentation
```

## Related Documentation

- `.claude/config/release-notes-template.yaml` - Master configuration
- `scripts/release-notes/README.md` - Usage guide
- `.claude/skills/release-notes/README.md` - Claude integration

---

*Generated with [Claude Code](https://claude.com/claude-code)*
