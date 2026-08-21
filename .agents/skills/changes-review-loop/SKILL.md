---
name: changes-review-loop
description: '[Code Quality] Use when you need to combine /changes-review + /fix in a recursive loop — each round runs /changes-review (report-only) to surface validated findings over a fixed diff scope, then /fix to resolve them, then loops again with a FRESH full /changes-review over the CHANGED diff until one complete pass produces zero validated findings (nothing left to fix).'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive a diff scope to a **clean pass** by pairing `$changes-review` with `$fix` in a recursive loop — each round runs `$changes-review` INLINE in **report-only mode** to surface validated findings over a fixed diff scope, then `$fix` to resolve them at the owning layer, then loops again with a FRESH full `$changes-review` over the CHANGED diff — stopping when a complete `$changes-review` pass clears the round's exit bar: **zero validated findings** in rounds 1-2, and **zero validated CRITICAL/HIGH/MEDIUM** from round 3 (LOW-only ENDS the loop, deferred not fixed).

**Summary:**

- **Each round = `$changes-review` (report-only) + validate + `$fix`** — the loop runs `$changes-review` as a review-PRODUCER that stops after its raw findings report (the documented `$workflow-review-changes` boundary: _"stop after the report; parent step 2 owns validation"_, `changes-review/SKILL.md:52,204`); the loop then owns the validation gate (`$why-review --validate-findings`) and the dedicated `$fix` half, so `$changes-review` never self-validates or self-fixes; one without the other never converges.
- **Steps (in order):** (0) resolve diff scope + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop { run `$changes-review` report-only INLINE → `$why-review --validate-findings` on the report → run `$fix` on the VALIDATED findings at the owning layer → log iteration } → (2) converge when a fresh review clears the round's exit bar (zero findings rounds 1-2; zero CRITICAL/HIGH/MEDIUM round 3+) OR escalate on non-progress → (3) terminal `$docs-update` + recap.
- **Convergence:** stop ONLY when a **fresh full** `$changes-review` over the CURRENT (post-fix) diff clears the round's exit bar — not a stale clean report predating the last fix.
- **Severity floor — from round 3, LOW stops blocking.** Rounds 1-2 converge on **zero validated findings** (any severity). **From round 3 the bar is zero validated CRITICAL/HIGH/MEDIUM — a round whose validated findings are ALL LOW ENDS the loop.** Never open another round to fix LOW alone; list every deferred LOW in the recap and Goal Contract instead, and NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit. Severity tiers per `SYNC:severity-rubric`.
- **Inline invariant:** run `$changes-review` and `$why-review` via the skill invocation, NEVER the `spawn_agent` tool — they self-bind their OWN review-loop obligations (and a session `/goal` gate WHEN available, `changes-review/SKILL.md:197-223`, `why-review/SKILL.md:57-76`), which a sub-agent cannot own or carry back to this loop. `$changes-review`'s own dimensional reviewers (its Phase 0.7 sub-agents) stay sub-agents by its design, so context stays bounded.
- **Apply ONLY validated findings:** every finding is validated to the ≥85% survival bar via `$why-review --validate-findings` before `$fix` touches it; the loop applies THOSE at the lowest owning layer (Entity > Service > Handler), routed by change type — NEVER unvalidated findings.
- **Scope base is FIXED; the working tree grows.** Recompute the diff scope each round (`branch-diff base` ∪ current uncommitted changes) so convergence is measured against a stable subject as fixes accumulate.
- **Bounded:** round cap default 3; blocking findings not shrinking across 2 rounds, or cap hit with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate** by asking the user directly. Increasing findings → STOP (fixes regressing).

**Why this skill exists (READ FIRST — it is the whole justification):** standalone `$changes-review` COUPLES find + fix inside one skill invocation (its Phase 7 self-fix and Phase -1 self-recursive loop, `changes-review/SKILL.md:53,197-223`) — the review and the fix share one context, one lens, and one confirmation bias. This loop **decouples** them: it runs `$changes-review` purely as a finder (report-only, the documented `$workflow-review-changes` boundary where it stops after the report and the caller owns fixing, `changes-review/SKILL.md:29,204,558,578`), validates the findings, then hands them to a **dedicated `$fix`** half with its own intelligent routing at the lowest owning layer, and then re-runs a **fresh full** `$changes-review` over the changed diff. The value is the clean finder/fixer split plus the fresh-full re-review each round: it catches **fix-induced regressions** the coupled inner loop can rationalize away, and it lets `$fix` own the fix mechanics instead of the reviewer patching its own findings. Without this outer loop, "changes-review found issues, then something fixed them" ships those fixes without an independent fresh review.

**Workflow:** resolve diff scope + Goal Contract → bind the convergence loop (protocol loop + optional `/goal` accelerator) → **round loop** { run `$changes-review` report-only INLINE → `$why-review --validate-findings` → run `$fix` on the validated findings at owning layer → log iteration } → converge when a fresh full review clears the round's exit bar (zero validated findings rounds 1-2; zero validated CRITICAL/HIGH/MEDIUM round 3+) → terminal `$docs-update` + recap.

**Key Rules:**

- **Each round pairs `$changes-review` (find) + `$fix` (resolve).** The loop runs `$changes-review` in report-only mode so it produces findings but does NOT self-validate or self-fix; the loop's `$why-review --validate-findings` gate and `$fix` are the halves that validate and land the change. A round is incomplete until BOTH have run (or the review returned zero findings).
- **MUST run INLINE in the main session — NEVER dispatch `$changes-review` or `$why-review` as a sub-agent.** They self-bind their own review-loop obligations (and a session `/goal` gate when available, `changes-review/SKILL.md:197-223`); as a sub-agent that in-session guarantee is silently lost. This loop skill therefore also runs inline. (`$changes-review`'s internal Phase 0.7 dimensional reviewers remain sub-agents by its own design — that is bounded and correct.)
- **Report-only invocation is mandatory.** Tell `$changes-review` to run as a review producer: do its full dimensional review + Phase 6 `$why-review --validate-findings` gate, then STOP before Phase 7 self-fix / Phase 7.5 holistic / Phase 8 docs-update. The loop owns fixing (Step 1.3) and the terminal docs-update (Step 3). If a `$changes-review` invocation cannot be constrained to report-only in this environment and self-fixes anyway, fall back to detecting fixes-applied per round (like `$workflow-review-changes-loop`) and skip the redundant `$fix` half for that round — never double-fix.
- **Convergence = a fresh full `$changes-review` over the post-fix diff clears the round's exit bar.** Rounds 1-2: zero validated findings. **Round 3+: zero validated CRITICAL/HIGH/MEDIUM — LOW-only converges** (record the LOWs as deferred, do not fix them). A clean report produced BEFORE the latest fix landed does NOT count — re-review the changed diff.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, never lowers the ≥85% finding-survival bar, and never applies to a binary gate (a failing test is a failure, not a LOW finding).
- **`$fix` applies ONLY validated findings**, at the lowest owning layer, routed by change type (code → `$fix` with its `--target` intelligent routing, or a direct edit at Entity/Service; spec-drift → `$spec [update]` + `$spec [mode=tests]`; docs → `$docs-update`; missing coverage → `$integration-test`; honor each finding's dual-feedback ledger, `changes-review/SKILL.md:530`). NEVER apply an unvalidated or demoted finding.
- **The diff scope base is FIXED across rounds; its content changes as fixes land.** Recompute `{scope}` = branch-diff base ∪ current uncommitted changes each round so the base merge-base never moves and convergence is measured against a stable subject.
- **Round cap (default 3)** and **blocking-findings-not-shrinking / increasing → STOP & escalate** by asking the user directly. NEVER loop open-ended. Cap exhaustion escalates only when CRITICAL/HIGH/MEDIUM remain — a LOW-only round converges via the severity floor.

---

## First Principle — Convergence, Not Motion

> A round that changes the diff is progress **only if** the next fresh review finds fewer things to fix.
> The loop exists to reach a fixed point (no blocking findings), not to keep editing the code.
> The bar tightens by round: everything blocks in rounds 1-2; from round 3 only CRITICAL/HIGH/MEDIUM block, so a LOW-only round is the fixed point.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round.

---

## Step 0 — Resolve Diff Scope + Goal Contract (FIRST ACTION)

1. **Parse the review scope** from the user prompt into a stable, reusable scope string — exactly the diff kinds `$changes-review` resolves (`changes-review/SKILL.md:96-104`). It has two parts UNIONed:
    - **Branch-diff base** — a branch-to-branch or PR diff (e.g. `git diff develop...HEAD`, three-dot: changes on the feature branch since it forked from `develop`) so the base is a **fixed merge-base**, not a moving target. If the prompt names a commit range, capture it the same way.
    - **Current changes** — the uncommitted working-tree changes (`git status --porcelain`, `git diff` + `git diff --staged`).
    - **Scope string (recompute each round):** `{branch-diff base} ∪ {current uncommitted changes}`. The base commit is fixed for the whole loop; the uncommitted set legitimately grows as fixes land.
    - If the prompt names no branch diff (pure "current changes" review), the scope is just the working-tree changes — the loop still applies. **NEVER silently convert the diff source type.**
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
    > _A fresh full `$changes-review` over `{scope}` clears the round's exit bar: **rounds 1-2** → **zero validated findings** (no finding of any severity survives the loop's `$why-review --validate-findings` gate); **round 3+** → **zero validated CRITICAL/HIGH/MEDIUM findings**, with any remaining LOW findings recorded as deferred rather than fixed._
    > Record the round cap (default 3) and the scope string in **Constraints**.

## Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (Steps 1–2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run `$changes-review` report-only INLINE over `{scope}` (recomputed each round). After each review, validate its findings with `$why-review --validate-findings`, apply every VALIDATED finding's fix via `$fix` at its owning layer, then re-run a FRESH full `$changes-review` over the CHANGED diff. Do NOT stop while the last review still produced validated findings that BLOCK at the current round's bar. Converge when a fresh full `$changes-review` clears that bar: **rounds 1-2** → zero validated findings; **round 3+** → zero validated CRITICAL/HIGH/MEDIUM (LOW-only ENDS the loop, with the LOWs recorded as deferred). Cap at `{N=5}` rounds; if blocking findings do not shrink across 2 consecutive rounds, findings increase, or the cap is hit with CRITICAL/HIGH/MEDIUM still open → STOP and escalate by asking the user directly. Never loop open-ended.

Treat this as a standing obligation you re-read at every Step 2 checkpoint — NOT a one-time note you can rationalize away after the first fix cycle. The Goal Contract's required Success Criterion (Step 0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal changes-review convergence loop: repeatedly run $changes-review report-only INLINE over {scope} (recomputed each round). After each review, validate its findings with $why-review --validate-findings, apply every VALIDATED finding's fix via $fix at its owning layer, then re-run a FRESH full $changes-review over the CHANGED diff. If blocking validated findings>0 → apply fixes and run another round; if a fresh full $changes-review clears the round's bar (rounds 1-2: zero validated findings; round 3+: zero validated CRITICAL/HIGH/MEDIUM, LOW-only counts as clear with the LOWs recorded as deferred) → CONVERGED, run the terminal $docs-update and clear the gate. Do NOT stop while the last review still produced blocking validated findings. Cap at {N=5} rounds; if blocking findings do not shrink across 2 consecutive rounds, findings increase, or the cap is hit with CRITICAL/HIGH/MEDIUM still open → STOP and escalate by asking the user directly. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner `$changes-review` round would self-bind its OWN Phase -1 review-loop obligation — but the loop runs it in **report-only mode**, where Phase -1 is deferred to the caller (the `$workflow-review-changes` boundary, `changes-review/SKILL.md:204`), so no inner self-fix gate is installed; THIS outer loop owns the single convergence gate. Each inner `$why-review --validate-findings` self-clears when that round's findings are all adjudicated. All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

## Step 1 — Round Loop (`$changes-review` → validate → `$fix` → log)

Each round couples the two halves — **review to find, fix to resolve.** For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat`. This is the fixes-applied baseline for the round and the objective backstop for convergence detection (Step 2).
2. **Run `$changes-review` report-only INLINE** on the recomputed `{scope}` via the skill invocation (NEVER the `spawn_agent` tool). Direct it to run as a review PRODUCER: perform its full dimensional review and STOP after writing its findings report — do NOT run its Phase 6 validation, Phase 7 self-fix, Phase 7.5 holistic, or Phase 8 docs-update. This is exactly the `$workflow-review-changes` boundary where the caller (this loop) owns validation and fixing, so `$changes-review` hands the raw report back and stops (`changes-review/SKILL.md:52,204,558,578`). If the environment cannot constrain `$changes-review` to report-only and it self-fixes anyway, treat that self-fix as this round's fix half (detect fixes-applied vs the before-snapshot) and skip Steps 1.3–1.4 to avoid double-fixing.
3. **Validate the findings — THE LOOP OWNS THIS GATE.** Run `$why-review --validate-findings <report-path>` INLINE via the skill invocation over the report `$changes-review` just produced (`plans/reports/code-review-*.md`), so every finding is confirmed correct, proof-backed, reasonable, and best-practice (≥85% survival bar) before any fix. This is the parent-owned validation the report-only boundary defers to the caller (`changes-review/SKILL.md:52`). If the validated finding set is empty → this round converged; go to Step 2 (no fix half needed).
4. **Run `$fix` on the validated findings** (findings>0 only) — this is the half the loop owns. Resolve each validated finding at its owning layer: code → `$fix` (its `--target` intelligent routing) or a direct edit at the lowest layer (Entity > Service > Handler); spec-drift (CODE-WRONG/SPEC-STALE/SPEC-SILENT) → route per the finding's Spec Drift Adjudication verdict (`$spec [update]` + `$spec [mode=tests]`); missing coverage (GAP/SPEC-GAP) → `$integration-test`; docs → defer to the terminal `$docs-update`; behavior-changing → honor the finding's Dual-Feedback Ledger (spec verdict + test action, `changes-review/SKILL.md:530`). Fix ONLY validated findings — never an unvalidated or demoted one.
5. **Append an Iteration Log entry** to the Goal Contract: round number, validated findings count, files/artifacts changed this round (`file:line`), fixes applied, and remaining gaps.

## Step 2 — Convergence & Escalation Gate

Evaluate after every round:

| Condition                                                                                                                     | Action                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh full `$changes-review` returned **zero validated findings** AND the working tree is unchanged by that final review pass | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to Step 3.                                                                                       |
| Validated findings > 0 AND round `< N` AND findings shrank vs prior round                                                     | Apply the validated fixes (Step 1.4), recompute `{scope}`, then run round `R+1` (fresh full re-review of the changed diff).                                                                                     |
| Findings did **not shrink** across 2 consecutive rounds (same/increasing count)                                               | **STOP & escalate** by asking the user directly — a non-converging loop is a signal, not a reason to spin.                                                                                                      |
| Round `R ≥ 3` AND the fresh review's validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM)                           | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to Step 3. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM still open                                                                        | **STOP & escalate** by asking the user directly — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.)                                   |

> **Increasing findings = STOP.** If round `R` surfaces MORE validated findings than round `R-1`, the fixes are regressing the code — STOP and escalate immediately (mirrors `changes-review/SKILL.md`'s regression stance). Never trade one fix for two new findings across rounds.

## Step 3 — Terminal Docs-Update + Recap

1. **Terminal `$docs-update` (MANDATORY once converged).** The loop ran `$changes-review` in report-only mode, so its unconditional Phase 8 docs-update (`changes-review/SKILL.md:55,68`) was deferred to the caller. Once a fresh full `$changes-review` clears the round's exit bar (zero validated findings, or zero validated CRITICAL/HIGH/MEDIUM from round 3), invoke `$docs-update` INLINE over the full changeset as the terminal step so no stale docs survive.
2. **Recap.** Emit a concise convergence recap: rounds run, validated findings per round (the shrinking sequence), the fixes applied at each round, the final zero-findings evidence, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's `$changes-review` report under `plans/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

---

## Convergence Detection — Why a Fresh Full Re-Review Is Required

A round converges ONLY when a `$changes-review` that ran over the **current, post-fix** diff clears the round's exit bar — zero validated findings in rounds 1-2, zero validated CRITICAL/HIGH/MEDIUM from round 3. Both properties are required because:

- **Fresh over the changed diff** — a clean report from a review that predates the last fix proves nothing about the fix. Every applied fix invalidates the prior verdict (`changes-review/SKILL.md:72`); the loop MUST re-review after fixing, never reuse a stale clean report.
- **Zero _validated_ findings** — the loop's `$why-review --validate-findings` gate already dropped inflated/unproven findings below the ≥85% bar; convergence rides on that validated set, so the loop never chases a nit the review itself would demote.
- **Working-tree unchanged backstop** — the objective `git`-diff comparison (Step 1.1 snapshot) confirms the converging review actually landed no fix; a "clean" verdict that still mutated files means the round DID fix things → run another round to re-prove clean.

When validated findings remain but cannot be fixed (owner/product input needed) → **escalate**, do not loop. When a fix lands but the next fresh review still finds issues → run another round. Convergence is a fixed point, not a single clean read.

---

**IMPORTANT MANDATORY sequence:** Step 0 (resolve diff scope + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: run `$changes-review` report-only INLINE → `$why-review --validate-findings` → run `$fix` on validated findings → log) → Step 2 (converge on a zero-findings fresh review / escalate on non-progress) → Step 3 (terminal `$docs-update` + recap).

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

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
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Pair `$changes-review` + `$fix` in a recursive loop over a fixed diff scope — `$changes-review` (report-only) to find validated findings → `$fix` to resolve them → fresh full re-review of the CHANGED diff — until a complete `$changes-review` pass clears the round's exit bar — **zero validated findings** in rounds 1-2, **zero validated CRITICAL/HIGH/MEDIUM** from round 3 (LOW-only ENDS the loop, deferred not fixed).

**IMPORTANT MUST ATTENTION main steps (in order):** (0) resolve diff scope + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop: run `$changes-review` report-only INLINE → `$why-review --validate-findings` → run `$fix` on VALIDATED findings at owning layer → append Iteration Log → (2) converge on a zero-findings fresh review / escalate on non-progress → (3) terminal `$docs-update` + recap.

**IMPORTANT MUST ATTENTION [BLOCKING] plan the detailed todo tasks FIRST — before running the loop.** Before the first round, create a detailed todo-task plan that enumerates every planned step and every planned round; a round MUST NOT start until that round's fresh todo-task plan exists. On EVERY re-run (each new round), REGENERATE a fresh loop todo-task plan — NEVER reuse the prior round's task list — so each round's work is explicitly planned before it executes.

**IMPORTANT MUST ATTENTION** each round pairs `$changes-review` (find) + `$fix` (resolve); the loop runs `$changes-review` in report-only mode (`changes-review/SKILL.md:29,204`) so it never self-fixes, and the loop MUST run the `$fix` half — one without the other never converges.
**IMPORTANT MUST ATTENTION** the convergence loop is bound by the **AI-driven protocol loop (Steps 1–2) — that is the primary, host-independent mechanism you MUST self-drive whether or not any command exists.** The `/goal` command is an OPTIONAL accelerator: invoke it (a real call) ONLY when available and permitted; if it is absent/unregistered/not-permitted, record one line in the Goal Contract and proceed — NEVER error, block, or fake a gate. Correctness must not depend on `/goal`.
**IMPORTANT MUST ATTENTION** run `$changes-review` and `$why-review` **INLINE via the skill invocation — NEVER as a sub-agent** (they self-bind their own review-loop obligations + a session `/goal` gate when available, `changes-review/SKILL.md:197-223`). `$changes-review`'s internal Phase 0.7 dimensional reviewers remain sub-agents by its own design.
**IMPORTANT MUST ATTENTION** convergence = a **fresh full** `$changes-review` over the **post-fix** diff clears the round's exit bar — **zero validated findings** in rounds 1-2, **zero validated CRITICAL/HIGH/MEDIUM** from round 3 (LOW-only ENDS the loop) — (with the working-tree-unchanged backstop) — never a stale clean report predating the last fix.
**IMPORTANT MUST ATTENTION** apply **ONLY validated findings** (≥85% survival bar via `$why-review --validate-findings`) at the lowest owning layer (Entity > Service > Handler); NEVER apply an unvalidated or demoted finding.
**IMPORTANT MUST ATTENTION** keep the diff **base fixed** across rounds; recompute `{scope}` = branch-diff base ∪ current uncommitted changes each round.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 3)**; findings not shrinking across 2 rounds, increasing, or cap hit with findings still open → **STOP & escalate** by asking the user directly. NEVER loop open-ended.
**IMPORTANT MUST ATTENTION** run the terminal `$docs-update` once the loop converges (deferred from `$changes-review`'s report-only run); do NOT commit or push unless the user explicitly asks.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
