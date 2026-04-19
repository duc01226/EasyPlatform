---
name: workflow-review-changes
version: 4.0.0
description: '[Workflow] Trigger Review Current Changes workflow — review, fix, and re-review recursively until all issues resolved.'
---

> **[WORKFLOW-IN-WORKFLOW: MUST RUN AS SUB-AGENT when inside another workflow]** This skill activates the full `review-changes` workflow (16 steps). When invoked as a step inside a parent workflow (e.g., `feature`, `bugfix`, `refactor`), it MUST execute via `Agent` tool (`subagent_type: "code-reviewer"`) — NEVER as an inline `Skill` tool call. Inline execution absorbs 16 steps of context into the parent session.
>
> **Sub-agent prompt must include:** current git diff, feature/task description, instruction to return SYNC:subagent-return-contract summary and write full findings to `plans/reports/`.
>
> **Standalone invocation** (not inside a workflow): inline execution is fine — no sub-agent required.

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[FRESH SUB-AGENT RE-REVIEW]** After fixes in `/cook`, spawn a fresh sub-agent per `SYNC:fresh-context-review` for unbiased re-review. Max 3 fresh rounds per conversation.
> **[ITERATION CAP]** Max 3 fresh-subagent re-review rounds per conversation (tracked in conversation context, not persistent files). PASS = zero Critical/High without fixes.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

Activate the `review-changes` workflow. Run `/workflow-start review-changes` with the user's prompt as context.

## Quick Summary

**Goal:** Review all uncommitted changes, fix issues found, then spawn a **fresh code-reviewer sub-agent** for unbiased re-review — repeat until clean.

**Sequence:** /review-changes → **[parallel batch]** /review-architecture + /review-domain-entities (if entity changes) + /performance + /integration-test-review → /code-simplifier → /code-review → /integration-test-verify → /plan → /plan-validate → /why-review → /cook → **fresh sub-agent re-review gate** → /docs-update → /watzup → /workflow-end

**Key Rules:**

- After `/cook` applies fixes → spawn fresh `code-reviewer` sub-agent per `SYNC:fresh-context-review` → integrate findings → fix → spawn NEW sub-agent → repeat
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing any fixes
- Max 3 fresh-subagent rounds per conversation (tracked in conversation context)

---

## Mandatory Task Creation (ZERO TOLERANCE)

Create one task per row in the table below — source of truth is `workflows.json` → `review-changes.sequence` (currently 16 steps; verify count matches if you suspect drift):

| #   | Task Subject                                                                                                   | Conditional?                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `[Workflow] /review-changes — Review all uncommitted changes (includes integration test sync check)`           | No                                                                                            |
| 2   | `[Workflow] /review-architecture — Architecture compliance review` ⚡ **PARALLEL BATCH**                       | No — run as sub-agent in parallel with steps 3/4/5                                            |
| 3   | `[Workflow] /review-domain-entities — DDD quality review of changed domain entity files` ⚡ **PARALLEL BATCH** | Yes — skip if no domain entity files (Domain/, Entities/, ValueObjects/) in git diff          |
| 4   | `[Workflow] /performance — Performance analysis` ⚡ **PARALLEL BATCH**                                         | No — run as sub-agent in parallel with steps 2/3/5                                            |
| 5   | `[Workflow] /integration-test-review — Integration test quality review` ⚡ **PARALLEL BATCH**                  | No — run as sub-agent in parallel with steps 2/3/4                                            |
| 6   | `[Workflow] /code-simplifier — Simplify and refine code`                                                       | No — runs AFTER parallel batch (modifies code; batch reviews pre-simplification state)        |
| 7   | `[Workflow] /code-review — Comprehensive code review`                                                          | No — runs AFTER code-simplifier (reviews simplified code)                                     |
| 8   | `[Workflow] /integration-test-verify — Verify integration tests pass`                                          | No — runs AFTER code-simplifier (verifies simplified code)                                    |
| 9   | `[Workflow] /plan — Consolidate review findings into fix plan`                                                 | Skip if all reviews PASS                                                                      |
| 10  | `[Workflow] /plan-validate — Critical questions on fix plan`                                                   | Skip if all reviews PASS                                                                      |
| 11  | `[Workflow] /why-review — Sanity-check that proposed fixes are warranted`                                      | Skip if all reviews PASS                                                                      |
| 12  | `[Workflow] /cook — Implement fixes from plan`                                                                 | Skip if all reviews PASS                                                                      |
| 13  | `[Workflow] Fresh sub-agent re-review gate — spawn new Agent per SYNC:fresh-context-review`                    | Skip if all reviews PASS                                                                      |
| 14  | `[Workflow] /docs-update — Update impacted documentation`                                                      | Always run — /docs-update triages internally (fast-exits when only config/tool files changed) |
| 15  | `[Workflow] /watzup — Wrap up and summarize`                                                                   | No                                                                                            |
| 16  | `[Workflow] /workflow-end — End workflow`                                                                      | No                                                                                            |

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

> **Integration Test Sync:** The `/review-changes` skill (task #1) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses `AskUserQuestion` to surface them — NOT purely advisory. The user must explicitly choose to run `/integration-test` or confirm tests are already written. No silent skip.

> **Docs Update:** `/docs-update` MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke `/feature-docs` and `/tdd-spec`. Never skip based on review PASS status alone.

---

## Parallel Review Phase (Steps 2–5) — EXECUTION PROTOCOL

Steps 2–5 (`/review-architecture`, `/review-domain-entities`, `/performance`, `/integration-test-review`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 40K+ tokens in the main session absorbing all four inline. The `stepMeta` in `workflows.json` marks all four as `executionMode: subagent, contextBudget: high` — the `workflow-step-tracker.cjs` hook outputs `💡 [SUB-AGENT RECOMMENDED]` as each step becomes active.

### Execution: spawn in one message

After step 1 (`/review-changes`) completes, spawn all active parallel reviewers in **a single response** with multiple `Agent` tool calls:

```
Agent(review-architecture, subagent_type="code-reviewer", ...)   ← all in ONE message
Agent(review-domain-entities, subagent_type="code-reviewer", ...) ← only if entity files in diff
Agent(performance, subagent_type="code-reviewer", ...)
Agent(integration-test-review, subagent_type="code-reviewer", ...)
```

Each sub-agent receives:

- The baseline summary from step 1 (what changed, integration test gaps found)
- Instruction to write report to `plans/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch

`Agent` tool calls do NOT trigger `workflow-step-tracker.cjs` (hook fires only on `Skill` completions). After all parallel sub-agents return:

1. `TaskUpdate` step 2 → `completed`
2. `TaskUpdate` step 3 → `completed` (or "Skipped — no entity files" if conditional)
3. `TaskUpdate` step 4 → `completed`
4. `TaskUpdate` step 5 → `completed`
5. Read all sub-agent report files; synthesize findings into a combined review summary
6. Proceed to step 6 (`/code-simplifier`) sequentially

### Consolidation before /code-simplifier

Before running `/code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High findings across all 4 reports
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `/code-simplifier` as context so simplification is informed by review findings

### What runs sequentially (never parallelize)

| Step                           | Why sequential                                         |
| ------------------------------ | ------------------------------------------------------ |
| `review-changes` (#1)          | Establishes baseline — must run first                  |
| `code-simplifier` (#6)         | Modifies code — batch reviews pre-simplification state |
| `code-review` (#7)             | Must review simplified code (after #6)                 |
| `integration-test-verify` (#8) | Must run tests on simplified code (after #6)           |
| `plan` → `cook` (#9–13)        | Ordered fix cycle — each step depends on previous      |

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

<!-- SYNC:incremental-persistence -->

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

<!-- /SYNC:subagent-return-contract -->

### Decision Logic

```
Reviews (steps 1-6) → ALL PASS? AND integration-test-verify (step 8) passes?
  YES → skip steps 9-13, proceed to /docs-update → /watzup → /workflow-end → DONE
  NO  → /plan → /plan-validate → /why-review → /cook → FRESH SUB-AGENT RE-REVIEW GATE (step 13)
Note: /integration-test-verify (step 8) always runs — it is NOT conditional on review outcome.
```

### Fresh Sub-Agent Re-Review Gate (Step 13) — After `/cook` Applies Fixes

1. **DO NOT** attempt main-agent re-review (main agent has confirmation bias from its own fixes)
2. **DO** spawn a NEW `Agent` tool call with `subagent_type: "code-reviewer"` using the canonical template from `SYNC:review-protocol-injection` in `.claude/skills/shared/sync-inline-versions.md`. Inject all 9 required SYNC protocol blocks verbatim (`SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`). Target files = `"run git diff to see all uncommitted changes"`. Report path = `plans/reports/workflow-review-changes-round{N}-{date}.md`.
3. **DO** increment fresh-subagent round count in conversation context
4. **DO** read the sub-agent's report and integrate findings — MUST NOT filter, reinterpret, or override
5. **IF** fresh sub-agent returns PASS (zero Critical/High) → proceed through `/docs-update` → `/watzup` → `/workflow-end` → DONE
6. **IF** fresh sub-agent returns FAIL and round count < 3 → run `/plan` + `/cook` again, then spawn a NEW Agent call (never reuse the previous sub-agent) for Round N+1
7. **IF** round count >= 3 → STOP and escalate via `AskUserQuestion` — do NOT silently loop or fall back to any prior protocol

### Iteration Tracking (Conversation-Scoped)

Iteration count is tracked **in conversation context only** — no persistent files. Each new conversation starts fresh at round 0.

**Rules:**

- **Max 3 fresh-subagent rounds** — if fresh-subagent round count >= 3 and issues persist, STOP and escalate via `AskUserQuestion` (manual review required)
- **PASS = done** — proceed to commit
- **Issue count increasing** — if round N finds MORE issues than round N-1, STOP and escalate via `AskUserQuestion`

### Flow Diagram

```
Main Session: Review → Issues? → Plan → Fix (/cook) → Spawn fresh sub-agent
                  │                                          │
                  │ (no issues)                              ↓
                  ↓                             Fresh sub-agent re-reads ALL
            /docs-update                        changed files from scratch with
            /watzup                             verbatim protocol injection
            /workflow-end                                    │
            DONE ✓                                           ↓
                                                  Report → PASS? → DONE ✓
                                                         → FAIL? → Fix → spawn
                                                                 NEW sub-agent
                                                                 (max 3 rounds)
```

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 16 tasks immediately
- **IMPORTANT MUST ATTENTION** after fixes in `/cook`, spawn a NEW `code-reviewer` sub-agent via the `Agent` tool per `SYNC:fresh-context-review` — NEVER re-review with the main agent
- **IMPORTANT MUST ATTENTION** track fresh-subagent round count in conversation context (session-scoped, no persistent files) — max 3 rounds, escalate via `AskUserQuestion` if exceeded
- **IMPORTANT MUST ATTENTION** PASS means a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing fixes — only then are changes ready to commit
- **IMPORTANT MUST ATTENTION** skip steps 9-13 when all reviews PASS and tests pass (no fixes needed)
- **IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking completed without invocation is a violation
  <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->
