---
name: product-owner
description: '[Project Management] Capture ideas, manage product backlogs, apply prioritization frameworks (RICE, MoSCoW), and facilitate stakeholder communication. Triggers: product owner, backlog management, user story prioritization, product roadmap, product backlog.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Help Product Owners capture ideas, manage backlogs, and prioritize using RICE, MoSCoW, and Value/Effort frameworks.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `project-structure-reference.md` -- project patterns and structure
> - `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (Codex has no hook injection — open this file directly before proceeding)
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Idea Capture** — Structure raw concepts with module detection and domain context
2. **Backlog Management** — Create/refine PBIs, track dependencies
3. **Prioritization** — Apply RICE score, MoSCoW, or Value/Effort matrix
4. **Validation** — MANDATORY interview to confirm assumptions before completion

**Key Rules:**

- Use numeric priority ordering (1-999), never High/Medium/Low categories
- Always detect project module and load feature context for domain ideas
- Post-refinement validation interview is NOT optional
- Use domain-specific entity names (Candidate, Employee, Goal, etc.)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Product Owner Assistant

Help Product Owners capture ideas, manage backlogs, and make prioritization decisions using established frameworks.

---

## Project Context Awareness

When working on domain ideas, automatically detect and load business feature context.

### Module Detection

**Dynamic Discovery:**

1. Run: `Glob("docs/business-features/*/README.md")`
2. Extract module names from paths
3. Match keywords (detect module from docs/business-features/ directory names)

**Detection Approach (silent auto-detect):**

- Auto-detect module(s) without displaying confidence levels
- Only prompt when ambiguous: "Which project module is this for?" + list Glob results

### Feature Context Loading

Once module detected:

1. Read `docs/business-features/{module}/README.md` (first 200 lines for overview)
2. Extract feature list from Quick Navigation
3. Identify closest matching feature(s)
4. Note related entities and services

**Multi-module support:** If 2+ modules detected, load ALL modules.

### Domain Vocabulary

Use exact entity names from docs:

- ServiceA: Candidate (not "Applicant"), Job, JobApplication, Interview, CV
- ServiceB: Order, Feedback, Review, CheckIn, Report
- Use "Employee" not "User" for staff members
- Use "Candidate" not "Applicant" for recruitment

### Token Budget

Target 8-12K tokens total for feature context loading:

- Module README overview: ~2K tokens
- Full feature doc sections: 3-5K tokens per feature
- Multi-module: Load all detected (may increase total)

---

## Core Capabilities

### 1. Idea Capture

- Transform raw concepts into structured idea artifacts
- Identify problem statements and value propositions
- Tag and categorize for future refinement
- **NEW:** Detect module and inject feature context

### 2. Backlog Management

- Create and refine Product Backlog Items (PBIs)
- Maintain backlog ordering (not categories)
- Track dependencies and blockers

### 3. Prioritization Frameworks

#### RICE Score

```
RICE = (Reach × Impact × Confidence) / Effort

Reach: # users affected per quarter
Impact: 0.25 (minimal) | 0.5 (low) | 1 (medium) | 2 (high) | 3 (massive)
Confidence: 0.5 (low) | 0.8 (medium) | 1.0 (high)
Effort: Story points (1, 2, 3, 5, 8, 13, 21)
```

#### MoSCoW

- **Must Have**: Critical for release, non-negotiable
- **Should Have**: Important but not vital
- **Could Have**: Nice to have, low effort
- **Won't Have**: Out of scope this cycle

#### Value vs Effort Matrix

```
         High Value
             │
    Quick    │    Strategic
    Wins     │    Priorities
─────────────┼─────────────
    Fill     │    Time
    Ins      │    Sinks
             │
         Low Value
   Low Effort    High Effort
```

### 4. Sprint Planning Support

- Capacity planning based on velocity
- Sprint goal definition
- Commitment vs forecast distinction

---

## Artifact Templates

### Idea Template Generation

Include in frontmatter (if project domain):

```yaml
module: ServiceB # Detected module
related_features: [OrderManagement, Feedback] # From README feature list
feature_doc_path: docs/business-features/ServiceB/detailed-features/README.GoalManagementFeature.md
entities: [Goal, Employee, OrganizationalUnit] # From feature doc
```

Use domain vocabulary in idea description based on loaded context.

### Template Locations

- Idea: `.claude/docs/team-artifacts/templates/idea-template.md`
- PBI: `.claude/docs/team-artifacts/templates/pbi-template.md`

---

## Workflow Integration

### Creating Ideas (with Domain Context)

When user says "new idea" or "feature request":

1. Use `$idea` command workflow
2. **Detect module** from conversation keywords
3. **Load feature context** from docs/business-features/
4. Populate idea-template.md with domain fields
5. Save to `team-artifacts/ideas/`
6. Suggest next step: `$refine {idea-file}`

### Prioritizing Backlog

When user says "prioritize" or "order backlog":

1. Read all PBIs in `team-artifacts/pbis/`
2. Apply requested framework (RICE, MoSCoW, Value/Effort)
3. Output ordered list with scores
4. Update priority field in PBI frontmatter

---

## Output Conventions

### File Naming

```
{YYMMDD}-po-idea-{slug}.md
{YYMMDD}-pbi-{slug}.md
```

### Priority Values

- Numeric ordering: 1 (highest) to 999 (lowest)
- Never use High/Medium/Low categories

### Status Values

`draft` | `under_review` | `approved` | `rejected` | `in_progress` | `done`

---

## Anti-Patterns to Avoid

1. **Category-based priority** - Use ordered sequence, not High/Med/Low
2. **Vague acceptance criteria** - Require GIVEN/WHEN/THEN format
3. **Scope creep** - Explicitly list "Out of Scope"
4. **Missing dependencies** - Always identify upstream/downstream
5. **Generic terminology** - Use domain-specific entity names

---

## Integration Points

| When           | Trigger          | Action                                 |
| -------------- | ---------------- | -------------------------------------- |
| Idea captured  | `$idea` complete | Suggest `$refine`, note module context |
| PBI ready      | PBI approved     | Notify BA for stories                  |
| Sprint planned | Sprint goal set  | Update PBI assignments                 |
| Domain feature | Module detected  | Load business feature docs             |

---

## Stakeholder Communication Templates

### Sprint Review Summary

```markdown
## Sprint {N} Review

**Sprint Goal:** {goal}
**Status:** {achieved | partially | not achieved}

### Completed Items

| PBI | Value Delivered |
| --- | --------------- |
|     |                 |

### Carried Over

| PBI | Reason | Plan |
| --- | ------ | ---- |
|     |        |      |

### Key Metrics

- Velocity: {points}
- Commitment: {%}
```

### Roadmap Update

```markdown
## Roadmap Update - {Date}

### This Quarter

| Priority | Item | Target | Status |
| -------- | ---- | ------ | ------ |
| 1        |      |        |        |

### Next Quarter

| Item | Dependencies | Notes |
| ---- | ------------ | ----- |
|      |              |       |

### Deferred

| Item | Reason |
| ---- | ------ |
|      |        |
```

---

## Quality Checklist

Before completing PO artifacts:

- [ ] Problem statement is user-focused, not solution-focused
- [ ] Value proposition quantified or qualified
- [ ] Priority has numeric order
- [ ] Dependencies explicitly listed
- [ ] Status frontmatter current
- [ ] **Module detected and context loaded** (if domain-related)
- [ ] **Domain vocabulary used correctly**

---

## Post-Refinement Validation (MANDATORY)

**Every idea/PBI refinement must end with a validation interview.**

After completing idea capture or PBI creation, validate with user to:

1. Confirm assumptions about user needs
2. Verify scope boundaries
3. Surface potential concerns
4. Brainstorm alternatives

### Validation Interview Process

Use a direct user question tool with 3-5 questions:

| Category     | Example Questions                                 |
| ------------ | ------------------------------------------------- |
| User Value   | "Is the value proposition clear to stakeholders?" |
| Scope        | "Should we explicitly exclude feature X?"         |
| Priority     | "Does this priority align with roadmap?"          |
| Dependencies | "Are there blockers from other teams?"            |
| Risk         | "What's the biggest concern with this approach?"  |

### Document Validation Results

Add to idea/PBI:

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

### When to Escalate

- Priority conflicts with roadmap
- Resource constraints identified
- Stakeholder alignment needed
- Cross-team dependency discovered

**This step is NOT optional - always validate before marking complete.**

## Related

- `business-analyst`
- `project-manager`

---

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

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
