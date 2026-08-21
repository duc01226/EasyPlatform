---
name: why-review-loop
version: 1.1.0
description: '[Code Quality] Use when you need to combine /why-review + /fix in a recursive loop — each round runs /why-review to find validated findings then /fix to resolve them, then loops again over the CHANGED target until a fresh full /why-review produces zero findings (nothing left to fix).'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Drive a review target to a **clean pass** by pairing `/why-review` with `/fix` in a recursive loop — each round runs `/why-review` INLINE to surface validated findings, then `/fix` to resolve them, then loops again over the CHANGED target — stopping when a complete `/why-review` pass clears the round's exit bar: **zero findings** in rounds 1-2, and **zero CRITICAL/HIGH/MEDIUM** from round 3 (LOW-only ENDS the loop, deferred not fixed).

**Summary:**

- **Each round = `/why-review` + `/fix`** — `/why-review` is review-ONLY and never edits the target, so the loop MUST pair it with a fix half; one without the other never converges.
- **Steps (in order):** (0) resolve target + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop { run `/why-review` INLINE → clear the **Trade-Off Gate** on the fix set → run `/fix` on the VALIDATED findings at the owning layer → log iteration } → (2) converge on a zero-findings round OR escalate on non-progress → (3) recap.
- **Convergence:** stop ONLY when a **fresh full** `/why-review` over the CURRENT (post-fix) target clears that round's exit bar — not a stale PASS predating the last fix.
- **Severity floor — from round 3, LOW stops blocking.** Rounds 1-2 converge on an **empty validated-finding set** (any severity). **From round 3 the bar is zero validated CRITICAL/HIGH/MEDIUM — a round whose validated findings are ALL LOW ENDS the loop.** Never open another round to fix LOW alone; list every deferred LOW in the recap and Goal Contract instead, and NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit.
- **Inline invariant:** run `/why-review` via the `Skill` tool, NEVER the `Agent` tool — it self-binds its OWN review-loop obligation (and a session `/goal` gate WHEN available, `why-review/SKILL.md:57-76`), which a sub-agent cannot own or carry back to this loop.
- **Apply ONLY validated findings:** `/why-review` already validates its findings to the ≥85% survival bar; the loop applies THOSE, at the lowest owning layer (Entity > Service > Handler), routed by target type — NEVER unvalidated findings.
- **Bounded:** round cap default 3; findings not shrinking across 2 rounds, or cap hit with findings still open → **STOP & escalate** via `AskUserQuestion`. Increasing findings → STOP (fixes regressing).
- **TRADE-OFF GATE before every fix (ALWAYS ASK):** (1) **is there any trade-off in this fix?** name what it sacrifices — "none" is an unfinished analysis; (2) **is it worth it?** gain vs cost, who pays, when → WORTH IT / NOT WORTH IT / UNCLEAR — NOT WORTH IT → do NOT apply, report it back instead; (3) **is the trade-off material enough to confirm with the user?** irreversible · cost shifted elsewhere · quality attribute traded · boundary crossed · high-consequence path · UNCLEAR → **STOP the loop and confirm via `AskUserQuestion` BEFORE applying**. NEVER auto-apply a material-trade-off fix just because the loop wants to converge.

**Why this skill exists (READ FIRST — it is the whole justification):** `/why-review` is **review-only** — `why-review/SKILL.md:330` (_"Review only — do NOT modify target files or implement changes"_) and `:76` (_"why-review fixes its OWN findings set, not code… Code/spec/test fixes remain the caller's job"_). Its internal self-recursive `/goal` loop (`why-review/SKILL.md:57-76`) converges its own **findings REPORT** to CLEAN — every surviving finding proof-backed, validated, ≥85% confidence — but it **never touches the code and never re-reviews a fixed target**. So a finding that demands a code/spec/doc change is validated and handed off, yet **nothing loops back to confirm the FIX is correct or that it introduced no new defect**. This skill closes that outer loop: it applies the validated fixes and re-runs a **fresh full** `/why-review` over the changed target until zero findings remain — catching fix-induced regressions and proving each fix actually resolved its finding. Without it, "why-review passed, then I fixed the findings" ships those fixes unreviewed.

**Workflow:** resolve target + Goal Contract → bind the convergence loop (protocol loop + optional `/goal` accelerator) → **round loop** { run `/why-review` INLINE → clear the Trade-Off Gate on the fix set (trade-off? worth it? material → confirm with user) → run `/fix` on the validated findings at owning layer → log iteration } → converge when a fresh full review yields zero findings → recap.

**Key Rules:**

- **Each round pairs `/why-review` (find) + `/fix` (resolve).** `/why-review` is review-only (`why-review/SKILL.md:76,330`) — it produces validated findings but never edits the target; `/fix` is the half that lands the change. A round is incomplete until BOTH have run (or the review returned zero findings).
- **MUST run INLINE in the main session — NEVER dispatch `/why-review` as a sub-agent.** It self-binds its own review-loop obligation (and a session `/goal` gate when available, `why-review/SKILL.md:57-76`); as a sub-agent that in-session guarantee is silently lost. This loop skill therefore also runs inline.
- **Convergence = a fresh full `/why-review` over the post-fix target clears the round's exit bar.** Rounds 1-2: PASS with an empty validated-finding set. **Round 3+: zero validated CRITICAL/HIGH/MEDIUM — LOW-only converges.** A PASS produced BEFORE the latest fix landed does NOT count — re-review the changed target.
- **The severity floor bounds ITERATION, never the standard.** It ends the loop; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, never lowers `/why-review`'s ≥85% finding-survival bar, and never applies to a binary gate (a failing test is a failure, not a LOW finding).
- **`/fix` applies ONLY validated findings**, at the lowest owning layer, routed by target type (code → `/fix` with its intelligent routing, or a direct edit at Entity/Service; plan/PBI → `/refine`; spec → `/spec [update]` + `/spec [mode=tests]`; docs → `/docs-update`; tests → `/integration-test`). NEVER apply an unvalidated or demoted finding.
- **The target base is FIXED across rounds; its content changes as fixes land.** Re-review the SAME target (same plan/diff/artifact) each round so convergence is measured against a stable subject.
- **Round cap (default 3)** and **findings-not-shrinking / increasing → STOP & escalate** via `AskUserQuestion`. NEVER loop open-ended.
- **ALWAYS ask the 3 trade-off questions before applying ANY fix** — is there a trade-off? is it worth it? is it material enough to confirm with the user? A MATERIAL trade-off (irreversible · cost shifted to another team/ops/maintainer/user · one quality attribute traded for another · tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change path · worth-it verdict UNCLEAR) **PAUSES the loop for an `AskUserQuestion` before the fix lands** — convergence pressure NEVER authorizes walking through a one-way door on the user's behalf. — why: an autonomous fix loop is exactly where an unpriced trade-off ships silently, because each round only asks "did findings shrink?".

---

## First Principle — Convergence, Not Motion

> A round that changes the target is progress **only if** the next fresh review finds fewer things to fix.
> The loop exists to reach a fixed point (no blocking findings), not to keep editing the target.
> The bar tightens by round: everything blocks in rounds 1-2; from round 3 only CRITICAL/HIGH/MEDIUM block, so a LOW-only round is the fixed point.
> If findings stop shrinking, that is a signal to **escalate**, not to spin another round.

---

## Step 0 — Resolve Target + Goal Contract (FIRST ACTION)

1. **Parse the review target** from the user prompt into a stable, reusable target reference — exactly the kinds `/why-review` resolves (`why-review/SKILL.md:142-161`):
    - **Plan / PBI / story** — a `plan.md` + `phase-*.md` dir, or a named PBI/story artifact.
    - **Code change** — a commit SHA, PR/merge commit, branch-to-branch or PR diff (e.g. `git diff develop...HEAD`), or uncommitted working-tree changes.
    - **Docs / spec / report** — a target artifact path whose claims are checked against source evidence.
    - Record the target type, its evidence, and confidence. **NEVER silently convert target types** (`why-review/SKILL.md:160`).
2. **Resolve/create the Goal Contract** per `SYNC:goal-contract-satisfaction-loop` (`plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`, template `.claude/templates/goal-contract-template.md`). Its single **required** Success Criterion:
    > _A fresh full `/why-review` over `{target}` clears the round's exit bar: **rounds 1-2** → PASS with **zero validated findings** (no finding, weakness, or missing item of any severity); **round 3+** → **zero validated CRITICAL/HIGH/MEDIUM findings**, with any remaining LOW findings recorded as deferred rather than fixed._
    > Record the round cap (default 3), the severity floor (LOW non-blocking from round 3), and the target reference in **Constraints**.

## Step 0b — Bind the Convergence Loop (protocol-first; `/goal` is an optional accelerator)

The convergence loop is bound by TWO layers. The **protocol loop (Steps 1–2) is the BINDING mechanism** and MUST be self-driven by you, the running agent, on every host — with or without any command or hook. The **`/goal` command is an OPTIONAL accelerator** layered on top; it is never the primary mechanism, and its absence NEVER weakens the loop. This mirrors the project rule that hooks/trackers are accelerators only — correctness must not depend on them.

**1. Protocol loop — ALWAYS binding (hook/command-independent).** You are personally responsible for not stopping until the loop converges or bounded-escalates. This binds Claude, Codex, and Copilot equally, whether or not `/goal` exists:

> Repeatedly run `/why-review` INLINE over `{target}`. After each review, apply every VALIDATED finding's fix at its owning layer, then re-run a FRESH full `/why-review` over the CHANGED target. Do NOT stop while the last review still produced findings that BLOCK at the current round's bar. Converge when a fresh full `/why-review` clears that bar: **rounds 1-2** → PASS with zero validated findings; **round 3+** → zero validated CRITICAL/HIGH/MEDIUM (LOW-only ENDS the loop, with the LOWs recorded as deferred). Cap at `{N=5}` rounds; if blocking findings do not shrink across 2 consecutive rounds, findings increase, or the cap is hit with CRITICAL/HIGH/MEDIUM still open → STOP and escalate via `AskUserQuestion`. Never loop open-ended.

Treat this as a standing obligation you re-read at every Step 2 checkpoint — NOT a one-time note you can rationalize away after the first fix cycle. The Goal Contract's required Success Criterion (Step 0) is its durable, host-independent record.

**2. `/goal` command — invoke as an accelerator WHEN AVAILABLE.** If a `/goal` command exists and you are permitted to run it in this environment, ALSO invoke it (a real tool/command call, NOT a paraphrase, NOT a Goal Contract file substituted for it) with the SAME condition, so a session Stop hook mechanically enforces the loop:

```
/goal why-review convergence loop: repeatedly run /why-review INLINE over {target}. After each review, apply every VALIDATED finding's fix at its owning layer, then re-run a FRESH full /why-review over the CHANGED target. If findings>0 → apply fixes and run another round; if a fresh full /why-review returns PASS with zero validated findings → CONVERGED, clear the gate. Do NOT stop while the last review still produced findings. Cap at {N=5} rounds; if findings do not shrink across 2 consecutive rounds, findings increase, or the cap is hit with findings still open → STOP and escalate via AskUserQuestion. Never loop open-ended.
```

The `/goal` Stop hook blocks stopping until the condition holds and auto-clears when met — do not tell the user to clear it.

**If `/goal` is unavailable, unregistered, or not permitted** (e.g. Codex/Copilot, or a Claude run without the command): DO NOT error, DO NOT block, and DO NOT invent a stand-in gate. Record ONE line in the Goal Contract — `/goal accelerator unavailable — loop bound by protocol (Steps 1–2) + this Goal Contract` — and proceed. The protocol loop above plus the Goal Contract are the same gate, enforced by discipline instead of a hook.

> **Nested gates (by design, safe):** each inner `/why-review` round self-binds its OWN review-loop obligation (and installs its own `/goal` gate WHEN available, `why-review/SKILL.md:57-76`) that clears when THAT round's findings are all validated CLEAN. This OUTER loop persists across rounds and **subsumes** the inner ones (a converged loop implies every inner round ended with validated findings). All self-clear on satisfaction — no orphaned gate. Do NOT tell the user to clear either.

## Step 1 — Round Loop (`/why-review` → `/fix` → log)

Each round couples the two halves — **review to find, fix to resolve.** For each round `R` (starting at 1), do ALL of:

1. **Run `/why-review` INLINE** on `{target}` via the `Skill` tool (NEVER the `Agent` tool). Let it run its full adversarial review + its own internal Findings Validation Gate, so the findings it returns are already **validated** (proof-backed, ≥85% survival bar).
2. **Read the validated finding set** from its report (`plans/reports/why-review-*.md`). If the verdict is PASS with **zero** findings → this round converged; go to Step 2 (no fix half needed).
3. **Trade-Off Gate on the fix set (BLOCKING — before any edit lands).** For EACH validated finding's fix, ask the 3 questions: (a) **is there any trade-off?** name what applying it sacrifices — future change cost, complexity, performance, coupling, reversibility, migration/ops burden, blast radius, security, testability, delivery time; "none" is an unfinished analysis, so state the dimensions checked; (b) **is it worth it?** gain vs cost, who pays, when → **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → do NOT apply — report the finding back as a withdrawn-fix note and count it as still-open, never as fixed; (c) **is the trade-off material enough to confirm with the user?** MATERIAL when irreversible (one-way door) · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · an auth/money/data-integrity/breaking-change path · or the verdict is UNCLEAR → **PAUSE the loop and confirm via `AskUserQuestion` BEFORE the edit**, stating the trade-off, both options, what each sacrifices, and your recommendation. Log each fix's trade-off verdict in the round's Iteration Log entry. — why: the loop's only convergence signal is "did findings shrink?", so a material trade-off rides in unpriced unless a gate stops the fix half specifically.
4. **Run `/fix` on the validated findings** (findings>0 only, trade-off gate cleared) — this is the half `/why-review` never does. Resolve each validated finding at its owning layer: code → `/fix` (its `--target` intelligent routing) or a direct edit at the lowest layer (Entity > Service > Handler); plan/PBI → `/refine`; spec → `/spec [update]` + `/spec [mode=tests]`; docs → `/docs-update`; behavior-changing → honor the finding's dual-feedback (spec verdict + test action per `why-review/SKILL.md:360`). Fix ONLY validated findings — never an unvalidated or demoted one.
5. **Append an Iteration Log entry** to the Goal Contract: round number, findings count (validated), files/artifacts changed this round (`file:line`), fixes applied, per-fix trade-off verdict (WORTH IT / NOT WORTH IT / UNCLEAR + material? + confirmed?), and remaining gaps.

## Step 2 — Convergence & Escalation Gate

Evaluate after every round:

| Condition                                                                                                                                                               | Action                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh full `/why-review` returned **PASS with zero validated findings**                                                                                                 | **CONVERGED** → mark the required criterion PASS in the Goal Satisfaction matrix → clear the `/goal` gate → go to Step 3.                                                                                                             |
| Round `R ≥ 3` AND the fresh review's validated findings are **ALL LOW** (zero CRITICAL/HIGH/MEDIUM)                                                                     | **CONVERGED on the severity floor** → do NOT run another round for LOW alone → record every remaining LOW as a deferred finding in the recap + Goal Contract → mark the required criterion PASS → go to Step 3.                       |
| Blocking findings > 0 AND round `< N` AND blocking findings shrank vs prior round                                                                                       | Clear the Trade-Off Gate (Step 1.3), apply the validated fixes (Step 1.4), then run round `R+1` (fresh full re-review of the changed target). Rounds 1-2 count every severity as blocking; round 3+ counts only CRITICAL/HIGH/MEDIUM. |
| A fix carries a **MATERIAL** trade-off (irreversible · cost shifted elsewhere · quality attribute traded · boundary crossed · high-consequence path · worth-it UNCLEAR) | **PAUSE the loop → confirm via `AskUserQuestion` BEFORE applying that fix.** Convergence pressure NEVER authorizes deciding a material trade-off for the user.                                                                        |
| Findings did **not shrink** across 2 consecutive rounds (same/increasing count)                                                                                         | **STOP & escalate** via `AskUserQuestion` — a non-converging loop is a signal, not a reason to spin.                                                                                                                                  |
| Round cap `N` hit with CRITICAL/HIGH/MEDIUM still open                                                                                                                  | **STOP & escalate** via `AskUserQuestion` — report the still-open findings; do not silently continue. (LOW-only at the cap converges via the severity-floor row above.)                                                               |

> **Increasing findings = STOP.** If round `R` surfaces MORE findings than round `R-1`, the fixes are regressing the target — STOP and escalate immediately. Never trade one fix for two new findings across rounds.

## Step 3 — Recap

Emit a concise convergence recap: rounds run, validated findings per round (the shrinking sequence, split by severity), the fixes applied at each round, the final PASS evidence (zero findings, or zero CRITICAL/HIGH/MEDIUM when the loop ended on the round-3+ severity floor), a `## Deferred LOW Findings (severity floor, round ≥3)` list of every LOW left unfixed with `file:line`, and the Goal Satisfaction matrix (required criterion PASS). Point to each round's `/why-review` report under `plans/reports/` and the Goal Contract Iteration Log. Do NOT commit or push unless the user explicitly asks.

---

## Convergence Detection — Why a Fresh Full Re-Review Is Required

A round converges ONLY when a `/why-review` that ran over the **current, post-fix** target returns PASS with an empty validated-finding set. Both properties are required because:

- **Fresh over the changed target** — a PASS verdict from a review that predates the last fix proves nothing about the fix. Every applied fix invalidates the prior verdict (`why-review/SKILL.md:565`); the loop MUST re-review after fixing, never reuse a stale clean verdict.
- **Zero _blocking_ validated findings** — `/why-review`'s own gate already dropped inflated/unproven findings below the ≥85% bar (`why-review/SKILL.md:361`); convergence rides on that validated set, so the loop never chases a nit the review itself would demote. "Blocking" means every severity in rounds 1-2, and CRITICAL/HIGH/MEDIUM only from round 3 — by round 3 the surviving LOWs are polish whose fix cost exceeds the risk of deferring them, so continuing to spin on them buys nothing and burns the round cap that a real defect might need. — why: a loop that cannot exit on nits converges on exhaustion instead of on quality.

When findings remain but cannot be fixed (owner/product input needed) → **escalate**, do not loop. When a fix lands but the next fresh review still finds issues → run another round. Convergence is a fixed point, not a single clean read.

---

**IMPORTANT MANDATORY sequence:** Step 0 (resolve target + Goal Contract) → Step 0b (bind the convergence loop: protocol loop primary + optional `/goal` accelerator) → Step 1 (round loop: run `/why-review` INLINE → clear the Trade-Off Gate on the fix set → run `/fix` on validated findings → log) → Step 2 (converge on a zero-findings fresh review / escalate on non-progress) → Step 3 (recap).

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

**IMPORTANT MUST ATTENTION Goal:** Pair `/why-review` + `/fix` in a recursive loop over a fixed target — review to find validated findings → `/fix` to resolve them → fresh full re-review of the CHANGED target — until a complete `/why-review` pass produces **zero findings** (nothing left to fix).

**IMPORTANT MUST ATTENTION main steps (in order):** (0) resolve target + Goal Contract → (0b) bind the convergence loop (protocol loop primary + optional `/goal` accelerator) → (1) round loop: run `/why-review` INLINE → clear the **Trade-Off Gate** on the fix set (trade-off? worth it? material → confirm with user) → run `/fix` on VALIDATED findings at owning layer → append Iteration Log → (2) converge on a zero-findings fresh review / escalate on non-progress → (3) recap.

**IMPORTANT MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS BEFORE EVERY FIX LANDS:** (1) **Is there any trade-off?** name what applying this fix SACRIFICES across future change cost · complexity · performance · coupling · reversibility · migration/ops burden · blast radius · security · testability · delivery time — "none" is an unfinished analysis, so state the dimensions checked and why each is unaffected; (2) **Is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN it comes due → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → do NOT apply the fix, report it back as withdrawn and count the finding still-open (never as fixed); (3) **Is the trade-off material enough to confirm with the user?** MATERIAL when irreversible (one-way door) · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · an auth/money/data-integrity/breaking-change path · or the verdict is UNCLEAR → **PAUSE the loop and confirm via `AskUserQuestion` BEFORE the edit lands**, stating the trade-off, both options, what each sacrifices, and your recommendation. Log every fix's trade-off verdict in the round's Iteration Log. — why: this loop's only convergence signal is "did findings shrink?", so an unpriced or one-way-door fix ships silently unless a gate stops the fix half specifically; convergence pressure NEVER authorizes deciding a material trade-off on the user's behalf.

**IMPORTANT MUST ATTENTION [BLOCKING] plan the detailed todo tasks FIRST — before running the loop.** Before the first round, create a detailed todo-task plan that enumerates every planned step and every planned round; a round MUST NOT start until that round's fresh todo-task plan exists. On EVERY re-run (each new round), REGENERATE a fresh loop todo-task plan — NEVER reuse the prior round's task list — so each round's work is explicitly planned before it executes.

**IMPORTANT MUST ATTENTION** each round pairs `/why-review` (find) + `/fix` (resolve); `/why-review` is review-only (`why-review/SKILL.md:76,330`) and never edits the target, so the loop MUST run the `/fix` half — one without the other never converges.
**IMPORTANT MUST ATTENTION** the convergence loop is bound by the **AI-driven protocol loop (Steps 1–2) — that is the primary, host-independent mechanism you MUST self-drive whether or not any command exists.** The `/goal` command is an OPTIONAL accelerator: invoke it (a real call) ONLY when available and permitted; if it is absent/unregistered/not-permitted, record one line in the Goal Contract and proceed — NEVER error, block, or fake a gate. Correctness must not depend on `/goal`.
**IMPORTANT MUST ATTENTION** run `/why-review` **INLINE via the `Skill` tool — NEVER as a sub-agent** (it self-binds its own review-loop obligation + a session `/goal` gate when available, `why-review/SKILL.md:57-76`).
**IMPORTANT MUST ATTENTION** convergence = a **fresh full** `/why-review` over the **post-fix** target returns PASS with an **empty validated-finding set** — never a stale clean verdict predating the last fix.
**IMPORTANT MUST ATTENTION** apply **ONLY validated findings** (≥85% survival bar) at the lowest owning layer (Entity > Service > Handler); NEVER apply an unvalidated or demoted finding.
**IMPORTANT MUST ATTENTION** enforce the **round cap (default 3)**; findings not shrinking across 2 rounds, increasing, or cap hit with findings still open → **STOP & escalate** via `AskUserQuestion`. NEVER loop open-ended.
**IMPORTANT MUST ATTENTION** do NOT commit or push unless the user explicitly asks.
