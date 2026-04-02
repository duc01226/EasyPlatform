---
name: fix-issue
version: 1.0.0
description: '[Implementation] Debug and fix GitHub issues with systematic investigation'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Understand Code First** — Search codebase for 3+ similar implementations BEFORE writing any code. Read existing files, validate assumptions with grep evidence, map dependencies via graph trace. Never invent new patterns when existing ones work.
> MUST READ `.claude/skills/shared/understand-code-first-protocol.md` for full protocol and checklists.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Estimation Framework** — SP scale: 1(trivial) → 2(small) → 3(medium) → 5(large) → 8(very large, high risk) → 13(epic, SHOULD split) → 21(MUST split). MUST provide `story_points` and `complexity` estimate after investigation.
> MUST READ `.claude/skills/shared/estimation-framework.md` for full protocol and checklists.

> **Skill Variant:** Variant of `/fix` — debug and fix GitHub issues with systematic investigation.

## Quick Summary

**Goal:** Investigate and fix bugs reported as GitHub issues with full traceability.

**Workflow:**

1. **Fetch** — Read GitHub issue details (title, description, reproduction steps)
2. **Reproduce** — Trace the reported behavior in code
3. **Fix** — Apply fix with root cause evidence

**Key Rules:**

- Debug Mindset: every claim needs `file:line` evidence
- Link fix back to the GitHub issue for traceability
- Verify fix addresses the specific reproduction steps from the issue

> **[MANDATORY]** Read `.claude/skills/shared/root-cause-debugging-protocol.md` BEFORE proposing any fix. Responsibility attribution and data lifecycle tracing are required.

<issue-number>$ARGUMENTS</issue-number>

## Debug Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume the first hypothesis is correct — verify with actual code traces
- Every root cause claim must include `file:line` evidence
- If you cannot prove a root cause with a code trace, state "hypothesis, not confirmed"
- Question assumptions: "Is this really the cause?" → trace the actual execution path
- Challenge completeness: "Are there other contributing factors?" → check related code paths
- No "should fix it" without proof — verify the fix addresses the traced root cause

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY claim.
**95%+** recommend freely | **80-94%** with caveats | **60-79%** list unknowns | **<60% STOP — gather more evidence.**

> **⚠️ Validate Before Fix (NON-NEGOTIABLE):** After root cause analysis, MUST present findings + proposed fix to user via `AskUserQuestion` and get explicit approval BEFORE any code changes. No silent fixes.

Activate `debug-investigate` skill and follow its workflow.

**IMPORTANT**: Always use external memory at `.ai/workspace/analysis/issue-[number].analysis.md` for structured analysis. **Re-read ENTIRE analysis file before proposing any fix** — this prevents knowledge loss.

**🛑 Present root cause + proposed fix → `AskUserQuestion` → wait for user approval before implementing.**

See `.claude/docs/AI-DEBUGGING-PROTOCOL.md` for comprehensive guidelines.

## ⚠️ MANDATORY: Post-Fix Verification

**After applying the fix, MUST run `/prove-fix`** — build code proof traces per change with confidence scores. Never skip.

---

## Standalone Review Gate (Non-Workflow Only)

> **MANDATORY IMPORTANT MUST:** If this skill is called **outside a workflow** (standalone `/fix-issue`), you MUST create a `TaskCreate` todo task for `/review-changes` as the **last task** in your task list. This ensures all changes are reviewed before commit even without a workflow enforcing it.
>
> If already running inside a workflow (e.g., `bugfix`), skip this — the workflow sequence handles `/review-changes` at the appropriate step.

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/understand-code-first-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/estimation-framework.md` before starting
