---
name: workflow-review-changes-loop
version: 1.0.0
description: '[Workflow] Use when you need to run /workflow-review-changes repeatedly in an outer convergence loop until a complete whole-workflow run applies zero fixes — recursive re-review of a fixed scope (branch-diff + current changes) until a clean no-op pass.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Converge a review scope to a **clean no-op pass** by re-running the ENTIRE `/workflow-review-changes` workflow INLINE, round after round, over a fixed scope combined with the fixes accumulated so far — stopping when a complete round applies **zero fixes**. **From round 3 the severity floor applies: LOW findings are no longer fixed, so a round that surfaces only LOW findings is a zero-fix round and ENDS the loop.**

**Summary:**

- **Steps (in order):** (0) resolve scope + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop { run `/workflow-review-changes` INLINE → detect fixes-applied → log iteration } → (2) converge on a zero-fix round OR escalate on non-progress → (3) recap.
- **Convergence:** stop ONLY when a whole round applies **zero fixes** (its fix cycle skipped, working tree unchanged, reviews clean) — not merely one clean review.
- **Inline invariant:** run `/workflow-review-changes` via the `Skill` tool, NEVER the `Agent` tool — it self-binds its own review-loop obligation (owning the session Stop hook for its `/goal` gate WHEN available), which a sub-agent cannot own or carry back to this loop.
- **Severity floor — from round 3, LOW stops blocking.** Rounds 1-2 fix every validated severity. **From round 3 tell the inner `/workflow-review-changes` to fix only CRITICAL/HIGH/MEDIUM and to defer LOW findings** — a round whose validated findings are ALL LOW therefore applies zero fixes and CONVERGES. Carry every deferred LOW into the recap and Goal Contract; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit. Severity tiers per `SYNC:severity-rubric`.
- **Bounded:** round cap default 3; blocking findings not shrinking across 2 rounds, or cap hit with CRITICAL/HIGH/MEDIUM fixes still landing → **STOP & escalate** via `AskUserQuestion`.

**Why this skill exists (READ FIRST — it is the whole justification):** `/workflow-review-changes` already converges _internally_ to a clean pass, BUT its inner loop does **NOT** re-run the 7 specialist reviewers from scratch. Per the `Conditional Inline Re-Review Protocol` in `.claude/skills/workflow-review-changes/SKILL.md`, the step-15 inline re-review re-runs only `/changes-review`'s own BE/FE/SCSS/UI dimensions plus _scoped_ re-runs of the specific specialist that raised a finding — `/architecture-review`, `/performance-review`, `/security-review`, `/integration-test-review`, `/production-readiness-review`, `/domain-entities-review`, and `/ui-review` fire ONCE (steps 4–10). Only a **fresh full re-invocation** re-runs ALL specialists over the now-fixed code — catching **second-order defects the fixes themselves introduced** and killing whole-workflow confirmation bias. Without this outer loop those regressions ship unreviewed.

**Workflow:** resolve scope + Goal Contract → bind the convergence loop (protocol loop + optional `/goal` accelerator) → **round loop** { run `/workflow-review-changes` INLINE → detect fixes-applied → log iteration } → converge when a round applies zero fixes → recap.

**Key Rules:**

- **MUST run INLINE in the main session — NEVER dispatch `/workflow-review-changes` as a sub-agent.** It self-binds its own review-loop obligation (owning the session Stop hook for its `/goal` gate when available); as a sub-agent that in-session guarantee is silently lost (see the `[WORKFLOW-IN-WORKFLOW]` execution block in `workflow-review-changes/SKILL.md`). This loop skill therefore also runs inline.
- **Convergence = a whole round applied ZERO fixes** (its fix cycle, steps 12–15, was skipped because reviews passed clean). That, not "one clean review", ends the loop.
- **Scope base is FIXED across rounds; the working tree grows.** Recompute the scope each round as `branch-diff base` ∪ current uncommitted changes — the diff base never moves, so convergence is measured against a stable target.
- **Round cap (default 3)** and **findings-increasing → STOP & escalate** via `AskUserQuestion`. NEVER loop open-ended. Cap exhaustion escalates only when CRITICAL/HIGH/MEDIUM fixes are still landing — a LOW-only round converges via the severity floor.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never applies to a binary gate inside the inner workflow (a failing test is a failure, not a LOW finding).

---

## First Principle — Convergence, Not Motion

> A round that changes files is progress **only if** the next round finds fewer things to fix.
> The loop exists to reach a fixed point (zero fixes), not to keep churning the diff.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round.

---

## Step 0 — Resolve Scope + Goal Contract (FIRST ACTION)

1. **Parse the review scope** from the user prompt into a stable, reusable scope string. It has two parts UNIONed:
    - **Branch-diff base** — a branch-to-branch or PR diff, e.g. `fix/timelog-org-business-timezone` into `develop`. Capture it as `git diff develop...HEAD` (three-dot: changes on the feature branch since it forked from `develop`) so the base is a **fixed merge-base**, not a moving target.
    - **Current changes** — the uncommitted working-tree changes (`git status --porcelain`, `git diff` + `git diff --staged`).
    - **Scope string (recompute each round):** `{branch-diff base} ∪ {current uncommitted changes}`. The base commit is fixed for the whole loop; the uncommitted set legitimately grows as fixes land.
    - If the prompt names no branch diff (pure "current changes" review), the scope is just the working-tree changes — the loop still applies.
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
    > _A complete `/workflow-review-changes` run over `{scope}` applies **zero fixes** (a clean no-op pass — no `/plan-execute` file changes; **rounds 1-2** no validated findings of any severity, **round 3+** no validated CRITICAL/HIGH/MEDIUM, with remaining LOW findings deferred rather than fixed)._
    > Record the round cap (default 3), the severity floor (LOW non-blocking from round 3), and the scope string in **Constraints**.

## Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (Steps 1–2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run `/workflow-review-changes` INLINE over `{scope}` (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix. From round 3 on, instruct the inner workflow to fix only CRITICAL/HIGH/MEDIUM validated findings and to defer LOW ones. Do NOT stop while the last round still applied fixes. Converge when a full round applies ZERO fixes (reviews clean, `/plan-execute` changed no files) — which from round 3 includes a round whose only validated findings were LOW. Cap at `{N=5}` rounds; if blocking findings do not shrink across 2 consecutive rounds, or the cap is hit with CRITICAL/HIGH/MEDIUM fixes still landing → STOP and escalate via `AskUserQuestion`. Never loop open-ended.

Treat this as a standing obligation you re-read at every Step 2 checkpoint — NOT a one-time note you can rationalize away after the first round. The Goal Contract's required Success Criterion (Step 0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal review-changes convergence loop: repeatedly run /workflow-review-changes INLINE over {scope} (branch-diff base ∪ current uncommitted changes, recomputed each round). After each round, detect whether it applied any fix; if fixes>0 → run another round; if a full round applied ZERO fixes (reviews clean, /plan-execute changed no files) → CONVERGED, clear the gate. From round 3 on, the inner workflow fixes only CRITICAL/HIGH/MEDIUM and defers LOW, so a LOW-only round is a zero-fix round and CONVERGES. Do NOT stop while the last round still applied fixes. Cap at {N=5} rounds; if blocking findings do not shrink across 2 consecutive rounds, or the round cap is hit with CRITICAL/HIGH/MEDIUM fixes still landing → STOP and escalate via AskUserQuestion. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner `/workflow-review-changes` round self-binds its OWN Step 0 review-loop obligation (and installs its own `/goal` gate WHEN available) that clears when that round reaches its internal clean pass. This OUTER loop persists across rounds and **subsumes** the inner ones (a converged loop implies every inner round ended clean). All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

## Step 1 — Round Loop (run → detect → log)

For each round `R` (starting at 1), do ALL of:

1. **Snapshot before:** record the working-tree fingerprint — `git status --porcelain` + `git diff --stat` (or `git rev-parse` of `git stash create` for an exact hash). This is the fixes-applied baseline for the round.
2. **Run the workflow INLINE:** invoke `/workflow-review-changes` via the `Skill` tool (NEVER the `Agent` tool) with the recomputed `{scope}` as its prompt. Let it run its full 20-step sequence including its own internal fix→re-review loop.
3. **Detect fixes-applied (objective):** compare the working tree after the round to the before-snapshot AND read the workflow's own result:
    - **Fixes applied (>0)** if the working tree changed during the round OR the workflow reported its fix cycle (steps 12–15) ran / `/plan-execute` modified files.
    - **Zero fixes** if the working tree is byte-identical to the before-snapshot AND the workflow reported either no validated findings, or (round 3+) validated findings that are ALL LOW with the fix phase explicitly skipped.
    - If a claimed LOW-only exit has a changed fingerprint, re-review; it is not a no-op convergence pass.
4. **Append an Iteration Log entry** to the Goal Contract: round number, files changed this round (`file:line`), fixes-applied count, the review verdict, and remaining gaps.

## Step 2 — Convergence & Escalation Gate

Evaluate after every round:

| Condition                                                                                                 | Action                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Round applied **ZERO fixes** (clean no-op pass)                                                           | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to Step 3.                                                                                       |
| Round applied fixes AND round `< N` AND findings shrank vs prior round                                    | Recompute `{scope}`, run round `R+1`.                                                                                                                                                                           |
| Findings did **not shrink** across 2 consecutive rounds (same/increasing count)                           | **STOP & escalate** via `AskUserQuestion` — a non-converging loop is a signal, not a reason to spin.                                                                                                            |
| Round `R ≥ 3` whose validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM, so zero fixes applied) | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to Step 3. |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM fixes still landing                                           | **STOP & escalate** via `AskUserQuestion` — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.)                                         |

> **Increasing findings = STOP.** If round `R` surfaces MORE findings than round `R-1`, the fixes are regressing the code — STOP and escalate immediately (mirrors the **Issue count increasing** rule under **Iteration Tracking (Conversation-Scoped)** in `workflow-review-changes/SKILL.md`). Never trade one fix for two new findings across rounds.

## Step 3 — Recap

Emit a concise convergence recap: rounds run, total fixes applied per round (the shrinking sequence), the final clean-pass evidence, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's report under `plans/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

---

## Convergence Detection — Why Two Conditions

A round counts as converged ONLY when **both** hold: (a) the working tree is unchanged by the round, AND (b) the reviews reported clean at that round's bar — no validated findings in rounds 1-2, no validated CRITICAL/HIGH/MEDIUM from round 3 (deferred LOWs listed, not fixed). Both are required because:

- Working-tree-unchanged alone is ambiguous — a round can make no changes because a finding was **unfixable/escalated**, not because it was clean. That is escalation, not convergence.
- Reviews-clean alone is insufficient — an orchestrator can rationalize a "clean" verdict; the objective `git`-diff comparison is the backstop that proves no fix actually landed.

When (a) is true but (b) is false → **escalate** (a real finding the loop cannot close). When (b) is true but (a) is false → the round DID fix things → run another round to re-prove clean.

---

**IMPORTANT MANDATORY sequence:** Step 0 (scope + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: run `/workflow-review-changes` INLINE → detect fixes → log) → Step 2 (converge on zero-fix round / escalate on non-progress) → Step 3 (recap).

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
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
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

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

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

**IMPORTANT MUST ATTENTION Goal:** Re-run the WHOLE `/workflow-review-changes` inline, round after round, over a fixed scope ∪ accumulated fixes, until a complete round applies **zero fixes**.

**IMPORTANT MUST ATTENTION main steps (in order):** (0) resolve scope + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop: run `/workflow-review-changes` INLINE → detect fixes-applied → append Iteration Log → (2) converge on a zero-fix round / escalate on non-progress → (3) recap.

**IMPORTANT MUST ATTENTION [BLOCKING] plan the detailed todo tasks FIRST — before running the loop.** Before the first round, create a detailed todo-task plan that enumerates every planned step and every planned round; a round MUST NOT start until that round's fresh todo-task plan exists. On EVERY re-run (each new round), REGENERATE a fresh loop todo-task plan — NEVER reuse the prior round's task list — so each round's work is explicitly planned before it executes.

**IMPORTANT MUST ATTENTION** the convergence loop is bound by the **AI-driven protocol loop (Steps 1–2) — that is the primary, host-independent mechanism you MUST self-drive whether or not any command exists.** The `/goal` command is an OPTIONAL accelerator: invoke it (a real call) ONLY when available and permitted; if it is absent/unregistered/not-permitted, record one line in the Goal Contract and proceed — NEVER error, block, or fake a gate. Correctness must not depend on `/goal`.
**IMPORTANT MUST ATTENTION** run `/workflow-review-changes` **INLINE via the `Skill` tool — NEVER as a sub-agent** (it self-binds its own review-loop obligation + a session `/goal` gate when available).
**IMPORTANT MUST ATTENTION** convergence = a whole round applied **ZERO fixes** (fix cycle skipped, working tree unchanged, reviews clean at that round's bar) — not merely one clean review. **From round 3 the severity floor applies: LOW findings are deferred not fixed, so a LOW-only round is a zero-fix round and ENDS the loop.**
**IMPORTANT MUST ATTENTION** the outer loop's value is the **fresh full specialist sweep** the inner loop never re-runs (see the **Conditional Inline Re-Review Protocol** in `workflow-review-changes/SKILL.md`) — that is why this skill exists.
**IMPORTANT MUST ATTENTION** keep the diff **base fixed** across rounds; recompute `{scope}` = branch-diff base ∪ current uncommitted changes each round.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 3)**; blocking findings not shrinking across 2 rounds, or cap hit with CRITICAL/HIGH/MEDIUM fixes still landing → **STOP & escalate** via `AskUserQuestion`. NEVER loop open-ended.
**IMPORTANT MUST ATTENTION** do NOT commit or push unless the user explicitly asks.
