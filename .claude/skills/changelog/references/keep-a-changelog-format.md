# Keep a Changelog Format

Based on [keepachangelog.com](https://keepachangelog.com/).

## Principles

1. Changelogs are for **humans**, not machines
2. Every version should have an entry
3. Same types of changes should be grouped
4. Versions and sections should be linkable
5. Latest version comes first
6. Release date is displayed for each version

## Change Types

| Type | Description |
|------|-------------|
| **Added** | New features |
| **Changed** | Changes in existing functionality |
| **Deprecated** | Soon-to-be removed features |
| **Removed** | Now removed features |
| **Fixed** | Bug fixes |
| **Security** | Vulnerability fixes |

## Format

```markdown
# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- New feature description

### Changed
- Updated behavior description

### Fixed
- Bug fix description

---

## [1.0.0] - 2026-01-14

### Added
- Initial release features

---
```

## Guidelines

### Version Numbers

Use [Semantic Versioning](https://semver.org/):
- MAJOR.MINOR.PATCH
- MAJOR: breaking changes
- MINOR: new features (backward compatible)
- PATCH: bug fixes (backward compatible)

### [Unreleased] Section

- Always maintain an `[Unreleased]` section at the top
- Move entries to versioned section on release
- Helps track pending changes

### Dates

Use ISO format: `YYYY-MM-DD` (e.g., 2026-01-14)

### Yanked Releases

Mark yanked releases: `## [1.0.1] - 2026-01-15 [YANKED]`
