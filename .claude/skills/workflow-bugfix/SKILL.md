---
name: workflow-bugfix
version: 1.0.0
description: '[Workflow] Use when activating the Bug Fix workflow for systematic debugging with root cause investigation, fix, and verification.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Bug Fix workflow — systematic debugging with root cause investigation, fix, and verification.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require regression tests to name `Business Intent / Invariant Guarded` and fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- MUST ATTENTION record current behavior, expected behavior, and unchanged behavior that must be preserved before fixing.
- MUST ATTENTION treat code-extracted specs and TCs as reference-only until canonical review accepts them.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

| Step                | Occurrence | Task Description                                          |
| ------------------- | ---------- | --------------------------------------------------------- |
| `/integration-test` | 1st        | INT-TEST₁ — RED phase: write regression test, expect FAIL |
| `/integration-test` | 2nd        | INT-TEST₂ — GREEN phase: re-run after fix, expect PASS    |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

**IMPORTANT MANDATORY Steps:** /scout -> /investigate -> /debug-investigate -> /spec [mode=amend] -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /integration-test -> /fix -> /prove-fix -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /changelog -> /test -> /docs-update -> /workflow-end -> /watzup

---

**IMPORTANT MANDATORY Steps:** /scout -> /investigate -> /debug-investigate -> /spec [mode=amend] -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /integration-test -> /fix -> /prove-fix -> /integration-test -> /integration-test-review -> /integration-test-verify -> /spec [mode=sync] -> /workflow-review-changes -> /changelog -> /test -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

> **[CRITICAL] Plan Before Fix Gate:** The `/plan → /plan-review → /plan-validate` steps are MANDATORY before `/fix`. You MUST ATTENTION create todo tasks for these plan steps AND complete them before proceeding to fix. Never skip planning — fixes without validated plans lead to incomplete root cause analysis and regressions.

Activate the `workflow-bugfix` workflow. Run `/start-workflow workflow-bugfix` with the user's prompt as context.

> **Spec check (before investigation):** If `docs/specs/` has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: `ls docs/specs/` to discover available app buckets or flat system folders; then probe `ls docs/specs/{app-bucket}/` or `ls docs/specs/{system-name}/` to find the specific service spec.

> **[BLOCKING] Code Bug vs Spec Bug Gate** (the bugfix-specialized instance of `SYNC:spec-drift-adjudication` / `shared/sdd-artifact-contract.md` → Drift Gates — same model, bugfix vocabulary): Before writing regression TCs, classify the issue:
>
> - **Code Bug** (= CODE-WRONG) — the canonical spec describes intended behavior, but code diverged. Write regression TCs for the intended behavior before fixing code.
> - **Spec Bug** (= SPEC-STALE) — the spec documents wrong behavior and code faithfully implements it. Update canonical spec/docs first via `/spec [mode=amend]`, then write TCs for the corrected behavior.
> - **Ambiguous** — ask the user or product owner which behavior is intended before writing TCs.
>
> Include a behavior preservation note: `current behavior -> expected behavior -> unchanged behavior to preserve -> regression TC/test evidence`. Never normalize the divergence to whichever side currently passes — reconcile to canonical intent.

> **[BLOCKING] End-to-start trace before fix plan:** Before `/plan`, `/spec [mode=tests]`, or `/fix`, the investigation must include observed final state, final reader/query/renderer/assertion, backward hops through storage/projection/writer/consumer/producer, all feeder paths, hypothesis matrix, owning fix layer, and forward convergence proof. Missing trace evidence blocks the fix path.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the bug report). Map root cause, regression-test evidence (RED fail + GREEN pass), and `/prove-fix` proof to the saved success criteria — each criterion gets `file:line`/command/report evidence in the Iteration Log. Pass the same goal file reference to every child step. Before `/workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

**Steps:** /scout → /investigate → /debug-investigate → /spec [mode=amend] → /plan → /plan-review → /plan-validate → /why-review → /spec [mode=tests] → /why-review → /review-artifact --type=spec-tests → /integration-test → /fix → /prove-fix → /integration-test → /integration-test-review → /integration-test-verify → /spec [mode=sync] → /workflow-review-changes → /changelog → /test → /docs-update → /workflow-end → /watzup

> **[PERFORMANCE-SDD ROUTE]** If this bug fix is performance-related (latency, throughput, memory, query speed, load behavior), run `/performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Do not use performance scope to bypass functional no-regression checks: run `/test` and any relevant functional checks when behavior can change. Update docs/specs for changed SLA, performance constraints, or behavior boundaries.

> **[TDD-FIRST BUG FIX]** The two `/integration-test` occurrences are intentional and serve distinct purposes:
>
> **First `/integration-test` (RED phase):** Write a regression test that REPRODUCES the bug. Run it — it MUST FAIL. If it passes, the test does not catch the bug. Proceed to fix only after the test fails — never start the fix while the test still passes.
> **Second `/integration-test` (GREEN phase):** Re-run integration tests after the fix — expect all to PASS. Confirms the fix works AND the regression guard is in place.
> **`/integration-test-review`:** Verify tests have real assertion value (not smoke/existence-only checks).

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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
>
> **Context budget** — the return payload is a SUMMARY, not a transcript: ≤10 finding bullets, no raw file contents / full diffs / verbatim logs inline, no re-pasted source. Everything beyond the summary lives in the `Full report` on disk. A sub-agent that would exceed the summary shape MUST write the detail to its report and return only the pointer — the orchestrator's context is the scarce resource the whole map-reduce protects.

<!-- /SYNC:subagent-return-contract -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — NEVER skip a listed protocol; ALWAYS honor each canonical body:**

- **End-To-Start Debugger Trace:** Trace observed end state backward; matrix + fix layer before fixing.
- **Nested Task Creation:** Expand child phases; link parent; one task in_progress.
- **Critical Thinking:** Traced proof per claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** Append findings to report file; never hold in memory.
- **Subagent Return Contract:** Return summary only; full detail to disk report.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
