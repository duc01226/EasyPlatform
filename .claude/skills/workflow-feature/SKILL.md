---
name: workflow-feature
version: 1.0.0
description: '[Workflow] Use when activating the Feature Implementation workflow for implement a well-defined feature with investigation, planning, implementation, and review. Also covers TDD/test-first development and spec-driven feature implementation with test specs written before code.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, implementation, and review. This workflow is spec-driven with tests by default: test specs (`/spec [mode=tests]`) are written and reviewed BEFORE implementation (`/plan-execute`), covering former TDD/test-first use cases.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION require test specs/tests to name `Business Intent / Invariant Guarded` and fail if that intent breaks.
- MUST ATTENTION apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; use `docs/project-config.json` and `docs/project-reference/docs-index-reference.md` for project-specific conventions.
- MUST ATTENTION preserve expected, unchanged, and no-regression behavior in the plan and review evidence when behavior can change.
- MUST ATTENTION treat code-extracted specs and TCs as reference-only until canonical review accepts them.
- MUST ATTENTION allow any supported AI tool to implement or review when the shared contract, synced context, and local docs are available.
- NEVER skip mandatory workflow or skill gates.

## Repeated Steps Disambiguation (CRITICAL for task creation)

This workflow has steps that appear multiple times. When creating tasks, use these descriptions to distinguish them:

| Step                                 | Occurrence   | Task Description                                 |
| ------------------------------------ | ------------ | ------------------------------------------------ |
| `/plan`                              | 1st (pos 6)  | PLAN₁: Feature Spec-backed implementation plan   |
| `/plan`                              | 2nd (pos 13) | PLAN₂: Sprint-ready plan incorporating TDD specs |
| `/plan-review`                       | 1st (pos 7)  | Review PLAN₁                                     |
| `/plan-review`                       | 2nd (pos 14) | Review PLAN₂                                     |
| `/spec [mode=tests]`                 | 1st (pos 10) | TDD-SPEC₁: Pre-implementation test specs         |
| `/spec [mode=tests]`                 | 2nd (pos 17) | TDD-SPEC₂: Post-implementation test spec update  |
| `/review-artifact --type=spec-tests` | 1st (pos 12) | Review TDD-SPEC₁                                 |
| `/review-artifact --type=spec-tests` | 2nd (pos 19) | Review TDD-SPEC₂                                 |

**NEVER deduplicate** — each occurrence is a distinct task with a different purpose.

---

## Conditional UI Planning

When a feature involves UI changes (detected during `/scout` or `/investigate`):

- If image/wireframe/Figma URL is provided → route to `/design-spec --mode=wireframe` or `/figma-design` before `/plan`
- If `/plan` detects frontend phases → ensure `ui-wireframe-protocol.md` sections are included in plan phases
- This is advisory — NOT a mandatory workflow step change. The existing workflow sequence remains unchanged.

## Closing Rule

Every step = `TaskUpdate in_progress` → `Skill` tool → complete skill → `TaskUpdate completed`. No shortcuts.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

> **Existing-behavior trace gate:** If the feature modifies an existing final output, persisted state, API response, projection, or user-visible workflow, include an end-to-start trace of the existing path (final reader -> storage/projection -> writer -> producer/origin), feeder paths, invariants to preserve, and forward proof for the intended new behavior before implementation.

> **Goal Contract propagation (workflow-owned):** At workflow start, resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from the feature request). Before `/plan-execute`, verify the plan's feature success criteria map to the saved criteria. Pass the same goal file reference to every child step — child skills read the SAME saved goal, never a re-derived one from chat memory. Before `/workflow-end`, emit the final Goal Satisfaction matrix (PASS/FAIL/BLOCKED); workflow completion requires every required criterion PASS or BLOCKED with a user-facing escalation.

**IMPORTANT MANDATORY Steps:** /scout -> /investigate -> /domain-analysis -> /why-review -> /spec -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /review-domain-entities -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /workflow-review-changes -> /production-readiness-review -> /security-review -> /changelog -> /test -> /docs-update -> /workflow-end -> /watzup

---

**IMPORTANT MANDATORY Steps:** /scout -> /investigate -> /domain-analysis -> /why-review -> /spec -> /plan -> /plan-review -> /plan-validate -> /why-review -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /plan -> /plan-review -> /plan-execute -> /seed-test-data -> /review-domain-entities -> /spec [mode=tests] -> /why-review -> /review-artifact --type=spec-tests -> /spec [mode=sync] -> /integration-test -> /integration-test-review -> /integration-test-verify -> /workflow-review-changes -> /production-readiness-review -> /security-review -> /changelog -> /test -> /docs-update -> /workflow-end -> /watzup

> **[BLOCKING]** Each step MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

Activate the `workflow-feature` workflow. Run `/start-workflow workflow-feature` with the user's prompt as context.

> **Spec check (before investigation):** If `docs/specs/` has a spec for the affected service/module, read the relevant ERD + business-rules + API-contracts files FIRST. Engineering specs provide domain context that reduces investigation time significantly. Command: `ls docs/specs/` to discover available app buckets or flat system folders; then probe `ls docs/specs/{app-bucket}/` or `ls docs/specs/{system-name}/` to find the specific service spec.

**Steps:** /scout → /investigate → /domain-analysis → /why-review → /spec → /plan → /plan-review → /plan-validate → /why-review → /spec [mode=tests] → /why-review → /review-artifact --type=spec-tests → /plan → /plan-review → /plan-execute → /seed-test-data → /review-domain-entities → /spec [mode=tests] → /why-review → /review-artifact --type=spec-tests → /spec [mode=sync] → /integration-test → /integration-test-review → /integration-test-verify → /workflow-review-changes → /production-readiness-review → /security-review → /changelog → /test → /docs-update → /workflow-end → /watzup

> **[PERFORMANCE-SDD ROUTE]** If this feature is a performance enhancement (latency, throughput, memory, query speed, load behavior), run `/performance-review` and require SLA/benchmark evidence: target metric, baseline, measurement command, and acceptable regression budget. Run `/plan-execute` even on the performance route — never skip it. If behavior can change, run `/test` and any relevant functional no-regression checks. Update docs/specs for changed SLA, performance constraints, or behavior boundaries. Use project-specific performance docs from `docs/project-config.json` / `docs/project-reference/` when available.

> **[AI-SDD CLOSURE]** Before `/workflow-end`, confirm changed behavior, unchanged behavior, TCs/tests, docs/specs, and generated mirror sync are either completed or explicitly skipped with evidence.
>
> **[AI-SDD CLOSURE — POST-IMPLEMENTATION SPEC RE-VERIFY (MANDATORY)]** The `/spec` authored at step 5 (before `/plan`) captured _intended_ behavior. After `/plan-execute`, re-verify Feature Spec **§1-7** (not only §8 TCs) against what was _actually built_ and adjudicate every divergence per `shared/sdd-artifact-contract.md` → Drift Gates (`SYNC:spec-drift-adjudication`): **CODE-WRONG** → fix code/test against the spec; **SPEC-STALE** → run `/spec [update]` to record the new intended behavior, then `/spec [mode=tests] [update]` + `/spec [mode=sync]`; **AMBIGUOUS** → escalate to the spec owner. A feature that shipped behavior the spec does not describe leaves the spec stale and is NOT closure-ready. This re-verify is not optional cleanup — it is the "after implement, verify and create/update specs again" half of the SDD cycle.

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

**IMPORTANT MUST ATTENTION Goal:** [Workflow] Trigger Feature Implementation workflow — implement a well-defined feature with investigation, planning, spec-driven test-first implementation, and review.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End To Start Debugger Trace:** trace observed output backward; matrix hypotheses before fixing.
- **Nested Task Creation:** expand child phases; link parent when nested.
- **Critical Thinking:** trace every claim; confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Incremental Persistence:** append findings to report file; never hold in memory.
- **Subagent Return Contract:** sub-agents return summary only; NEVER inline full output; report on disk.

**IMPORTANT MUST ATTENTION** apply Phase 1 compression before structural enhancement; preserve semantic meaning.
**IMPORTANT MUST ATTENTION** NEVER alter YAML frontmatter, code blocks, tables, or SYNC-tag bodies during optimization.
**IMPORTANT MUST ATTENTION** keep evidence gates and mandatory workflow/skill steps explicit and enforceable.
**IMPORTANT MUST ATTENTION** add a final review task to verify output quality and unresolved risks.
