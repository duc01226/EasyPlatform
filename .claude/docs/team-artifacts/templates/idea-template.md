---
id: IDEA-{YYMMDD}-{NNN}
title: '{Brief title}'
submitted_by: '{Name}'
role: '{PO|BA|Dev|QA|Designer|PM|Stakeholder}'
date: { YYYY-MM-DD }
status: draft | under_review | approved | rejected | implemented
priority: P1 | P2 | P3 | unset
tags: []
template_version: '2.0'

# Domain Context (optional, for domain features — populate from project-config.json modules)
module: '' # Module name from project-config.json backendServices.serviceMap
related_features: [] # e.g., [FeatureA, FeatureB]
feature_doc_path: '' # e.g., docs/business-features/{Module}/detailed-features/README.{Feature}.md
entities: [] # e.g., [Goal, Employee, OrganizationalUnit]

# Refinement Tracking
refined_by: ''
refined_date: ''
pbi_references: [] # Links to generated PBIs
---

# {Title}

## Problem Statement

<!-- What problem does this solve? Who experiences this problem? -->

## Proposed Solution

<!-- High-level description of the solution -->

## Expected Value

<!-- Business value, user benefit, or efficiency gain -->

## Target Users

<!-- Who will use this feature? -->

## Rough Scope

- [ ] {Scope item 1}
- [ ] {Scope item 2}

## Domain Context (Project Features)

> **Note:** This section is auto-populated by `/idea` command for domain features.

### Related Features

<!-- List of related business features from module README -->

- [ ] {Feature Name 1} ([docs link])
- [ ] {Feature Name 2} ([docs link])

### Domain Entities

<!-- Entities involved, from feature docs Domain Model section -->

- **Primary:** {Entity1}, {Entity2}
- **Related:** {Entity3}, {Entity4}

### Existing Business Rules

<!-- Reference to existing BRs that may be affected -->

- BR-{MOD}-XXX: {Brief description} (see feature doc)
- BR-{MOD}-YYY: {Brief description} (see feature doc)

**Documentation Links:**

- Module Overview: `docs/business-features/{module}/README.md`
- Related Docs: (auto-generated links)

## Questions / Risks

<!-- Unknowns, dependencies, potential blockers -->

## Related

<!-- Links to related ideas, PBIs, or documentation -->

---

## Template Instructions

### Frontmatter Fields

- **module**: Auto-detected by `/idea` for project domain features. Leave blank for infrastructure/cross-cutting.
- **related_features**: Auto-populated from module README. Can be manually edited.
- **entities**: Domain entities involved, helps with codebase navigation.

### Domain Context Section

- Auto-populated for project domain ideas
- Provides quick links to related feature documentation
- References existing business rules that may be affected
- Can be manually edited if detection is incorrect

---

_To refine this idea into a PBI, run: `/refine {this-file}`_
