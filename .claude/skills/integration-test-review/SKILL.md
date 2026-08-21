---
name: integration-test-review
version: 1.3.1
description: '[Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Ensure the review target (changed production code) is covered by tests that protect real business behavior with correct data assertions, infinite repeatability, and spec alignment — verifying every behavior change has test coverage (integration-first, unit fallback) so that specs ↔ tests ↔ code stay aligned (spec-driven development).

**Summary:**

- **Purpose:** Review target is the CHANGE (collect BOTH changed production code AND changed test files), never just the test files — Gates 1-6 and 8 judge test quality, Gate 7 maps every behavior-changing production file to a covering test (integration-first; unit only with recorded justification) + spec TC. Uncovered changed behavior = HIGH finding minimum.
- **The 8 Gates (main review steps):** G1 Assertion Value — mutation-score, record the Mutation Probe Ledger (no ledger = FAIL); G2 Data State — assert specific DB fields with async polling; G3 Repeatability — unique IDs, additive-only, 2 consecutive green runs; G4 Domain Logic — read handler, assert ONLY fields it writes; G5 Spec Traceability — `TestSpec` annotation → TC in spec docs (1 TC → many tests is correct); G6 Three-Way Sync — feature-docs > test-spec docs > code > test, escalate conflicts; G7 Change Coverage — every behavior-changing file → covering test + non-stale §8 TC; G8 Scenario Fidelity — the setup's sequence, pacing, and data must be reachable in production; settle barriers in ARRANGE, never widened assertion timeouts.
- **The phase pipeline (run ALL, `TaskCreate` each):** P0 Scope-detect → P1 Collect (split prod vs test files) → P2 Gate Review (Gates 1-6 + 8 per file, Gate 7 across set) → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix ALL Crit/High + WRITE missing tests → P6 Validated-fix + full fresh re-review until 0 Crit/0 High → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.
- **Read handler/service source (and feature docs) BEFORE judging any assertion.** FAIL smoke-only, existence-only (not-null), dead (always-true), copy-paste, and DI-resolution-only tests — why: assertion quality is unknowable without knowing what the handler actually writes.
- **Don't just report gaps — fix them.** Gate 6: NEVER fix a test to match broken code, NEVER self-resolve a three-way conflict (escalate via `AskUserQuestion`). Phase 5 WRITES the missing test (runs `/spec [mode=tests]` for SPEC-GAPs); a full fresh re-review runs after every validated fix cycle until a clean pass returns 0 CRITICAL/0 HIGH.
- **MANDATORY feature-area-wide TC audit (Phase 1 task + Phase 3 addendum):** Gate 7 alone is diff-scoped — it can't see a pre-existing §8 TC that lost its covering test outside the diff. Every review non-skippably enumerates the FULL Section-8 TC list of the implicated feature doc(s), not only diff-touched TCs, into the SAME Coverage Mapping Table; zero GAP rows required, whole table, before PASS.

**Scope:** The FULL change set — changed production code AND changed test files — from uncommitted changes (default), user-specified files, or a user-specified diff (branch/PR). The review target is never "just the test files".

**Workflow:** Phase 0 Detect → Collect → Coverage Map (Gate 7) → 8-Gate Review → Spec Cross-Check → Report → validate findings → fix validated issues (including writing missing tests) → full re-review after fixes → Build & verify → If fail: investigate + fix plan

**Non-negotiable rules:**

- MUST collect BOTH changed production code AND changed test files — coverage of the change is part of the review, not an optional extra
- MUST verify every behavior-changing production change maps to a covering test — integration test FIRST; unit test ONLY with recorded justification (Gate 7)
- MUST treat an uncovered changed behavior as a HIGH finding minimum — fix by writing the missing test in Phase 5, not just reporting
- MUST verify spec↔test↔code alignment for changed code, not only for existing tests — a changed behavior with no TC in spec docs is a spec gap finding
- MUST read handler/service source BEFORE judging any test assertions
- MUST flag smoke-only tests (no-exception-only checks) as FAIL
- MUST flag DI-resolution-only tests (resolve + not-null) as FAIL — NOT integration tests
- MUST verify tests use unique IDs per run (infinitely repeatable)
- MUST use async polling/retry for ALL DB assertions — async delays are norm
- MUST flag repository-created or repository-mutated test data that bypasses real use cases and can leave invalid state
- MUST treat an unrealistic setup as a review finding (Gate 8) — compressed pacing between actor steps, a fixed sleep standing in for a real observable, a widened assertion timeout replacing an ARRANGE barrier, or a retry wrapped around a failing assertion
- MUST require 2 consecutive successful suite/project runs before declaring integration tests verified/idempotent
- NEVER accept assertions that always pass regardless of handler correctness
- **NO smoke/fake/useless tests** — every test MUST execute actual operations and verify data state

- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing)

---

## First Principle — Easy to Change

> **The success metric of every coding decision is _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every
> technique exists to serve one goal: **making the next change cheaper**.

When evaluating code, refactor, test, or abstraction, ask:
**does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction,
  speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated
  knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist
below — if downstream rule would raise change cost, this principle wins.

---

## Phase 0: Scope Detection

Classify BEFORE any gate review. Route wrong → waste all effort.

| Signal                                       | Classification      | Action                                                                                                         |
| -------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| No user-specified files                      | Uncommitted changes | Run `git diff --name-only` (staged + unstaged) to collect scope — BOTH production code AND test files          |
| User specifies files/diff (branch, PR, etc.) | Explicit scope      | Use provided list/diff directly — still split into production vs test files                                    |
| 10+ test files                               | Large scope         | Parallel sub-agents grouped by module                                                                          |
| 1-9 test files                               | Normal scope        | Single review pass                                                                                             |
| 0 test files BUT production code changed     | Coverage-gap review | Gate 7 IS the review — map every changed behavior to existing tests; uncovered behavior = finding. Do NOT exit |
| 0 changes at all                             | Empty target        | Ask user for explicit scope via `AskUserQuestion`                                                              |

**The review target is the CHANGE, not the test files.** Changed test files are reviewed for quality (Gates 1-6 and 8); changed production files are checked for coverage and spec alignment (Gate 7). Both halves are mandatory.

**Search for test reference docs** — NEVER hardcode paths. Grep for `integration-test-reference`, `test-patterns`, `integration-test-guide` near changed test files to discover project-specific conventions before starting gate review.

---

## The 8 Quality Gates

> Gates 1-6 and Gate 8 apply per changed/target TEST file. Gate 7 applies to the CHANGE SET — every behavior-changing production file must map to a covering test and a spec TC.

### Gate 1: Assertion Value — "Would this catch the bug?" (MUTATION-SCORE gate)

> **Think:** If a single line of the handler's core logic were changed (a `>` flipped to `>=`, a field assignment removed, a boolean negated), would at least one assertion FAIL? If NONE → FAIL. This is the mutation-testing question, made automatic.

**#1 AI failure:** hallucination assertions — look real, verify nothing.

**Operationalized — run the project's mutation tool (PRIMARY).** "Would this catch the bug?" is exactly the mutation-score question. Mechanize it instead of eyeballing it:

1. **Discover the configured mutation tool** from `docs/project-config.json`, dependency manifests, and CI config. Common per stack: **Stryker** (JS/TS, .NET — StrykerNet), **PITest** (Java/JVM), **mutmut** or **cosmic-ray** (Python). Cite the local config or command if one exists.
2. **Run it scoped to the CHANGED handler/service** (mutate only the production files in the review target — never the whole repo) against the covering tests from Gate 7.
3. **Read the surviving-mutant report.** Each **surviving mutant = a missing invariant = an assertion gap** → a **HIGH finding minimum** (CRITICAL when the mutated line touches authorization, money, or data integrity).
4. **Fix in Phase 5 by WRITING the killing test** — the assertion or property that fails on that mutant. Re-run until the changed code's mutants are killed (or each survivor has a recorded justification, e.g. equivalent mutant). Raising the line-coverage number is NOT a fix — coverage that executes a line without asserting its effect leaves the mutant alive.

**Manual fallback (when NO mutation tool is configured or addable).** Apply the single-mutation thought experiment by hand: read the handler source, then for each core-logic line ask "if I deleted or inverted this, which assertion fails?" If the answer is NONE for any business-critical line → FAIL. Prefer recommending the stack-appropriate mutation tool as a harness add so the gate becomes automatic next time.

**PASS:** Every changed core-logic line is killed by ≥1 assertion — no surviving mutant on the changed code (mutation tool), or the manual single-mutation check finds a failing assertion for each (fallback) — **AND the Mutation Probe Ledger (below) is recorded in the report** with a KILLED/SURVIVOR verdict per changed core-logic line. No ledger → no PASS, regardless of how clean the eyeball check felt.

**FAIL:**

- A surviving mutant on a changed core-logic line with no killing test (or no recorded equivalent-mutant justification)
- No-exception as ONLY assertion
- Not-null without content check
- Assertions on fields handler doesn't modify
- Dead assertions: `x >= 0` where x always >= 0, `count >= 0`, string not-empty on required fields

**Verify:** Run the mutation tool on the changed handler → list surviving mutants → each survivor is a missing assertion to write. When no tool is available: read handler source → list fields/branches it changes → check at least one assertion would fail if each were mutated.

**Recorded artifact — Mutation Probe Ledger (REQUIRED, non-skippable, BOTH paths).** "I checked it mentally" is not evidence. Gate 1 cannot be marked PASS without this ledger written into the review report — it is the proof the probe ran, identical in obligation whether a tool ran or the manual fallback did:

| Changed core-logic line (`file:line`, abstract) | Mutation applied (`>`→`>=`, assignment dropped, boolean negated, branch removed) | Killing assertion / test (`TC-…` + `file:line`) | Verdict                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| {the line}                                      | {the mutant}                                                                     | {the assertion that fails on it}                | KILLED                                                               |
| {the line}                                      | {the mutant}                                                                     | — none —                                        | **SURVIVOR → finding** (or recorded equivalent-mutant justification) |

Rules: (1) every changed core-logic line gets a row — no sampling, no "representative subset". (2) Tool path: rows come from the surviving-mutant report; manual fallback: rows come from the line-by-line thought experiment — same table, same columns. (3) A `SURVIVOR` row with no killing assertion is a HIGH finding minimum (CRITICAL on auth/money/data-integrity lines) UNLESS it carries a written equivalent-mutant justification. (4) An empty or absent ledger = Gate 1 **FAIL** (not "skipped") — the gate is unproven, so it cannot pass.

### Gate 2: Data State — "Does it check the database?"

> **Think:** Does this test prove the database changed, or just that no exception occurred?

**PASS:** After command, test queries DB and asserts specific entity field values.

**FAIL:**

- Only checks return value, never verifies DB state
- Checks existence (not-null) without field values
- Missing async polling on side-effect assertions

**Exception:** Smoke-only ONLY when side effect truly unobservable. MUST include explicit justification comment.

**ALWAYS use async polling/retry for data assertions.** Event handlers, bus consumers, background jobs run async — data may not be immediately available.

### Gate 3: Repeatability — "Can I run this 100 times?"

> **Think:** If this test runs N times in a shared database, does it get noisier each run? Would run #2 fail?

**FAIL:** Hardcoded IDs, hardcoded business keys without unique suffix, teardown/cleanup, ordering dependency, seeders without existence check, or direct repository setup that creates state users could not create through real use cases.

**FAIL (not parallel-safe — see `SYNC:test-data-isolation`):** Assertions hung off a shared mutable entity another test can change, OR off a parent a bulk re-sync/recompute/rebuild/cascade consumer can wipe — even when THIS test never mutates it. Each test MUST own fresh per-test data; only immutable lookup data may be shared. Verify by grepping every other test on that shared data AND every cross-cutting consumer over it.

**Verify:** Repeatability is only proven when the relevant suite/project passes 2 consecutive runs without resetting data. One green run is not enough.

### Gate 4: Domain Logic — "Does test match handler?"

> **Think:** Did I read the handler source? Do I know which exact fields it writes? Do assertions check those fields — and ONLY those fields?

**PASS:** Assertions match what handler ACTUALLY does (verified by reading source). Covers primary business rule. Validation paths tested.

**FAIL:** Assertions on untouched fields (copy-paste), missing primary side-effect assertion, event handler tests that never trigger the event.

**Verify:** Grep handler class → read it → list what it does → compare with assertions.

**Also check:**

- Authorization: test verifies both authorized AND unauthorized access paths?
- Coverage: happy path + validation failure + DB state check (3 tests minimum)

### Gate 5: Spec Traceability — "Is this tracked?"

> **Think:** Can I trace TC-XXX-NNN from test annotation → spec docs → feature docs in one unbroken chain?

**PASS:** Business test has a `TestSpec` annotation linking to a TC ID that exists in spec docs. Technical-only test has a `TechnicalSpec` annotation and does not claim §8 business coverage. The test method name need **NOT** match the TC, and **many test methods may legitimately carry the same TC** (one business TC → many tests across components/services — the join key is the test-spec annotation, not the method name; see `tc-format.md` → TC ↔ Test Code Cardinality).

**FAIL (WARN, not BLOCK):** Missing annotation, orphaned TC ID (business `TestSpec` points to a TC absent from spec docs), technical-only test still carrying a business `TestSpec`, or spec says "Planned" but test exists. **NOT a finding:** several tests sharing one TC, a method name that differs from the TC, or a technical-only test carrying `TechnicalSpec` instead of `TestSpec`.

### Gate 6: Three-Way Sync — "Do test, code, and docs agree?"

> **Think:** Have I read ALL 3 sources? Where exactly do they disagree? Does evidence support a verdict, or must I escalate?

Hardest gate. Identify discrepancy, classify using source-of-truth hierarchy — NEVER silently pick winner. Always state the resolved source with `file:line` evidence — why: a winner picked without evidence hides bugs.

#### Source of Truth Hierarchy (highest → lowest)

| Priority    | Source                                       | Why                                                                |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------ |
| 1 (Highest) | Feature docs (`docs/specs/…/Section 8 TCs`)  | Business intent — defines WHAT must happen                         |
| 2           | Test-spec docs (`docs/specs/`)               | TC scenarios derived from feature docs — defines HOW to verify     |
| 3           | Implementation code (handler/entity/service) | What WAS built — may reflect intentional evolution not yet in docs |
| 4 (Lowest)  | Integration test code                        | What IS being tested — most likely to be wrong or stale            |

**Rule:** Docs win over code. Code wins over tests. Feature docs win over test-spec docs.

#### Conflict Classification

| Pattern                       | Feature Doc | Impl Code | Test Code | Verdict               | Action                                        |
| ----------------------------- | ----------- | --------- | --------- | --------------------- | --------------------------------------------- |
| All agree                     | ✓           | ✓         | ✓         | PASS                  | None                                          |
| Stale docs                    | —           | ✓         | ✓         | Docs lag code         | Flag docs for `/docs-update`; test is correct |
| Wrong test                    | ✓           | ✓         | ✗         | Test wrong            | Fix test assertions to match code + docs      |
| Code bug                      | ✓           | ✗         | ✓         | Code has bug          | Report as BUG — do NOT fix test to match code |
| Test + code diverge from docs | ✓           | ✗         | ✗         | Code bug + wrong test | Fix test to match docs; report code bug       |
| Three-way conflict            | ✗           | ✗         | ✗         | ESCALATE              | Cannot self-resolve — `AskUserQuestion`       |

**CRITICAL rules:**

- NEVER fix a test to match broken code — that hides bugs
- NEVER assume docs are wrong without evidence they were intentionally superseded
- NEVER self-resolve a three-way conflict — always escalate via `AskUserQuestion`
- "Stale docs" verdict requires BOTH code AND test to agree — one source never enough
- When escalating, include: TC ID, what each source says, evidence found

#### Verify Each Source

1. **Feature doc:** Read Section 8 — scenario title, preconditions, steps, expected results
2. **Test-spec doc:** Find same TC — Planned/Implemented status and described scenario
3. **Implementation code:** Read handler/entity/service — fields written, events fired, validation rules
4. **Test code:** Read test method — arrange, execute, assert

Compare each pair with `file:line` evidence for each source.

**PASS:** All three agree. **WARN:** Minor wording, same semantic. **FAIL:** Semantic disagreement on field/rule/outcome. **ESCALATE:** All three differ and evidence cannot resolve.

### Gate 7: Change Coverage — "Is every changed behavior tested AND specced?"

> **Think:** For each behavior-changing production file in the review target, which test would FAIL if this change were broken? If NONE → coverage gap. Which spec TC describes this behavior? If NONE → spec gap.

This gate makes the skill verify the REVIEW TARGET has coverage — not merely review tests that happen to exist.

> **Scope note:** protocol below diff-scoped (changed production files → TC). Does NOT by itself prove 100% feature-area coverage — a pre-existing TC that lost its covering test, or was never covered, sits outside this diff and passes silently. **Phase 3 addendum — Feature-Area-Wide TC Audit** (below) closes that gap: audits every Section-8 TC in implicated feature doc(s), not only ones this diff touches; both feed the SAME Coverage Mapping Table, SAME zero-GAP exit bar.

**Protocol:**

1. **Collect changed production files** from the review target (Phase 0 scope): commands, queries, handlers, entities, services, event handlers, consumers, controllers, frontend services/stores with business logic.
2. **Filter to behavior-changing files.** Exclude: migrations (one-time execution paths), generated code, pure renames/formatting, config-only, DI registration-only changes. Record each exclusion with reason.
3. **Find covering tests** per changed behavior — use graph (`query tests_for <fn>`, `trace <file> --direction both`) plus grep for the handler/class name under test directories. A test COVERS a change only if it exercises the changed path and asserts the changed outcome — read the test; name match alone is NOT coverage.
4. **Apply test-type priority:** integration test FIRST (subcutaneous CQRS through real DI, data-state assertions). Unit test is an acceptable fallback ONLY when integration coverage is infeasible (pure function/calculation logic, no observable data state, no DI path) — record the justification per fallback.
5. **Check spec alignment for the change — existence AND correctness.** Each changed behavior must map to a TC in spec docs (feature doc Section 8 / test-spec docs). Finding a TC is NOT enough: READ the mapped TC and confirm it describes the CURRENT behavior. New behavior with no TC, or a TC that exists but still describes the OLD/superseded behavior → spec gap (spec-driven development violation). A behavior is only fully covered when a covering test exercises it AND a non-stale §8 TC documents it — so this correctness re-check applies to COVERED rows too, never just to GAP rows.

**Coverage Mapping Table (MANDATORY output):**

> Rows are keyed by **changed production behavior**, not by TC. A behavior is COVERED when **≥1** covering test exercises it — list ALL covering tests in the column when several apply. One `Spec TC` may legitimately appear across multiple rows and be covered by many tests (one TC → many tests, 1:N). Do NOT expect or require one test per TC, and do NOT flag a TC reused across rows as a duplicate (see `tc-format.md` → TC ↔ Test Code Cardinality).

| Changed File / Behavior | Spec TC            | Covering Test(s)                          | Test Type                          | Verdict                                 |
| ----------------------- | ------------------ | ----------------------------------------- | ---------------------------------- | --------------------------------------- |
| {file:line — behavior}  | TC-X-NNN / MISSING | {test file:method}[, …one or more] / NONE | integration / unit (justified) / — | COVERED / COVERED-UNIT / GAP / SPEC-GAP |

**Verdicts:**

- **COVERED** — integration test exercises the changed path with data-state assertions AND the mapped §8 TC describes the CURRENT behavior. A covering test whose mapped TC is stale is NOT COVERED — record it as SPEC-GAP.
- **COVERED-UNIT** — unit test covers it, integration infeasible, justification recorded, and the mapped §8 TC is current (same stale-TC rule applies).
- **GAP (FAIL)** — no test would fail if the change broke. Severity: HIGH minimum; CRITICAL when the change touches authorization, money, or data integrity. Fix in Phase 5 by WRITING the missing test (integration-first) — reporting alone does not clear this gate
- **SPEC-GAP (FAIL)** — behavior has no TC, OR a covering test exists but its mapped TC still describes OLD/superseded behavior (stale TC ≠ covered). Both the missing-TC and the stale-but-covered case are SPEC-GAP. Fix via `/spec [mode=tests]` UPDATE (and `/spec` when business rules changed)

**FAIL:**

- Changed handler/command/entity rule with zero covering test
- Unit test substituted where an integration test is feasible, with no justification
- Test exists but does not assert the changed outcome (stale coverage counted as coverage)
- New/changed behavior absent from spec docs, or TC describing superseded behavior
- A COVERED row marked COVERED without reading its mapped §8 TC — TC existence assumed instead of its CURRENT-behavior correctness verified (a stale-but-covered TC silently passes as covered)

**Explicit user waiver** (recorded verbatim in the report with the user's reason) is the ONLY alternative to closing a GAP.

### Gate 8: Scenario Fidelity — "Could production ever reach this setup?"

> **Think:** Read the ARRANGE block as a production trace. Could this exact sequence, timing, and data actually occur in the running system? If no, the test is mis-specified — the finding lands on the SCENARIO, never on the assertion.

An unrealistic setup proves nothing when it passes and burns hours when it fails. Judge fidelity BEFORE judging assertion strength — a strong assertion over an impossible scenario is still a defective test. Applies per changed/target TEST file, alongside Gates 1-6.

**Finding triggers — mechanically checkable; each fires as a finding with severity + `file:line` evidence:**

| Trigger (what to look for in the test)                                                                                                                                          | Severity                                                                                | Fix direction                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Chained actor actions with no settle barrier** — two or more distinct actor actions issued back-to-back that production separates by seconds, minutes, or hours               | HIGH (CRITICAL when an in-flight async message can land between them and clobber state) | Add an ARRANGE barrier that polls a real observable proving the prior action finished                                                |
| **Fixed sleep standing in for a real observable** — a hardcoded delay where a persisted state change, version/audit stamp, queue/worker idle marker, or completion event exists | MEDIUM (HIGH when the delay is what keeps a race from firing)                           | Replace with poll-until-settled on that observable; a fixed delay is acceptable ONLY when no observable exists AND a comment says so |
| **Widened assertion timeout instead of an added precondition** — the ASSERT-side wait grew, or a retry/poll wrapper appeared there, rather than an ARRANGE barrier being added  | HIGH                                                                                    | Move the wait into ARRANGE and restore the original assertion window                                                                 |
| **Unreachable setup state with no explanation** — ARRANGE constructs a state and nothing records how production could reach it                                                  | MEDIUM (HIGH when the asserted outcome depends on that state)                           | Reach the state through real use-case paths, or label it a deliberate impossible-state test with the reason it is reachable          |
| **Retry wrapped around a failing assertion** — a retry/loop added around the ACT+ASSERT pair after a red run                                                                    | CRITICAL                                                                                | Revert the retry; adjudicate the intermittency (`/integration-test-verify`) before any change                                        |
| **Fidelity improvement that weakened the protected invariant** — the scenario became realistic and the assertion became looser in the same change                               | HIGH                                                                                    | Keep the assertion; find a DIFFERENT realistic scenario that still exercises the rule                                                |

**PASS:** Every actor step in ARRANGE could occur in production in that order and at that pacing; every wait is an ARRANGE-phase barrier on a real observable (or a commented fixed delay where no observable exists); any deliberately impossible state carries a comment naming WHY production could reach it (upstream bug, partial write, legacy data).

**FAIL:** Any trigger row fires with no recorded justification.

**Verify:** Read the test end-to-end as a production trace — per actor step ask "what separates this from the previous step in real life, and what does the test wait on?" Then grep the test file (and, when reviewing a change, its diff) for sleep/delay calls, retry/poll wrappers, and enlarged timeout arguments; every hit is a candidate row above. A trigger that fires in the DIFF (a wait that grew, a retry that appeared) outranks one that merely pre-existed — it is evidence of masking in progress.

---

## Review Protocol (9 Phases)

Use `TaskCreate` for EACH phase before starting.

**Phase 1 — Collect:** Split the change set: production files (Gate 7 coverage targets) vs test files. Categorize test files: new (full review), modified (changed methods only), new projects (infra + samples). Categorize production files: behavior-changing vs excluded (with reason).

> **MANDATORY task — "Validate: 100% Section-8 TC coverage for {feature doc(s)} — not just diff-touched TCs."** Create as OWN named `TaskCreate` item in Phase 1 breakdown. Non-skippable whenever this review runs inside a workflow, current git changes are present (staged/unstaged), or by direct user request — every invocation of this skill except a scope explicitly narrowed by the user to a single named TC/test. Identify feature doc(s) implicated by the change set (or named by the user) up front — their full Section 8 TC list is the audit scope for Phase 3's addendum below, independent of which TCs the diff touches.

**Phase 2 — Gate Review:** Per test file, apply Gates 1-6 and Gate 8. Apply Gate 7 once across the change set and produce the Coverage Mapping Table. Record per-file verdict table:

| Gate                                | Verdict                           | Evidence                 |
| ----------------------------------- | --------------------------------- | ------------------------ |
| 1. Assertion Value                  | PASS/FAIL                         | {file:line}              |
| 2. Data State                       | PASS/FAIL                         | {file:line}              |
| 3. Repeatability                    | PASS/FAIL                         | {file:line}              |
| 4. Domain Logic                     | PASS/FAIL                         | {file:line}              |
| 5. Traceability                     | PASS/WARN                         | {file:line}              |
| 6. Three-Way Sync                   | PASS/WARN/FAIL/ESCALATE           | {file:line}              |
| 7. Change Coverage (per change set) | COVERED/COVERED-UNIT/GAP/SPEC-GAP | {coverage mapping table} |
| 8. Scenario Fidelity                | PASS/FAIL                         | {file:line}              |

**Phase 3 — Spec Cross-Check + Three-Way Diff:** Two directions — from tests AND from changed code.

For each TC ID in code:

1. Verify TC entry exists in both `docs/specs/` (Section 8) and `docs/specs/`
2. Read what TC describes in each doc
3. Read what implementation code actually does
4. Read what test asserts
5. Classify conflict pattern (Gate 6 table) and record action
6. Flag gaps both directions: TC in code but not in docs, or "Implemented" TC in docs but no test found

For each behavior-changing production file in the review target (reverse direction — spec-driven development check):

7. Verify a TC exists describing the changed behavior AND read it to confirm it describes the CURRENT behavior — run this even when a covering test was already found and the row is otherwise COVERED. If the TC still describes the OLD behavior, downgrade the row from COVERED to SPEC-GAP and flag it stale (route to `/spec [mode=tests]` UPDATE). Finding a covering test never excuses re-checking the TC's correctness.
8. New behavior with no TC anywhere → SPEC-GAP finding (Gate 7); recommend `/spec [mode=tests]` (and `/spec` when business rules changed)

**Phase 3 addendum — Feature-Area-Wide TC Audit (MANDATORY, satisfies Phase 1 "100% Section-8 TC coverage" task).** Steps 1-8 above diff-scoped: map changed production files → TC. This addendum TC-scoped instead, covers TCs the diff never touched:

9. Enumerate **every** `TC-{FEATURE}-{NNN}` in Section 8 of **all** feature doc(s) implicated by the change set (or named by the user) — FULL list, not the subset steps 1-8 already visited.
10. For each TC not already resolved by steps 1-8, find covering test(s) the same way Gate 7 does (graph query / grep the handler or class the TC describes; read test — name match alone NOT coverage) and read TC to confirm it still describes CURRENT behavior.
11. Classify each using SAME verdicts and Coverage Mapping Table format as Gate 7 (`COVERED` / `COVERED-UNIT` / `GAP` / `SPEC-GAP`) — append rows to the SAME Coverage Mapping Table Gate 7 produces, so review emits one unified table covering both diff-touched and pre-existing TCs.
12. A `GAP` surfaced here (pre-existing TC, zero covering test — coverage regressed or never written) carries the SAME Phase 5 "WRITE the missing test" obligation as a diff-touched Gate 7 GAP — not a lesser finding merely because the diff didn't touch it. Severity: HIGH minimum per Gate 7's rule.
13. Zero `GAP` rows across the WHOLE unified table (diff-touched + feature-area-wide) required before review can report PASS on Gate 7 / the Phase 1 mandatory task.

**Phase 4 — Initial Report:** Write to `plans/reports/integration-test-review-{date}-{slug}.md`

**Phase 5 — Fix All Issues (MANDATORY — fix ONLY findings already validated per the embedded `double-round-trip-review` validate-before-fix contract):** Fix every CRITICAL and HIGH issue. MEDIUM: fix if straightforward, document as tech debt otherwise.

1. Prioritize: CRITICAL → HIGH → MEDIUM
2. Per fix: read handler source, understand domain logic, write/fix assertion
3. **Gate 7 GAP fixes:** WRITE the missing test — integration test first (route through `/integration-test` patterns); unit test only with recorded justification. SPEC-GAP fixes: run `/spec [mode=tests]` UPDATE to add/correct the TC before or alongside writing the test
4. **Gate 8 fidelity fixes:** repair the SCENARIO, never the assertion — add the ARRANGE-phase settle barrier on a real observable, restore any widened assertion timeout to its original window, remove any retry wrapped around a failing assertion, and comment a deliberate impossible-state setup with why production could reach it
5. NEVER weaken assertions to make tests pass — fix root cause (timing, data, setup) instead
6. Re-read changed files to verify fix correctness
7. Record each fix with `file:line` under `## Fixes Applied`

**Phase 6 — Validated Fix + Full Re-Review (MANDATORY when fixes are applied):**

Do not spawn a fresh reviewer to re-review the same findings before validation/fix. After Phase 5 applies validated fixes, run a full fresh review over the current test scope. When that review uses sub-agents, spawn fresh `integration-tester` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "integration-tester"`
3. Embed full verbatim body of 9 SYNC blocks (all present inline in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. Task field: `"Run a full fresh integration-test review pass over {file-list} after validated fixes were applied. Review against 8 quality gates: assertion value, data state, infinite repeatability, domain logic, test-spec traceability, three-way sync, change coverage, scenario fidelity. Read handler source AND feature docs before judging assertions. Flag smoke-only, existence-only, dead assertions, and repository-created invalid test data as FAIL. Gate 3 also flags tests that are not parallel-safe: assertions hung off a shared mutable entity another test can change, or off a parent a bulk cross-cutting consumer (re-sync/recompute/rebuild/cascade) can wipe even without this test mutating it — each test must own fresh per-test data; prove by grepping other tests on that shared data and every consumer over it. Gate 7: map every behavior-changing production file in {changed-production-file-list} to a covering test (integration-first; unit fallback requires justification) AND a spec TC — uncovered behavior is a HIGH finding minimum, missing/stale TC is a SPEC-GAP finding. Gate 8 (Scenario Fidelity): read each ARRANGE block as a production trace and flag setups production could never reach — distinct actor actions chained with no settle barrier where real life separates them by seconds/minutes/hours, a fixed sleep standing in for a real observable, an assertion timeout widened instead of an ARRANGE barrier added, a retry wrapped around a failing assertion, or a setup state with no explanation of how production reaches it; the finding is on the SCENARIO, never on the assertion. Source-of-truth hierarchy: feature docs > test-spec docs > implementation code > test code. Classify every disagreement as: wrong test, code bug, stale docs, or escalate (three-way conflict)."`
5. Target Files: explicit file list (never pass inline contents)
6. Reference Docs: include `docs/project-reference/integration-test-reference.md`
7. Report path: `plans/reports/integration-test-review-rerun{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If new CRITICAL/HIGH:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`
5. **Exit criteria:** A complete full review returns 0 CRITICAL and 0 HIGH issues

**Phase 7 — Build & Run Tests (MANDATORY):** Build and run ALL changed/reviewed test files.

1. Build test project
2. Run changed tests (filter by reviewed test classes)
3. NEVER mark review complete until all tests pass — unverified reviews have zero value
4. Record results under `## Test Execution Results`

**Phase 8 — Failure Investigation (if Phase 7 fails):** Investigate systematically (classify → root-cause → fix plan), never just retry.

1. **Classify failure:** Test bug (assertion/setup wrong) vs Service bug (handler broken) vs Environment (service not running, DB timeout)
2. **Root cause:** Read failing output, trace handler source, identify exact mismatch
3. **Fix plan per failure:** failing test (`file:line`, TC-ID), error summary, root cause + confidence %, proposed fix
4. **Apply and rerun** — loop until pass or environment blockers identified
5. **Environment blockers:** Document as `BLOCKED — requires running system`; do NOT mark as test failures
6. Append under `## Failure Investigation`

**10+ files:** Parallel sub-agents grouped by module. Each gets file list + 8 gates + handler paths + feature doc paths + the changed-production-file list for its module (Gate 7). Consolidate into single report — the orchestrator merges per-module coverage tables into ONE Coverage Mapping Table covering the whole change set.

---

## Common Anti-Patterns

| Anti-Pattern                                                                                                       | Why It's Bad                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Smoke-only** (no-exception alone)                                                                                | Proves no crash, not correctness                                                                                                   |
| **Existence-only** (not-null)                                                                                      | Proves data exists, not handler set it correctly                                                                                   |
| **Dead assertion** (`count >= 0`, always true)                                                                     | Tests nothing                                                                                                                      |
| **Framework testing** (assert auto-set fields)                                                                     | Tests framework, not handler                                                                                                       |
| **Copy-paste assertions** (wrong entity fields)                                                                    | Assertions don't match handler                                                                                                     |
| **Hardcoded ID** (`Id = "test-001"`)                                                                               | Fails on second run                                                                                                                |
| **Cleanup dependency** (`finally { Delete(); }`)                                                                   | Fragile, hides pollution                                                                                                           |
| **Order dependency** (test B needs A first)                                                                        | Parallel execution breaks                                                                                                          |
| **Shared mutable entity** (assertions on data another test can change)                                             | Not parallel-safe — another test corrupts the shared state; own fresh per-test data                                                |
| **Cross-cutting consumer blind spot** (shared parent wiped by bulk re-sync/recompute/rebuild/cascade)              | A consumer empties your data without this test touching the parent — sharing is unsafe even without direct mutation                |
| **Repository data hacks** (direct create/update bypassing use cases)                                               | Leaves impossible state and hides real workflow bugs                                                                               |
| **Compressed actor pacing** (distinct actor actions fired microseconds apart that production separates by minutes) | Manufactures a race the system was never designed to survive — reported as a product defect when it is a test-fidelity defect      |
| **Blind sleep instead of a settle barrier** (fixed delay where an observable exists)                               | Passes or fails by luck; hides the real completion signal the test should wait on                                                  |
| **Widened assertion timeout as the fix** (ASSERT-side wait grown instead of an ARRANGE precondition added)         | Masks the fidelity defect and stretches every future run — the barrier belongs in ARRANGE                                          |
| **Missing await** (unchecked async exception)                                                                      | Exception swallowed silently                                                                                                       |
| **Event not triggered** (query, never fire)                                                                        | Tests seeder, not handler                                                                                                          |
| **Test fixed to match broken code**                                                                                | Hides the bug — docs still say it's wrong                                                                                          |
| **Self-resolved three-way conflict**                                                                               | AI picked winner without evidence — silent lie                                                                                     |
| **Stale docs assumed without two-source proof**                                                                    | Docs may be right; code may be the bug                                                                                             |
| **Test-files-only scope** (production changes ignored)                                                             | Reviews tests that exist, misses behavior with none                                                                                |
| **Name-match counted as coverage** (test never reads changed path)                                                 | Stale coverage — test passes while change is broken                                                                                |
| **Unjustified unit-test substitution**                                                                             | Skips DI/data-state verification integration gives                                                                                 |
| **Spec-less change** (no TC for new/changed behavior)                                                              | Breaks spec-driven development — specs drift silently                                                                              |
| **Stale-TC counted as covered** (covering test found, mapped TC never re-read)                                     | TC documents OLD behavior — coverage path passes a spec gap silently; must downgrade to SPEC-GAP                                   |
| **Surviving mutant left unkilled** (Gate 1 mutation tool not run, or survivor ignored)                             | A changed line whose mutation no assertion catches = a fakeable, over-fitted test that protects no invariant                       |
| **1:1 TC↔test demanded** (one test per TC, method-name=TC, or many-tests-per-TC flagged as duplicate)              | Forces splitting/technicalizing business TCs — breaks §8's business/user-story orientation (M1/M5). One TC → many tests is correct |

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use `AskUserQuestion` to ask user:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — scout → investigate → spec [mode=tests] → artifact-review --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **Execute `/integration-test-review` directly** — run standalone

---

## Phase 9: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, MUST use `AskUserQuestion`:

- **"/integration-test-verify (Recommended)"** — Run integration tests to verify all pass
- **"/workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                      | Relationship                                                           | When to Call                                                       |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/integration-test`        | **Producer** — generates tests this skill reviews                      | Always preceded by /integration-test                               |
| `/integration-test-verify` | **Successor** — runs tests after review clears                         | Call after review passes all 8 gates                               |
| `/spec [mode=tests]`       | **TC source** — Gate 5 checks TCs exist in feature doc Section 8       | If Gate 5 fails (orphaned test) → run /spec [mode=tests] UPDATE    |
| `/spec-index`              | **Spec authority** — Gate 6 compares test code vs spec bundle          | If Gate 6 finds conflict: spec is authority                        |
| `/spec`                    | **Business doc** — Gate 6 compares tests vs feature doc business rules | If Gate 6 finds conflict: check spec vs spec-index alignment first |
| `/docs-update`             | **Orchestrator** — includes spec [mode=sync]                           | Call when Gate 6 reveals doc staleness                             |

## Standalone Chain

> When called outside a workflow, follow this chain after running integration-test-review.

```
integration-test-review (you are here)
  │
  ├─ SCOPE: the full change set — changed production code AND changed test files
  │    Tests may NOT exist yet for changed code — that is a Gate 7 finding, not an exit condition
  │
  ├─ Gate 1-5 findings → fix tests (re-run integration-test if test code needs regeneration)
  │
  ├─ Gate 8 (Scenario Fidelity) findings → repair the SCENARIO, never the assertion:
  │    → Add the ARRANGE-phase settle barrier on a real observable between chained actor actions
  │    → Restore any widened assertion timeout; remove any retry wrapped around a failing assertion
  │    → Label a deliberate impossible-state setup with why production could reach it
  │    → If the realistic scenario no longer exercises the rule, find a DIFFERENT realistic scenario — never a weaker assertion
  │
  ├─ Gate 7 (Change Coverage) gap resolution:
  │    │
  │    ├─ GAP (changed behavior, no covering test):
  │    │    → Write the missing test — integration-first via /integration-test
  │    │    → Unit test fallback ONLY when integration infeasible — record justification
  │    │    → User waiver (verbatim, with reason) is the only alternative
  │    │
  │    └─ SPEC-GAP (changed behavior, no/stale TC in spec docs):
  │         → /spec [mode=tests] UPDATE to add or correct the TC
  │         → /spec [update] when business rules changed
  │         → Then link the new/updated TC to the covering test (Gate 5)
  │
  ├─ Gate 6 (Three-Way Sync) conflict resolution:
  │    │
  │    ├─ Test code ≠ spec (feature doc says behavior A, test asserts behavior B):
  │    │    → Determine: spec authoritative or test authoritative?
  │    │    → If SPEC is correct: fix test → re-run /integration-test
  │    │    → If TEST reflects correct new behavior (spec stale): /spec [update] → /spec [mode=tests] [UPDATE] → update test
  │    │
  │    ├─ Test code ≠ implementation (test asserts X, code does Y):
  │    │    → If CODE is correct: fix test → /spec [mode=tests] UPDATE (update TC to match code's correct behavior)
  │    │    → If TEST is correct (code bug): do NOT update test → fix code → /prove-fix → re-run tests
  │    │
  │    └─ Derived index ≠ Feature Spec (the bucket INDEX.md / ERD disagrees with the canonical §1-8):
  │         → The Feature Spec is canonical; the index is regenerable, never authoritative
  │         → Run /spec-index to re-derive the index from the specs
  │         → Do NOT self-resolve — escalate to user if ambiguous
  │
  ├─ [REQUIRED] → /integration-test-verify
  │     After all fixes, run actual tests to confirm all gates pass.
  │
  ├─ [REQUIRED] → /spec [mode=sync]
  │     If TCs were updated (Gate 5/6 fix), reconcile §8 TCs ↔ executing test code.
  │
  └─ [RECOMMENDED] → /docs-update
        If Gate 6 revealed doc staleness, /docs-update runs full chain to update all layers.
```

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.
> **A test that cannot fail is not a test — it is decoration.** Every test MUST earn existence by proving it would FAIL if the protected business rule/invariant changed or the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `integration-tester` subagent_type (integration-test reviews ALWAYS spawn `integration-tester`, NOT `code-reviewer`)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Integration-test reviews spawn the `integration-tester` sub-agent, NOT `code-reviewer`.
> Keep `subagent_type: "integration-tester"` from the canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `integration-tester` specializes in test-spec generation, TC traceability, CQRS test patterns, async-polling / eventual-consistency assertion correctness, and cross-service integration context — areas `code-reviewer` does not cover at depth.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `integration-tester` — ALWAYS for integration-test reviews (test files, TC traceability, CQRS/async assertion correctness)
- `code-reviewer` — for general code-quality reviews only (NOT integration tests)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "integration-tester",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need TaskCreate. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `integration-tester` subagent_type — integration-test reviews ALWAYS use `integration-tester`, never `code-reviewer`
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

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

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **3-round ceiling** below.
>
> **Round cap — 3 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 3 with blocking findings still open (severity floor applied) → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 3, LOW stops blocking.** The exit bar tightens by round, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in rounds 1–2 and only validated CRITICAL/HIGH/MEDIUM findings in round 3+. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so.
>
> | Round | Exit bar — loop ENDS when the fresh full review has…                      | Must be fixed to continue      |
> | ----- | ------------------------------------------------------------------------- | ------------------------------ |
> | 1-2   | zero validated findings at ANY severity                                   | CRITICAL · HIGH · MEDIUM · LOW |
> | 3+    | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only is a PASS** | CRITICAL · HIGH · MEDIUM only  |
>
> From round 3 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop immediately** — do not open another round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM should-fix · LOW nice-to-fix); rounds 1-2 are unchanged, so an easy LOW still gets fixed early when it is cheap.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥3)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **The floor bounds the loop, not the standard.** It ends _iteration_; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared → END; blocking findings remain → validate findings → fix → restart from the first review phase. Rounds 1-2 clear on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop** (deferred LOWs go in the report). Capped at **3 rounds**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 3 completes with CRITICAL/HIGH/MEDIUM still open. NEVER loop past 3 rounds, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - From round 3 on, a round whose validated findings are ALL LOW ENDS the loop — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-3 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The 3-round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early at any round, and cap exhaustion escalates rather than passes
> - Enforce the round cap of 3 alongside the 2 repeated-no-progress blocker rule; both are escalation triggers, neither is a completion criterion
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥3)` whenever the loop ended on the round-3+ bar with LOWs still open.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data. Verification is only PASS after the relevant suite/project passes 2 consecutive runs without database reset.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.
> 7. **Migration code excluded:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:repeatable-test-principle -->

<!-- SYNC:test-data-isolation -->

> **Parallel-Safe Test Isolation** — Tests MUST run in parallel and still pass; no test's data may be affected by any other test. `repeatable-test-principle` guards a test against its OWN prior runs; THIS guards it against OTHER concurrent tests, including indirect corruption through a shared parent + a cross-cutting consumer.
>
> 1. **Own fresh data per test:** Each test creates its own entities with unique IDs, down to the root it asserts on. NEVER assert against a shared mutable entity another test can change; only immutable reference/lookup data may be shared — why: shared mutable state is the single point another test corrupts.
> 2. **Isolate at the highest mutated entity:** Own a private instance of the highest-level entity (aggregate root/parent) any test mutates. Sharing is safe only for data no test ever writes — why: a writable shared parent is contended ground two tests fight over.
> 3. **Account for cross-cutting consumers:** A bulk re-sync, recompute, projection rebuild, or cascade any test triggers over a shared parent can rewrite or wipe every entity beneath it — so sharing that parent is unsafe EVEN WHEN your test never mutates it directly — why: the corruption arrives through a consumer, not the path under test.
> 4. **Suspect contamination FIRST on contradiction:** When a test fails intermittently, or its result contradicts the traced behavior of the path under test (the path is provably innocent yet state is wrong), rule out cross-test interference BEFORE blaming the code under test — why: the innocent path takes the blame for another test's writes.
> 5. **Prove isolation by search, not assumption:** Grep every OTHER test touching the same shared data AND every consumer that fans out over it; cite `file:line` evidence. Absence of a sharer is a finding to prove, not assume — why: isolation claimed without a search is unverified.

<!-- /SYNC:test-data-isolation -->

<!-- SYNC:integration-test-execution-discipline -->

> **Integration Test Execution Discipline** — How the integration-test family (write · review · verify) runs, diagnoses, and clears a suite. Binds `/integration-test`, `/integration-test-review`, and `/integration-test-verify` identically.
>
> 1. **Verify the WHOLE system passes — not a hand-picked subset.** `/integration-test-verify` must prove the full relevant suite is green (every test in the system the change can touch), not one cherry-picked test. "All pass" is only true with actual runner output (Passed/Failed/Skipped counts + names) and only after 2 consecutive green runs without a DB reset.
> 2. **Drive state through real use-case paths — NEVER hack seed data.** Set up every precondition exactly as a real user would: real commands, queries, production consumers/messages, or valid idempotent seeders. NEVER create or mutate domain data by direct repository writes — that fabricates states a user could never reach and hides the real workflow bug. Hacking seed data to force a green run is forbidden.
> 3. **On ANY failure → `/debug-investigate` the root cause BEFORE any fix.** Do not guess, do not patch the symptom site. Trace the failure end-to-start and classify whose fault it is: test code (wrong assertion/setup), source/production code (real defect), or environment/infrastructure/data. Then route: test-code fault → `/integration-test-review` to fix the test at the root (never weaken assertions or add skips); source-code fault → fix the production defect at the owning layer and report it; environment fault → mark BLOCKED and point at the startup script. NEVER change a test to match broken code.
> 4. **60-second runtime cap — a slow test is a RED FLAG, not a tuning knob.** Local integration tests run fast. If any single test (or a stalled suite) exceeds ~60s, STOP and treat the slowness itself as a defect signal — deadlock, missing `await`, infinite poll/retry, a real network/external call, or an unbounded query. `/debug-investigate` the cause; NEVER paper over it by raising the timeout or extending the wait.
> 5. **Loop until the whole suite is green.** After fixing the validated root cause, restart the full 2-run verification from run 1. Done means the entire relevant suite passes repeatably — never green-once, never a subset.

<!-- /SYNC:integration-test-execution-discipline -->

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

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

<!-- SYNC:test-failure-fault-adjudication -->

> **Test-Failure Fault Adjudication** — When a test fails (or you are debugging or fixing a failure), the job is to determine _who is at fault — the source code or the test code_. Getting that verdict right matters more than turning the suite green. Binds every debug / fix / test skill identically.
>
> 1. **Provisional verdict before touching either side.** Classify the observed evidence as SOURCE-WRONG, TEST-WRONG, TEST-NOT-OPTIMAL, ENVIRONMENT-BLOCKED, or AMBIGUOUS; then `/debug-investigate` and trace end-to-start before editing. A green-again suite is NOT the goal.
> 2. **Triangulate against the spec AND the source.** If a governing Feature Spec covers the behavior (e.g. `docs/specs/**` — §3 ACs / §4 BRs / §5 invariants / §8 TCs), it is the tiebreaker for _intended_ behavior — compare BOTH the production source and the failing test against it. With no spec, the documented intent / acceptance criteria / caller contract is the reference. Decide from this evidence whether the SOURCE is wrong or the TEST is wrong.
> 3. **Classify who is at fault, then fix the wrong side at its root:**
>     - **SOURCE-WRONG** — production code violates the spec's intended behavior or a clear invariant → fix the source at the owning layer; keep or strengthen the test that caught it.
>     - **TEST-WRONG** — the test encodes a stale or incorrect assertion, setup, or expectation that contradicts intended behavior → fix the test at its root. NEVER weaken an assertion, add a skip, or relax a timeout to force green.
>     - **TEST-NOT-OPTIMAL** — intended behavior is valid but the test seam, timing, or assertion signal is fragile → improve the test without weakening the invariant.
>     - **ENVIRONMENT-BLOCKED** — infrastructure or external state prevents a source/test verdict → preserve diagnostics and stop mutation until the environment is healthy.
>     - **AMBIGUOUS** — evidence or intended behavior does not safely select an owner → ask the user or canonical owner before editing.
>     - NEVER change a test to match broken source, and NEVER change source to satisfy a broken test. (Migration code excluded — schema/data migrations are one-time execution paths, not core application logic.)
> 4. **Ask the user when intended behavior is unclear.** If no spec covers the behavior, the spec is silent, or the spec is ambiguous about which side is correct, STOP and `AskUserQuestion` (or consult the canonical spec owner) before editing either side — never silently pick source or test just to make the suite pass.
>
> Reconcile to intended behavior, never to whichever side currently passes — green can encode the very bug.

<!-- /SYNC:test-failure-fault-adjudication -->

<!-- SYNC:spec-tests-code-triangulation -->

> **Spec ↔ Tests ↔ Code Triangulation** — The unit of review is the WHOLE PACKAGE (spec + tests + code), not the diff alone. Load all three faces together and reason mutual-consistency FIRST, before any isolated per-file check.
>
> 1. **Locate all three faces** for the changed behavior: the governing Feature Spec section(s) (§3 ACs / §4 BRs / §8 TCs), the tests that guard it, and the production code. A missing face is a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
> 2. **Triangulate pairwise** — classify which face is wrong on every disagreement:
>     - code vs spec → CODE-EXTRA / SPEC-STALE / CODE-WRONG (a [HARD] §4 rule or §5 invariant with no enforcing path is CODE-WRONG).
>     - tests vs spec → TEST-GAP / SPEC-SILENT.
>     - tests vs code → TEST-GAP / WEAK-TEST (a test that survives a deliberately broken invariant).
> 3. **Capture hidden rules** — an invariant the code enforces but the spec never states (SPEC-SILENT) is surfaced as a finding, added into §3/§4/§8, and guarded with a test: the enrichment loop, never a silent pass.
> 4. **Re-review after enrichment** — when triangulation adds spec content or a test, re-review the package against the enriched spec; converge only when a full pass surfaces no new disagreement.
>
> NEVER mark PASS while any face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

<!-- /SYNC:spec-tests-code-triangulation -->

<!-- SYNC:spec-drift-adjudication -->

> **Spec drift adjudication (code-wrong vs spec-stale).** Whenever changed behavior diverges from a canonical Feature Spec (business rule, acceptance criterion, flow, state transition, or §8 TC under `docs/specs/`), you MUST NOT silently pick a side. Adjudicate per `shared/sdd-artifact-contract.md` → **Drift Gates**:
>
> 1. **Detect** — compare the change against the spec's documented intent. No divergence → record `Spec in sync` and move on.
> 2. **Classify** the divergence:
>     - **CODE-WRONG** — the spec correctly states intended behavior and the change violates it → BLOCKING finding; fix the code/test against intended behavior (write/adjust a regression TC first).
>     - **SPEC-STALE** — the change is the new intended behavior and the spec now documents the old/wrong behavior → update the spec FIRST via `/spec [mode=update]`, then sync `/spec [mode=tests]` + `/spec [mode=sync]`.
>     - **AMBIGUOUS** — intended behavior is unclear → `AskUserQuestion` (or the canonical spec owner) before editing either side.
>     - **SPEC-SILENT** — the code correctly enforces an invariant/behavior that NO canonical spec artifact (§3 AC, §4 BR, §5 invariant, §8 TC) states → not drift but an UNWRITTEN rule discovered by review. ENRICH the spec via the **Invariant Harvest** pass (`/spec [mode=sync] direction=harvest` → `spec/references/sync.md`): prove it is always-true (≥2 enforcement points or a rejecting guard), express it as a universally-quantified property, then add the rule to §4 (or §3/§5) AND a §8 TC via `/spec [update]` + `/spec [mode=tests]` and add the guarding test. A discovered invariant left only in code (or only in tests) is INCOMPLETE — this is the highest-value capture (the rule nobody wrote down).
> 3. **Never normalize drift just because code/tests are green** — green can encode the drift itself. Reconcile to canonical intent, never to whichever side currently passes.
>
> A behavior-changing review/implementation that leaves a spec divergence unadjudicated is INCOMPLETE; an unwritten-but-enforced invariant left uncaptured (no §4/§8 entry) is equally INCOMPLETE.

<!-- /SYNC:spec-drift-adjudication -->

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

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the _concern axis_; orient with these examples, derive what fits the repository:
>
> | Category Type       | Example Groupings                                                     |
> | ------------------- | --------------------------------------------------------------------- |
> | Agent/Tooling       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs    | Root README, project config, CI/CD pipeline configs                   |
> | Reference docs      | Architecture docs, patterns references, setup guides                  |
> | Feature/domain docs | Business feature documentation, spec files, ADRs                      |
> | Backend logic       | Service/handler/controller source (infer from project structure)      |
> | Frontend logic      | UI component/state/API source (infer from project structure)          |
> | Data/Schema         | Migrations, schema files, seed data                                   |
> | Tests               | Unit, integration, E2E test files                                     |
> | Infrastructure      | Docker, k8s, CI/CD, cloud manifests                                   |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>     - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `/why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: rounds 1-2 exit on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **round cap of 3 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 3 completing with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.

<!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders (MUST ATTENTION)

**IMPORTANT MUST ATTENTION Goal:** Ensure the review target (changed production code) is covered by tests that protect real business behavior with correct data assertions, infinite repeatability, and spec alignment — verify every behavior change has a covering test (integration-first, unit fallback) so specs ↔ tests ↔ code stay aligned (spec-driven development).

**IMPORTANT MUST ATTENTION 8 Gates (judge every one):** G1 Assertion Value (mutation-score + Mutation Probe Ledger) · G2 Data State (assert DB fields, async-poll) · G3 Repeatability (unique IDs, 2 green runs) · G4 Domain Logic (read handler, assert only fields it writes) · G5 Spec Traceability (TC annotation → spec docs; 1 TC → many tests OK) · G6 Three-Way Sync (feature-docs > test-spec > code > test; escalate conflicts) · G7 Change Coverage (every behavior-changing file → covering test + non-stale §8 TC) · G8 Scenario Fidelity (setup reachable in production; settle barrier in ARRANGE, never a widened assertion timeout).

**IMPORTANT MUST ATTENTION Phases (run ALL, `TaskCreate` each, one `in_progress`):** P0 Scope-detect → P1 Collect (split prod vs test) → P2 Gate Review → P3 Spec Cross-Check (both directions) → P4 Initial Report → P5 Fix ALL Crit/High + WRITE missing tests → P6 Validated-fix + full fresh re-review until 0 Crit/0 High → P7 Build & run ALL tests → P8 Failure Investigation → P9 Why-Review self-validation.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Evidence:** Speculation forbidden; cite evidence, state confidence, NEVER guess.
- **Double Round-Trip Review:** Validated-fix then full fresh re-review until clean.
- **Repeatable Test Principle:** Unique IDs, additive-only, no cleanup; ALWAYS async-poll DB asserts.
- **Parallel-Safe Test Isolation:** Own fresh per-test data; never a shared mutable entity; account for cross-cutting consumers wiping a shared parent; suspect contamination FIRST on contradiction; prove isolation by grep.
- **Real-World Fidelity:** the setup's sequence, pacing, and data must be reachable in production; settle barriers on a real observable belong in ARRANGE — NEVER a widened assertion timeout, a blind sleep, or a retry around a failing assertion; label deliberate impossible-state tests with why the state is reachable.
- **Source/Test Drift Check:** Source change → reinspect affected tests for intended behavior.
- **Spec↔Tests↔Code Triangulation:** the unit of review is the WHOLE PACKAGE (spec §3/§4/§8 + tests + code) — load all three, reason mutual-consistency first; a disagreeing or missing face is a logged finding, NEVER a silent PASS.
- **Spec Drift Adjudication:** on behavior divergence from a canonical spec, classify CODE-WRONG / SPEC-STALE / AMBIGUOUS / SPEC-SILENT and harvest unwritten invariants into §4/§8 + a guarding test — NEVER normalize drift to whichever side is green.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent, one `in_progress`.
- **Project Reference Docs Guide:** Read required project docs (ALWAYS `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist findings to `plans/reports/` incrementally.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive each category's concerns from first principles, NEVER a fixed checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** scope = the CHANGE SET (production + test files) — NEVER review only the test files; Gate 7 coverage mapping is NOT optional — why: a test-files-only scope reviews tests that exist and misses changed behavior that has none
**IMPORTANT MUST ATTENTION** read handler/service source (and feature docs) BEFORE judging any assertion — cannot review what you have not read — why: assertion quality is unknowable without knowing what the handler actually writes
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80% to act, 60-80% verify first, <60% DO NOT report — NEVER speculate; "Insufficient evidence" is valid output — why: AI reports inherit confirmation bias; unproven severities propagate downstream as ground truth
**IMPORTANT MUST ATTENTION** bootstrap `TaskCreate` for ALL 9 phases BEFORE starting; on context loss call `TaskList` first and resume, never duplicate — why: phase tracking is the only recovery anchor after compaction
**IMPORTANT MUST ATTENTION** search 3+ existing test patterns and the project's test reference docs (`integration-test-reference.md` via grep, NEVER hardcoded paths) before judging conventions; evaluate pattern FIT (same base class, scope, DI path) before copying a nearby example — why: local conventions override generic framework defaults
**IMPORTANT MUST ATTENTION** every behavior-changing production change needs a covering test — integration-first; unit fallback requires recorded infeasibility justification; GAP = HIGH minimum (CRITICAL on auth/money/data-integrity), fixed by WRITING the test in Phase 5, not just reporting
**IMPORTANT MUST ATTENTION** run the Phase 1 "Validate: 100% Section-8 TC coverage" task + Phase 3 addendum EVERY review (inside a workflow, current git changes present, or by user request) — enumerate the FULL Section-8 TC list of the implicated feature doc(s), not only diff-touched TCs, into the SAME Coverage Mapping Table; zero GAP rows across the WHOLE table before PASS — why: Gate 7 alone is diff-scoped and misses a pre-existing TC whose covering test regressed outside the diff
**IMPORTANT MUST ATTENTION** Gate 1 mutation probe is non-skippable — record the Mutation Probe Ledger (KILLED/SURVIVOR per changed core-logic line); no ledger = Gate 1 FAIL, not "skipped" — why: a surviving mutant is a fakeable test that protects no invariant
**IMPORTANT MUST ATTENTION** spec-driven alignment runs BOTH directions — from TCs in tests AND from changed code back to spec docs; missing OR stale-but-covered TC = SPEC-GAP finding — why: a covering test whose mapped TC documents OLD behavior passes a spec gap silently
**IMPORTANT MUST ATTENTION** a test that cannot fail is decoration — if it cannot catch the protected business rule/invariant breaking, delete or fix it; flag smoke-only/existence-only/dead assertions as FAIL unless justified by explicit design comment
**IMPORTANT MUST ATTENTION** tests MUST be infinitely repeatable — unique IDs per run, no cleanup, no rollback; ALWAYS use async polling/retry for ALL DB assertions; verification requires 2 consecutive passing runs without DB reset — why: one green run hides ordering and eventual-consistency flakiness
**IMPORTANT MUST ATTENTION** Gate 3 also enforces parallel-safe isolation — FAIL any test hanging assertions off a shared mutable entity another test can change, or off a parent a bulk cross-cutting consumer (re-sync/recompute/rebuild/cascade) can wipe even without this test mutating it; require fresh per-test data and prove isolation by grepping other tests on that shared data AND every consumer over it; on a contradiction between a provably-innocent path and wrong state, suspect contamination FIRST — why: shared mutable state lets another test silently corrupt your data and the innocent path takes the blame
**IMPORTANT MUST ATTENTION** Gate 8 — an unrealistic setup is a REVIEW FINDING, not a tolerable quirk: flag actor actions chained with no settle barrier where production separates them by seconds/minutes/hours, a fixed sleep standing in for a real observable, an assertion timeout widened instead of an ARRANGE barrier added, a retry wrapped around a failing assertion, and a setup state with no explanation of how production reaches it — fix the SCENARIO, NEVER the assertion — why: a scenario production can never meet proves nothing when green and blames the product when red
**IMPORTANT MUST ATTENTION** Gate 6 — read ALL three sources before classifying (never two); NEVER fix a test to match broken code (report the code bug instead); NEVER self-resolve a three-way conflict (escalate via `AskUserQuestion`); "stale docs" requires BOTH impl code AND test to agree — why: a winner picked without evidence hides bugs
**IMPORTANT MUST ATTENTION** fix ALL CRITICAL/HIGH issues (Phase 5 NOT optional); validate findings via `/why-review` before fixing; after validated fixes rerun a full fresh review until a clean pass returns 0 CRITICAL/0 HIGH — why: every fix invalidates the prior verdict
**IMPORTANT MUST ATTENTION** integration-test reviews ALWAYS spawn the `integration-tester` sub-agent, NEVER `code-reviewer`, with all protocol bodies embedded VERBATIM — why: `code-reviewer` lacks TC-traceability and async-polling assertion depth, and file-path indirection drops compliance ~40%
**IMPORTANT MUST ATTENTION** build and run ALL changed/reviewed tests after fixes (Phase 7 NOT optional) — unverified reviews have zero value; if tests fail, classify (test bug vs service bug vs environment) and root-cause in Phase 8, NEVER retry blindly
**IMPORTANT MUST ATTENTION** write findings to `plans/reports/integration-test-review-{date}-{slug}.md` incrementally — never just return text — why: long sub-agents hit cutoffs before a final batch write and lose findings
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80%; scope = the CHANGE SET, never just tests; read handler source BEFORE judging assertions

**Anti-Rationalization:**

| Evasion                                                 | Rebuttal                                                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| "Smoke test is fine for now"                            | No smoke test earns its place. Fix or delete.                                                                                             |
| "Handler source too long to read"                       | Cannot judge assertion quality without reading. REQUIRED.                                                                                 |
| "Re-review after fixes is overkill"                     | Fixes changed the target. A full fresh review is required before PASS.                                                                    |
| "Tests were passing before"                             | Passing ≠ correct. Dead assertions always pass.                                                                                           |
| "Conflict is obvious, I can self-resolve"               | Three-way conflict requires escalation. NEVER self-resolve.                                                                               |
| "Phase 6/7/8 optional for small fixes"                  | No exceptions. Every validated fix requires full re-review + build verification.                                                          |
| "0 test files, nothing to review"                       | Production changes without tests ARE the review — run Gate 7 coverage mapping.                                                            |
| "A unit test is enough here"                            | Integration-first. Unit fallback requires recorded infeasibility justification.                                                           |
| "Test with matching name exists = covered"              | Read it. Coverage means it exercises the changed path and asserts the changed outcome.                                                    |
| "Specs can be updated later"                            | Spec-driven development: missing/stale TC is a SPEC-GAP finding, fixed in this review.                                                    |
| "I checked the mutants mentally"                        | No ledger = Gate 1 FAIL. The Mutation Probe Ledger is the only proof the probe ran.                                                       |
| "My finding list is obviously right"                    | AI reports inherit confirmation bias. Validate via `/why-review` before fixing.                                                           |
| "Name match counts as coverage"                         | Read the test — coverage requires exercising the changed path AND asserting its outcome.                                                  |
| "It shares an existing entity, that's fine"             | Shared mutable state is the single point another test corrupts. Require fresh per-test data; only immutable lookup data may be shared.    |
| "This test never mutates that parent"                   | A cross-cutting consumer wipes the shared parent without this test touching it. Sharing is unsafe even without direct mutation.           |
| "The path under test is correct, test passes elsewhere" | Provably-innocent path + wrong state = suspect cross-test interference FIRST. Grep other tests + cross-cutting consumers before clearing. |
| "The setup is unrealistic but the assertion is strong"  | A strong assertion over a scenario production can never reach is still a defective test. Gate 8 finding — fix the scenario.               |
| "It just needed a longer timeout"                       | A widened assertion timeout is masking, not a fix. The barrier belongs in ARRANGE, on a real observable.                                  |
| "A sleep there is harmless"                             | A blind sleep passes or fails by luck. Name the observable that proves the prior step finished, or comment why none exists.               |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.
