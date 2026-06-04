---
name: prove-fix
version: 1.0.0
description: '[Code Quality] Use when you need to prove fix correctness with code proof traces, confidence scoring, and stack-trace-style evidence chains.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Block shipping an unproven fix — build a code proof trace (like a debugger stack trace) for each fix change with confidence percentages, so every code change carries a `file:line` evidence chain and confidence score and a fix ships only when its correctness is proven (≥80%), not assumed.

**Workflow:**

1. **Inventory** — List every code change made by the fix (file:line, before/after)
2. **Trace** — For each change, build a proof chain tracing from symptom → root cause → fix
3. **Score** — Assign confidence percentage per change with evidence
4. **Verify** — Cross-check fix against edge cases and side effects
5. **Verdict** — Overall fix confidence and any remaining risks

**Key Rules:**

- Every claim MUST ATTENTION have `file:line` evidence — no exceptions
- Each change gets its OWN proof trace and confidence score
- If ANY change scores below 80%, flag it and recommend additional investigation
- Always run this proof-trace step after `/fix` — **non-negotiable**, never skip it

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Prove Fix

Post-fix verification skill building evidence-based proof chains for every code change. A code debugger's stack trace, but for proving WHY a fix is correct.

---

## When to Use

- **After `/fix`** in bugfix, hotfix, or any fix workflow
- After applying code changes that fix a reported bug
- Verify fix correctness before review/commit

## When NOT to Use

- Before fix applied (use `/debug-investigate` instead)
- New feature verification (use `/test` instead)
- Code quality review (use `/code-review` instead)

---

## Step 1: Change Inventory

List ALL changes made by the fix. For each change, document:

```
CHANGE #N: [short description]
  File: [path/to/file.ext]
  Lines: [start-end]
  Before: [code snippet — the broken version]
  After:  [code snippet — the fixed version]
  Type:   [root-cause-fix | secondary-fix | defensive-fix | cleanup]
```

**Change types:**

- **root-cause-fix** — Directly addresses the root cause of the bug
- **secondary-fix** — Fixes a related issue discovered during investigation
- **defensive-fix** — Prevents the same class of bug from recurring
- **cleanup** — Removed dead code or simplified logic (no behavior change)

---

## Step 2: Proof Trace (per change)

For EACH change, build a **stack-trace-style proof chain** — the core of the skill.

### Proof Trace Format

```
PROOF TRACE — Change #N: [description]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYMPTOM (what the user sees):
  → [Observable behavior, e.g., "UI doesn't refresh after assigning PIC"]

TRIGGER PATH (how the symptom occurs):
  1. [file:line] User action → [method/event]
  2. [file:line] → calls [method]
  3. [file:line] → dispatches [action/event]
  4. [file:line] → handler/effect [name]
  5. [file:line] ← BUG HERE: [exact broken behavior]

ROOT CAUSE (proven):
  → [One sentence: what exactly is wrong and why]
  → Evidence: [file:line] shows [specific code proving the bug]
  → Hypothesis matrix mapping: RC-[N] status [primary/contributing/latent] from [report path/section]
  → Feeder paths closed: [path names or "single path verified"]; unresolved paths: [none/list]

FIX MECHANISM (how the change fixes it):
  → [One sentence: what the fix does differently]
  → Before: [broken code path with file:line]
  → After:  [fixed code path with file:line]
  → Owning fix layer: [layer/component] — why this is the lowest shared owner

WHY THIS FIX IS CORRECT:
  → [Reasoning backed by code evidence]
  → Pattern precedent: [file:line] shows same pattern working elsewhere
  → Framework behavior: [file:line or doc reference] confirms expected behavior
  → Forward convergence: [origin/trigger] -> [corrected transformations] -> [observed final output no longer stale/wrong]

EDGE CASES CHECKED:
  → [edge case 1]: [verified/not-verified] — [evidence]
  → [edge case 2]: [verified/not-verified] — [evidence]

SIDE EFFECTS:
  → [None / List of potential side effects with evidence]

CONFIDENCE: [X%]
  Verified: [list of verified items]
  Not verified: [list of unverified items, if any]
```

### Proof Trace Rules

1. **Every arrow (→) MUST ATTENTION have a `file:line` reference** — no exceptions
2. **TRIGGER PATH must be traceable** — someone should be able to follow it step-by-step in the code
3. **Hypothesis matrix mapping is REQUIRED for bugfixes** — every fix part maps to a primary/contributing/latent root cause or is flagged as unrelated scope
4. **Feeder paths must be accounted for** — prove the fix closes every path that can write the final observed state, or explicitly list remaining unverified paths
5. **Pattern precedent is REQUIRED** — find at least 1 working example of the same pattern elsewhere in the codebase
6. **Edge cases MUST ATTENTION be enumerated** — at minimum: error path, null/empty input, concurrent access
7. **Side effects MUST ATTENTION be assessed** — what else could this change affect?

---

## Step 3: Confidence Scoring

Each change gets an individual confidence score:

| Score       | Meaning                                                                     | Action Required                                    |
| ----------- | --------------------------------------------------------------------------- | -------------------------------------------------- |
| **95-100%** | Full proof trace complete, all edge cases verified, pattern precedent found | Ship it                                            |
| **80-94%**  | Main proof trace complete, some edge cases unverified                       | Ship with caveats noted                            |
| **60-79%**  | Proof trace partial, some links unverified                                  | Flag to user — recommend additional investigation  |
| **<60%**    | Insufficient evidence                                                       | **BLOCK** — do not proceed until evidence gathered |

### Scoring Criteria

Award points for each verified item:

| Criterion                                 | Points  | Evidence Required             |
| ----------------------------------------- | ------- | ----------------------------- |
| Root cause identified with file:line      | +25     | Code reference                |
| Fix mechanism explained with before/after | +20     | Code diff                     |
| Pattern precedent found in codebase       | +15     | Working example at file:line  |
| Framework behavior confirmed              | +10     | Framework source or docs      |
| Edge cases checked (per case)             | +5 each | Verification result           |
| Side effects assessed                     | +10     | Impact analysis               |
| No regressions identified                 | +5      | Test results or code analysis |

**Total possible: 100+** (normalize to percentage)

---

## Step 4: Cross-Verification

After individual proof traces, perform cross-change verification:

1. **Interaction check** — Do the changes interact with each other? Could one change break another?
2. **Completeness check** — Does the combined fix address ALL reported symptoms?
3. **Regression check** — Could the combined changes introduce new bugs?
4. **Dependency check** — Are there other code paths that depend on the changed behavior?
5. **Performance regression check** — Does the fix introduce performance issues?

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST ATTENTION use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST ATTENTION have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

---

## Step 5: Final Verdict

Produce a summary verdict:

```
FIX VERIFICATION VERDICT
━━━━━━━━━━━━━━━━━━━━━━━

Overall Confidence: [X%]

Changes Summary:
  #1: [description] — [X%] ✅/⚠️/❌
  #2: [description] — [X%] ✅/⚠️/❌
  #N: [description] — [X%] ✅/⚠️/❌

Symbols: ✅ ≥80% (ship) | ⚠️ 60-79% (flag) | ❌ <60% (block)

Remaining Risks:
  - [risk 1]: [likelihood] × [impact] — [mitigation]
  - [risk 2]: [likelihood] × [impact] — [mitigation]

Verification Method:
  - [Manual testing required? Which scenarios?]
  - [Automated tests cover this? Which tests?]
  - [Additional monitoring needed post-deploy?]

Recommendation: [SHIP / SHIP WITH CAVEATS / INVESTIGATE FURTHER / BLOCK]
```

**Goal Satisfaction update (MANDATORY after verdict):** resolve the active Goal Contract per `SYNC:goal-contract-satisfaction-loop` and map each proof trace to the saved success criterion it satisfies. Append proof evidence and remaining gaps to the goal file's Iteration Log and update its Goal Satisfaction matrix (PASS/FAIL/BLOCKED per criterion). A SHIP recommendation does NOT close the work while any required goal criterion remains FAIL — route the validated gap into another bounded fix loop or escalate a blocker.

---

## Example: Proof Trace for NgRx Effect Fix

```
PROOF TRACE — Change #1: Move catchError inside switchMap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYMPTOM:
  → UI doesn't refresh after assigning PIC, Job Opening, or changing stage

TRIGGER PATH:
  1. candidate-quick-card-v2.component.ts:445 — User clicks "Assign PIC"
  2. candidate-card.container.component.ts:892 — onPersonInChargeChange($event)
  3. candidate-card.effect.ts:275 — SavePersonInCharge effect
  4. candidate-card.effect.ts:284 — dispatches LoadCandidateDetailsAction
  5. candidate-card.effect.ts:48 ← EFFECT IS DEAD — never processes the action

ROOT CAUSE:
  → catchError at outer pipe level (effect.ts:64) causes effect completion on ANY error
  → Evidence: effect.ts:43-69 shows catchError OUTSIDE switchMap
  → Evidence: ngrx-effects.js:156-165 confirms defaultEffectsErrorHandler
     only catches errors, not completions

FIX MECHANISM:
  → Move catchError INSIDE switchMap so errors are caught per-request
  → Before: effect.ts:64 — catchError at outer pipe → effect COMPLETES → DEAD
  → After:  effect.ts:52 — catchError inside switchMap → inner obs completes → outer SURVIVES

WHY THIS FIX IS CORRECT:
  → RxJS: catchError inside switchMap catches per-emission, outer stream continues
  → Pattern precedent: effect.ts:120 (moveApplicationToNextState) uses same inner pattern
  → Framework: NgRx effects auto-resubscribe on ERROR but NOT on COMPLETION

EDGE CASES:
  → 403 Forbidden: verified — returns SetCandidateDetails with isAllowDisplayed=false
  → Network timeout: verified — returns EMPTY, effect survives
  → Multiple rapid requests: verified — switchMap cancels previous (unchanged)

SIDE EFFECTS:
  → None — same error handling logic, only scope changed

CONFIDENCE: 95%
  Verified: root cause, fix mechanism, pattern precedent, framework source, all edge cases
  Not verified: behavior under specific proxy/auth middleware errors (very unlikely)
```

---

> Run `python .claude/scripts/code_graph trace <file> --direction downstream --json` to prove fix doesn't break downstream.

## Graph Intelligence (RECOMMENDED if graph.db exists)

If `.code-graph/graph.db` exists, enhance analysis with structural queries:

- **Verify test coverage:** `python .claude/scripts/code_graph query tests_for <function> --json`
- **Trace affected code paths:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`

### Graph-Trace for Fix Verification

When graph DB is available, use `trace` to PROVE the fix doesn't break downstream consumers:

- `python .claude/scripts/code_graph trace <fixed-file> --direction downstream --json` — verify all downstream consumers, event handlers, and bus message listeners are unaffected
- `python .claude/scripts/code_graph trace <fixed-file> --direction both --json` — full context: what triggered the bug (upstream) + what the fix affects (downstream)
- Include trace results as evidence in the proof chain

## Integration with Other Skills

This skill is the **mandatory verification gate** between `/fix` and `/code-simplifier` in fix workflows.

**Workflow position:**

```
... → /fix → /prove-fix → /code-simplifier → /review-changes → ...
```

**If proof trace reveals issues:**

- Score ≥80%: proceed to next step
- Score 60-79%: ask user whether to proceed or investigate further
- Score <60%: BLOCK — return to `/debug-investigate` or `/fix` step

---

<prove-context>$ARGUMENTS</prove-context>

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `workflow-bugfix` workflow** (Recommended) — scout → investigate → debug → plan → fix → prove-fix → review → test
> 2. **Execute `/prove-fix` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/code-simplifier (Recommended)"** — Clean up fix implementation
- **"/integration-test"** — Generate/update regression integration tests
- **"/workflow-review-changes"** — Review all changes before commit
- **"Skip, continue manually"** — user decides

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (read directly when relevant; do not rely on hook-injected conversation text)

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

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

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:fix-layer-accountability -->

> **Fix-Layer Accountability** — NEVER fix at the crash site. Trace the full flow, fix at the owning layer.
>
> AI default behavior: see error at Place A → fix Place A. This is WRONG. The crash site is a SYMPTOM, not the cause.
>
> **MANDATORY before ANY fix:**
>
> 1. **Trace full data flow** — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where the bad state ENTERS, not where it CRASHES.
> 2. **Identify the invariant owner** — Which layer's contract guarantees this value is valid? That layer is responsible. Fix at the LOWEST layer that owns the invariant — not the highest layer that consumes it.
> 3. **One fix, maximum protection** — Ask: "If I fix here, does it protect ALL downstream consumers with ONE change?" If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
> 4. **Verify no bypass paths** — Confirm all data flows through the fix point. Check for: direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
>
> **BLOCKED until:** `- [ ]` Full data flow traced (origin → crash) `- [ ]` Invariant owner identified with `file:line` evidence `- [ ]` All access sites audited (grep count) `- [ ]` Fix layer justified (lowest layer that protects most consumers)
>
> **Anti-patterns (REJECT these):**
>
> - "Fix it where it crashes" — Crash site ≠ cause site. Trace upstream.
> - "Add defensive checks at every consumer" — Scattered defense = wrong layer. One authoritative fix > many scattered guards.
> - "Both fix is safer" — Pick ONE authoritative layer. Redundant checks across layers send mixed signals about who owns the invariant.

<!-- /SYNC:fix-layer-accountability -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:fix-layer-accountability:reminder -->

**IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** block shipping an unproven fix — every code change carries a `file:line` evidence chain and confidence score, so a fix ships only when its correctness is proven (≥80%), not assumed.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
