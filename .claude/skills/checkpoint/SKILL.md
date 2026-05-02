---
name: checkpoint
version: 1.0.0
description: '[Utilities] Save analysis context to checkpoint file for recovery'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Save current analysis context and progress to an external file for recovery after context loss.

**Workflow:**

1. **Gather Context** — Collect task state, findings, files analyzed, decisions made
2. **Write Checkpoint** — Save structured markdown to `plans/reports/checkpoint-{timestamp}-{slug}.md`
3. **Update Todos** — Reflect checkpoint creation in task tracking

**Key Rules:**

- Save checkpoints every 30-60 minutes during complex tasks
- Include file paths, line numbers, and recovery instructions
- Document decisions with rationale for future reference

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Save Memory Checkpoint

Save current analysis, findings, and progress to an external memory file to prevent context loss during long-running tasks.

## Usage

Use this command when:

- Working on complex multi-step tasks (investigation, planning, implementation)
- Before expected context compaction
- At key milestones during feature development
- After completing significant analysis phases

## Checkpoint File Location

Files are saved to: `plans/reports/checkpoint-{timestamp}-{slug}.md`

## Instructions

**Create a checkpoint file with the following structure:**

### Step 1: Determine Checkpoint Location

```bash
# Get current date for filename
date +%y%m%d-%H%M
```

### Step 2: Gather Context

Collect and document:

1. **Current Task** - What are you working on?
2. **Key Findings** - What have you discovered?
3. **Files Analyzed** - Which files have been read/modified?
4. **Progress Summary** - What's completed vs remaining?
5. **Important Context** - Critical information to preserve
6. **Next Steps** - What should be done next?
7. **Open Questions** - Unresolved issues

### Step 3: Write Checkpoint File

Create a markdown file at `plans/reports/checkpoint-YYMMDD-HHMM-{task-slug}.md` with:

```markdown
# Memory Checkpoint: [Task Description]

> Checkpoint created to preserve analysis context during [task type].

## Session Info

- **Created:** [timestamp]
- **Task:** [description]
- **Branch:** [git branch]
- **Phase:** [current phase]

## Current Task Summary

[Brief description of what you're working on]

## Key Findings

### Analysis Results

- [Finding 1]
- [Finding 2]
- [Finding N]

### Patterns Discovered

- [Pattern 1]
- [Pattern 2]

### Dependencies Identified

- [Dependency 1]
- [Dependency 2]

## Files Context

### Analyzed Files

| File            | Purpose   | Relevance       |
| --------------- | --------- | --------------- |
| path/to/file.cs | [purpose] | High/Medium/Low |

### Modified Files

- `path/to/modified.ts` - [change description]

### Pending Files

- `path/to/pending.cs` - [why pending]

## Progress Summary

### Completed

- [x] [Completed item 1]
- [x] [Completed item 2]

### In Progress

- [ ] [Current item]

### Remaining

- [ ] [Remaining item 1]
- [ ] [Remaining item 2]

## Important Context

### Critical Information

[Information that must not be lost]

### Assumptions Made

- [Assumption 1]
- [Assumption 2]

### Decisions Made

- [Decision 1] - [rationale]
- [Decision 2] - [rationale]

## Next Steps

1. [Immediate next action]
2. [Following action]
3. [Subsequent action]

## Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

## Recovery Instructions

To resume this task after context reset:

1. Read this checkpoint file
2. Review [specific files] for context
3. Continue from [specific point]

---

_Checkpoint saved by Claude Code at [timestamp]_
```

### Step 4: Update Todo List

Update your todo list to reflect checkpoint was created:

```
- [x] Create memory checkpoint at [timestamp]
```

## Best Practices

1. **Save checkpoints frequently** - Every 30-60 minutes during complex tasks
2. **Be specific** - Include file paths, line numbers, exact findings
3. **Document decisions** - Record why choices were made
4. **Link related files** - Reference other analysis documents
5. **Include recovery steps** - Make resumption easy

## Related Commands

- `/context` - Load project context
- `/compact` - Manually trigger context compaction
- `/watzup` - Generate progress summary

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
