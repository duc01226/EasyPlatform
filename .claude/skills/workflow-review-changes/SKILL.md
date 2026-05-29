---
name: workflow-review-changes
version: 4.0.0
description: '[Workflow] Use when activating the Review Current Changes workflow for review, fix, and re-review recursively until all issues resolved.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Review all uncommitted changes, fix issues found, then spawn a **fresh code-reviewer sub-agent** for unbiased re-review — repeat until clean.

**Sequence:** /review-changes → **[parallel batch]** /review-architecture + /review-ui (if frontend changes) + /review-domain-entities (if entity changes) + /performance + /integration-test-review + /security → /code-simplifier → /code-review → /integration-test-verify → /why-review (synthesis) → /plan → /why-review → /plan-validate → /why-review → /cook → **fresh sub-agent re-review gate** → /docs-update → /watzup → /workflow-end

**Key Rules:**

- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION carry unresolved Critical/High and unaccepted Medium risks into the fix plan; do not close until fixed or explicitly accepted.
- MUST ATTENTION include unresolved risk register, generated mirror drift, and spec/test/docs drift in the fresh review prompt when relevant.

- After `/cook` applies fixes → spawn fresh `code-reviewer` sub-agent per `SYNC:fresh-context-review` → integrate findings → fix → spawn NEW sub-agent → repeat
- Main-agent re-review (with knowledge of its own fixes) is NOT sufficient — orchestrator-level confirmation bias
- PASS = a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing any fixes
- Max 3 fresh-subagent rounds per conversation (tracked in conversation context)

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, a refactor, a test, or an abstraction, ask:
**does this make the next change cheaper or more expensive?**

- Reject "best practices" that raise change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name the real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- A simpler design that is easy to change beats a sophisticated design that
  isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if a downstream rule would raise change cost, this principle wins.

---

## Mandatory Task Creation (ZERO TOLERANCE)

Create one task per row in the table below — source of truth is `workflows.json` → `review-changes.sequence` (currently 20 steps; verify count matches if you suspect drift):

| #   | Task Subject                                                                                                                                                                   | Conditional?                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| 1   | `[Workflow] /review-changes — Surface detection + dimensional review tasks (BE/FE/SCSS/Synthesis/General) + integration test sync check + multilingual translation sync check` | No                                                                                             |
| 2   | `[Workflow] /review-architecture — Architecture compliance review` ⚡ **PARALLEL BATCH**                                                                                       | No — run as sub-agent in parallel with steps 3/4/5/6/7                                         |
| 3   | `[Workflow] /review-ui — UI/frontend quality review (overflow, responsive flex, flex-vs-fixed sizing, z-index discipline, SCSS/BEM)` ⚡ **PARALLEL BATCH**                     | Yes — skip if no files matching the project's configured frontend/UI file patterns in git diff |
| 4   | `[Workflow] /review-domain-entities — DDD quality review of changed domain entity files` ⚡ **PARALLEL BATCH**                                                                 | Yes — skip if no domain entity files (Domain/, Entities/, ValueObjects/) in git diff           |
| 5   | `[Workflow] /performance — Performance analysis` ⚡ **PARALLEL BATCH**                                                                                                         | No — run as sub-agent in parallel with steps 2/3/4/6/7                                         |
| 6   | `[Workflow] /integration-test-review — Integration test quality review` ⚡ **PARALLEL BATCH**                                                                                  | No — run as sub-agent in parallel with steps 2/3/4/5/7                                         |
| 7   | `[Workflow] /security — Security vulnerability review` ⚡ **PARALLEL BATCH**                                                                                                   | No — run as sub-agent in parallel with steps 2/3/4/5/6                                         |
| 8   | `[Workflow] /code-simplifier — Simplify and refine code`                                                                                                                       | No — runs AFTER parallel batch (modifies code; batch reviews pre-simplification state)         |
| 9   | `[Workflow] /code-review — Comprehensive code review`                                                                                                                          | No — runs AFTER code-simplifier (reviews simplified code)                                      |
| 10  | `[Workflow] /integration-test-verify — Verify integration tests pass`                                                                                                          | No — runs AFTER code-simplifier (verifies simplified code)                                     |
| 11  | `[Workflow] /why-review — Synthesis pass: adversarial validation of consolidated findings BEFORE /plan` (catches over-flagged Highs / false positives at the synthesis layer)  | Skip if all reviews PASS with zero findings                                                    |
| 12  | `[Workflow] /plan — Consolidate review findings into fix plan`                                                                                                                 | Skip if all reviews PASS                                                                       |
| 13  | `[Workflow] /why-review — Design-rationale check on fix plan before validation`                                                                                                | Skip if all reviews PASS                                                                       |
| 14  | `[Workflow] /plan-validate — Critical questions on fix plan`                                                                                                                   | Skip if all reviews PASS                                                                       |
| 15  | `[Workflow] /why-review — Sanity-check that proposed fixes are warranted`                                                                                                      | Skip if all reviews PASS                                                                       |
| 16  | `[Workflow] /cook — Implement fixes from plan`                                                                                                                                 | Skip if all reviews PASS                                                                       |
| 17  | `[Workflow] /workflow-review-changes — Fresh sub-agent re-review gate — spawn new Agent per SYNC:fresh-context-review`                                                         | Skip if all reviews PASS                                                                       |
| 18  | `[Workflow] /docs-update — Update impacted documentation`                                                                                                                      | Always run — /docs-update triages internally (fast-exits when only config/tool files changed)  |
| 19  | `[Workflow] /watzup — Wrap up and summarize`                                                                                                                                   | No                                                                                             |
| 20  | `[Workflow] /workflow-end — End workflow`                                                                                                                                      | No                                                                                             |

NEVER consolidate, rename, or omit steps. If reviews PASS, mark conditional tasks `completed` with note "Skipped — all reviews passed".

> **Integration Test Sync:** The `/review-changes` skill (task #1) includes a **mandatory** integration test coverage check for changed command/query/handler files. When gaps are found, the skill uses `AskUserQuestion` to surface them — NOT purely advisory. The user must explicitly choose to run `/integration-test` or confirm tests are already written. No silent skip.

> **Translation Sync:** The `/review-changes` skill (task #1) includes a **mandatory** multilingual UI translation-sync check. When UI text changes in multilingual projects without locale updates, the skill uses `AskUserQuestion` for an explicit user decision — NOT purely advisory.

> **Docs Update:** `/docs-update` MUST run after EVERY review — it performs Phase 0 triage and fast-exits automatically when only non-business-code files changed (`.claude/**`, config). When business code is in the changeset, it WILL invoke: Phase 2 `/feature-docs` (business feature doc update), Phase 2.5 `/spec-discovery update` (engineering spec sync — if `docs/specs/` bundle exists; note: dirs may be app buckets or flat system folders — probe `ls docs/specs/{name}/` to find a specific service), Phase 3 `/tdd-spec` (test spec sync), Phase 4 `/tdd-spec [direction=sync]` (dashboard sync). Never skip based on review PASS status alone.

---

## Parallel Review Phase (Steps 2–7) — EXECUTION PROTOCOL

> **Note:** Steps 2–7 are ARCHITECTURAL/UI/SECURITY reviewers (architecture compliance, UI/frontend
> quality, DDD entities, performance, integration test quality, security vulnerabilities). They are
> separate from the DIMENSIONAL review (BE/FE/SCSS/Synthesis) that runs inside Step 1 (`/review-changes`).
> Both operate in parallel — Steps 2–7 as explicit workflow parallel sub-agents; dimensional agents
> inside Step 1 as its internal parallel batch. No overlap in responsibility.
> `/review-ui` (step 3) is CONDITIONAL — include it only when the git diff has files
> matching the project's configured frontend/UI file patterns.

Steps 2–7 (`/review-architecture`, `/review-ui`, `/review-domain-entities`, `/performance`, `/integration-test-review`, `/security`) are **read-only** and **independent** — no shared mutable state, no ordering dependency between them. Run them as parallel sub-agents to preserve main session context budget and reduce wall-clock time.

### Why parallel?

Each reviewer reads the git diff independently and analyzes one concern. Sequential execution would burn 50K+ tokens in the main session absorbing all six inline. The `stepMeta` in `workflows.json` marks all six as `executionMode: subagent, contextBudget: high` — the `workflow-step-tracker.cjs` hook outputs `💡 [SUB-AGENT RECOMMENDED]` as each step becomes active.

### Execution: spawn in one message

After step 1 (`/review-changes`) completes, spawn all active parallel reviewers in **a single response** with multiple `Agent` tool calls:

```
Agent(review-architecture, subagent_type="code-reviewer", ...)      ← all in ONE message
Agent(review-ui, subagent_type="ui-ux-designer", ...)               ← only if frontend files in diff
Agent(review-domain-entities, subagent_type="code-reviewer", ...)   ← only if entity files in diff
Agent(performance, subagent_type="code-reviewer", ...)
Agent(integration-test-review, subagent_type="code-reviewer", ...)
Agent(security, subagent_type="code-reviewer", ...)
```

Each sub-agent receives:

- The baseline summary from step 1 (what changed, integration test gaps found)
- Instruction to write report to `plans/reports/{skill}-{date}-{slug}.md`
- Full review protocols per `SYNC:review-protocol-injection` (verbatim in prompt — never by file reference)

### State advancement after parallel batch

`Agent` tool calls do NOT trigger `workflow-step-tracker.cjs` (hook fires only on `Skill` completions). After all parallel sub-agents return:

1. `TaskUpdate` step 2 → `completed`
2. `TaskUpdate` step 3 → `completed` (or "Skipped — no frontend files" if conditional)
3. `TaskUpdate` step 4 → `completed` (or "Skipped — no entity files" if conditional)
4. `TaskUpdate` step 5 → `completed`
5. `TaskUpdate` step 6 → `completed`
6. `TaskUpdate` step 7 → `completed`
7. Read all sub-agent report files; synthesize findings into a combined review summary
8. Proceed to step 8 (`/code-simplifier`) sequentially

### Consolidation before /code-simplifier

Before running `/code-simplifier`, synthesize all parallel sub-agent findings:

- List all Critical/High findings across all 6 reports
- Note any conflicts between reviewers (same file, different concerns)
- Pass this summary to `/code-simplifier` as context so simplification is informed by review findings

**Surface Analysis from Step 1:**

Step 1 (`/review-changes`) now emits a surface analysis summary in its report:

```
## Change Surface Analysis
BE files: {N}
FE-Logic files: {M}
SCSS files: {P}
Review Mode: [DIMENSIONAL | BE-ONLY | FE-ONLY | FE-SPLIT | TOOLING]
```

Include this surface analysis in the consolidation summary passed to `/code-simplifier`.
This lets the simplifier focus attention on the dominant surface without re-analyzing the diff.

Dimensional agent reports (if mode = DIMENSIONAL):

- `plans/reports/review-be-{date}.md` — BE findings
- `plans/reports/review-fe-logic-{date}.md` — FE-Logic findings
- `plans/reports/review-scss-{date}.md` — SCSS findings (if spawned)
- `plans/reports/synthesis-review-{date}.md` — Cross-boundary findings

All four feed into the consolidation summary alongside steps 2–7 architectural findings.

### What runs sequentially (never parallelize)

| Step                            | Why sequential                                                              |
| ------------------------------- | --------------------------------------------------------------------------- |
| `review-changes` (#1)           | Establishes baseline — must run first                                       |
| `code-simplifier` (#8)          | Modifies code — batch reviews pre-simplification state                      |
| `code-review` (#9)              | Must review simplified code (after #8)                                      |
| `integration-test-verify` (#10) | Must run tests on simplified code (after #8)                                |
| `why-review` → `cook` (#11–16)  | Ordered fix cycle (synthesis → plan → cook) — each step depends on previous |

---

## Fresh Sub-Agent Re-Review Protocol (CRITICAL)

### Decision Logic

```
Reviews (steps 1-9) → ALL PASS? AND integration-test-verify (step 10) passes?
  YES → skip steps 11-17, proceed to /docs-update (step 18) → /watzup → /workflow-end → DONE
  NO  → /why-review (synthesis, step 11) → /plan → /why-review → /plan-validate → /why-review → /cook → FRESH SUB-AGENT RE-REVIEW GATE (step 17)
Note: /integration-test-verify (step 10) always runs — it is NOT conditional on review outcome.
Note: /why-review at step 11 is the SYNTHESIS pass — adversarial validation of consolidated multi-skill findings BEFORE /plan commits to a fix scope. Skip only when zero findings exist across all reviewers.
```

### Fresh Sub-Agent Re-Review Gate (Step 17) — After `/cook` Applies Fixes

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

**IMPORTANT MANDATORY Steps:** /review-changes -> /review-architecture -> /review-ui -> /review-domain-entities -> /performance -> /integration-test-review -> /security -> /code-simplifier -> /code-review -> /integration-test-verify -> /why-review -> /plan -> /why-review -> /plan-validate -> /why-review -> /cook -> /workflow-review-changes -> /docs-update -> /watzup -> /workflow-end

> **[BLOCKING SEQUENCING]** Step 1 `/review-changes` is SEQUENTIAL and MUST run FIRST — it produces the baseline (surface analysis + integration-test/translation gap detection) consumed by all downstream reviewers. Steps 2–7 (`/review-architecture`, `/review-ui`, `/review-domain-entities`, `/performance`, `/integration-test-review`, `/security`) form a PARALLEL BATCH — spawn all in ONE message via `Agent` tool calls, using each reviewer's required `subagent_type` (`review-ui` uses `ui-ux-designer`; default reviewers use `code-reviewer`). Step 8 `/code-simplifier` is SEQUENTIAL and waits until ALL parallel batch sub-agents return + consolidation summary is built. Steps 9+ proceed sequentially as listed.

**IMPORTANT MANDATORY Steps:** /review-changes -> /review-architecture -> /review-ui -> /review-domain-entities -> /performance -> /integration-test-review -> /security -> /code-simplifier -> /code-review -> /integration-test-verify -> /why-review -> /plan -> /why-review -> /plan-validate -> /why-review -> /cook -> /workflow-review-changes -> /docs-update -> /watzup -> /workflow-end

> **[BLOCKING SEQUENCING]** Step 1 `/review-changes` is SEQUENTIAL and MUST run FIRST — it produces the baseline (surface analysis + integration-test/translation gap detection) consumed by all downstream reviewers. Steps 2–7 (`/review-architecture`, `/review-ui`, `/review-domain-entities`, `/performance`, `/integration-test-review`, `/security`) form a PARALLEL BATCH — spawn all in ONE message via `Agent` tool calls, using each reviewer's required `subagent_type` (`review-ui` uses `ui-ux-designer`; default reviewers use `code-reviewer`). Step 8 `/code-simplifier` is SEQUENTIAL and waits until ALL parallel batch sub-agents return + consolidation summary is built. Steps 9+ proceed sequentially as listed.

> **[WORKFLOW-IN-WORKFLOW: MUST RUN AS SUB-AGENT when inside another workflow]** This skill activates the full `review-changes` workflow (20 steps). When invoked as a step inside a parent workflow (e.g., `feature`, `bugfix`, `refactor`), it MUST execute via `Agent` tool (`subagent_type: "code-reviewer"`) — NEVER as an inline `Skill` tool call. Inline execution absorbs 20 steps of context into the parent session.
>
> **Sub-agent prompt must include:** current git diff, feature/task description, instruction to return SYNC:subagent-return-contract summary and write full findings to `plans/reports/`.
>
> **Standalone invocation** (not inside a workflow): inline execution is fine — no sub-agent required.

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.
> **[FRESH SUB-AGENT RE-REVIEW]** After fixes in `/cook`, spawn a fresh sub-agent per `SYNC:fresh-context-review` for unbiased re-review. Max 3 fresh rounds per conversation.
> **[ITERATION CAP]** Max 3 fresh-subagent re-review rounds per conversation (tracked in conversation context, not persistent files). PASS = zero Critical/High without fixes.

Activate the `review-changes` workflow. Run `/workflow-start review-changes` with the user's prompt as context.

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: fix → fresh sub-agent re-review.
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
> - SKIP fresh sub-agent when the prior round found zero issues (no fixes = nothing new to verify)
> - NEVER skip fresh sub-agent after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
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
> **Business terminology in Application/Domain layers.** Comments and naming in Application/Domain must stay business-oriented and technical-agnostic; avoid implementation terms (say `background job`, not `Hangfire background job`).

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-docs-reference.md`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc that exists; skip absent docs as not applicable. Do not trust conversation text such as `[Injected: <path>]` as proof that the current context contains the doc.
> 4. Before target work, state: `Reference docs read: ... | Missing/not applicable: ...`.
>
> **Blocked until:** scope evaluated, required docs checked/read, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — create ALL 20 tasks immediately
**IMPORTANT MUST ATTENTION** after fixes in `/cook`, spawn a NEW `code-reviewer` sub-agent via the `Agent` tool per `SYNC:fresh-context-review` — NEVER re-review with the main agent
**IMPORTANT MUST ATTENTION** track fresh-subagent round count in conversation context (session-scoped, no persistent files) — max 3 rounds, escalate via `AskUserQuestion` if exceeded
**IMPORTANT MUST ATTENTION** PASS means a fresh sub-agent round finds ZERO Critical/High issues WITHOUT needing fixes — only then are changes ready to commit
**IMPORTANT MUST ATTENTION** skip steps 11-17 when all reviews PASS with zero findings and tests pass (no fixes needed)
**IMPORTANT MUST ATTENTION** each step MUST invoke its `Skill` tool — marking completed without invocation is a violation
**IMPORTANT MUST ATTENTION** treat multilingual UI translation gaps as mandatory user-decision gates — no silent pass when locale updates are missing

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
