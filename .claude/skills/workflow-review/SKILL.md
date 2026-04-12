---
name: workflow-review
version: 4.0.0
description: '[Workflow] Trigger Code Review workflow — review, fix, and re-review recursively until all issues resolved.'
---

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[FRESH SUB-AGENT RE-REVIEW]** After fixes in `/cook`, spawn a fresh sub-agent per `SYNC:fresh-context-review` for unbiased re-review. Max 3 fresh rounds per conversation.
> **[ITERATION CAP]** Max 3 fresh-subagent re-review rounds per conversation (tracked in conversation context, not persistent files). PASS = zero Critical/High without fixes.

Activate the `review` workflow. Run `/workflow-start review` with the user's prompt as context.

## Quick Summary

**Goal:** Review codebase or specific scope, fix issues found, then spawn a **fresh code-reviewer sub-agent** for unbiased re-review — repeat until clean.

**Sequence:** /review-architecture → /code-simplifier → /code-review → /performance → /plan → /plan-validate → /cook → **fresh sub-agent re-review gate** → /docs-update → /watzup → /workflow-end

**Key Rules:**

- After `/cook` applies fixes → spawn fresh `code-reviewer` sub-agent per `SYNC:fresh-context-review` → integrate findings → fix → spawn NEW sub-agent → repeat
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing any fixes
- Max 3 fresh-subagent rounds per conversation (tracked in conversation context)

---

## Mandatory Task Creation (ZERO TOLERANCE)

Create EXACTLY these 11 tasks (source: `workflows.json` → `review.sequence`):

| #   | Task Subject                                                                                | Conditional?                |
| --- | ------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | `[Workflow] /review-architecture — Architecture compliance review`                          | No                          |
| 2   | `[Workflow] /code-simplifier — Simplify and refine code`                                    | No                          |
| 3   | `[Workflow] /code-review — Comprehensive code review`                                       | No                          |
| 4   | `[Workflow] /performance — Performance analysis`                                            | No                          |
| 5   | `[Workflow] /plan — Consolidate review findings into fix plan`                              | Skip if all reviews PASS    |
| 6   | `[Workflow] /plan-validate — Critical questions on fix plan`                                | Skip if all reviews PASS    |
| 7   | `[Workflow] /cook — Implement fixes from plan`                                              | Skip if all reviews PASS    |
| 8   | `[Workflow] Fresh sub-agent re-review gate — spawn new Agent per SYNC:fresh-context-review` | Skip if all reviews PASS    |
| 9   | `[Workflow] /docs-update — Update impacted documentation`                                   | Skip if PASS + no staleness |
| 10  | `[Workflow] /watzup — Wrap up and summarize`                                                | No                          |
| 11  | `[Workflow] /workflow-end — End workflow`                                                   | No                          |

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

---

## Fresh Sub-Agent Re-Review Protocol (CRITICAL)

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `Agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `Agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via `AskUserQuestion` if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

### Decision Logic

```
Reviews (steps 1-4) → ALL PASS?
  YES → skip steps 5-8, proceed to /watzup → /workflow-end → DONE
  NO  → /plan → /plan-validate → /cook → FRESH SUB-AGENT RE-REVIEW GATE (step 8)
```

### Fresh Sub-Agent Re-Review Gate (Step 8) — After `/cook` Applies Fixes

1. **DO NOT** attempt main-agent re-review (main agent has confirmation bias from its own fixes)
2. **DO** spawn a NEW `Agent` tool call with `subagent_type: "code-reviewer"` using the canonical template from `SYNC:review-protocol-injection` in `.claude/skills/shared/sync-inline-versions.md`. Inject all 9 required SYNC protocol blocks verbatim (`SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`). Target files = `"run git diff to see all uncommitted changes"`. Report path = `plans/reports/workflow-review-round{N}-{date}.md`.
3. **DO** increment fresh-subagent round count in conversation context
4. **DO** read the sub-agent's report and integrate findings — MUST NOT filter, reinterpret, or override
5. **IF** fresh sub-agent returns PASS (zero Critical/High) → proceed through `/docs-update` → `/watzup` → `/workflow-end` → DONE
6. **IF** fresh sub-agent returns FAIL and round count < 3 → run `/plan` + `/cook` again, then spawn a NEW Agent call (never reuse the previous sub-agent) for Round N+1
7. **IF** round count >= 3 → STOP and escalate via `AskUserQuestion` — do NOT silently loop or fall back to any prior protocol

### Iteration Rules

- **Max 3 fresh-subagent rounds** — if fresh-subagent round count >= 3 and issues persist, STOP and use `AskUserQuestion` to escalate (manual review required)
- **PASS = done** — proceed to commit
- **Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`

### Flow Diagram

```
Main Session: Review → Issues? → Plan → Fix (/cook) → Spawn fresh sub-agent
                  │                                          │
                  │ (no issues)                              ↓
                  ↓                             Fresh sub-agent re-reads ALL
            /watzup                             files from scratch with
            /workflow-end                       verbatim protocol injection
            DONE ✓                                           │
                                                             ↓
                                                  Report → PASS? → DONE ✓
                                                         → FAIL? → Fix → spawn
                                                                 NEW sub-agent
                                                                 (max 3 rounds)
```

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 11 tasks immediately
- **IMPORTANT MUST ATTENTION** after fixes in `/cook`, spawn a NEW `code-reviewer` sub-agent via the `Agent` tool per `SYNC:fresh-context-review` — NEVER re-review with the main agent
- **IMPORTANT MUST ATTENTION** track fresh-subagent round count via conversation context (session-scoped) — max 3 rounds, escalate via `AskUserQuestion` if exceeded
- **IMPORTANT MUST ATTENTION** PASS means a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing fixes — only then are changes ready to commit
- **IMPORTANT MUST ATTENTION** skip steps 5-8 when all reviews PASS (no fixes needed)
- **IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking completed without invocation is a violation
