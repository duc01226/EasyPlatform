---
name: quality-gate-review
version: 1.1.1
description: '[Project Management] Use when you need to enforce quality gates, verify compliance with standards, track quality metrics, and generate audit trails.'
---

## Quick Summary

**Goal:** Enforce quality gates, verify compliance with standards, and track quality metrics across the development lifecycle.

> **Renamed:** formerly `/qc-specialist` — that name no longer resolves as a slash command; use `/quality-gate-review`.

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

# Quality Gate Review

Enforce quality gates, verify compliance with standards, track quality metrics, and generate audit trails across the development lifecycle.

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
- [ ] Mutation score meets target; surviving mutants triaged (line-coverage diagnostic only — not a gate)
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
- Mutation score (line-coverage diagnostic only — not a gate)
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

### Pre-QA Checklist

```markdown
## Quality Gate: Ready for QA (Dev → QA)

**Feature/PBI:** {Reference}
**Reviewer:** {Name}
**Date:** {Date}

### Readiness

- [ ] All acceptance criteria implemented
- [ ] Unit tests passing
- [ ] Code review complete
- [ ] No known critical bugs
- [ ] Test data prepared

### Gate Status: PASS / FAIL / CONDITIONAL

**Notes:**
{Any concerns or conditions}
```

### Database Performance gate (applies to all stages)

- [ ] Database performance (pagination on all list queries; indexes on filter/FK/sort columns) — verified via `/production-readiness-review` and `/performance-review`

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
- [ ] Mutation score meets target; surviving mutants triaged (line-coverage reported as a diagnostic only, no threshold)
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

When user runs `/quality-gate {artifact-or-pr}`:

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

| Metric         | Target          | Actual | Trend |
| -------------- | --------------- | ------ | ----- |
| Mutation score | meets target    |        | ↑↓→   |
| Line coverage  | diagnostic only |        | ↑↓→   |
| Complexity     | <15             |        |       |
| Duplication    | <5%             |        |       |
| Debt Ratio     | <10%            |        |       |

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

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

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
> **Stop conditions:** confidence <80% on any critical decision → escalate via AskUserQuestion · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `/sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `/sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Enforce quality gates, verify compliance with standards, track quality metrics, and generate audit trails across the development lifecycle.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Sequential Thinking:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers, confidence closer.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
