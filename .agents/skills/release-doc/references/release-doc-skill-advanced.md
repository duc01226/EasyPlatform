<!-- SKILL-NAV:START -->
## Contents

- [Advanced Features](#advanced-features)
- [Service Boundary Detection](#service-boundary-detection)
- [Breaking Change Analysis](#breaking-change-analysis)
- [PR Metadata Extraction](#pr-metadata-extraction)
- [Contributor Statistics](#contributor-statistics)
- [Version Bumping](#version-bumping)
- [Quality Validation](#quality-validation)
- [LLM-Powered Transforms](#llm-powered-transforms)
- [Full Enhanced Pipeline](#full-enhanced-pipeline)

<!-- SKILL-NAV:END -->

## Advanced Features

### Service Boundary Detection

Analyze which services are affected by the release:

```bash
# Parse with file changes, then detect services
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-doc/lib/detect-services.cjs
```

**Output:** Service impact analysis with severity levels (critical, high, medium, low)

### Breaking Change Analysis

Enhanced breaking change detection with migration info extraction:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/detect-breaking.cjs
```

**Detects:**

- `BREAKING CHANGE:` in commit body
- `!` suffix on commit type (e.g., `feat!:`)
- Migration instructions

### PR Metadata Extraction

Extract and link pull request information:

```bash
# Extract PR numbers from commit messages
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/extract-pr-metadata.cjs

# With GitHub API enrichment (requires gh CLI)
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/extract-pr-metadata.cjs --fetch-gh
```

**Extracts:** PR numbers, titles, labels, authors from commits

### Contributor Statistics

Generate detailed contributor stats:

```bash
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/contributor-stats.cjs
```

**Output:** Contributor list with commit counts, feature/fix breakdown

### Version Bumping

Automatically determine and bump semantic version based on commit types:

```bash
# Auto-bump based on commits (feat→minor, fix→patch, BREAKING→major)
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-doc/lib/bump-version.cjs

# Bump with prerelease tag
node .claude/skills/release-doc/lib/bump-version.cjs --prerelease beta

# Per-service versioning
node .claude/skills/release-doc/lib/bump-version.cjs --service {service-name}

# Dry run (don't write version file)
node .claude/skills/release-doc/lib/bump-version.cjs --dry-run
```

**Version Files:**

- Root: `.version`
- Per-service: `.versions/<service-name>.version`

### Quality Validation

Validate release notes against quality rules:

```bash
# Validate with default threshold (70)
node .claude/skills/release-doc/lib/validate-notes.cjs docs/release-notes/v1.1.0.md

# Custom threshold
node .claude/skills/release-doc/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --threshold 80

# JSON output for CI
node .claude/skills/release-doc/lib/validate-notes.cjs docs/release-notes/v1.1.0.md --json
```

**Validation Rules (100 points total):**
| Rule | Weight | Description |
| --------------------------- | ------ | ---------------------------- |
| summary_exists | 15 | Has Summary section |
| summary_not_empty | 10 | Summary has content |
| has_version | 10 | Version number present |
| features_documented | 10 | Features properly formatted |
| fixes_documented | 10 | Bug fixes properly formatted |
| no_broken_links | 10 | No empty link references |
| contributors_listed | 10 | Contributors section present |
| has_date | 5 | Date present |
| no_todo_markers | 5 | No TODO/FIXME markers |
| proper_heading_hierarchy | 5 | Proper H1→H2 structure |
| no_placeholder_text | 5 | No placeholder text |
| technical_details_collapsed | 5 | Tech details in <details> |

### LLM-Powered Transforms

Transform release notes for different audiences using Claude API:

```bash
# Requires ANTHROPIC_API_KEY environment variable
export ANTHROPIC_API_KEY="your-api-key"

# Create executive summary
node .claude/skills/release-doc/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform executive

# Transform for business stakeholders
node .claude/skills/release-doc/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform business --output docs/release-notes/v1.1.0-business.md

# Transform for end users
node .claude/skills/release-doc/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform enduser
```

**Transform Types:**
| Type | Description |
| ----------- | ------------------------------ |
| `summarize` | Brief 3-5 bullet point summary |
| `business` | ROI-focused, business language |
| `enduser` | User-friendly, non-technical |
| `executive` | Strategic impact summary |
| `technical` | Enhanced technical details |

### Full Enhanced Pipeline

Combine all features for comprehensive release notes:

```bash
# Enhanced pipeline with service detection
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-doc/lib/detect-services.cjs | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/detect-breaking.cjs | \
node .claude/skills/release-doc/lib/contributor-stats.cjs | \
node .claude/skills/release-doc/lib/render-template.cjs --version v1.1.0

# With version bumping and validation
node .claude/skills/release-doc/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-doc/lib/bump-version.cjs | \
node .claude/skills/release-doc/lib/categorize-commits.cjs | \
node .claude/skills/release-doc/lib/render-template.cjs --output docs/release-notes/v1.1.0.md && \
node .claude/skills/release-doc/lib/validate-notes.cjs docs/release-notes/v1.1.0.md
```
