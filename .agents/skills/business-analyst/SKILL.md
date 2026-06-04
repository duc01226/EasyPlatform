---
name: business-analyst
description: '[Project Management] Use when creating user stories, writing acceptance criteria, analyzing requirements, or mapping business processes.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** Refine requirements into actionable user stories with BDD acceptance criteria and business rule traceability.

**Workflow:**

1. **Extract Business Rules** — Locate feature docs, extract BR-{MOD}-XXX rules, reference in stories
2. **Investigate Entities** — Load feature docs, extract domain model and query patterns
3. **Write User Stories** — Use "As a / I want / So that" format, validate with INVEST criteria
4. **Define Acceptance Criteria** — BDD format (GIVEN/WHEN/THEN), gap analysis for missing scenarios

**Key Rules:**

- Always reference existing business rules from `docs/specs/` before creating new ones
- User stories must pass INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- Include entity context and related domain model in every story
- MUST ATTENTION include `story_points` and `complexity` in all PBI/story outputs
- **[BLOCKING] Tech-agnostic output:** story/acceptance-criteria prose follows `docs/project-reference/spec-principles.md` §3 — no framework/product/language/design-pattern names; source paths, class names, and test identifiers appear ONLY in evidence fields (`**Evidence**`, `IntegrationTest`, `[Source:]`), frontmatter, and Mermaid.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

# Business Analyst Assistant

Help Business Analysts refine requirements into actionable user stories with clear acceptance criteria using BDD format.

---

## Business Rules Extraction (Project Domain)

When refining domain-related PBIs, automatically extract and reference existing business rules.

### Step 1: Locate Related Feature Docs

**Dynamic Discovery:**

1. Run: `Glob("docs/specs/{module}/*.md")` for feature docs
2. Or: `Glob("docs/specs/{module}/**/*.md")` for nested features

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
Glob("docs/specs/{module}/*.md")
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
3. Include Evidence field: `[Source: namespace/service/id]` abstract-anchor format — never physical code coordinates or repository-root paths (stack-portable; see `shared/tc-format.md`)
4. Example from InvoiceManagement feature:
    ```
    TC-INV-001: Create invoice with valid data
    GIVEN user has permission to create invoices
    WHEN user submits invoice form with all required fields
    THEN invoice is created and appears in invoice list
    Evidence: [Source: operation/sales/CreateInvoice], [Source: component/sales/Invoice]
    ```

### 4. Business Rules Documentation

#### Rule Format

```
BR-{MOD}-{NNN}: {Rule name}
IF {condition}
THEN {action/result}
ELSE {alternative}
Evidence: [Source: rule/{service}/{RuleName}]
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
- [ ] Evidence format follows the abstract-anchor convention (`[Source: namespace/service/id]`) — no physical code coordinates or repository-root paths

### Documentation Links

Add to user story:

```markdown
## Reference Documentation

- Feature Doc: `docs/specs/{module}/{feature}.md`
- Related Entities: `docs/specs/{module}/*.md`
- Existing Test Cases: See feature doc Section 8 (Test Specifications)
```

If conflicts found, note in "Unresolved Questions" section.

---

## Workflow Integration

### Refining Ideas to PBIs

When user runs `$refine {idea-file}`:

1. Read idea artifact
2. **Check for module field** in frontmatter
3. **Load business feature context** if domain-related
4. Extract requirements
5. **Extract existing BRs** from feature docs
6. Identify acceptance criteria using TC patterns
7. Create PBI with GIVEN/WHEN/THEN format
8. Save to `team-artifacts/pbis/`

### Creating User Stories

When user runs `$story {pbi-file}`:

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
````

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

```

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

Use a direct user question tool with 3-5 questions:

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
```

### When to Flag for Stakeholder Review

- Decision impacts other teams
- Scope change requested
- Technical risk identified
- Business rule conflict detected

**This step is NOT optional - always validate before marking refinement complete.**

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
