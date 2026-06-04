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

Codex does not receive Claude hook-based doc injection.
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

- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing) _(read directly; do not rely on hook-injected conversation text)_

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

### Gate 1: Assertion Value — "Would this catch the bug?"

> **Think:** If I deleted the core logic from this handler, which assertions would fail? If NONE → FAIL.

**#1 AI failure:** hallucination assertions — look real, verify nothing.

**PASS:** At least one assertion per test FAILS if core logic breaks.

**FAIL:**

- No-exception as ONLY assertion
- Not-null without content check
- Assertions on fields handler doesn't modify
- Dead assertions: `x >= 0` where x always >= 0, `count >= 0`, string not-empty on required fields

**Verify:** Read handler source → list fields it changes → check test asserts those fields.

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
5. **Check spec alignment for the change:** each changed behavior must map to a TC in spec docs (feature doc Section 8 / test-spec docs). New behavior with no TC, or changed behavior whose TC still describes the OLD behavior → spec gap (spec-driven development violation).

**Coverage Mapping Table (MANDATORY output):**

> Rows are keyed by **changed production behavior**, not by TC. A behavior is COVERED when **≥1** covering test exercises it — list ALL covering tests in the column when several apply. One `Spec TC` may legitimately appear across multiple rows and be covered by many tests (one TC → many tests, 1:N). Do NOT expect or require one test per TC, and do NOT flag a TC reused across rows as a duplicate (see `tc-format.md` → TC ↔ Test Code Cardinality).

| Changed File / Behavior | Spec TC            | Covering Test(s)                          | Test Type                          | Verdict                                 |
| ----------------------- | ------------------ | ----------------------------------------- | ---------------------------------- | --------------------------------------- |
| {file:line — behavior}  | TC-X-NNN / MISSING | {test file:method}[, …one or more] / NONE | integration / unit (justified) / — | COVERED / COVERED-UNIT / GAP / SPEC-GAP |

**Verdicts:**

- **COVERED** — integration test exercises the changed path with data-state assertions
- **COVERED-UNIT** — unit test covers it, integration infeasible, justification recorded
- **GAP (FAIL)** — no test would fail if the change broke. Severity: HIGH minimum; CRITICAL when the change touches authorization, money, or data integrity. Fix in Phase 5 by WRITING the missing test (integration-first) — reporting alone does not clear this gate
- **SPEC-GAP (FAIL)** — behavior has no TC or a stale TC in spec docs. Fix via `$spec [mode=tests]` UPDATE (and `$spec` when business rules changed)

**FAIL:**

- Changed handler/command/entity rule with zero covering test
- Unit test substituted where an integration test is feasible, with no justification
- Test exists but does not assert the changed outcome (stale coverage counted as coverage)
- New/changed behavior absent from spec docs, or TC describing superseded behavior

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

7. Verify a TC exists describing the changed behavior; if the TC still describes the OLD behavior, flag it as stale (route to `$spec [mode=tests]` UPDATE)
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

Do not spawn a fresh reviewer to re-review the same findings before validation/fix. After Phase 5 applies validated fixes, run a full fresh review over the current test scope. When that review uses sub-agents, spawn fresh `code-reviewer` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "code-reviewer"`
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
| **1:1 TC↔test demanded** (one test per TC, method-name=TC, or many-tests-per-TC flagged as duplicate) | Forces splitting/technicalizing business TCs — breaks §8's business/user-story orientation (M1/M5). One TC → many tests is correct |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, MUST use a direct user question to ask user:
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

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, MUST use a direct user question:

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
> **BLOCKED until:** Evidence file path (`file:line`) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because".
>
> **If incomplete → output:** "Insufficient evidence. Verified: [...]. Not verified: [...]."

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`, fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
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

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
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

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "code-reviewer",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

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

- DO copy the template wholesale — including all 10 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` agent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing, stop and run or ask the user to run `$project-init`.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Ensure the review target (changed production code) has test coverage (integration-first) and that integration tests protect real business behavior with repeatable data-state assertions aligned to specs and implementation.

- **MANDATORY IMPORTANT MUST ATTENTION** use task tracking for ALL phases BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** scope = the CHANGE SET (production + tests) — never review only the test files; Gate 7 coverage mapping is NOT optional
- **MANDATORY IMPORTANT MUST ATTENTION** every behavior-changing production change needs a covering test — integration-first; unit fallback requires recorded justification; GAP = HIGH minimum, fixed by WRITING the test
- **MANDATORY IMPORTANT MUST ATTENTION** spec-driven alignment runs BOTH directions — from TCs in tests AND from changed code back to spec docs; missing/stale TC = SPEC-GAP finding
- **MANDATORY IMPORTANT MUST ATTENTION** test that cannot fail is decoration — if it can't catch the protected business rule/invariant breaking, delete or fix it
- **MANDATORY IMPORTANT MUST ATTENTION** read handler source BEFORE judging assertions — cannot review without understanding
- **MANDATORY IMPORTANT MUST ATTENTION** tests MUST be infinitely repeatable — unique data per run, no cleanup, no rollback
- **MANDATORY IMPORTANT MUST ATTENTION** integration-test verification requires 3 consecutive passing runs without DB reset
- **MANDATORY IMPORTANT MUST ATTENTION** ALWAYS use async polling/retry for DB assertions
- **MANDATORY IMPORTANT MUST ATTENTION** flag smoke-only as FAIL unless justified with explicit design comment
- **MANDATORY IMPORTANT MUST ATTENTION** write findings to report file — never just return text
- **MANDATORY IMPORTANT MUST ATTENTION** fix ALL CRITICAL and HIGH issues BEFORE running tests — Phase 5 NOT optional
- **MANDATORY IMPORTANT MUST ATTENTION** validate findings before fixes; after validated fixes, rerun a full fresh review before declaring PASS
- **MANDATORY IMPORTANT MUST ATTENTION** build and run ALL tests after fixes — Phase 7 NOT optional; unverified reviews have zero value
- **MANDATORY IMPORTANT MUST ATTENTION** if tests fail, classify and investigate root cause — Phase 8 generates fix plan; NEVER retry blindly
- **MANDATORY IMPORTANT MUST ATTENTION** Gate 6: read ALL three sources before classifying — never classify from two sources alone
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER fix a test to match broken code — hides the bug
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER self-resolve a three-way conflict — escalate via a direct user question
- **MANDATORY IMPORTANT MUST ATTENTION** "stale docs" requires BOTH impl code AND test to agree — one source never enough
- **MANDATORY IMPORTANT MUST ATTENTION** validate findings before fixes; after validated fixes, rerun full integration-test review before PASS

**Anti-Rationalization:**

| Evasion                                    | Rebuttal                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| "Smoke test is fine for now"               | No smoke test earns its place. Fix or delete.                                          |
| "Handler source too long to read"          | Cannot judge assertion quality without reading. REQUIRED.                              |
| "Re-review after fixes is overkill"        | Fixes changed the target. A full fresh review is required before PASS.                 |
| "Tests were passing before"                | Passing ≠ correct. Dead assertions always pass.                                        |
| "Conflict is obvious, I can self-resolve"  | Three-way conflict requires escalation. NEVER self-resolve.                            |
| "Phase 6/7/8 optional for small fixes"     | No exceptions. Every validated fix requires full re-review + build verification.       |
| "0 test files, nothing to review"          | Production changes without tests ARE the review — run Gate 7 coverage mapping.         |
| "A unit test is enough here"               | Integration-first. Unit fallback requires recorded infeasibility justification.        |
| "Test with matching name exists = covered" | Read it. Coverage means it exercises the changed path and asserts the changed outcome. |
| "Specs can be updated later"               | Spec-driven development: missing/stale TC is a SPEC-GAP finding, fixed in this review. |

---

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

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
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
