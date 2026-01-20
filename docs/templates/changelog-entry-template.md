# Changelog Entry Template

Based on [Keep a Changelog](https://keepachangelog.com/).

## Format

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
| Refactored service layer | Improved performance of data loading |
| Added enum StageCategory | Added stage categories for pipeline tracking |

### Grouping

Group related changes by module/feature:

```markdown
### TextSnippet: Content Management

#### Added
- Rich text editor with markdown
- Category organization
- Full-text search
```

### Linking

Reference PRs, issues, or docs when helpful:

```markdown
#### Fixed
- Fixed candidate search timeout (PR #123)
```

## Examples

### Good Example - Business-Focused

```markdown
## [Unreleased]

### TextSnippet: Content Management System

**Feature**: Rich text snippet management with advanced categorization and search.

#### Added
- Rich text editor with markdown support and syntax highlighting
- Hierarchical category system with nested tags
- Full-text search across all snippets with filters
- Multi-language content support (EN/VI)
- Snippet versioning and history tracking
- Import/export functionality

#### Changed
- Improved snippet preview with real-time rendering
- Enhanced category navigation with breadcrumbs
```

### Bad Example - Too Technical

```markdown
## [Unreleased]

### Pipeline Changes

#### Added
- Pipeline.cs entity
- StageCategory enum
- PipelineController with CRUD operations
- SavePipelineCommand handler
- GetPipelineQuery handler
- PipelineDto mapping
```

## Tips

1. **Focus on user value**: Explain what users can now do, not what code changed
2. **Use active voice**: "Added user export" not "User export was added"
3. **Be specific**: Include key details that matter to users
4. **Group logically**: Related changes go in one section
5. **Keep it concise**: One line per change, clear and direct
6. **Avoid technical jargon**: Unless your audience is purely technical
7. **Reference related docs**: Link to detailed documentation when helpful

## Entry Types Reference

### Added
For new features that users can now use.

**Focus**: What new capabilities do users have?

### Changed
For modifications to existing features that affect user experience.

**Focus**: What behavior is different? How does it affect users?

### Fixed
For bug fixes that resolve user-facing issues.

**Focus**: What problem no longer occurs?

### Deprecated
For features that will be removed in a future version.

**Focus**: What should users stop relying on? When will it be removed?

### Removed
For features that have been completely removed.

**Focus**: What can users no longer do? What's the alternative?

### Security
For security vulnerability fixes.

**Focus**: What risk has been eliminated? (Use general terms, don't expose vulnerabilities)

## When to Use This vs release-notes

| Scenario | Use This Template | Use release-notes Skill |
|----------|-------------------|------------------------|
| During PR/feature development | ✅ Yes | ❌ No |
| Manual business-focused entry | ✅ Yes | ❌ No |
| At release time | ❌ No | ✅ Yes |
| Automated from commits | ❌ No | ✅ Yes |
| [Unreleased] section | ✅ Yes | ❌ No |
| Versioned release docs | ❌ No | ✅ Yes |
