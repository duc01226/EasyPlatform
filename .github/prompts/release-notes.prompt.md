---
agent: agent
description: Generate or update release notes for a feature from branch comparison, feature docs, or investigation
tools: ['read', 'search', 'edit', 'execute']
---

# Generate Release Notes

Create or update release notes for EasyPlatform features using automated commit parsing and categorization.

## Input Parameters

${input:feature} - Feature name or version (e.g., "v1.1.0", "kudos")
${input:source} - Source type: "branch" | "docs" | "investigate"
${input:base} - (Optional) Base ref for comparison (default: latest tag)
${input:head} - (Optional) Head ref for comparison (default: HEAD)

## Workflow

### Step 1: Determine Source Type

Based on `${input:source}`:

**branch**: Parse git commits between refs (primary method)
**docs**: Use feature documentation as source
**investigate**: Manual codebase investigation

### Step 2: Gather Information

#### Source: Branch Comparison (Recommended)

Use the automated pipeline scripts:

```bash
# Step 2a: Parse commits into structured JSON
node .claude/skills/release-notes/lib/parse-commits.cjs ${input:base} ${input:head}

# Step 2b: Categorize into release note sections
node .claude/skills/release-notes/lib/parse-commits.cjs ${input:base} ${input:head} | \
node .claude/skills/release-notes/lib/categorize-commits.cjs

# Step 2c: Generate markdown output
node .claude/skills/release-notes/lib/parse-commits.cjs ${input:base} ${input:head} | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs --version ${input:feature}
```

**Categorization Rules (from config.yaml):**
| Commit Type | Category | User-Facing |
|-------------|----------|-------------|
| `feat` | What's New | Yes |
| `fix` | Bug Fixes | Yes |
| `perf` | Improvements | Yes |
| `docs` | Documentation | Yes (unless internal) |
| `refactor` | Improvements | Technical only |
| `test`, `ci`, `build`, `chore`, `style` | Internal | No |

**Auto-excluded patterns:**
- `chore(deps):` - Dependency updates
- `chore(config):` - Configuration changes
- `[skip changelog]` - Explicit skip marker

#### Source: Documentation
```bash
# Find and read feature documentation
find docs/ -name "*.md" | xargs grep -l "${input:feature}"
```

Extract from docs:
- Feature overview
- Key capabilities
- Technical implementation
- API endpoints
- UI components

#### Source: Investigation
1. Search for feature-related files
2. Analyze entity definitions
3. Review commands/queries
4. Check frontend components

### Step 3: Generate Release Note

**Output Location:** `docs/release-notes/YYMMDD-<feature-slug>.md`

**Full Pipeline Command:**
```bash
node .claude/skills/release-notes/lib/parse-commits.cjs ${input:base} ${input:head} | \
node .claude/skills/release-notes/lib/categorize-commits.cjs | \
node .claude/skills/release-notes/lib/render-template.cjs \
  --version ${input:feature} \
  --output docs/release-notes/$(date +%y%m%d)-${input:feature}.md
```

**Generated Structure:**
```markdown
# Release Notes: [Version]

**Date:** [Today's Date]
**Version:** [Version]
**Status:** Draft

---

## Summary
[Auto-generated summary of changes]

## What's New
- **[Feature]**: Description (Scope)

## Improvements
- **[Improvement]**: Description

## Bug Fixes
- **[Fix]**: Description

## Documentation
- **[Doc update]**: Description

## Breaking Changes
> **Warning**: The following changes may require migration

### [Breaking Change Title]
[Migration instructions from BREAKING CHANGE: in commit body]

---

## Technical Details
<details>
<summary>For Developers</summary>

### Commits Included
| Hash | Type | Description |
|------|------|-------------|
| abc1234 | feat | ... |

</details>

## Contributors
- @contributor1

---

*Generated with [Claude Code](https://claude.com/claude-code)*
```

### Step 4: Validate

- [ ] Summary accurately describes the release
- [ ] User-focused language (not developer jargon)
- [ ] Breaking changes clearly marked with migration steps
- [ ] Contributors acknowledged
- [ ] Status is "Draft" pending review

## Output

Return the path to the created/updated release note file.

## Examples

### From Git Commits (Primary)
```
Feature: v1.1.0
Source: branch
Base: v1.0.0
Head: HEAD
```
Pipeline: parse-commits → categorize-commits → render-template
Result: `docs/release-notes/250111-v1.1.0.md`

### From Feature Docs
```
Feature: kudos
Source: docs
```
Result: Reads README.KudosFeature.md, generates `docs/release-notes/YYMMDD-kudos.md`

### From Branch Comparison
```
Feature: employee-export
Source: branch
Base: main
Head: feature/employee-export
```
Result: Parses commits, generates release notes from conventional commits

### Investigation
```
Feature: authentication
Source: investigate
```
Result: Searches codebase, generates release notes from analysis

## Configuration

See `.claude/skills/release-notes/config.yaml` for:
- Category mappings
- Service boundary patterns
- Exclusion rules
- Output settings
