---
name: integration-test-review
description: '[Code Quality] Use when you need to review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability — AND verify the review target (changed production code) has test coverage (integration-first) with spec↔test↔code alignment.'
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

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
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

**Goal:** Ensure the review target (changed production code) is covered by tests that protect real business behavior with correct data assertions, infinite repeatability, and spec alignment — verifying every behavior change has test coverage (integration-first, unit fallback) so that specs ↔ tests ↔ code stay aligned (spec-driven development).

**Summary:**

- The review target is the CHANGE, not the test files: collect BOTH changed production code AND changed test files — Gates 1-6 judge test quality, Gate 7 maps every behavior-changing production file to a covering test (integration-first; unit only with recorded justification) and a spec TC. An uncovered changed behavior is a HIGH finding minimum.
- Read the handler/service source (and feature docs) BEFORE judging any assertion. FAIL smoke-only, existence-only (not-null), dead (always-true), copy-paste, and DI-resolution-only tests; require unique IDs + async polling + 3 consecutive green runs to call tests repeatable/verified.
- Gate 6 three-way sync uses the source-of-truth hierarchy (feature docs > test-spec docs > impl code > test code): NEVER fix a test to match broken code, NEVER self-resolve a three-way conflict — escalate via a direct user question.
- Don't just report gaps — Phase 5 WRITES the missing test (and runs `$spec [mode=tests]` for SPEC-GAPs), then a full fresh re-review runs after every validated fix cycle until a clean pass returns 0 CRITICAL/0 HIGH.

**Scope:** The FULL change set — changed production code AND changed test files — from uncommitted changes (default), user-specified files, or a user-specified diff (branch/PR). The review target is never "just the test files".

**Workflow:** Phase 0 Detect → Collect → Coverage Map (Gate 7) → 7-Gate Review → Spec Cross-Check → Report → validate findings → fix validated issues (including writing missing tests) → full re-review after fixes → Build & verify → If fail: investigate + fix plan

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
- MUST require 3 consecutive successful suite/project runs before declaring integration tests verified/idempotent
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
| 0 changes at all                             | Empty target        | Ask user for explicit scope via a direct user question                                                         |

**The review target is the CHANGE, not the test files.** Changed test files are reviewed for quality (Gates 1-6); changed production files are checked for coverage and spec alignment (Gate 7). Both halves are mandatory.

**Search for test reference docs** — NEVER hardcode paths. Grep for `integration-test-reference`, `test-patterns`, `integration-test-guide` near changed test files to discover project-specific conventions before starting gate review.

---

## The 7 Quality Gates

> Gates 1-6 apply per changed/target TEST file. Gate 7 applies to the CHANGE SET — every behavior-changing production file must map to a covering test and a spec TC.

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

**Verify:** Repeatability is only proven when the relevant suite/project passes 3 consecutive runs without resetting data. One green run is not enough.

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

**PASS:** Test has a `TestSpec` annotation linking to a TC ID that exists in spec docs. The test method name need **NOT** match the TC, and **many test methods may legitimately carry the same TC** (one business TC → many tests across components/services — the join key is the test-spec annotation, not the method name; see `tc-format.md` → TC ↔ Test Code Cardinality).

**FAIL (WARN, not BLOCK):** Missing annotation, orphaned TC ID (annotation points to a TC absent from spec docs), or spec says "Planned" but test exists. **NOT a finding:** several tests sharing one TC, or a method name that differs from the TC — those are the expected one-to-many shape.

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
| Stale docs                    | —           | ✓         | ✓         | Docs lag code         | Flag docs for `$docs-update`; test is correct |
| Wrong test                    | ✓           | ✓         | ✗         | Test wrong            | Fix test assertions to match code + docs      |
| Code bug                      | ✓           | ✗         | ✓         | Code has bug          | Report as BUG — do NOT fix test to match code |
| Test + code diverge from docs | ✓           | ✗         | ✗         | Code bug + wrong test | Fix test to match docs; report code bug       |
| Three-way conflict            | ✗           | ✗         | ✗         | ESCALATE              | Cannot self-resolve — a direct user question  |

**CRITICAL rules:**

- NEVER fix a test to match broken code — that hides bugs
- NEVER assume docs are wrong without evidence they were intentionally superseded
- NEVER self-resolve a three-way conflict — always escalate via a direct user question
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
- **SPEC-GAP (FAIL)** — behavior has no TC, OR a covering test exists but its mapped TC still describes OLD/superseded behavior (stale TC ≠ covered). Both the missing-TC and the stale-but-covered case are SPEC-GAP. Fix via `$spec [mode=tests]` UPDATE (and `$spec` when business rules changed)

**FAIL:**

- Changed handler/command/entity rule with zero covering test
- Unit test substituted where an integration test is feasible, with no justification
- Test exists but does not assert the changed outcome (stale coverage counted as coverage)
- New/changed behavior absent from spec docs, or TC describing superseded behavior
- A COVERED row marked COVERED without reading its mapped §8 TC — TC existence assumed instead of its CURRENT-behavior correctness verified (a stale-but-covered TC silently passes as covered)

**Explicit user waiver** (recorded verbatim in the report with the user's reason) is the ONLY alternative to closing a GAP.

---

## Review Protocol (9 Phases)

Use task tracking for EACH phase before starting.

**Phase 1 — Collect:** Split the change set: production files (Gate 7 coverage targets) vs test files. Categorize test files: new (full review), modified (changed methods only), new projects (infra + samples). Categorize production files: behavior-changing vs excluded (with reason).

**Phase 2 — Gate Review:** Per test file, apply Gates 1-6. Apply Gate 7 once across the change set and produce the Coverage Mapping Table. Record per-file verdict table:

| Gate                                | Verdict                           | Evidence                 |
| ----------------------------------- | --------------------------------- | ------------------------ |
| 1. Assertion Value                  | PASS/FAIL                         | {file:line}              |
| 2. Data State                       | PASS/FAIL                         | {file:line}              |
| 3. Repeatability                    | PASS/FAIL                         | {file:line}              |
| 4. Domain Logic                     | PASS/FAIL                         | {file:line}              |
| 5. Traceability                     | PASS/WARN                         | {file:line}              |
| 6. Three-Way Sync                   | PASS/WARN/FAIL/ESCALATE           | {file:line}              |
| 7. Change Coverage (per change set) | COVERED/COVERED-UNIT/GAP/SPEC-GAP | {coverage mapping table} |

**Phase 3 — Spec Cross-Check + Three-Way Diff:** Two directions — from tests AND from changed code.

For each TC ID in code:

1. Verify TC entry exists in both `docs/specs/` (Section 8) and `docs/specs/`
2. Read what TC describes in each doc
3. Read what implementation code actually does
4. Read what test asserts
5. Classify conflict pattern (Gate 6 table) and record action
6. Flag gaps both directions: TC in code but not in docs, or "Implemented" TC in docs but no test found

For each behavior-changing production file in the review target (reverse direction — spec-driven development check):

7. Verify a TC exists describing the changed behavior AND read it to confirm it describes the CURRENT behavior — run this even when a covering test was already found and the row is otherwise COVERED. If the TC still describes the OLD behavior, downgrade the row from COVERED to SPEC-GAP and flag it stale (route to `$spec [mode=tests]` UPDATE). Finding a covering test never excuses re-checking the TC's correctness.
8. New behavior with no TC anywhere → SPEC-GAP finding (Gate 7); recommend `$spec [mode=tests]` (and `$spec` when business rules changed)

**Phase 4 — Initial Report:** Write to `plans/reports/integration-test-review-{date}-{slug}.md`

**Phase 5 — Fix All Issues (MANDATORY):** Fix every CRITICAL and HIGH issue. MEDIUM: fix if straightforward, document as tech debt otherwise.

1. Prioritize: CRITICAL → HIGH → MEDIUM
2. Per fix: read handler source, understand domain logic, write/fix assertion
3. **Gate 7 GAP fixes:** WRITE the missing test — integration test first (route through `$integration-test` patterns); unit test only with recorded justification. SPEC-GAP fixes: run `$spec [mode=tests]` UPDATE to add/correct the TC before or alongside writing the test
4. NEVER weaken assertions to make tests pass — fix root cause (timing, data, setup) instead
5. Re-read changed files to verify fix correctness
6. Record each fix with `file:line` under `## Fixes Applied`

**Phase 6 — Validated Fix + Full Re-Review (MANDATORY when fixes are applied):**

Do not spawn a fresh reviewer to re-review the same findings before validation/fix. After Phase 5 applies validated fixes, run a full fresh review over the current test scope. When that review uses sub-agents, spawn fresh `integration-tester` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "integration-tester"`
3. Embed full verbatim body of 9 SYNC blocks (all present inline in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. Task field: `"Run a full fresh integration-test review pass over {file-list} after validated fixes were applied. Review against 7 quality gates: assertion value, data state, infinite repeatability, domain logic, test-spec traceability, three-way sync, change coverage. Read handler source AND feature docs before judging assertions. Flag smoke-only, existence-only, dead assertions, and repository-created invalid test data as FAIL. Gate 7: map every behavior-changing production file in {changed-production-file-list} to a covering test (integration-first; unit fallback requires justification) AND a spec TC — uncovered behavior is a HIGH finding minimum, missing/stale TC is a SPEC-GAP finding. Source-of-truth hierarchy: feature docs > test-spec docs > implementation code > test code. Classify every disagreement as: wrong test, code bug, stale docs, or escalate (three-way conflict)."`
5. Target Files: explicit file list (never pass inline contents)
6. Reference Docs: include `docs/project-reference/integration-test-reference.md`
7. Report path: `plans/reports/integration-test-review-rerun{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Re-Review {N} Findings` — DO NOT filter or override
3. **If new CRITICAL/HIGH:** validate the new finding set before any additional fixes
4. **Repeat only after another fix cycle:** restart the full review again after validated fixes are applied; if the same blocker repeats across 3 full invocations with no progress, escalate via a direct user question
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

**10+ files:** Parallel sub-agents grouped by module. Each gets file list + 7 gates + handler paths + feature doc paths + the changed-production-file list for its module (Gate 7). Consolidate into single report — the orchestrator merges per-module coverage tables into ONE Coverage Mapping Table covering the whole change set.

---

## Common Anti-Patterns

| Anti-Pattern                                                                                          | Why It's Bad                                                                                                                       |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Smoke-only** (no-exception alone)                                                                   | Proves no crash, not correctness                                                                                                   |
| **Existence-only** (not-null)                                                                         | Proves data exists, not handler set it correctly                                                                                   |
| **Dead assertion** (`count >= 0`, always true)                                                        | Tests nothing                                                                                                                      |
| **Framework testing** (assert auto-set fields)                                                        | Tests framework, not handler                                                                                                       |
| **Copy-paste assertions** (wrong entity fields)                                                       | Assertions don't match handler                                                                                                     |
| **Hardcoded ID** (`Id = "test-001"`)                                                                  | Fails on second run                                                                                                                |
| **Cleanup dependency** (`finally { Delete(); }`)                                                      | Fragile, hides pollution                                                                                                           |
| **Order dependency** (test B needs A first)                                                           | Parallel execution breaks                                                                                                          |
| **Repository data hacks** (direct create/update bypassing use cases)                                  | Leaves impossible state and hides real workflow bugs                                                                               |
| **Missing await** (unchecked async exception)                                                         | Exception swallowed silently                                                                                                       |
| **Event not triggered** (query, never fire)                                                           | Tests seeder, not handler                                                                                                          |
| **Test fixed to match broken code**                                                                   | Hides the bug — docs still say it's wrong                                                                                          |
| **Self-resolved three-way conflict**                                                                  | AI picked winner without evidence — silent lie                                                                                     |
| **Stale docs assumed without two-source proof**                                                       | Docs may be right; code may be the bug                                                                                             |
| **Test-files-only scope** (production changes ignored)                                                | Reviews tests that exist, misses behavior with none                                                                                |
| **Name-match counted as coverage** (test never reads changed path)                                    | Stale coverage — test passes while change is broken                                                                                |
| **Unjustified unit-test substitution**                                                                | Skips DI/data-state verification integration gives                                                                                 |
| **Spec-less change** (no TC for new/changed behavior)                                                 | Breaks spec-driven development — specs drift silently                                                                              |
| **Stale-TC counted as covered** (covering test found, mapped TC never re-read)                        | TC documents OLD behavior — coverage path passes a spec gap silently; must downgrade to SPEC-GAP                                   |
| **Surviving mutant left unkilled** (Gate 1 mutation tool not run, or survivor ignored)                | A changed line whose mutation no assertion catches = a fakeable, over-fitted test that protects no invariant                       |
| **1:1 TC↔test demanded** (one test per TC, method-name=TC, or many-tests-per-TC flagged as duplicate) | Forces splitting/technicalizing business TCs — breaks §8's business/user-story orientation (M1/M5). One TC → many tests is correct |

---

## Workflow Recommendation

> **MANDATORY — NO EXCEPTIONS:** If NOT already in a workflow, MUST use a direct user question to ask user:
>
> 1. **Activate `workflow-write-integration-test` workflow** (Recommended) — scout → investigate → spec [mode=tests] → review-artifact --type=spec-tests → integration-test → integration-test-review → integration-test-verify → spec [mode=sync] → docs-update → workflow-end → watzup
> 2. **Execute `$integration-test-review` directly** — run standalone

---

## Phase 9: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS** after completing, MUST use a direct user question:

- **"$integration-test-verify (Recommended)"** — Run integration tests to verify all pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                      | Relationship                                                           | When to Call                                                       |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `$integration-test`        | **Producer** — generates tests this skill reviews                      | Always preceded by $integration-test                               |
| `$integration-test-verify` | **Successor** — runs tests after review clears                         | Call after review passes all 7 gates                               |
| `$spec [mode=tests]`       | **TC source** — Gate 5 checks TCs exist in feature doc Section 8       | If Gate 5 fails (orphaned test) → run $spec [mode=tests] UPDATE    |
| `$spec-index`              | **Spec authority** — Gate 6 compares test code vs spec bundle          | If Gate 6 finds conflict: spec is authority                        |
| `$spec`                    | **Business doc** — Gate 6 compares tests vs feature doc business rules | If Gate 6 finds conflict: check spec vs spec-index alignment first |
| `$docs-update`             | **Orchestrator** — includes spec [mode=sync]                           | Call when Gate 6 reveals doc staleness                             |

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
  ├─ Gate 7 (Change Coverage) gap resolution:
  │    │
  │    ├─ GAP (changed behavior, no covering test):
  │    │    → Write the missing test — integration-first via $integration-test
  │    │    → Unit test fallback ONLY when integration infeasible — record justification
  │    │    → User waiver (verbatim, with reason) is the only alternative
  │    │
  │    └─ SPEC-GAP (changed behavior, no/stale TC in spec docs):
  │         → $spec [mode=tests] UPDATE to add or correct the TC
  │         → $spec [update] when business rules changed
  │         → Then link the new/updated TC to the covering test (Gate 5)
  │
  ├─ Gate 6 (Three-Way Sync) conflict resolution:
  │    │
  │    ├─ Test code ≠ spec (feature doc says behavior A, test asserts behavior B):
  │    │    → Determine: spec authoritative or test authoritative?
  │    │    → If SPEC is correct: fix test → re-run $integration-test
  │    │    → If TEST reflects correct new behavior (spec stale): $spec [update] → $spec [mode=tests] [UPDATE] → update test
  │    │
  │    ├─ Test code ≠ implementation (test asserts X, code does Y):
  │    │    → If CODE is correct: fix test → $spec [mode=tests] UPDATE (update TC to match code's correct behavior)
  │    │    → If TEST is correct (code bug): do NOT update test → fix code → $prove-fix → re-run tests
  │    │
  │    └─ Derived index ≠ Feature Spec (the bucket INDEX.md / ERD disagrees with the canonical §1-8):
  │         → The Feature Spec is canonical; the index is regenerable, never authoritative
  │         → Run $spec-index to re-derive the index from the specs
  │         → Do NOT self-resolve — escalate to user if ambiguous
  │
  ├─ [REQUIRED] → $integration-test-verify
  │     After all fixes, run actual tests to confirm all gates pass.
  │
  ├─ [REQUIRED] → $spec [mode=sync]
  │     If TCs were updated (Gate 5/6 fix), reconcile §8 TCs ↔ integration test code.
  │
  └─ [RECOMMENDED] → $docs-update
        If Gate 6 revealed doc staleness, $docs-update runs full chain to update all layers.
```

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **A test that cannot fail is not a test — it is decoration.** Every test MUST earn existence by proving it would FAIL if the protected business rule/invariant changed or the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `integration-tester` agent_type (integration-test reviews ALWAYS spawn `integration-tester`, NOT `code-reviewer`)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Integration-test reviews spawn the `integration-tester` sub-agent, NOT `code-reviewer`.
> Keep `agent_type: "integration-tester"` from the canonical template below; NEVER revert to `code-reviewer`.
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
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "integration-tester",
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
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
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
- DO choose `integration-tester` agent_type — integration-test reviews ALWAYS use `integration-tester`, never `code-reviewer`
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

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data. Verification is only PASS after the relevant suite/project passes 3 consecutive runs without database reset.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.
> 7. **Migration code excluded:** Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:repeatable-test-principle -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

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

## Closing Reminders (MUST ATTENTION)

**IMPORTANT MUST ATTENTION Goal:** Ensure the review target (changed production code) is covered by tests that protect real business behavior with correct data assertions, infinite repeatability, and spec alignment — verify every behavior change has a covering test (integration-first, unit fallback) so specs ↔ tests ↔ code stay aligned (spec-driven development).

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.
- **Evidence:** Speculation forbidden; cite evidence, state confidence, NEVER guess.
- **Double Round-Trip Review:** Validated-fix then full fresh re-review until clean.
- **Repeatable Test Principle:** Unique IDs, additive-only, no cleanup; ALWAYS async-poll DB asserts.
- **Source/Test Drift Check:** Source change → reinspect affected tests for intended behavior.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Expand child phases, link parent, one `in_progress`.
- **Project Reference Docs Guide:** Read required project docs (ALWAYS `lessons.md`) before target work.
- **Task Tracking External Report:** Bootstrap tasks; persist findings to `plans/reports/` incrementally.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive each category's concerns from first principles, NEVER a fixed checklist.

**IMPORTANT MUST ATTENTION** scope = the CHANGE SET (production + test files) — NEVER review only the test files; Gate 7 coverage mapping is NOT optional — why: a test-files-only scope reviews tests that exist and misses changed behavior that has none
**IMPORTANT MUST ATTENTION** read handler/service source (and feature docs) BEFORE judging any assertion — cannot review what you have not read — why: assertion quality is unknowable without knowing what the handler actually writes
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80% to act, 60-80% verify first, <60% DO NOT report — NEVER speculate; "Insufficient evidence" is valid output — why: AI reports inherit confirmation bias; unproven severities propagate downstream as ground truth
**IMPORTANT MUST ATTENTION** bootstrap task tracking for ALL 9 phases BEFORE starting; on context loss call the current task list first and resume, never duplicate — why: phase tracking is the only recovery anchor after compaction
**IMPORTANT MUST ATTENTION** search 3+ existing test patterns and the project's test reference docs (`integration-test-reference.md` via grep, NEVER hardcoded paths) before judging conventions; evaluate pattern FIT (same base class, scope, DI path) before copying a nearby example — why: local conventions override generic framework defaults
**IMPORTANT MUST ATTENTION** every behavior-changing production change needs a covering test — integration-first; unit fallback requires recorded infeasibility justification; GAP = HIGH minimum (CRITICAL on auth/money/data-integrity), fixed by WRITING the test in Phase 5, not just reporting
**IMPORTANT MUST ATTENTION** Gate 1 mutation probe is non-skippable — record the Mutation Probe Ledger (KILLED/SURVIVOR per changed core-logic line); no ledger = Gate 1 FAIL, not "skipped" — why: a surviving mutant is a fakeable test that protects no invariant
**IMPORTANT MUST ATTENTION** spec-driven alignment runs BOTH directions — from TCs in tests AND from changed code back to spec docs; missing OR stale-but-covered TC = SPEC-GAP finding — why: a covering test whose mapped TC documents OLD behavior passes a spec gap silently
**IMPORTANT MUST ATTENTION** a test that cannot fail is decoration — if it cannot catch the protected business rule/invariant breaking, delete or fix it; flag smoke-only/existence-only/dead assertions as FAIL unless justified by explicit design comment
**IMPORTANT MUST ATTENTION** tests MUST be infinitely repeatable — unique IDs per run, no cleanup, no rollback; ALWAYS use async polling/retry for ALL DB assertions; verification requires 3 consecutive passing runs without DB reset — why: one green run hides ordering and eventual-consistency flakiness
**IMPORTANT MUST ATTENTION** Gate 6 — read ALL three sources before classifying (never two); NEVER fix a test to match broken code (report the code bug instead); NEVER self-resolve a three-way conflict (escalate via a direct user question); "stale docs" requires BOTH impl code AND test to agree — why: a winner picked without evidence hides bugs
**IMPORTANT MUST ATTENTION** fix ALL CRITICAL/HIGH issues (Phase 5 NOT optional); validate findings via `$why-review` before fixing; after validated fixes rerun a full fresh review until a clean pass returns 0 CRITICAL/0 HIGH — why: every fix invalidates the prior verdict
**IMPORTANT MUST ATTENTION** integration-test reviews ALWAYS spawn the `integration-tester` sub-agent, NEVER `code-reviewer`, with all protocol bodies embedded VERBATIM — why: `code-reviewer` lacks TC-traceability and async-polling assertion depth, and file-path indirection drops compliance ~40%
**IMPORTANT MUST ATTENTION** build and run ALL changed/reviewed tests after fixes (Phase 7 NOT optional) — unverified reviews have zero value; if tests fail, classify (test bug vs service bug vs environment) and root-cause in Phase 8, NEVER retry blindly
**IMPORTANT MUST ATTENTION** write findings to `plans/reports/integration-test-review-{date}-{slug}.md` incrementally — never just return text — why: long sub-agents hit cutoffs before a final batch write and lose findings
**IMPORTANT MUST ATTENTION** every finding requires `file:line` proof with confidence >80%; scope = the CHANGE SET, never just tests; read handler source BEFORE judging assertions

**Anti-Rationalization:**

| Evasion                                    | Rebuttal                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| "Smoke test is fine for now"               | No smoke test earns its place. Fix or delete.                                            |
| "Handler source too long to read"          | Cannot judge assertion quality without reading. REQUIRED.                                |
| "Re-review after fixes is overkill"        | Fixes changed the target. A full fresh review is required before PASS.                   |
| "Tests were passing before"                | Passing ≠ correct. Dead assertions always pass.                                          |
| "Conflict is obvious, I can self-resolve"  | Three-way conflict requires escalation. NEVER self-resolve.                              |
| "Phase 6/7/8 optional for small fixes"     | No exceptions. Every validated fix requires full re-review + build verification.         |
| "0 test files, nothing to review"          | Production changes without tests ARE the review — run Gate 7 coverage mapping.           |
| "A unit test is enough here"               | Integration-first. Unit fallback requires recorded infeasibility justification.          |
| "Test with matching name exists = covered" | Read it. Coverage means it exercises the changed path and asserts the changed outcome.   |
| "Specs can be updated later"               | Spec-driven development: missing/stale TC is a SPEC-GAP finding, fixed in this review.   |
| "I checked the mutants mentally"           | No ledger = Gate 1 FAIL. The Mutation Probe Ledger is the only proof the probe ran.      |
| "My finding list is obviously right"       | AI reports inherit confirmation bias. Validate via `$why-review` before fixing.          |
| "Name match counts as coverage"            | Read the test — coverage requires exercising the changed path AND asserting its outcome. |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

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
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
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
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
