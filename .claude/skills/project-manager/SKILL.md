---
name: project-manager
version: 1.1.0
description: '[Project Management] Generate project status reports, track dependencies, manage risk registers, and facilitate team sync meetings. Triggers: project status, sprint tracking, risk assessment, project timeline, blocker report, meeting agenda.'
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

**Goal:** Generate project status reports, track dependencies, manage risks, and facilitate team sync meetings.

**Workflow:**

1. **Status Reports** — Aggregate sprint progress, blockers, velocity from PBIs/PRs/todos
2. **Dependency Tracking** — Map inter-feature dependencies and critical path
3. **Risk Management** — Score probability x impact (1-9), define mitigations
4. **Team Sync** — Generate meeting agendas, track action items and decisions

**Key Rules:**

- MUST ATTENTION READ `references/report-templates.md` before executing
- All data must be current; blockers need owners and actions
- Status colors: Green (on track), Yellow (at risk), Red (blocked)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Project Manager Assistant

Help Project Managers generate status reports, track dependencies, manage risks, and facilitate team synchronization.

---

## Prerequisites

**⚠️ MUST ATTENTION READ** `references/report-templates.md` before executing — contains status report template, dependency tracker, risk register, team sync agenda, and sprint ceremony checklists required by all capabilities below.

## Core Capabilities

| Capability          | Command         | Key Activities                                                            |
| ------------------- | --------------- | ------------------------------------------------------------------------- |
| Status Reports      | `/status`       | Aggregate sprint progress, summarize completions/blockers, track velocity |
| Dependency Tracking | `/dependency`   | Map inter-feature dependencies, identify critical path, alert on risks    |
| Risk Management     | Update register | Score probability x impact, define mitigations, escalate critical         |
| Team Sync           | `/team-sync`    | Generate agendas, track action items, document decisions                  |

---

## Status Report Generation

**Command:** `/status`

Generate from:

1. PBIs in `team-artifacts/pbis/` with `in_progress` status
2. Recent PRs and commits
3. Open blockers in todo lists
4. Quality gate reports

**⚠️ MUST ATTENTION READ:** `references/report-templates.md` for full status report template.

---

## Dependency Tracking

**Command:** `/dependency`

Visualize and track upstream/downstream dependencies, external dependencies, and critical path.

**⚠️ MUST ATTENTION READ:** `references/report-templates.md` for dependency matrix and tracker template.

---

## Risk Management

Maintain risk register with probability x impact scoring (1-9 scale).

| Threshold    | Action                                 |
| ------------ | -------------------------------------- |
| 7-9 Critical | Escalate to stakeholders, daily review |
| 4-6 High     | Active mitigation, weekly review       |
| 1-3 Low      | Monitor, bi-weekly review              |

**⚠️ MUST ATTENTION READ:** `references/report-templates.md` for risk register template and scoring matrix.

---

## Team Sync Facilitation

**Command:** `/team-sync`

Generate meeting agenda covering: sprint health, role updates, blockers, risks, action items.

**⚠️ MUST ATTENTION READ:** `references/report-templates.md` for agenda template and sprint ceremonies checklists.

---

## Output Conventions

### File Naming

```
{YYMMDD}-pm-status-sprint-{n}.md
{YYMMDD}-pm-dependency-{feature}.md
{YYMMDD}-pm-risk-register.md
{YYMMDD}-pm-sync-{date}.md
```

### Status Colors

- Green: On Track
- Yellow: At Risk
- Red: Blocked/Critical

---

## Integration Points

| When            | Trigger         | Action                  |
| --------------- | --------------- | ----------------------- |
| End of day      | `/status`       | Generate daily status   |
| Sprint start    | `/dependency`   | Map sprint dependencies |
| Risk identified | Update register | Score and assign        |
| Before sync     | `/team-sync`    | Generate agenda         |

---

## Quality Checklist

- [ ] All data is current (as of today)
- [ ] Blockers have owners and actions
- [ ] Risks are scored and have mitigations
- [ ] Dependencies are mapped both directions
- [ ] Status colors accurately reflect health
- [ ] Action items have owners and due dates

## Related

- `product-owner`
- `planning`

## References

| File                             | Contents                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `references/report-templates.md` | Status report, dependency tracker, risk register, team sync agenda, sprint ceremony checklists |

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
- **IMPORTANT MUST ATTENTION** READ `references/report-templates.md` before starting
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->
