---
id: PBI-{YYMMDD}-{NNN}
title: "{Brief title}"
source_idea: "{IDEA-XXXXXX-NNN or N/A}"
related_module: "{Module name}"
related_entities: []
business_docs_link: "{docs/business-features/{Module}/}"
related_features: []
related_test_specs: []
figma_link: ""
priority: 1-999
effort: XS | S | M | L | XL
status: backlog | ready | in_progress | done | blocked
sprint: "{Sprint name or N/A}"
assigned_to: "{Name or Unassigned}"
created: {YYYY-MM-DD}
updated: {YYYY-MM-DD}
---

# {Title}

## Description
<!-- Clear, concise description of what needs to be built -->

## Business Value
<!-- Why this matters to users/business -->

## Acceptance Criteria

### AC-01: {Criteria title}
- **Given** {precondition}
- **When** {action}
- **Then** {expected result}

### AC-02: {Criteria title}
- **Given** {precondition}
- **When** {action}
- **Then** {expected result}

## Out of Scope
<!-- Explicitly list what is NOT included -->

## Dependencies
| Type | Item | Status |
|------|------|--------|
| Upstream | {Item} | {Status} |
| Downstream | {Item} | {Status} |

## Business Documentation Reference
<!-- Auto-populated from /refine command -->
- **Module**: {Module name}
- **Module Docs**: [docs/business-features/{Module}/](docs/business-features/{Module}/)
- **Related Features**: {FR-XX IDs}
- **Related Test Specs**: {TC-XX IDs}
- **Gap Analysis**: {Notes from business-analyst skill}

## Technical Notes
<!-- Architecture decisions, API contracts, data model changes -->

## Design Reference
<!-- Add Figma URL to frontmatter `figma_link` field for auto-extraction -->
<!-- Run `/design-spec {this-file}` to extract specs from Figma -->

**Figma**: {See frontmatter `figma_link`}

### Extracted Design Specs
<!-- Auto-populated by /design-spec command when figma_link is set -->
<!-- Includes: colors, typography, spacing, component structure -->

## Test Strategy
<!-- High-level testing approach -->

---
*To create user stories, run: `/story {this-file}`*
*To create test spec, run: `/test-spec {this-file}`*
