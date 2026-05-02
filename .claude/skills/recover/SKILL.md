---
name: recover
version: 1.0.0
description: '[Utilities] Restore workflow context from checkpoint after session loss'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Restore workflow state and todo items from checkpoint files after context loss or session interruption.

**Workflow:**

1. **Find Checkpoint** — Locate latest `memory-checkpoint-*.md` in reports directory
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
ls -la plans/reports/memory-checkpoint-*.md | tail -5
```

Or search for all recent checkpoints:

```bash
find plans -name "memory-checkpoint-*.md" -mmin -60 | head -5
```

### Step 2: Read Checkpoint File

Read the most recent checkpoint to understand the saved state:

```
Read the checkpoint file at: plans/reports/memory-checkpoint-YYMMDD-HHMMSS.md
```

### Step 3: Extract Recovery Metadata

The checkpoint file contains a JSON metadata block at the end:

```json
{
  "sessionId": "...",
  "activePlan": "plans/YYMMDD-slug/",
  "workflowType": "feature",
  "currentStep": "cook",
  "remainingSteps": ["test", "code-review"],
  "pendingTodos": [...]
}
```

### Step 4: Restore Todo Items

**IMMEDIATELY call TaskCreate** with the pending todos from the checkpoint:

```json
[
    { "content": "[Workflow] /cook - Implement", "status": "in_progress", "activeForm": "Executing /cook" },
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

## Automatic vs Manual Recovery

| Scenario                      | Recovery Type | Trigger                          |
| ----------------------------- | ------------- | -------------------------------- |
| Session resume after compact  | Automatic     | `post-compact-recovery.cjs` hook |
| New session in same directory | Manual        | This `/recover` command          |
| Explicit user request         | Manual        | This `/recover` command          |
| No workflow state found       | Manual        | This `/recover` command          |

## Checkpoint Locations

Checkpoints are saved to different locations based on context:

1. **Active plan exists:** `{plan-path}/reports/memory-checkpoint-*.md`
2. **No active plan:** `plans/reports/memory-checkpoint-*.md`

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
   Found: plans/reports/memory-checkpoint-260110-143025.md

2. Reading checkpoint metadata...
   - Workflow: feature
   - Current step: /cook
   - Remaining: /test, /code-review
   - Active plan: plans/260110-1430-new-feature/

3. Restoring TaskCreate items...
   [Calling TaskCreate with 3 pending items]

4. Reading active plan...
   [Reading plans/260110-1430-new-feature/plan.md]

5. Ready to continue from /cook step.
   Shall I proceed with the implementation?
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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
