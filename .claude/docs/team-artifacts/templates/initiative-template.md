---
# Work-record fields (id, title, intent, status) follow .claude/skills/task-track/references/integration-guide.md, section "Records another skill authors".
id: INITIATIVE-{YYMMDD}-{NNN}
title: '{Brief title}'
intent: '{One sentence: the outcome this initiative is for}'
status: draft
submitted_by: '{Name}'
role: '{PO|BA|Dev|QA|Designer|PM|Stakeholder}'
date: { YYYY-MM-DD }
tags: [] # free-text keywords; the areas an initiative belongs to are recorded through /task-track
template_version: '2.3'

# Domain Context (optional, for domain features — populate from project-config.json modules)
module: '' # Module name from project-config.json backendServices.serviceMap
related_features: [] # e.g., [FeatureA, FeatureB]
feature_doc_path: '' # e.g., {Bucket}/README.{Feature}.md under the business spec root
entities: [] # e.g., [Goal, Employee, OrganizationalUnit]

# Refinement Tracking
refined_by: ''
refined_date: ''
task_references: [] # Links to generated tasks
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

> **Note:** This section is auto-populated by `/initiative` command for domain features.

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

- Module Overview: `{module}/README.md` in the business spec root
- Related Docs: (auto-generated links)

## Questions / Risks

<!-- Unknowns, dependencies, potential blockers -->

## Related

<!-- Links to related initiatives, tasks, or documentation -->

---

## Template Instructions

### Frontmatter Fields

- **id / title / intent / status**: the work-record fields. A new initiative is `status: draft`. Approving, committing, closing, canceling and reopening it are a person's decisions recorded through `/task-track --mode=lifecycle`; its type, priority level, due date and areas are recorded through `/task-track --mode=maintain`. The section named at the top of this file owns those lists, so this template states none of them and carries no decision or priority key of its own.
- **module**: Auto-detected by `/initiative` for project domain features. Leave blank for infrastructure/cross-cutting.
- **related_features**: Auto-populated from module README. Can be manually edited.
- **entities**: Domain entities involved, helps with codebase navigation.

### Domain Context Section

- Auto-populated for project domain initiatives
- Provides quick links to related feature documentation
- References existing business rules that may be affected
- Can be manually edited if detection is incorrect

---

_To refine this initiative into a task, run: `/work-item --mode=refine {this-file}`_
