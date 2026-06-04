---
name: workflow-end
version: 1.0.0
description: '[Process] Use when you need to end the active workflow and clear state.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** [Process] Close the active workflow cleanly — clear workflow tracking so the next prompt gets fresh detection, and before clearing state print a one-way developer-comprehension recap (what / purpose / how / why) of what the workflow changed so the developer understands the work without re-reading the diff.

**Summary:**

- This is the penultimate state-closure step (runs before `/watzup`); workflow end is model-driven — it completes when all TaskList items are done, NO hook clears state on completion (residual `.ck-workflow-state.json` is only cleared by `session-init` on explicit `/clear`).
- Gate before closing: run the integration-test coverage check on changed business-logic files (handlers/commands/services/controllers) — if any lacks a matching test, MUST surface via `AskUserQuestion`, never silent-skip.
- When a diff exists, ALWAYS print the one-way four-part comprehension recap (what changed / purpose / how / why), depth throttled by `codingLevel` (`CK_CODING_LEVEL` → `.claude/.ck.json` → default 3); skip only when there are no changes. The recap never quizzes and never blocks — deeper explanation is the standalone `/understand` skill.
- Sync the knowledge graph only if `.code-graph/` exists, then announce `Workflow [name] completed` so the next prompt gets fresh detection.

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Explain** — print the diff-gated comprehension recap (skip only when no changes).
4. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION when the workflow produced a diff, print the comprehension recap (what changed / purpose / how it works / why) — depth throttled by `codingLevel`, but NEVER fully skip when changes exist.
- MUST ATTENTION the recap is one-way — NO quiz, NO teach-back, NEVER blocks. Deeper comprehension is handled by the standalone `/understand` skill, which `/watzup` invokes as its final handoff and which the developer can also invoke directly for any target.
- MUST ATTENTION run the spec ↔ TDD-test sync gate (`spec-tdd-test-sync-gate`) BEFORE task-completion verification when behavior-changing files are in the diff — the workflow MUST NOT report completed while a behavior-vs-spec divergence is unadjudicated; surface unsynced drift via `AskUserQuestion`, never silent-close.
- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- MUST ATTENTION define success criteria before execution and loop until observable verification passes.
- MUST ATTENTION when creating/reviewing specs or tests, name `Business Intent / Invariant Guarded` or the protected business intent/invariant and ensure the test would fail if that intent breaks.
- NEVER skip mandatory workflow or skill gates.

## When This Runs

This skill is the **workflow state-closure step**. In workflows including `/watzup`, runs after final verification/docs work and before `/watzup`, so active workflow closes before post-workflow summary and `/understand` handoff. As penultimate action — after all workflow work done, before clearing state — prints one-way developer-comprehension recap of what workflow changed. Use `/understand` for deep standalone explainer of any target.

**NOT for**: Manual invocation mid-workflow (use workflow switching via `/start-workflow` instead).

---

## What To Do

1. **Integration test coverage check** (skip if workflow is docs/design/investigation/e2e-only, or project has no test suite):

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

(The second command lists untracked files not yet staged — catches brand-new handler files before first git add) - Scan changed files for those likely requiring integration test coverage: **business logic files** such as handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from the project's existing file patterns (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`). - For each identified file → search for a corresponding test file. Infer the project's test naming convention from existing tests (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects). - If ANY identified file lacks a corresponding test → **MANDATORY**: use `AskUserQuestion`: - Option A: "Run `/integration-test` now" (Recommended) - Option B: "Tests already written/updated — proceed" - **No silent skip.** Business logic changes without test coverage MUST be surfaced to the user. - If no business logic files changed, or all have matching tests → skip silently

2. **Spec ↔ TDD-test sync gate** (`spec-tdd-test-sync-gate` — runs BEFORE task-completion verification; skip with reason only if the workflow is docs/design/investigation/e2e-only OR the diff has no behavior-changing files):

    The feedback half of the loop closes HERE — a workflow MUST NOT report completed while the spec still diverges from the code that just changed. Green tests do NOT normalize that drift.
    - Scope to the behavior-changing files in the diff (same surface the coverage check above scanned — handlers/commands/queries/services/controllers/entities/event processors and behavior-bearing frontend logic).
    - Run `/spec [mode=sync]` over the §8 TCs ↔ integration tests for those files: reconcile every §8 TC against its covering test, and surface any §8 TC with no covering test or any test guarding behavior with no §8 TC.
    - Re-check for **unadjudicated spec-vs-code drift**: any behavior-changing file whose divergence from the canonical Feature Spec was never classified CODE-WRONG / SPEC-STALE / AMBIGUOUS / in-sync (per `SYNC:spec-drift-adjudication`).
    - If `/spec [mode=sync]` finds an unsynced §8 TC, OR any behavior-vs-spec divergence is unadjudicated → **MANDATORY**: surface via `AskUserQuestion`:
        - Option A: "Reconcile now — run `/spec [mode=sync]` / `/spec [update]` to close the drift" (Recommended)
        - Option B: "Accept as-is — I will record the reason" (the user's accept-as-is reason is captured in the recap)
    - **No silent skip, no silent close.** **Workflow MUST NOT report `completed` while a behavior-vs-spec divergence is unadjudicated** — record the gate outcome (synced / accepted-as-is-with-reason) before proceeding.

3. **Sync knowledge graph** (skip if `.code-graph/` dir doesn't exist):
    ```bash
    if [ -d ".code-graph" ]; then python .claude/scripts/code_graph sync --json && python .claude/scripts/code_graph update --json; fi
    ```
    Report results briefly.
4. Mark this task as `completed` via `TaskUpdate`

5. **Explain the changes — developer comprehension recap** (the final teaching step; runs after everything else is done):

    Scope what this workflow changed:

    ```bash
    git diff --name-only HEAD && git ls-files --others --exclude-standard
    ```

    - **No diff** (pure investigation/research/docs-only workflow with nothing built) → skip with reason `"no changes to explain"`.
    - **Diff present** → ALWAYS print a one-way teaching recap so the developer understands the work **without re-reading the diff**. This is one-way — NO quiz, NO teach-back, NEVER blocks. For a deeper explanation of any target (a plan, subsystem, decision, concept, or bug), use `/understand`; `/watzup` invokes it as the final handoff.

    **Throttle depth by coding level** (resolve first found: env `CK_CODING_LEVEL` → `.claude/.ck.json` `codingLevel` → default `3`):

    | Level | Recap depth                                                              |
    | ----- | ------------------------------------------------------------------------ |
    | 4–5   | 2–4 tight sentences on the highest-blast-radius change only              |
    | 2–3   | The four-part recap below, concise                                       |
    | 0–1   | The four-part recap, fuller, plainest language, define non-obvious terms |

    Always print at least the short recap when a diff exists — NEVER fully skip.

    **Structure (optimize for easiest learning — lead with high-level motivation, then drill into low-level logic; surface what a reader would NOT guess from the diff):**
    1. **What changed** — concrete edits grouped by **behaviour** (not by file); cite `file:line`.
    2. **Purpose / kind** — feature / bug fix / enhancement / refactor / perf / security — and the problem it solves.
    3. **How it works** — mechanism, key logic, invariants relied on, edge cases preserved; focus the **non-obvious**.
    4. **Why this way** — rationale and trade-offs; why over the obvious alternative.

6. Announce to the user: "Workflow **[name]** completed. Next prompt will trigger fresh workflow detection."
7. Workflow end is model-driven — it completes once this skill's TaskList items are all marked done, AND the spec ↔ TDD-test sync gate (step 2) recorded synced-or-accepted-as-is. No hook clears persisted state on completion; any residual `.claude/.ck-workflow-state.json` is cleared by `session-init` on an explicit `/clear`.

---

## See Also

- **Skill:** `/start-workflow` - Start/switch workflows
- **Doc:** `CLAUDE.md` → _Workflow Step Advancement_ - model-driven advancement rule (no step-tracking hook)
- **Hook:** `session-init.cjs` - clears any residual `.ck-workflow-state.json` on an explicit `/clear`

---

**IMPORTANT MANDATORY Steps:** integration-test-coverage-check -> spec-tdd-test-sync-gate -> verify-task-completion -> verify-workflow-state -> explain-changes-recap -> announce-workflow-completion -> clear-workflow-state

**IMPORTANT MANDATORY Steps:** integration-test-coverage-check -> spec-tdd-test-sync-gate -> verify-task-completion -> verify-workflow-state -> explain-changes-recap -> announce-workflow-completion -> clear-workflow-state

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Workflow End

Finalize and close the active workflow, clearing state so the next user prompt triggers fresh workflow detection.

---

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `/sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `/project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Close the active workflow cleanly — clear workflow tracking so the next prompt gets fresh detection, AND before clearing state leave the developer understanding what the workflow changed via the diff-gated one-way comprehension recap.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim; confidence >80% to act; NEVER guess as fact.
- **Project Reference Docs Guide:** MUST ATTENTION read required project-reference docs (ALWAYS `lessons.md`) before target work.

**IMPORTANT MUST ATTENTION** when the workflow changed code (diff present), print the comprehension recap — what changed / purpose / how it works / why — grouped by behaviour not file, optimized for easiest learning; depth throttled by `codingLevel` (`CK_CODING_LEVEL` → `.claude/.ck.json` → default 3), NEVER fully skip when changes exist — why: the developer must understand the work without re-reading the diff
**IMPORTANT MUST ATTENTION** the spec ↔ TDD-test sync gate runs BEFORE task-completion verification — NEVER report the workflow `completed` while a behavior-vs-spec divergence is unadjudicated; reconcile via `/spec [mode=sync]` or capture an explicit accept-as-is reason — why: green tests do not normalize spec drift; the feedback half of the loop closes here
**IMPORTANT MUST ATTENTION** run the integration-test coverage check on changed business-logic files (handlers/commands/queries/services/controllers/resolvers/event processors) — if ANY lacks a matching test, surface via `AskUserQuestion`; NEVER silent-skip — why: business-logic change without coverage ships an unguarded regression path
**IMPORTANT MUST ATTENTION** the recap is one-way and NEVER blocks — no quiz, no teach-back; route deeper comprehension to the standalone `/understand` skill — why: blocking on a teaching step would stall workflow closure
**IMPORTANT MUST ATTENTION** workflow end is model-driven — close ONLY once every TaskList item is done AND the sync gate recorded synced-or-accepted-as-is; NEVER wait for a hook to clear state — why: no hook clears `.ck-workflow-state.json` on completion (only `session-init` on explicit `/clear`)
**IMPORTANT MUST ATTENTION** break work into small todo tasks with `TaskCreate` BEFORE starting; mark one `in_progress`, complete it immediately after its evidence lands; add a final review todo — why: untracked steps get silently skipped under long context
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code, and verify pattern FIT (same base class, scope, lifetime, preconditions) before copying the nearest example — why: closest example ≠ matching constraints
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim — confidence >80% to act, <60% DO NOT recommend; NEVER present a guess as fact
**IMPORTANT MUST ATTENTION** sync the knowledge graph ONLY if `.code-graph/` exists, then announce `Workflow [name] completed` so the next prompt triggers fresh detection

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| "No real code changed, skip the recap"            | A diff exists → print at least the short recap. Skip ONLY with reason `no changes to explain`.   |
| "Tests are green, mark the workflow completed"    | Green ≠ synced. Run the spec↔TDD-test sync gate FIRST; unadjudicated drift blocks `completed`.   |
| "Business file changed but I'm sure it's covered" | Show the matching test `file:line`. No proof → surface coverage gap via `AskUserQuestion`.       |
| "Workflow feels done, clear state now"            | Model-driven: confirm ALL TaskList items done + sync gate recorded before announcing completion. |

**IMPORTANT MUST ATTENTION Goal echo:** close the workflow cleanly — diff-gated recap delivered, sync gate adjudicated, state cleared for fresh detection.
**IMPORTANT MUST ATTENTION** NEVER silent-skip the integration-test coverage gate or the spec↔TDD-test sync gate — surface gaps via `AskUserQuestion`.
**IMPORTANT MUST ATTENTION** cite `file:line` evidence (confidence >80%); print the diff-gated recap; NEVER report `completed` with unadjudicated drift.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
