---
name: test
version: 1.0.0
description: '[Testing] Use when you need to run tests locally and analyze the summary report.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Deliver an accurate, read-only pass/fail verdict — by running tests locally via the `tester` subagent and analyzing the summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Summary:**

- **Purpose:** give the user the TRUE test state — accurate pass/fail verdict, exact counts, failing-test names, report path — without applying any fix.
- **Main steps (run in order):** (1) **Delegate** — launch the `tester` subagent with the test scope from arguments; NEVER invoke test commands directly. (2) **Analyze** — review the subagent's summary report; identify failures and patterns. (3) **Report** — summarize pass/fail counts, highlight failing tests, cite the report path. (4) **Goal evidence** — resolve the active Goal Contract, append verification evidence, update the Goal Satisfaction matrix.
- READ-ONLY: stop at reporting; NEVER start implementing fixes — why: fixing is `/fix`'s job and mixing it into the report hides the true test state.
- After the run, append verification evidence (command, exact counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record "No active goal — evidence reported inline only." when none exists; NEVER copy sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.

**Workflow:**

1. **Delegate** — Launch `tester` subagent with test scope from arguments
2. **Analyze** — Review test results, identify failures and patterns
3. **Report** — Summarize pass/fail counts, highlight failing tests

**Key Rules:**

- READ-ONLY: do not implement fixes, only report results
- Activate relevant skills from catalog during process
- Always use `tester` subagent, not direct test commands
- An INTERMITTENT failure (red in one run, green in another) is NOT yet a product defect — route it through the same adjudication `/integration-test-verify` uses before reporting it as one: (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race. Report the verdict with its evidence, or report the failure as UNADJUDICATED — never as a product defect on the strength of one red run

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Use the `tester` subagent to run tests locally and analyze the summary report.

**IMPORTANT**: Stop at reporting results — do not start implementing.
**IMPORTANT:** Analyze the skills catalog and activate the skills that are needed for the task during the process.

**Goal Contract evidence (after test run):** Resolve the active Goal Contract per the goal-contract-satisfaction-loop protocol (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md`). When one exists, append the verification evidence to the goal file's Iteration Log — test command, exact pass/fail counts, report path — mapped to the saved success criteria the run verifies, and update the Goal Satisfaction matrix rows for those criteria (PASS/FAIL/BLOCKED). Record `No active goal — evidence reported inline only.` when none exists. Never copy raw sensitive fixture data into the goal file.

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

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `testing` workflow** (Recommended) — test
> 2. **Execute `/test` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/docs-update (Recommended)"** — Update documentation after tests pass
- **"/fix"** — If tests revealed failures that need fixing
- **"/watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine _who is at fault — the source code or the test code_. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Root-cause first — never guess, never patch the symptom.** `/debug-investigate` and trace the failure end-to-start to its actual cause before touching either side. A green-again suite is NOT the goal; a correct verdict on what was actually wrong is.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for _intended_ behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:real-world-fidelity-testing -->

> **Real-World Fidelity Gate** — MANDATORY when authoring, reviewing, or repairing any integration / E2E / system test.
>
> A test earns trust by reproducing a situation the system can actually meet in production. A scenario that could never occur in real life proves nothing when it passes, and wastes hours when it fails.
>
> 1. **Ask the fidelity question BEFORE writing the setup:** _"Can this sequence, timing, and data actually occur in production?"_ If no, the test is mis-specified — fix the SCENARIO, never the assertion.
> 2. **Model real pacing between actor steps.** Two distinct actor actions that production separates by seconds, minutes, or hours MUST NOT be fired back-to-back in the same millisecond. Compressed pacing manufactures races the system was never designed to survive, then reports them as product defects.
> 3. **Wait on a real signal, never a blind sleep.** Find an observable proving the prior step finished — a persisted state change, an audit/version stamp, a queue/worker idle marker, a completion event — and poll until it settles (unchanged across a short stability window). Use a fixed delay ONLY when no observable exists, and say so in a comment.
> 4. **Barriers belong in ARRANGE, never in ASSERT.** Waiting for a precondition is fidelity. Widening an assertion's timeout, loosening a comparison, adding a retry around a failing assertion, or skipping the test is masking. NEVER do the latter to force green.
> 5. **Distinguish harness-amplified from real.** Test topologies (shared infra, fan-out consumers, parallel suites, cold starts) can make a rare production race routine locally. Before filing a product defect, state whether the trigger exists in production and at what likelihood.
> 6. **Keep the protected invariant intact.** Improving fidelity must NEVER reduce what the test protects. If a realistic scenario no longer exercises the rule, the rule needs a DIFFERENT realistic scenario — not a weaker assertion.
> 7. **Deliberate impossible-state tests are allowed, but MUST be labelled.** Corruption-repair, migration, and fail-safe tests intentionally construct states production should never reach; comment WHY the state is reachable (upstream bug, partial write, legacy data), so they are never confused with unrealistic setups.

<!-- /SYNC:real-world-fidelity-testing -->

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

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act). NEVER speculate without proof.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** deliver an accurate, read-only pass/fail verdict — run tests via the `tester` subagent, analyze its summary report — with exact counts, failing-test names, report path, and Goal Contract evidence, so the user knows the true test state without any fix applied.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** ALWAYS apply critical + sequential thinking; traced proof, confidence >80%.
- **Evidence:** ALWAYS cite `file:line` per claim; NEVER speculate without proof.
- **Source/Test Drift:** when source changes, decide from evidence whether test or source is wrong; NEVER assume.
- **Real-World Fidelity:** a scenario production could never reach proves nothing green and blames the product red; distinguish harness-amplified from real before calling an intermittent failure a product defect.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**MANDATORY IMPORTANT MUST ATTENTION** READ-ONLY — run tests, report pass/fail counts + failing-test names + report path; NEVER implement fixes here, stop at reporting — why: fixing is `/fix`'s job; mixing the two hides the true test state.
**MANDATORY IMPORTANT MUST ATTENTION** ALWAYS run tests through the `tester` subagent; NEVER invoke test commands directly — why: the subagent isolates the run and produces the canonical summary report this skill analyzes.
**MANDATORY IMPORTANT MUST ATTENTION** resolve the active Goal Contract after the run; append verification evidence (test command, exact pass/fail counts, report path) to the goal file's Iteration Log and update the Goal Satisfaction matrix; record `No active goal — evidence reported inline only.` when none exists; NEVER copy raw sensitive fixture data into the goal file — why: the goal file is the durable PASS/FAIL ledger, not a secrets store.
**MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim about a failure (confidence >80% to act, <80% verify first); NEVER speculate which test failed or why — read the report — why: a guessed failure verdict sends the user to fix the wrong thing.
**MANDATORY IMPORTANT MUST ATTENTION** an INTERMITTENT failure is UNADJUDICATED, not a product defect — classify it as (a) unrealistic scenario / compressed actor pacing, (b) harness topology amplification (shared infra, fan-out consumers, suite parallelism, cold start), or (c) a genuine product race, with evidence, before reporting it as a defect; report it as UNADJUDICATED when the evidence is not there — why: a test-fidelity defect reported as a product defect sends the team to fix code that was never wrong.
**MANDATORY IMPORTANT MUST ATTENTION** before asserting a test/source relationship, grep 3+ similar tests and match the local pattern; apply the source/test drift check — decide from evidence whether a failing test guards intended behavior or the source is the bug — why: a mismatched assumption mislabels a real bug as a flaky test.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting; mark one `in_progress`, complete immediately after evidence; add a final review todo to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** validate route/decisions with the user via `AskUserQuestion` — NEVER auto-decide a workflow vs standalone run.
**IMPORTANT MUST ATTENTION** READ `CLAUDE.md` before starting.

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Tests obviously pass, skip the run"      | Run via `tester` anyway — a guessed verdict is not a verdict. Report real counts.                           |
| "I can run the test command directly"     | NEVER — always delegate to the `tester` subagent; direct runs bypass the canonical report.                  |
| "Failure looks trivial, I'll just fix it" | Stop at reporting. Fixing is `/fix`'s job; this skill is strictly READ-ONLY.                                |
| "No goal file, skip the evidence step"    | Record `No active goal — evidence reported inline only.` Never silently skip the Goal Contract.             |
| "I know which test failed"                | Show `file:line` + the report path. No proof = no claim.                                                    |
| "It failed once — that's a product bug"   | Intermittent = unadjudicated. Rule out unrealistic scenario and harness amplification first, with evidence. |

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

**IMPORTANT MUST ATTENTION** READ-ONLY — report pass/fail, NEVER fix here (that is `/fix`'s job).
**IMPORTANT MUST ATTENTION** ALWAYS run via the `tester` subagent; cite `file:line` + report path for every failure claim (confidence >80%).
**IMPORTANT MUST ATTENTION Goal:** accurate read-only pass/fail verdict with exact counts, failing-test names, report path, and Goal Contract evidence — so the user knows the true test state without any fix applied.
