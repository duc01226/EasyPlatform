---
name: team-sync
version: 1.0.0
description: '[Project Management] Generate meeting agendas and facilitate team coordination. Use when preparing standups, sprint reviews, retros, weekly syncs, or team meetings. Triggers on keywords like "standup", "team sync", "meeting agenda", "daily", "sprint review", "retro", "weekly sync".'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Facilitate team synchronization by generating cross-team status updates and alignment items.

**Workflow:**

1. **Gather** -- Collect status from multiple workstreams
2. **Synthesize** -- Identify cross-team dependencies and blockers
3. **Report** -- Generate sync summary with action items

**Key Rules:**

- Focus on cross-team dependencies and blockers
- Highlight decisions needed and who needs to be involved
- Keep sync reports concise and actionable

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Team Sync

Generate meeting agendas and action item tracking.

## When to Use

- Daily standup preparation
- Weekly team sync
- Sprint review/planning
- Retrospective facilitation

## Quick Reference

### Meeting Types

#### Daily Standup

- What I did yesterday
- What I'll do today
- Any blockers

#### Weekly Sync

- Progress highlights
- Cross-team dependencies
- Upcoming milestones

#### Sprint Review

- Demo completed items
- Stakeholder feedback
- Velocity review

#### Sprint Planning

- Capacity check
- Backlog prioritization
- Sprint goal setting

### Workflow

1. Identify meeting type
2. Gather relevant data (PBIs, blockers)
3. Generate agenda template
4. Populate with current data
5. Output agenda

### Agenda Template

```markdown
## {Meeting Type} - {Date}

### Attendees

- {names}

### Agenda

1. {item}

### Discussion Points

- {point}

### Action Items

- [ ] {action} - {owner}

### Next Meeting

{date/time}
```

### Related

- **Role Skill:** `project-manager`
- **Command:** `/team-sync`

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

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
