---
name: business-analyst
version: 1.0.0
description: '[Project Management] Assist Business Analysts with requirements refinement, user story writing, acceptance criteria in BDD format, and gap analysis. Use when creating user stories, writing acceptance criteria, analyzing requirements, or mapping business processes. Triggers on keywords like "requirements", "user story", "acceptance criteria", "BDD", "GIVEN WHEN THEN", "gap analysis", "process flow", "business rules".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

## Quick Summary

**Goal:** Refine requirements into actionable user stories with BDD acceptance criteria and business rule traceability.

**Workflow:**

1. **Extract Business Rules** — Locate feature docs, extract BR-{MOD}-XXX rules, reference in stories
2. **Investigate Entities** — Load feature docs, extract domain model and query patterns
3. **Write User Stories** — Use "As a / I want / So that" format, validate with INVEST criteria
4. **Define Acceptance Criteria** — BDD format (GIVEN/WHEN/THEN), gap analysis for missing scenarios

**Key Rules:**

- Always reference existing business rules from `docs/business-features/` before creating new ones
- User stories must pass INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Include entity context and related domain model in every story
- MUST ATTENTION include `story_points` and `complexity` in all PBI/story outputs

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

# Business Analyst Assistant

Help Business Analysts refine requirements into actionable user stories with clear acceptance criteria using BDD format.

---

## Business Rules Extraction (Project Domain)

When refining domain-related PBIs, automatically extract and reference existing business rules.

### Step 1: Locate Related Feature Docs

**Dynamic Discovery:**

1. Run: `Glob("docs/business-features/{module}/detailed-features/*.md")` for feature docs
2. Or: `Glob("docs/business-features/{module}/detailed-features/**/*.md")` for nested features

From PBI frontmatter or module detection:

1. Check `module` field
2. Identify related feature from `related_features` list
3. Read discovered feature documentation

### Step 2: Extract Existing Business Rules

From feature doc "Business Rules" section:

- Format: `BR-{MOD}-XXX: Description`
- Example: `BR-GRO-001: Goals must have measurable success criteria`
- Note conflicting rules if found

### Step 3: Add to User Story

Include section:

```markdown
## Related Business Rules

**From Feature Docs:**

- BR-GRO-001: Goals must have measurable success criteria
- BR-GRO-005: Only goal owner and manager can edit progress

**New Business Rules (if applicable):**

- BR-GRO-042: {New rule description}

**Conflicts/Clarifications:**

- {Note any conflicts with existing rules}
```

### Token Budget

Target 8-12K tokens total (validated decision: prefer completeness):

- Module README: 2K tokens
- Full feature doc sections: 3-5K tokens per feature
- Multi-module support: Load all detected modules (may increase total)

---

## Entity Domain Investigation

When refining domain-related PBIs, investigate related entities using feature docs.

### Step 1: Load Feature Doc

```
Glob("docs/business-features/{module}/detailed-features/*.md")
```

Select file matching feature from PBI context.

### Step 2: Extract Domain Model

From `## Domain Model` section (Section 5):

- Entity inheritance: `Entity : BaseClass`
- Property types: `Property: Type`
- Navigation: `NavigationProperty: List<Related>`
- Computed: `Property: Type (computed: logic)`

### Step 3: Correlate with Codebase

From `## File Locations` section:

1. Read entity source file
2. Verify properties match documentation
3. Note any undocumented properties (flag for doc update)

### Step 4: Identify Query Patterns

From `## Key Expressions` section:

- Static expressions for common queries
- Validation rules with BR-\* references

### Step 5: Add to User Story

Include entity context:

```markdown
## Entity Context

**Primary:** {Entity} - {description}
**Related:** {Entity1}, {Entity2}
**Key Queries:** {ExpressionName}
**Source:** {path}
```

This ensures implementation uses correct entities and patterns.

---

## Core Capabilities

### 1. Requirements Refinement

- Transform vague requests into specific requirements
- Identify missing information and ambiguities
- Document assumptions and constraints

### 2. User Story Writing

#### Format

```
As a {user role/persona}
I want {goal/desire}
So that {benefit/value}
```

#### INVEST Criteria

- **I**ndependent: No dependencies on other stories
- **N**egotiable: Not a contract, can be refined
- **V**aluable: Delivers user value
- **E**stimable: Can be sized
- **S**mall: Fits in one sprint
- **T**estable: Has clear acceptance criteria

### 3. Acceptance Criteria (BDD Format)

```gherkin
Scenario: {Descriptive title}
  Given {precondition/context}
    And {additional context}
  When {action/trigger}
    And {additional action}
  Then {expected outcome}
    And {additional verification}
```

**For Project Domain:**

1. Reference existing test case patterns from feature docs
2. Use TC-{FEATURE}-{NNN} format (e.g., TC-GM-001)
3. Include Evidence field: `file:line` format
4. Example from GoalManagement feature:
    ```
    TC-GRO-GOAL-001: Create goal with valid data
    GIVEN employee has permission to create goals
    WHEN employee submits goal form with all required fields
    THEN goal is created and appears in goal list
    Evidence: goal.service.ts:87, goal.component.ts:142
    ```

### 4. Business Rules Documentation

#### Rule Format

```
BR-{MOD}-{NNN}: {Rule name}
IF {condition}
THEN {action/result}
ELSE {alternative}
Evidence: {file}:{line}
```

### 5. Gap Analysis

- Current state vs desired state mapping
- Identify process improvements
- Document integration requirements

---

## Context Validation (Project Domain)

Before finalizing user story:

### Cross-Reference Check

- [ ] Business rules don't conflict with existing BR-{MOD}-XXX rules
- [ ] Test case format matches existing TC-{FEATURE}-{NNN} patterns
- [ ] Entity names match those in feature docs
- [ ] Evidence format follows file:line convention

### Documentation Links

Add to user story:

```markdown
## Reference Documentation

- Feature Doc: `docs/business-features/{module}/detailed-features/{feature}.md`
- Related Entities: `docs/business-features/{module}/detailed-features/*.md`
- Existing Test Cases: See feature doc Section 15 (Test Specifications)
```

If conflicts found, note in "Unresolved Questions" section.

---

## Workflow Integration

### Refining Ideas to PBIs

When user runs `/refine {idea-file}`:

1. Read idea artifact
2. **Check for module field** in frontmatter
3. **Load business feature context** if domain-related
4. Extract requirements
5. **Extract existing BRs** from feature docs
6. Identify acceptance criteria using TC patterns
7. Create PBI with GIVEN/WHEN/THEN format
8. Save to `team-artifacts/pbis/`

### Creating User Stories

When user runs `/story {pbi-file}`:

1. Read PBI
2. Break into vertical slices
3. Write user stories with AC
4. Ensure INVEST criteria met
5. **Include related BRs**
6. Save to `team-artifacts/pbis/stories/`

---

## Templates

### User Story Template

````markdown
---
id: US-{YYMMDD}-{NNN}
parent_pbi: '{PBI-ID}'
persona: '{Persona name}'
priority: P1 | P2 | P3
story_points: 1 | 2 | 3 | 5 | 8 | 13 | 21
complexity: Low | Medium | High | Very High
status: draft | ready | in_progress | done
module: '' # Project module (if applicable)
---

# User Story

**As a** {user role}
**I want** {goal}
**So that** {benefit}

## Acceptance Criteria

### Scenario 1: {Happy path title}

```gherkin
Given {context}
When {action}
Then {outcome}
```
````

### Scenario 2: {Edge case title}

```gherkin
Given {context}
When {action}
Then {outcome}
```

### Scenario 3: {Error case title}

```gherkin
Given {context}
When {invalid action}
Then {error handling}
```

## Related Business Rules

<!-- Auto-extracted from feature docs -->

- BR-{MOD}-XXX: {Description}

## Out of Scope

- {Explicitly excluded item}

## Notes

- {Implementation guidance}

```

---

## Elicitation Techniques

### 5 Whys
1. Why? → {answer}
2. Why? → {answer}
3. Why? → {answer}
4. Why? → {answer}
5. Why? → {root cause}

### SMART Criteria for Requirements
- **S**pecific: Clear and unambiguous
- **M**easurable: Can verify completion
- **A**chievable: Technically feasible
- **R**elevant: Aligned with business goals
- **T**ime-bound: Has a deadline or sprint

---

## Output Conventions

### File Naming
```

{YYMMDD}-ba-story-{slug}.md
{YYMMDD}-ba-requirements-{slug}.md

````

### Requirement IDs
- Functional: `FR-{MOD}-{NNN}` (e.g., FR-GROW-001)
- Non-Functional: `NFR-{MOD}-{NNN}`
- Business Rule: `BR-{MOD}-{NNN}`

### AC IDs
- `AC-{NNN}` per story/PBI

### Test Case IDs (Project)
- `TC-{FEATURE}-{NNN}` (e.g., TC-GM-001)

---

## Quality Checklist

Before completing BA artifacts:
- [ ] User story follows "As a... I want... So that..." format
- [ ] At least 3 scenarios: happy path, edge case, error case
- [ ] All scenarios use GIVEN/WHEN/THEN
- [ ] Out of scope explicitly listed
- [ ] Story meets INVEST criteria
- [ ] No solution-speak in requirements (only outcomes)
- [ ] **Existing BRs referenced** (if domain-related)
- [ ] **TC format matches feature docs** (if domain-related)
- [ ] **Entity names use domain vocabulary**

---

## Post-Refinement Validation (MANDATORY)

**Every refinement must end with a validation interview.**

After completing user story or PBI refinement, conduct validation to:

1. Surface hidden assumptions
2. Confirm critical decisions
3. Identify potential concerns
4. Brainstorm with user on alternatives

### Validation Interview Process

Use `AskUserQuestion` tool with 3-5 questions:

| Category        | Example Questions                       |
| --------------- | --------------------------------------- |
| Assumptions     | "We assume X. Is this correct?"         |
| Scope           | "Should Y be explicitly excluded?"      |
| Dependencies    | "Does this depend on Z being ready?"    |
| Edge Cases      | "What happens when data is empty/null?" |
| Business Impact | "Will this affect existing reports?"    |

### Document Validation Results

Add to user story/PBI:

```markdown
## Validation Summary

**Validated:** {date}

### Confirmed Decisions
- {decision}: {user choice}

### Concerns Raised
- {concern}: {resolution}

### Action Items
- [ ] {follow-up if any}
````

### When to Flag for Stakeholder Review

- Decision impacts other teams
- Scope change requested
- Technical risk identified
- Business rule conflict detected

**This step is NOT optional - always validate before marking refinement complete.**

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
