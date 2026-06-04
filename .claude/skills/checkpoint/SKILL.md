---
name: checkpoint
version: 2.0.0
description: '[Utilities] Use when you need to save analysis context to a checkpoint file for recovery (user-facing alias for memory-management Part 1 CHECKPOINT_CREATE).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Save current analysis context and progress to an external file for recovery after context loss.

> **Thin alias.** `/checkpoint` is the user-facing entry point to the **CHECKPOINT_CREATE** protocol owned by `memory-management` (Part 1: File-Based External Memory). `memory-management` is `disable-model-invocation: true` (not directly user-invocable), so this command is the canonical way to create a manual checkpoint. The checkpoint **file structure is defined once** in `.claude/skills/memory-management/SKILL.md` (Part 1); this skill is the command surface that invokes it.

**Workflow:**

1. **Gather Context** — task state, key findings (with `file:line`), files analyzed/modified, progress, decisions, next steps, open questions
2. **Write Checkpoint** — save to `plans/reports/checkpoint-{timestamp}-{slug}.md` following the CHECKPOINT_CREATE structure in `memory-management` Part 1
3. **Update Todos** — reflect checkpoint creation in task tracking

**Key Rules:**

- Canonical protocol + file template live in `memory-management` Part 1 (CHECKPOINT_CREATE) — do not duplicate the structure here; this skill is the command surface only
- Save checkpoints every 30-60 minutes during complex tasks and before expected context compaction
- Always include Recovery Instructions (which file to read, which line to resume from)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Save Memory Checkpoint

Save current analysis, findings, and progress to an external memory file to prevent context loss during long-running tasks. This is the user-invocable alias for `memory-management`'s checkpoint-create path.

## Usage

Use this command when:

- Working on complex multi-step tasks (investigation, planning, implementation)
- Before expected context compaction
- At key milestones during feature development
- After completing significant analysis phases

## Checkpoint File Location

Files are saved to: `plans/reports/checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md` (unified checkpoint grammar — the resume/recover readers glob `checkpoint-*` and parse this timestamp).

## Instructions

1. **Determine location** — stamp the filename via `date +%Y%m%d-%H%M%S`; path `plans/reports/checkpoint-{YYYYMMDD}-{HHMMSS}-{slug}.md`.
2. **Gather + write** — follow the **CHECKPOINT_CREATE Protocol** template in `.claude/skills/memory-management/SKILL.md` (Part 1 — the single canonical owner of the checkpoint structure). Required sections: Task Context, Key Findings (with `file:line`), Files Analyzed, Progress, Important Context, Next Steps, Recovery Instructions.
3. **Update todo list** — add `- [x] Create memory checkpoint at {timestamp}`.

To **recover** from a checkpoint, use `/recover` (CHECKPOINT_RECOVER protocol).

## Best Practices

1. **Save checkpoints frequently** - Every 30-60 minutes during complex tasks
2. **Be specific** - Include file paths, line numbers, exact findings
3. **Document decisions** - Record why choices were made
4. **Link related files** - Reference other analysis documents
5. **Include recovery steps** - Make resumption easy

## Related Commands

- `/recover` - Restore workflow context from the latest checkpoint (CHECKPOINT_RECOVER)
- `/context` - Load project context
- `/compact` - Manually trigger context compaction
- `/watzup` - Generate progress summary

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
