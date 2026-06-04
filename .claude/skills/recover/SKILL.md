---
name: recover
version: 1.0.0
description: '[Utilities] Use when you need to restore workflow context from checkpoint after session loss.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Restore workflow state and todo items from checkpoint files after context loss or session interruption.

**Workflow:**

1. **Find Checkpoint** — Locate latest `checkpoint-*.md` in reports directory (legacy `memory-checkpoint-*.md` are also recognized)
2. **Read Metadata** — Extract JSON block with session ID, active plan, current step, pending todos
3. **Restore Todos** — Immediately call TaskCreate with pending items from checkpoint
4. **Resume Workflow** — Continue from the interrupted step using restored context

**Key Rules:**

- Always restore TaskCreate items before resuming any work
- Check both `plans/reports/` and plan-specific report directories
- Use timestamp to find the checkpoint closest to the interruption

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Recover Workflow Context

Restore workflow state and todo items from checkpoint files after context compaction or session loss.

## Usage

Use this command when:

- Context was compacted and you've lost track of the workflow
- Session was interrupted and needs to resume
- Todo items need to be restored from a checkpoint
- The automatic recovery didn't trigger

## Recovery Process

### Step 1: Find Latest Checkpoint

Look for checkpoint files in the reports directory:

```bash
ls -la plans/reports/checkpoint-*.md | tail -5
```

Or search for all recent checkpoints:

```bash
find plans -name "checkpoint-*.md" -mmin -60 | head -5
```

### Step 2: Read Checkpoint File

Read the most recent checkpoint to understand the saved state:

```
Read the checkpoint file at: plans/reports/checkpoint-YYYYMMDD-HHMMSS-slug.md
```

### Step 3: Extract Recovery Metadata

The checkpoint file contains a JSON metadata block at the end:

```json
{
  "sessionId": "...",
  "activePlan": "plans/YYMMDD-slug/",
  "workflowType": "feature",
  "currentStep": "feature-implement",
  "remainingSteps": ["test", "code-review"],
  "pendingTodos": [...]
}
```

### Step 4: Restore Todo Items

**IMMEDIATELY call TaskCreate** with the pending todos from the checkpoint:

```json
[
    { "content": "[Workflow] /feature-implement - Implement", "status": "in_progress", "activeForm": "Executing /feature-implement" },
    { "content": "[Workflow] /test - Run tests", "status": "pending", "activeForm": "Executing /test" },
    { "content": "[Workflow] /code-review - Review code", "status": "pending", "activeForm": "Executing /code-review" }
]
```

### Step 5: Read Active Plan (if exists)

If `activePlan` is set in the metadata, read the plan file:

```
Read: {activePlan}/plan.md
```

### Step 6: Continue Workflow

Resume from the `currentStep` identified in the metadata. Execute the remaining workflow steps in order.

## Recovery Checklist

- [ ] Located most recent checkpoint file
- [ ] Read checkpoint content
- [ ] Extracted recovery metadata JSON
- [ ] Restored todo items via TaskCreate
- [ ] Read active plan (if applicable)
- [ ] Identified current workflow step
- [ ] Ready to continue from interrupted step

## Recovery (skill-driven)

| Scenario                      | Recovery Type | Trigger                                                                                            |
| ----------------------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| Session resume after compact  | Manual        | This `/recover` command — static `CLAUDE.md` re-read re-anchors protocol; recovery is skill-driven |
| New session in same directory | Manual        | This `/recover` command                                                                            |
| Explicit user request         | Manual        | This `/recover` command                                                                            |
| No workflow state found       | Manual        | This `/recover` command                                                                            |

## Checkpoint Locations

Checkpoints are saved to different locations based on context:

1. **Active plan exists:** `{plan-path}/reports/checkpoint-*.md`
2. **No active plan:** `plans/reports/checkpoint-*.md`

> Legacy `memory-checkpoint-*.md` files (written before the grammar was unified) are still matched by the resume/recover globs — back-read is preserved, nothing on disk is orphaned.

## Tips

1. **Check multiple locations** - Plans may have their own reports directories
2. **Use timestamp** - Checkpoints are timestamped, find the one closest to when you were working
3. **Verify todo status** - Compare checkpoint todos with current TaskCreate state
4. **Read incrementally** - Don't try to restore everything at once

## Related Commands

- `/checkpoint` - Create a manual checkpoint (before expected loss)
- `/compact` - Manually trigger context compaction
- `/context` - Load project context
- `/watzup` - Generate progress summary

## Example Recovery Flow

```
User: /recover

Claude: Let me find and restore your workflow context.

1. Finding latest checkpoint...
   Found: plans/reports/checkpoint-20260110-143025-new-feature.md

2. Reading checkpoint metadata...
   - Workflow: feature
   - Current step: /feature-implement
   - Remaining: /test, /code-review
   - Active plan: plans/260110-1430-new-feature/

3. Restoring TaskCreate items...
   [Calling TaskCreate with 3 pending items]

4. Reading active plan...
   [Reading plans/260110-1430-new-feature/plan.md]

5. Ready to continue from /feature-implement step.
   Shall I proceed with the implementation?
```

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

- **Critical Thinking:** MUST ATTENTION apply critical + sequential thinking; traced proof, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
