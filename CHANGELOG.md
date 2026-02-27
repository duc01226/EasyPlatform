# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Hook Quality Enhancements

**Enhancement**: Four targeted improvements to Claude Code hooks — post-edit rule verification, error injection in auto-fix, search threshold tuning, and lessons frequency scoring.

#### Added

- Post-edit rule verification hook (`post-edit-rule-check.cjs`) — detects CLAUDE.md rule violations in edited `.cs`/`.ts` files using full-file scan with negative patterns. 6 initial rules covering HttpClient, untilDestroyed, ValidationException, side effects, DTO mapping, raw component. Advisory only (never blocks). Includes violation-metrics counter for feedback loop measurement.
- Lessons frequency scoring — sidecar `docs/lessons-freq.json` tracks per-rule hit counts; `recordLessonFrequency()` and `getTopLessons()` APIs in lessons-writer; lessons-injector now sorts lessons by frequency (highest first)

#### Changed

- Auto-fix trigger now extracts error output from failed Bash commands and injects last ~10 lines into tier 2+ advisory messages, giving the AI actionable error context on repeated failures
- Search-before-code threshold lowered from 20 to 10 lines for `.cs`/`.ts` files (other extensions unchanged at 20), catching more anti-pattern edits in primary codebase languages

### AI Agent Orchestration Improvements

**Feature**: Six-principle agent quality system improving verification, self-improvement, and autonomous bug detection.

Analyzed the Claude Code agent setup against 6 orchestration principles (Plan Mode Default, Subagent Strategy, Self-Improvement Loop, Verification Before Done, Demand Elegance, Autonomous Bug Fixing) and implemented 5 phases of improvements to close gaps.

#### Added

- Verification gate hook (`pre-completion-gate.cjs`) warns when tasks completed or commits made without recent test/build evidence
- Auto-fix trigger hook (`auto-fix-trigger.cjs`) detects build/test failures with 3-tier escalation (suggestion → stronger → rollback review)
- Self-improvement artifacts: `MEMORY.md` (project memory, auto-loaded), `docs/lessons.md` (append-only lesson log)
- Lessons writer utility auto-captures failure lessons on session exit and pattern learner confirmations
- Plan artifact gate in todo-enforcement warns when implementation skills invoked without a plan directory
- Bypass audit trail: `quick:` bypasses now tracked with `bypass: true` field in ACE events
- Subagent registry documentation (`docs/claude/subagent-registry.md`) covering 16 agent types, capabilities, and protocols
- Agent orchestration principles reference (`docs/claude/agent-orchestration-principles.md`)
- 24 new tests covering all new hooks and modules

#### Changed

- ACE delta generation (`ar-generation.cjs`) now produces actionable skill-specific behavioral advice instead of generic "Continue using this skill pattern (100% success)"
- Seeded `deltas.json` with 8 project-specific behavioral deltas (BEM, base class hierarchy, untilDestroyed, CQRS, DTO mapping, search-before-code, repository, side effects)

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

