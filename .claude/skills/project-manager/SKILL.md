---
name: project-manager
version: 1.1.0
description: '[Project Management] Use when you need to generate project status reports, track dependencies, manage risk registers, and facilitate team sync meetings.'
---

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
| Status Reports      | (this skill)    | Aggregate sprint progress, summarize completions/blockers, track velocity |
| Dependency Tracking | `/dependency`   | Map inter-feature dependencies, identify critical path, alert on risks    |
| Risk Management     | Update register | Score probability x impact, define mitigations, escalate critical         |

---

## Status Report Generation

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
| End of day      | (this skill)    | Generate daily status   |
| Sprint start    | `/dependency`   | Map sprint dependencies |
| Risk identified | Update register | Score and assign        |

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
- `plan`

## References

| File                             | Contents                                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `references/report-templates.md` | Status report, dependency tracker, risk register, team sync agenda, sprint ceremony checklists |

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** critical + sequential thinking, traced proof, confidence >80%, anti-hallucination.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
**IMPORTANT MUST ATTENTION** READ `references/report-templates.md` before starting

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
