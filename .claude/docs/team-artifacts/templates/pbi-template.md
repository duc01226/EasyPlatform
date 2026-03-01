---
id: PBI-{YYMMDD}-{NNN}
title: '{Brief title}'
source_idea: '{IDEA-XXXXXX-NNN or N/A}'
priority: 1-999
effort: XS | S | M | L | XL
status: backlog | ready | in_progress | done | blocked
sprint: '{Sprint name or N/A}'
assigned_to: '{Name or Unassigned}'
created: { YYYY-MM-DD }
updated: { YYYY-MM-DD }
template_version: '2.0'

# BravoSUITE Domain Context (for domain features)
module: '' # bravoGROWTH | bravoTALENTS | bravoSURVEYS | bravoINSIGHTS | Accounts
related_features: [] # From idea template
primary_feature_doc: '' # Primary related feature documentation

# Traceability
idea_reference: '' # Link to source idea (IDEA-YYYY-NNN)
epic_reference: '' # Link to parent epic (if applicable)
dependencies: [] # Other PBIs this depends on
---

# {Title}

## Description

<!-- Clear, concise description of what needs to be built -->

## Business Value

<!-- Why this matters to users/business -->

## Related Business Rules

> **Note:** For BravoSUITE domain features, this section references existing business rules from feature docs.

### Existing Business Rules (from feature docs)

<!-- Auto-extracted by `/refine` or BA skill -->

- **BR-{MOD}-XXX**: {Description of existing rule}
    - Source: `docs/business-features/{module}/detailed-features/{feature}.md`
    - Impact: {How this PBI relates to this rule}

- **BR-{MOD}-YYY**: {Description of existing rule}
    - Source: (link)
    - Impact: (description)

### New Business Rules (introduced by this PBI)

<!-- Define any new business rules needed -->

- **BR-{MOD}-ZZZ**: {Description of new rule}
    - Rationale: {Why this rule is needed}
    - Scope: {What it affects}

### Clarifications Needed

<!-- Flag any conflicts or ambiguities with existing rules -->

- [ ] Conflict with BR-{MOD}-XXX: (describe conflict)
- [ ] Clarification needed on BR-{MOD}-YYY: (describe question)

## Acceptance Criteria

### Format Guidelines

Use BDD format (GIVEN/WHEN/THEN):

```gherkin
GIVEN {context/precondition}
WHEN {action/trigger}
THEN {expected outcome}
```

### For BravoSUITE Domain Features

Follow test case patterns from related feature docs:

- **Format:** TC-{MOD}-{FEATURE}-XXX
- **Evidence:** file:line format (e.g., component.ts:142)
- **Reference:** See existing patterns in feature doc Section 15 (Test Cases)

### Acceptance Criteria List

#### AC-01: {Criteria title}

**Test Case:** TC-{MOD}-{FEATURE}-001

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (will be added during implementation)

- Backend: (file:line)
- Frontend: (file:line)

**Related Business Rules:** BR-{MOD}-XXX, BR-{MOD}-YYY

---

#### AC-02: {Criteria title}

**Test Case:** TC-{MOD}-{FEATURE}-002

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (will be added during implementation)

- Backend: (file:line)
- Frontend: (file:line)

---

#### AC-03: {Error case}

**Test Case:** TC-{MOD}-{FEATURE}-003

```gherkin
GIVEN {precondition}
WHEN {invalid action}
THEN {error handling}
```

## BR/TC Validation Checklist

### Existing Business Rules Referenced

- [ ] BR-{MOD}-XXX: {Rule description} - Verified applicable
- [ ] BR-{MOD}-YYY: {Rule description} - Verified applicable

### New Business Rules Introduced

- [ ] BR-{MOD}-ZZZ: {New rule description} - Review needed

### Test Case Pattern Alignment

- [ ] TC format follows TC-{MOD}-{FEATURE}-XXX pattern
- [ ] All ACs use GIVEN/WHEN/THEN format
- [ ] Evidence format specified (file:line)

### Conflict Check

- [ ] No conflicts with existing BRs identified
- [ ] Clarifications documented if needed

## Out of Scope

<!-- Explicitly list what is NOT included -->

## Dependencies

| Type       | Item   | Status   |
| ---------- | ------ | -------- |
| Upstream   | {Item} | {Status} |
| Downstream | {Item} | {Status} |

## Reference Documentation

> **Note:** Auto-populated for BravoSUITE domain features.

### Business Feature Docs

- **Primary Feature:** [{Feature Name}]({path_to_feature_doc})
- **Module Overview:** [{Module Name}]({path_to_module_readme})

### Related Entities (from .ai.md)

- [{Entity1}]({path_to_ai_md})
- [{Entity2}]({path_to_ai_md})

### Existing Test Cases

See Section 15 (Test Cases & Scenarios) in primary feature doc for patterns:

- TC-{MOD}-{FEATURE}-XXX format
- GIVEN/WHEN/THEN structure
- Evidence format examples

## Technical Notes

<!-- Architecture decisions, API contracts, data model changes -->

## Design Reference

### Figma Designs

> **Auto-Extraction:** Claude Code extracts design context from Figma links during `/plan`.

| Screen/Component | Figma Link          | Node ID     | Notes         |
| ---------------- | ------------------- | ----------- | ------------- |
| {Screen name}    | [Link]({Figma URL}) | `{node-id}` | {Description} |
| {Component name} | [Link]({Figma URL}) | `{node-id}` | {Description} |

<!--
Figma URL format: https://www.figma.com/design/{file_key}/{name}?node-id={node_id}
Node ID: Use URL format (e.g., 1-3), extraction converts to API format (1:3)
-->

### Other Assets

<!-- Wireframes, mockups, screenshots not in Figma -->

- {Asset description}: {link or path}

## Test Strategy

<!-- High-level testing approach -->

---

## Template Instructions

### Frontmatter Fields

- **module**: Auto-populated from idea or detected by `/refine`. Critical for domain PBIs.
- **related_features**: Helps navigate feature documentation during implementation.
- **primary_feature_doc**: Primary reference for business rules and test patterns.

### Related Business Rules Section

- **Existing Rules**: Auto-extracted by BA skill from feature docs. Verify accuracy.
- **New Rules**: Document any new business rules introduced. Use BR-{MOD}-NNN format.
- **Clarifications**: Flag conflicts early to avoid rework.

### Acceptance Criteria

- Use TC-{MOD}-{FEATURE}-XXX format for domain features
- Reference existing test case patterns from feature docs
- Include Evidence format reminder (will be populated during implementation)
- Link to related business rules

### Reference Documentation

- Auto-populated with links to feature docs
- Provides quick access during implementation
- Check links are valid before committing PBI

---

_To create user stories, run: `/story {this-file}`_
_To create test spec, run: `/test-spec {this-file}`_
