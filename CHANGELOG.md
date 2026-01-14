# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### AI Development Tools: Changelog Management System

**Feature**: Manual, business-focused changelog workflow complementing automated release notes.

Developers can now create high-quality changelog entries that transform technical changes into user-facing value. Systematic 7-step workflow ensures no changes are missed, while business focus guidelines help write for both technical and non-technical audiences.

#### Added
- Changelog-update skill with systematic file review workflow
  - 7-step process: gather changes → temp notes → file review → holistic analysis → generate entry → update CHANGELOG → cleanup
  - Temp notes file (`.ai/workspace/changelog-notes-*.md`) prevents missed changes
  - Business focus guidelines transform technical jargon to user value
- Keep a Changelog format reference and compliance
  - Complete v1.1.0 specification with examples
  - Entry types: Added, Changed, Fixed, Deprecated, Removed, Security
  - Good vs bad examples for each category
- Changelog entry template with usage guidelines
  - Business-focused writing patterns
  - Anti-patterns to avoid
  - When to use changelog-update vs release-notes
- Both Claude Code and GitHub Copilot support
  - `.claude/skills/changelog-update/` - Claude skill
  - `.github/skills/changelog-update/` - Copilot skill
  - `.github/prompts/changelog-update.prompt.md` - Copilot chat prompt

#### Changed
- CLAUDE.md: Added "Changelog & Release Notes" section (lines 454-514)
  - Differentiation table: manual vs automated workflows
  - Complementary usage pattern: development + release phases
  - Clear guidance on when to use each tool
- Copilot instructions: Added changelog documentation (lines 178-199)
  - Tool comparison table
  - Usage scenarios
  - Template references

---

## [v1.1.0] - 2026-01-11

This release introduces conventional commits infrastructure with automated release notes generation.

### Added

- **Release notes skill** - Automated release notes generation with 14 modular library scripts for parsing commits, detecting breaking changes, categorizing changes, extracting PR metadata, contributor stats, and changelog updates
- **Conventional commits support** - Commitlint configuration with Husky pre-commit hooks enforcing commit message standards
- **Commit conventions documentation** - Comprehensive guide at `docs/contributing/commit-conventions.md`

### Changed

- **Release notes prompt** - Updated GitHub prompt template with improved structure

---

## [v1.0.1] - 2026-01-11

This release includes 1 new feature.

### Added

- **Add AI companion doc generation to feature-docs skills** (AI Tools)

