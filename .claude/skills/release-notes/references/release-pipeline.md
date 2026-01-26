# Release Notes Pipeline Reference

## Advanced Features

### Service Boundary Detection

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs
```

Output: Service impact analysis with severity levels (critical, high, medium, low)

### Breaking Change Analysis

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs
```

Detects: `BREAKING CHANGE:` in body, `!` suffix on type, migration instructions

### PR Metadata Extraction

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/extract-pr-metadata.cjs [--fetch-gh]
```

### Contributor Statistics

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/contributor-stats.cjs
```

### Version Bumping

```bash
# Auto-bump (feat->minor, fix->patch, BREAKING->major)
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD | \
node .claude/skills/release-notes/lib/bump-version.cjs [--prerelease beta] [--service platform-core] [--dry-run]
```

Version Files: Root `.version`, Per-service `.versions/<service-name>.version`

### Quality Validation

```bash
node .claude/skills/release-notes/lib/validate-notes.cjs docs/release-notes/v1.1.0.md [--threshold 80] [--json]
```

| Rule | Weight | Description |
|------|--------|-------------|
| summary_exists | 15 | Has Summary section |
| summary_not_empty | 10 | Summary has content |
| has_version | 10 | Version number present |
| features_documented | 10 | Features properly formatted |
| fixes_documented | 10 | Bug fixes properly formatted |
| no_broken_links | 10 | No empty link references |
| contributors_listed | 10 | Contributors section present |
| has_date | 5 | Date present |
| no_todo_markers | 5 | No TODO/FIXME markers |
| proper_heading_hierarchy | 5 | Proper H1->H2 structure |
| no_placeholder_text | 5 | No placeholder text |
| technical_details_collapsed | 5 | Tech details in `<details>` |

### LLM-Powered Transforms

```bash
export ANTHROPIC_API_KEY="your-api-key"
node .claude/skills/release-notes/lib/transform-llm.cjs docs/release-notes/v1.1.0.md --transform <type> [--output path]
```

| Type | Description |
|------|-------------|
| `summarize` | Brief 3-5 bullet point summary |
| `business` | ROI-focused, business language |
| `enduser` | User-friendly, non-technical |
| `executive` | Strategic impact summary |
| `technical` | Enhanced technical details |

### Full Enhanced Pipeline

```bash
node .claude/skills/release-notes/lib/parse-commits.cjs v1.0.0 HEAD --with-files | \
node .claude/skills/release-notes/lib/detect-services.cjs | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/detect-breaking.cjs | \
node .claude/skills/release-notes/lib/contributor-stats.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version v1.1.0
```

## Configuration

See `config.yaml` for: categories, services, exclude patterns, output settings.

## Troubleshooting

### No commits found
```bash
git log --oneline <base>..<head>
```

### Non-conventional commits
Go to "other" category. Consider commitlint enforcement.

### Missing scope context
Add scope mappings to `config.yaml` -> `services` section.
