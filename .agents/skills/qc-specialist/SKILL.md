---
name: qc-specialist
description: '[Project Management] Use when you need to enforce quality gates, verify compliance with standards, track quality metrics, and generate audit trails.'
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

**Goal:** Enforce quality gates, verify compliance with standards, and track quality metrics across the development lifecycle.

**Workflow:**

1. **Identify Gate** — Determine which quality gate applies (Idea>PBI, PBI>Dev, Dev>QA, QA>Release)
2. **Verify Checklist** — Run through pass/fail criteria for the gate stage
3. **Generate Report** — Produce PASS/FAIL/CONDITIONAL gate status with evidence
4. **Track Metrics** — Log in audit trail and update quality metrics dashboard

**Key Rules:**

- Every gate must have a clear PASS/FAIL/CONDITIONAL status
- Evidence must be provided for critical checklist items
- Sign-offs are required before release gates can pass

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# QC Specialist Assistant

Help QC Specialists enforce quality gates, verify compliance with standards, and track quality metrics across the development lifecycle.

---

## Core Capabilities

### 1. Quality Gates

Define pass/fail criteria at each stage:

#### Gate: Idea → PBI

- [ ] Problem statement present
- [ ] Business value articulated
- [ ] No technical solution prescribed
- [ ] Target users identified

#### Gate: PBI → Development

- [ ] Acceptance criteria in GIVEN/WHEN/THEN
- [ ] Out of scope defined
- [ ] Dependencies identified
- [ ] Design approved (if applicable)

#### Gate: Development → QA

- [ ] Code review approved
- [ ] Unit tests >80% coverage
- [ ] No P1/P2 linting errors
- [ ] Documentation updated

#### Gate: QA → Release

- [ ] All test cases executed
- [ ] No open P1/P2 bugs
- [ ] Regression suite passed
- [ ] PO sign-off received

#### PO Acceptance Decision (per-AC verdict — how "PO sign-off received" is earned)

For each acceptance criterion from the PBI/story:

1. **Read criterion** — Ensure it's testable and measurable
2. **Check evidence** — Review test results, screenshots, demo recordings
3. **Verify** — Does the implementation satisfy the criterion?
4. **Verdict** — PASS or FAIL with specific evidence

**Decision rules:** Every acceptance criterion must have a PASS/FAIL verdict. REJECT must list the specific items that failed. CONDITIONAL ACCEPT must list conditions and a timeline.

```
## Acceptance Decision

**Feature/PBI:** {Reference}
**Reviewer:** {PO name/role}
**Date:** {date}
**Verdict:** ACCEPT | REJECT | CONDITIONAL ACCEPT

### Criteria Review

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| 1 | {AC text} | PASS | {Evidence} |
| 2 | {AC text} | FAIL | {Why it failed} |

### Decision Details
- {Rationale for overall verdict}

### Conditions (if CONDITIONAL)
- {Condition — deadline}

### Rejected Items (if REJECT)
- {Item — what needs to change}
```

### 2. Compliance Verification

- Code follows architecture patterns
- Security requirements met
- Accessibility standards (WCAG 2.1 AA)
- Performance benchmarks

### 3. Audit Trail

Track artifact lifecycle:

```
{Artifact} | {Action} | {By} | {Date} | {Notes}
```

### 4. Quality Metrics

#### Code Quality

- Cyclomatic complexity
- Code coverage %
- Technical debt ratio
- Duplication %

#### Process Quality

- Defect escape rate
- First-time-right %
- Cycle time
- Lead time

---

## Quality Gate Checklists

### Pre-Development Checklist

```markdown
## Quality Gate: PBI Ready for Development

**PBI:** {PBI-ID}
**Reviewer:** {Name}
**Date:** {Date}

### Requirements

- [ ] Clear problem statement
- [ ] User value articulated
- [ ] Acceptance criteria in GIVEN/WHEN/THEN format
- [ ] Out of scope explicitly listed

### Design

- [ ] Design spec approved (if UI changes)
- [ ] API contract defined (if backend changes)
- [ ] Database changes documented (if applicable)

### Dependencies

- [ ] Upstream dependencies identified
- [ ] No blocking dependencies
- [ ] Integration points documented

### Gate Status: PASS / FAIL / CONDITIONAL

**Notes:**
{Any concerns or conditions}
```

### Pre-Release Checklist

```markdown
## Quality Gate: Ready for Release

**Feature:** {Feature name}
**Release:** {Version}
**Date:** {Date}

### Testing

- [ ] All test cases executed
- [ ] Pass rate: \_\_\_\_%
- [ ] No open P1 bugs
- [ ] No open P2 bugs (or exceptions approved)

### Code Quality

- [ ] Code review approved
- [ ] Coverage > 80%
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met

### Documentation

- [ ] User documentation updated
- [ ] API documentation current
- [ ] Release notes drafted

### Sign-Offs

- [ ] QA Lead: **\*\***\_**\*\*** Date: **\_\_\_**
- [ ] Dev Lead: **\*\***\_**\*\*** Date: **\_\_\_**
- [ ] PO: **\*\*\*\***\_\_**\*\*\*\*** Date: **\_\_\_**

### Gate Status: PASS / FAIL

**Release Decision:**
{Go / No-Go with notes}
```

---

## Workflow Integration

### Running Quality Gate

When user runs `$quality-gate {artifact-or-pr}`:

1. Identify gate type based on artifact/stage
2. Load appropriate checklist
3. Verify each criterion
4. Generate pass/fail report
5. Log in audit trail

---

## Metrics Dashboard Template

```markdown
## Quality Metrics - Sprint {N}

### Code Quality

| Metric      | Target | Actual | Trend |
| ----------- | ------ | ------ | ----- |
| Coverage    | >80%   |        | ↑↓→   |
| Complexity  | <15    |        |       |
| Duplication | <5%    |        |       |
| Debt Ratio  | <10%   |        |       |

### Process Quality

| Metric            | Target | Actual |
| ----------------- | ------ | ------ |
| Defect Escape     | <5%    |        |
| First-Time-Right  | >90%   |        |
| Avg Review Cycles | <2     |        |

### Defect Trends

| Sprint | Found | Fixed | Escaped |
| ------ | ----- | ----- | ------- |
| N-2    |       |       |         |
| N-1    |       |       |         |
| N      |       |       |         |
```

---

## Output Conventions

### File Naming

```
{YYMMDD}-qc-gate-{stage}-{slug}.md
{YYMMDD}-qc-audit-{feature}.md
{YYMMDD}-qc-metrics-sprint-{n}.md
```

---

## Quality Checklist

Before completing QC artifacts:

- [ ] All checklist items verified
- [ ] Evidence provided for critical items
- [ ] Sign-offs captured
- [ ] Gate status clearly stated
- [ ] Audit trail updated

## Related

- `spec`
- `code-review`

---

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

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
