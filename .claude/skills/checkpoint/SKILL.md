---
name: checkpoint
version: 2.0.0
description: '[Utilities] Use when you need to save analysis context to a checkpoint file for recovery (user-facing alias for memory-management Part 1 CHECKPOINT_CREATE).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Save current analysis context and progress to an external file for recovery after context loss.

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** MUST ATTENTION critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
