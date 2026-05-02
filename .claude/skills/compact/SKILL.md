---
name: compact
version: 1.0.0
description: '[Utilities] Compress context to optimize token usage'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Compress conversation context to optimize token usage while preserving critical information.

**Workflow:**

1. **Analyze** -- Identify essential vs. expendable context
2. **Compress** -- Remove redundant information, summarize findings
3. **Verify** -- Ensure critical decisions and progress are preserved

**Key Rules:**

- Preserve: decisions made, files modified, current task state
- Remove: redundant tool outputs, repeated searches, verbose logs
- Use when context window approaches limits

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Compact Context

Proactively compress the current conversation context to optimize token usage.

## When to Use

- Before starting a new task in a long session
- When working on multiple unrelated features
- At natural workflow checkpoints (after commits, PR creation)
- When context indicator shows high usage

## Actions

1. **Summarize completed work** - What was done, key decisions made
2. **Preserve essential context** - Active file paths, current task, blockers
3. **Clear redundant history** - Old exploration, superseded plans
4. **Update memory** - Save important patterns to `.claude/memory/`

## Best Practices

- Use `/compact` at natural breakpoints, not mid-task
- After compacting, briefly restate the current objective
- Check that critical file paths are still accessible
- If working on a bug, preserve error messages and stack traces

## Context Preservation Checklist

Before compacting, ensure you've saved:

- [ ] Current branch and uncommitted changes status
- [ ] Active file paths being modified
- [ ] Any error messages or stack traces
- [ ] Key decisions and their rationale
- [ ] Pending items from todo list

## Example Usage

```
User: /compact
Claude: Compacting context...

## Session Summary
- Implemented employee export feature
- Fixed validation bug in SaveEmployeeCommand
- Created unit tests for EmployeeHelper

## Active Context
- Branch: feature/employee-export
- Files: Employee.Application/Commands/ExportEmployees/
- Current task: Add pagination to export

## Cleared
- Exploration of unrelated notification code
- Superseded implementation approaches

Ready to continue with pagination implementation.
```

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
