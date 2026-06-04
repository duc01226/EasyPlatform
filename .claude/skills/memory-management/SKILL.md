---
name: memory-management
version: 1.0.0
description: '[Utilities] Use when saving or recovering task progress across sessions via file checkpoints — especially before context compaction.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Persist task progress across sessions using file-based checkpoints so work survives context loss and compaction.

**Workflow:**

1. **File Checkpoints** — Save task-specific context to `plans/reports/checkpoint-*.md` every 30-60 min
2. **Recovery** — On context loss, find latest checkpoint via Glob, read it, resume from documented next steps

**Key Rules:**

- Create checkpoints before expected context compaction and at key milestones
- Always include Recovery Instructions in checkpoint files
- Checkpoints are file-based and permanent; create them with `/checkpoint`, restore with `/recover`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Memory Management & Task Continuity

Provide external file-based checkpoints for long-running tasks so progress, findings, and next steps survive context loss and compaction.

---

## File-Based External Memory (Checkpoints)

### When to Create File Checkpoints

- Starting complex multi-step tasks (investigation, planning, implementation)
- Every 30-60 minutes during long tasks
- At key milestones
- Before expected context compaction
- After completing significant analysis phases

### Checkpoint File Location

Files saved to: `plans/reports/checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`

### CHECKPOINT_CREATE Protocol

Create a checkpoint file with this structure:

```markdown
# Memory Checkpoint: {Task Description}

> Created: {ISO timestamp}
> Task Type: {investigation|planning|bugfix|feature|docs}
> Phase: {current phase number/name}

## Task Context

{What you're working on and why}

## Key Findings

{Critical discoveries and insights - be specific with file paths and line numbers}

## Files Analyzed

| File              | Purpose     | Status   |
| ----------------- | ----------- | -------- |
| path/file.cs:line | description | ✅/🔄/⏳ |

## Progress

- [x] Completed items
- [ ] In-progress items
- [ ] Remaining items

## Important Context

{Information that must be preserved - decisions, assumptions, rationale}

## Next Steps

1. {Immediate next action}
2. {Following action}

## Recovery Instructions

{Exact steps to resume: which file to read, which line to continue from}
```

### CHECKPOINT_RECOVER Protocol

When recovering from a checkpoint:

1. Search for latest checkpoint: `Glob("plans/reports/checkpoint-*.md")`
2. Read the checkpoint file
3. Load any referenced analysis files
4. Review Progress section
5. Continue from documented Next Steps
6. Create new checkpoint after resuming

### Checkpoint Before Compaction (manual — no auto hook)

There is **no** automatic PreCompact checkpoint hook. Before a long task that risks compaction, create a checkpoint manually with `/checkpoint`. On resume, static `CLAUDE.md` / `SKILL.md` re-read plus `/recover` over the on-disk checkpoint restores context.

---

## Integration with Workflows

### Long-Running Task Memory Pattern

All long-running workflows should follow this pattern:

```
┌─────────────────────────────────────────────────────────┐
│ TASK START                                               │
│   └── Create initial checkpoint with task context        │
│   └── Initialize todo list                               │
│                                                          │
│ EVERY 20-30 OPERATIONS                                   │
│   └── Update checkpoint with progress                    │
│   └── Update todo list status                            │
│                                                          │
│ MILESTONE REACHED                                         │
│   └── Create detailed checkpoint                         │
│                                                          │
│ BEFORE COMPACTION (no auto hook - /checkpoint)           │
│   └── Create a checkpoint manually                       │
│                                                          │
│ AFTER COMPACTION / SESSION RESUME                        │
│   └── Read latest checkpoint                             │
│   └── Continue from documented Next Steps                │
│                                                          │
│ TASK COMPLETE                                             │
│   └── Final checkpoint with summary                      │
│   └── Clean up temporary checkpoints                     │
└─────────────────────────────────────────────────────────┘
```

### Checkpoint Naming Convention

| Type              | Format                                      | Example                                   |
| ----------------- | ------------------------------------------- | ----------------------------------------- |
| Manual checkpoint | `checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`  | `checkpoint-20250106-143000-user-auth.md` |
| Auto checkpoint   | `checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`  | `checkpoint-20250106-143000-autosave.md`  |
| Analysis notes    | `{type}-{date}-{slug}.md`                   | `analysis-250106-payment-flow.md`         |
| Task notes        | `.ai/workspace/analysis/{slug}.analysis.md` | Used by feature                           |

> **Legacy back-read:** checkpoints written before grammar unification — `memory-checkpoint-*.md`, or `checkpoint-{YYMMDD}-{HHMM}-{slug}.md` without seconds — are still discovered by `/recover`. No on-disk checkpoint is orphaned by the rename. (`/recover` is the sole discoverer — recovery is skill-driven.)

### Related Commands & Skills

| Command/Skill       | Purpose                             |
| ------------------- | ----------------------------------- |
| `/checkpoint`       | Create manual memory checkpoint     |
| `/context`          | Load project context                |
| `/compact`          | Manually trigger context compaction |
| `/watzup`           | Generate progress summary           |
| `workflow-feature`  | Uses task analysis notes pattern    |
| `debug-investigate` | Uses investigation logs             |
| `investigate`       | Uses analysis report pattern        |

## Related

- `learn`
- `context-optimization`

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

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** sequential reasoning, traced `file:line` proof, confidence >80% to act, NEVER guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
