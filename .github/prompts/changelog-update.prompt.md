---
description: Update CHANGELOG.md [Unreleased] section with business-focused entries
argument-hint: [scope or feature name]
---

# Changelog Update

Update CHANGELOG.md with business-focused entries by reviewing file changes.

**Scope**: $ARGUMENTS

## Pre-Workflow

### Activate Skills

- Activate `changelog-update` skill for systematic changelog entry creation

## Workflow

### 1. Review Changes

- Run `git diff --stat` and `git log --oneline` for recent changes
- Identify user-facing features, fixes, and breaking changes

### 2. Categorize Entries

- **Added** - New features
- **Changed** - Enhancements to existing features
- **Fixed** - Bug fixes
- **Removed** - Removed features
- **Breaking** - Breaking changes requiring migration

### 3. Write Entries

- Write business-focused descriptions (not technical commit messages)
- Add entries under `[Unreleased]` section in CHANGELOG.md
- Follow Keep a Changelog format

## Output

Updated CHANGELOG.md with categorized, business-focused entries under `[Unreleased]`.

**Note**: For automated release notes from conventional commits, use `/release-notes` instead.

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break many small todo tasks
- Always add a final review todo task to review the works done at the end to find any fix or enhancement needed
