---
# Work-record fields (id, title, intent, status, priority) follow .claude/skills/task-track/references/integration-guide.md, section "Records another skill authors".
id: TASK-{YYMMDD}-{NNN}
title: '{Brief title}'
intent: '{One sentence: the releasable outcome}'
status: draft
priority: 1-999 # integer, lower comes first; leave the key out until the task is ranked
priority_label: Must Have | Should Have | Could Have | Won't Have
source_initiative: '{INITIATIVE-XXXXXX-NNN or N/A}'
effort: XS | S | M | L | XL
delivery_wave: '{Optional implementation wave or N/A}'
created: { YYYY-MM-DD }
updated: { YYYY-MM-DD }
template_version: '2.4'

# Domain Context (for domain features — populate from project-config.json modules)
module: '' # Module name from project-config.json backendServices.serviceMap
related_features: [] # From initiative template
primary_feature_doc: '' # Primary related feature documentation

# Traceability
initiative_reference: '' # Link to source initiative (INITIATIVE-YYYY-NNN)
dependencies: [] # Other tasks this depends on
scope_mode: ORDINARY | DECOMPOSITION-EMBEDDED | EXPLICIT-ROADMAP | EXEMPT | FRAMEWORK-LIBRARY
# Required only when any shared isLargeIdea signal is true; omit for ordinary all-false ideas.
large_idea_decomposition: null
---

# {Title}

## Description

<!-- Clear, concise description of what needs to be built -->

## Business Value

<!-- Why this matters to users/business -->

## Large-Idea Decomposition (Conditional)

<!-- Required when any shared isLargeIdea signal is true. Preserve this block into stories, mock-ups, plans, and the all-task presentation. -->

```yaml
large_idea_decomposition:
    outcome_slices: [{ stable ID, independently releasable outcome, releasable-when evidence, owning artifact }]
    dependencies_order: [{ before, after, reason }]
    non_goals: [{ statement, owner }]
    risks_evidence: [{ risk, evidence_needed, status, owner }]
    deferred_work_owner: [{ item, owner, follow_up_artifact, target_slice }]
```

## Releasable Outcome (Required)

<!-- A task is one independently releasable actor-facing outcome, not a technical work package. -->

- **Primary actor:** {Who can achieve the outcome}
- **Outcome:** {What the actor can accomplish after this task}
- **Entry → result → exit journey:** {How the actor enters, acts, sees the result, and leaves or continues}
- **Visible/persisted truth:** {What proves the result is accurate after refresh, revisit, or retry}
- **Access and recovery:** {Applicable roles, loading/empty/error/duplicate-submit/refresh/recovery behavior}
- **Technical/enabling work:** {Attached subtasks/dependencies | None}; never emit technical/foundation/setup/migration work as a standalone task
- **Gate:** `PASS | BLOCKED` — {Evidence that this outcome is independently releasable}

### Full-Flow Surface (Required for UI tasks)

<!-- Cover the complete demoable outcome. “Many pages” means every required view, not an arbitrary page count. -->

| View/page   | Entry from         | User action/result         | Exit/next view      | Components                      | States              |
| ----------- | ------------------ | -------------------------- | ------------------- | ------------------------------- | ------------------- |
| {View/page} | {Navigation entry} | {Observable action/result} | {Next view or exit} | {Common/domain/page components} | {Applicable states} |

**Navigation map:** `{view} → {view} → {business result} → {exit/next step}`

**Mock-app evidence:** {Path to a multi-view mock app, or `N/A — backend-only with explicit reason`}

**Full-flow demo status:** `PASS | BLOCKED` — {The demo covers all required views, navigation, components, states, and the visible/persisted result}

## Related Business Rules

> **Note:** For project domain features, this section references existing business rules from feature docs.

### Existing Business Rules (from feature docs)

<!-- Auto-extracted by `/work-item --mode=refine` or BA skill -->

- **BR-{MOD}-XXX**: {Description of existing rule}
    - Source: `{module}/{feature}.md` in the business spec root
    - Impact: {How this task relates to this rule}

- **BR-{MOD}-YYY**: {Description of existing rule}
    - Source: (link)
    - Impact: (description)

### New Business Rules (introduced by this task)

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

### For project Domain Features

Follow test case patterns from related feature docs:

- **Format:** TC-{FEATURE}-{NNN}
- **Evidence:** `[Source: namespace/service/id]` abstract anchor (stack-portable — physical `file:line` lives only in the provenance sidecar, never in the task body)
- **Reference:** See existing patterns in feature doc Section 8 (Test Specifications)

### Acceptance Criteria List

#### AC-01: {Criteria title}

**Test Case:** TC-{FEATURE}-001

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (abstract anchor added during implementation; physical coordinates → provenance sidecar)

- Backend: `[Source: operation/{service}/{Operation}]` (or `event`/`rule`/`schema` per artifact)
- Frontend: `[Source: component/{service}/{Component}]`

**Related Business Rules:** BR-{MOD}-XXX, BR-{MOD}-YYY

---

#### AC-02: {Criteria title}

**Test Case:** TC-{FEATURE}-002

```gherkin
GIVEN {precondition}
WHEN {action}
THEN {outcome}
```

**Evidence Format:** (abstract anchor added during implementation; physical coordinates → provenance sidecar)

- Backend: `[Source: operation/{service}/{Operation}]` (or `event`/`rule`/`schema` per artifact)
- Frontend: `[Source: component/{service}/{Component}]`

---

#### AC-03: {Error case}

**Test Case:** TC-{FEATURE}-003

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

- [ ] TC format follows TC-{FEATURE}-{NNN} pattern
- [ ] All ACs use GIVEN/WHEN/THEN format
- [ ] Evidence format specified (`[Source: namespace/service/id]` abstract anchor — never physical `file:line`)

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

> **Note:** Auto-populated for project domain features.

### Business Feature Docs

- **Primary Feature:** [{Feature Name}]({path_to_feature_doc})
- **Module Overview:** [{Module Name}]({path_to_module_readme})

### Related Entities (from feature docs)

- [{Entity1}]({path_to_feature_doc}#7-domain-model)
- [{Entity2}]({path_to_feature_doc}#7-domain-model)

### Existing Test Cases

See Section 8 (Test Specifications) in primary feature doc for patterns:

- TC-{FEATURE}-{NNN} format
- GIVEN/WHEN/THEN structure
- Evidence format examples

## Technical Notes

<!-- Architecture decisions, API contracts, data model changes -->

## Design Reference

### Design References

> Export the frames as images and attach them for AI analysis — a design-tool link alone is not readable context.

| Screen/Component | Design link   | Notes         |
| ---------------- | ------------- | ------------- |
| {Screen name}    | [Link]({URL}) | {Description} |
| {Component name} | [Link]({URL}) | {Description} |

### Other Assets

<!-- Wireframes, mockups, screenshots held outside the design tool -->

- {Asset description}: {link or path}

## Test Strategy

<!-- High-level testing approach -->

---

## Template Instructions

### Frontmatter Fields

- **id / title / intent / status / priority**: the work-record fields. A new task is `status: draft` with no assignee; readiness, assignment and later states are recorded through `/task-track`, never by generating or reviewing the task. A due date, and the areas and initiatives the task belongs to, are recorded through `/task-track` as well, not as frontmatter keys.
- **module**: Auto-populated from the initiative or detected by `/work-item --mode=refine`. Critical for domain tasks.
- **related_features**: Helps navigate feature documentation during implementation.
- **primary_feature_doc**: Primary reference for business rules and test patterns.

### Related Business Rules Section

- **Existing Rules**: Auto-extracted by BA skill from feature docs. Verify accuracy.
- **New Rules**: Document any new business rules introduced. Use BR-{MOD}-NNN format.
- **Clarifications**: Flag conflicts early to avoid rework.

### Acceptance Criteria

- Use TC-{FEATURE}-{NNN} format for domain features
- Reference existing test case patterns from feature docs
- Include Evidence format reminder (will be populated during implementation)
- Link to related business rules

### Reference Documentation

- Auto-populated with links to feature docs
- Provides quick access during implementation
- Check links are valid before committing task

---

_To create user stories, run: `/work-item --mode=story {this-file}`_
_To create test spec, run: `/spec [mode=tests] {this-file}`_
