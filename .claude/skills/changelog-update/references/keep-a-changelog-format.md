# Keep a Changelog Format Reference

> Based on [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/)

## Core Principles

1. **Written by humans, for humans** - Changelogs must be readable by both technical and non-technical audiences
2. **Latest changes first** - Most recent versions appear at the top
3. **One entry per version** - Each version has its own section
4. **ISO 8601 date format** - Use YYYY-MM-DD format (e.g., 2026-01-14)
5. **Semantic Versioning** - Follow [SemVer](https://semver.org/) for version numbers

## Format Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features go here

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Now removed features

### Fixed
- Bug fixes

### Security
- Security vulnerability fixes

## [1.0.0] - 2026-01-14

### Added
- Initial release features

[Unreleased]: https://github.com/user/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/user/repo/releases/tag/v1.0.0
```

## Entry Types

### Added
For new features.

**Example**:
```markdown
- Drag-and-drop pipeline builder with customizable stages
- User authentication with OAuth 2.0 support
```

### Changed
For changes in existing functionality.

**Example**:
```markdown
- Updated dashboard layout for better mobile experience
- Improved performance of data loading by 50%
```

### Deprecated
For soon-to-be removed features.

**Example**:
```markdown
- Legacy API v1 endpoints (will be removed in v3.0.0)
```

### Removed
For now removed features.

**Example**:
```markdown
- Removed deprecated v1 authentication endpoints
```

### Fixed
For any bug fixes.

**Example**:
```markdown
- Fixed user profile not loading when session expires
- Corrected calculation error in monthly reports
```

### Security
For security vulnerability fixes.

**Example**:
```markdown
- Patched SQL injection vulnerability in search endpoint
- Updated dependencies to fix CVE-2026-12345
```

## Version Format

- **[Unreleased]** - For changes not yet released
- **[MAJOR.MINOR.PATCH]** - For released versions following Semantic Versioning
  - MAJOR: Breaking changes
  - MINOR: New features (backward compatible)
  - PATCH: Bug fixes (backward compatible)

**Examples**:
- `[2.0.0]` - Breaking changes
- `[1.5.0]` - New features
- `[1.4.3]` - Bug fix

## Date Format

Always use **ISO 8601 format**: `YYYY-MM-DD`

**Examples**:
- `2026-01-14`
- `2025-12-31`

## Links Section

At the bottom of the changelog, include comparison links:

```markdown
[Unreleased]: https://github.com/user/repo/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/user/repo/compare/v0.9.0...v1.0.0
[0.9.0]: https://github.com/user/repo/releases/tag/v0.9.0
```

## Best Practices

1. **Group related changes** - Organize entries by feature/module
2. **Be concise but informative** - One line per change, clear description
3. **Focus on impact** - Explain what users gain or what behavior changes
4. **Avoid technical jargon** - Write for all audiences
5. **Reference issues/PRs** - Link to more details when helpful
6. **Maintain chronological order** - Latest first within each section

## Business-Focused Writing

Transform technical changes to user value:

| ❌ Technical | ✅ Business-Focused |
|-------------|---------------------|
| Added UserController class | Added user management API endpoints |
| Fixed null reference in GetById | Fixed error when loading user profiles |
| Refactored service layer | Improved data loading performance |
| Added enum StageCategory | Added stage categories for pipeline tracking |

## Common Mistakes to Avoid

1. ❌ Using commit messages directly as changelog entries
2. ❌ Mixing technical and business language inconsistently
3. ❌ Forgetting to update [Unreleased] section during development
4. ❌ Not grouping related changes together
5. ❌ Omitting dates from version headers
6. ❌ Using non-standard date formats

## References

- Official specification: [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/)
- Semantic Versioning: [SemVer 2.0.0](https://semver.org/)
- Common Changelog: [common-changelog.org](https://common-changelog.org/)
