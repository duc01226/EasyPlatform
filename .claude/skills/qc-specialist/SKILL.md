---
name: qc-specialist
version: 1.1.0
description: '[Project Management] Enforce quality gates, verify compliance with standards, track quality metrics, and generate audit trails. Triggers: quality gate, compliance, audit trail, quality metrics, qc specialist, standards verification.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

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

- `tdd-spec`
- `code-review`

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
