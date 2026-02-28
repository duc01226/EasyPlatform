# Changelog Entry Template

Based on [Keep a Changelog](https://keepachangelog.com/).

## Standard Format

```markdown
## [Unreleased]

### {Module}: {Feature/Fix Title}

**Feature/Fix/Enhancement**: {One-line business description}

#### Added
- {New feature for users}
- {New capability}

#### Changed
- {Changed behavior}
- {Updated functionality}

#### Fixed
- {Bug that was fixed}
- {Issue that was resolved}

#### Deprecated
- {Feature being phased out}

#### Removed
- {Removed feature}

#### Security
- {Security improvement}
```

## Guidelines

### Business Focus

Write for both technical and non-technical readers:

| Technical (Avoid) | Business-Focused (Use) |
|-------------------|------------------------|
| Added UserController | Added user management API |
| Fixed null reference | Fixed user profile loading error |
| Refactored service layer | Improved data loading performance |
| Added StageCategory enum | Added stage categories for pipeline tracking |
| Created migration file | Database schema updated for new features |

### Grouping

Group related changes by module/feature:

```markdown
### bravoTALENTS: Hiring Pipeline

**Feature**: Customizable hiring pipeline builder for recruitment.

#### Added

**Backend**:
- Pipeline and Stage entities with CRUD operations
- Pipeline duplication and default templates
- Multi-language support (EN/VI)

**Frontend**:
- Drag-and-drop stage builder
- Pipeline filter and stage display components
- Updated navigation and job creation wizard
```

### Linking

Reference PRs, issues, or docs when helpful:

```markdown
#### Fixed
- Fixed candidate search timeout (PR #123)
- Resolved pipeline stage ordering issue (#456)
```

### Documentation Section

Include documentation updates:

```markdown
#### Documentation
- `README.FeatureName.md` - 26-section feature documentation
- `README.FeatureName.ai.md` - AI companion documentation
```

## Changelog Location

- **Primary**: `./CHANGELOG.md` (project root)
- **Fallback**: `./docs/CHANGELOG.md`
- **Never**: Create in both locations

## [Unreleased] Section

Always use `[Unreleased]` for pending changes:

```markdown
## [Unreleased]

### Feature A
...

### Feature B
...

---

## [1.0.0] - 2026-01-14

### Released features
...
```

Move entries from `[Unreleased]` to versioned section on release.
