---
name: integration-test-review
description: '[Code Quality] Review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability. Use in review workflows or standalone.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small todo tasks BEFORE starting.
> **A test that cannot fail is not a test. It is decoration.** Every test must earn its existence by proving it would FAIL if the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing)

<!-- SYNC:double-round-trip-review -->

> **Deep Multi-Round Review** — Escalating rounds. Round 1 in main session. Round 2+ and EVERY recursive re-review iteration MUST use a fresh sub-agent.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output baseline findings.
>
> **Round 2:** MANDATORY fresh sub-agent review — see `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. The sub-agent re-reads ALL files from scratch with ZERO Round 1 memory. It must catch:
>
> - Cross-cutting concerns missed in Round 1
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the main session rationalized away
>
> **Round 3+ (recursive after fixes):** After ANY fix cycle, MANDATORY fresh sub-agent re-review. Spawn a **NEW** Agent tool call each iteration — never reuse Round 2's agent. Each new agent re-reads ALL files from scratch with full protocol injection. Continue until PASS or **3 fresh-subagent rounds max**, then escalate to user via `AskUserQuestion`.
>
> **Rules:**
>
> - NEVER declare PASS after Round 1 alone
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via `AskUserQuestion` (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `Agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `Agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via `AskUserQuestion` if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

<!-- SYNC:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 9 protocol blocks VERBATIM. The template below has ALL 9 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 9 protocol bodies pre-embedded.

### Subagent Type Selection

- `code-reviewer` — for code reviews (reviewing source files, git diffs, implementation)
- `general-purpose` — for plan / doc / artifact reviews (reviewing markdown plans, docs, specs)

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
  description: "Fresh Round {N} review",
  subagent_type: "code-reviewer",
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
6. Stack-Specific: JS: === vs ==, typeof null. C#: async void, missing using, LINQ deferred execution.
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
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. From changed files → find TC-{FEAT}-{NNN} in docs/business-features/{Service}/detailed-features/{Feature}.md Section 15.
2. Every changed code path MUST map to a corresponding TC (or flag as "needs TC").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Verify TC evidence fields point to actual code (file:line, not stale references).
5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
6. If no specs exist → log gap and recommend /tdd-spec.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

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

- DO copy the template wholesale — including all 9 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

## Quick Summary

**Goal:** Review integration tests for real bug-protection value, correct data assertions, infinite repeatability, and spec alignment.

**Scope:** All test files in uncommitted changes (default), or user-specified scope.

**Workflow:** Collect → Review (5 gates) → Spec cross-check → Report → **Fix all issues** → **Second-round fresh review** → Build & verify → If fail: investigate + fix plan

**Non-negotiable rules:**

- MUST read the handler/service source before judging any test's assertions
- MUST flag smoke-only tests (no-exception-only checks) as FAIL
- MUST flag DI-resolution-only tests (resolve + not-null) as FAIL — they are NOT integration tests
- MUST verify tests use unique IDs per run (infinitely repeatable)
- MUST use async polling/retry for all DB assertions — async delays are the norm
- NEVER accept assertions that always pass regardless of handler correctness
- **NO smoke/fake/useless tests** — every test must execute actual operations and verify data state

---

## The 5 Quality Gates

### Gate 1: Assertion Value — "Would this catch the bug?"

The #1 AI failure: **hallucination assertions** — look real, verify nothing.

**PASS:** Asserts specific field values that would change if handler had a bug. At least one assertion per test that FAILS if core logic breaks.

**FAIL:**

- No-exception as ONLY assertion
- Not-null without checking content
- Assertions on fields the handler doesn't modify
- Dead assertions: `x >= 0` where x is always >= 0
- Unchecked exception captures
- count >= 0 (always true), string not empty on required fields (always true)

**Verify:** Read handler source → list fields it changes → check test asserts those fields.

### Gate 2: Data State — "Does it check the database?"

**PASS:** After command, test queries DB and asserts specific entity field values.

**FAIL:**

- Only checks return value, never verifies DB state
- Checks existence (not-null) without field values
- Missing async polling on side-effect assertions

**Exception:** Smoke-only ONLY when side effect is truly unobservable. Must be marked with explicit justification comment.

**Always use async polling/retry for data assertions.** Event handlers, bus consumers, background jobs run async. Data may not be available immediately.

### Gate 3: Repeatability — "Can I run this 100 times?"

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data.
>
> 1. **Unique data per run:** Use `Ulid.NewUlid()` or `Guid.NewGuid()` for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No migration Down() dependency:** Tests work with current schema only. Never rely on rollback.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append unique suffix.

<!-- /SYNC:repeatable-test-principle -->

**FAIL:** Hardcoded IDs, hardcoded business keys without unique suffix, teardown/cleanup, ordering dependency, seeders without existence check.

### Gate 4: Domain Logic — "Does test match handler?"

**PASS:** Assertions match what handler ACTUALLY does (verified by reading source). Covers primary business rule. Validation paths tested.

**FAIL:** Assertions on untouched fields (copy-paste), missing primary side-effect assertion, event handler tests that never trigger the event.

**Verify:** Grep handler class → read it → list what it does → compare with assertions.

**Also check:**

- Authorization: does the test verify both authorized AND unauthorized access paths?
- Coverage: at minimum, happy path + validation failure + DB state check (3 tests)

### Gate 5: Spec Traceability — "Is this tracked?"

**PASS:** Test has spec annotation linking to a TC ID. TC ID exists in spec docs. Method name matches TC.

**FAIL (WARN, not BLOCK):** Missing annotation, orphaned TC ID, or spec says "Planned" but test exists.

### Gate 6: Three-Way Sync — "Do test, code, and docs agree?"

The hardest gate. When test code, implementation code, and feature/test-spec docs all differ, the AI must identify the discrepancy and classify it using the source-of-truth hierarchy — never silently pick a winner.

#### Source of Truth Hierarchy (highest → lowest)

| Priority    | Source                                                   | Why                                                                |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| 1 (Highest) | Feature docs (`docs/business-features/…/Section 15 TCs`) | Business intent — defines WHAT must happen                         |
| 2           | Test-spec docs (`docs/test-specs/`)                      | TC scenarios derived from feature docs — defines HOW to verify     |
| 3           | Implementation code (handler/entity/service)             | What WAS built — may reflect intentional evolution not yet in docs |
| 4 (Lowest)  | Integration test code                                    | What IS being tested — most likely to be wrong or stale            |

**Rule:** Docs win over code. Code wins over tests. Feature docs win over test-spec docs.

#### Conflict Classification

For each TC, read all three sources and classify:

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
- A "stale docs" verdict requires BOTH code AND test to agree — one is not enough
- When escalating, include: TC ID, what each source says, and what evidence you found

#### How to verify each source

1. **Feature doc**: Read `docs/business-features/{Service}/detailed-features/{Feature}.md` Section 15 for the TC. Note the scenario title, preconditions, steps, and expected results.
2. **Test-spec doc**: Read `docs/test-specs/{Service}/README.md` (or `INTEGRATION-TESTS.md`) for the same TC. Note whether it says Planned/Implemented and what the described scenario is.
3. **Implementation code**: Read the handler/entity/service that the TC exercises. List what it actually does — fields written, events fired, validation rules.
4. **Test code**: Read the test method. List what it arranges, what command it executes, and what it asserts.

Compare each pair. Document findings with `file:line` for each source.

**PASS:** All three sources agree on scenario intent and outcome.
**WARN:** Minor wording differences with same semantic meaning — flag but do not block.
**FAIL:** Semantic disagreement — a field, rule, or outcome differs between sources.
**ESCALATE:** All three differ and the correct answer cannot be derived from evidence alone.

---

## Review Protocol (9 Phases)

Use `TaskCreate` to create todo tasks for EACH phase below before starting.

**Phase 1 — Collect:** Categorize changed files: new (full review), modified (changed methods only), new projects (infra + samples).

**Phase 2 — Gate Review:** Per file, apply all 6 gates. Record per-file verdict table:

| Gate               | Verdict                 | Evidence    |
| ------------------ | ----------------------- | ----------- |
| 1. Assertion Value | PASS/FAIL               | {file:line} |
| 2. Data State      | PASS/FAIL               | {file:line} |
| 3. Repeatability   | PASS/FAIL               | {file:line} |
| 4. Domain Logic    | PASS/FAIL               | {file:line} |
| 5. Traceability    | PASS/WARN               | {file:line} |
| 6. Three-Way Sync  | PASS/WARN/FAIL/ESCALATE | {file:line} |

**Phase 3 — Spec Cross-Check + Three-Way Diff:** For each TC ID in code:

1. Verify TC entry exists in both `docs/business-features/` (Section 15) and `docs/test-specs/`
2. Read what the TC describes in each doc
3. Read what the implementation code actually does
4. Read what the test asserts
5. Classify the conflict pattern (Gate 6 table) and record action
6. Flag gaps both directions: TC in code but not in docs, or "Implemented" TC in docs but no test found

**Phase 4 — Initial Report:** Write to `plans/reports/integration-test-review-{date}-{slug}.md`

**Phase 5 — Fix All Issues (MANDATORY):** Fix every CRITICAL and HIGH issue found in Phase 2. MEDIUM issues: fix if straightforward, otherwise document as tech debt.

1. Prioritize: CRITICAL first, then HIGH, then MEDIUM
2. For each fix: read the handler source, understand the domain logic, then write/fix the assertion
3. **Never weaken assertions to make tests pass** — fix root cause (timing, data, setup) instead
4. After fixing, re-read changed files to verify the fix is correct
5. Record each fix with `file:line` in the report under `## Fixes Applied`

**Phase 6 — Fresh Sub-Agent Re-Review (MANDATORY):**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

After Phase 5 fixes, spawn fresh `code-reviewer` sub-agents (parallel by module for 10+ files; single agent otherwise) using the canonical Agent template from `SYNC:review-protocol-injection` above. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2 findings or Phase 5 fixes. When constructing each Agent call prompt:

1. Copy the Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "code-reviewer"`
3. Embed the full verbatim body of these 9 SYNC blocks (all present inline above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. In the Task field, specify: `"Review the integration tests in {file-list} against the 6 quality gates: assertion value, data state verification, infinite repeatability, domain logic, test-spec traceability, and three-way sync (test code vs implementation code vs feature/test-spec docs). Read handler source AND feature docs before judging assertions. Flag smoke-only, existence-only, and dead assertions as FAIL. Apply the source-of-truth hierarchy: feature docs > test-spec docs > implementation code > test code. Classify every disagreement as: wrong test, code bug, stale docs, or escalate (three-way conflict)."`
5. Set Target Files as the explicit file list (never pass inline contents)
6. Set Reference Docs to include `docs/project-reference/integration-test-reference.md`
7. Set report path as `plans/reports/integration-test-review-round{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in the main report — DO NOT filter or override
3. **If new CRITICAL or HIGH issues:** fix them, then spawn NEW Round N+1 fresh sub-agents (never reuse prior agents)
4. **Max 3 fresh rounds** — escalate to user via `AskUserQuestion` if still failing after 3 rounds
5. **Exit criteria:** Fresh-round review returns 0 CRITICAL and 0 HIGH issues

**Phase 7 — Build & Run Tests (MANDATORY):** Build and run ALL changed/reviewed test files. Verify they pass.

1. Build the test project
2. Run changed tests (filter by reviewed test classes)
3. **Never mark review complete until all tests pass.** Unverified reviews have zero value.
4. Record pass/fail results in the report under `## Test Execution Results`

**Phase 8 — Failure Investigation (if Phase 7 fails):** If tests fail after fixes, do NOT just retry. Investigate systematically.

1. **Classify failure:** Test bug (assertion wrong, setup wrong) vs Service bug (handler broken) vs Environment (service not running, DB timeout)
2. **Root cause analysis:** Read the failing test output, trace through handler source, identify the exact mismatch
3. **Generate fix plan:** For each failure, document:
    - Failing test: `file:line`, TC-ID
    - Error message / stack trace summary
    - Root cause (with confidence %)
    - Proposed fix (with `file:line` of what to change)
4. **Apply fixes and rerun** — loop until all pass or environment blockers identified
5. **Environment blockers:** If tests fail because services are not running, document in report and mark as `BLOCKED — requires running system`. Do NOT mark these as test failures.
6. Append to report under `## Failure Investigation`

**10+ files:** Use parallel sub-agents grouped by module. Each gets file list + 6 gates + handler paths + feature doc paths. Consolidate into single report.

---

## Common Anti-Patterns

| Anti-Pattern                                     | Why It's Bad                                     |
| ------------------------------------------------ | ------------------------------------------------ |
| **Smoke-only** (no-exception alone)              | Proves no crash, not correctness                 |
| **Existence-only** (not-null)                    | Proves data exists, not handler set it correctly |
| **Dead assertion** (`count >= 0`, always true)   | Tests nothing                                    |
| **Framework testing** (assert auto-set fields)   | Tests framework, not handler                     |
| **Copy-paste assertions** (wrong entity fields)  | Assertions don't match handler                   |
| **Hardcoded ID** (`Id = "test-001"`)             | Fails on second run                              |
| **Cleanup dependency** (`finally { Delete(); }`) | Fragile, hides pollution                         |
| **Order dependency** (test B needs A first)      | Parallel execution breaks                        |
| **Missing await** (unchecked async exception)    | Exception swallowed silently                     |
| **Event not triggered** (query, never fire)      | Tests seeder, not handler                        |
| **Test fixed to match broken code**              | Hides the bug — docs still say it's wrong        |
| **Self-resolved three-way conflict**             | AI picked a winner without evidence — silent lie |
| **Stale docs assumed without two-source proof**  | Docs may be right; code may be the bug           |

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** use `TaskCreate` to break ALL work into small todo tasks BEFORE starting — create todo tasks for each phase
- **MANDATORY IMPORTANT MUST ATTENTION** a test that cannot fail is decoration — if it can't catch the bug, delete or fix it
- **MANDATORY IMPORTANT MUST ATTENTION** read the handler source before judging assertions — you cannot review what you don't understand
- **MANDATORY IMPORTANT MUST ATTENTION** tests MUST be infinitely repeatable — unique data per run, no cleanup, no rollback dependency
- **MANDATORY IMPORTANT MUST ATTENTION** always use async polling/retry for DB assertions — async delays from event handlers and consumers
- **MANDATORY IMPORTANT MUST ATTENTION** flag smoke-only as FAIL unless justified with explicit design comment
- **MANDATORY IMPORTANT MUST ATTENTION** write findings to report file — never just return text
- **MANDATORY IMPORTANT MUST ATTENTION** fix all CRITICAL and HIGH issues BEFORE running tests — Phase 5 is NOT optional
- **MANDATORY IMPORTANT MUST ATTENTION** second-round fresh review after fixes — Phase 6 ensures fixes are correct and no new issues introduced
- **MANDATORY IMPORTANT MUST ATTENTION** build and run ALL tests after fixes — Phase 7 is NOT optional, unverified reviews have zero value
- **MANDATORY IMPORTANT MUST ATTENTION** if tests fail, investigate root cause systematically — Phase 8 generates diagnostic report with fix plan, never just retry blindly
- **MANDATORY IMPORTANT MUST ATTENTION** Gate 6: read ALL three sources (feature doc, impl code, test code) before classifying any discrepancy — never classify from two sources alone
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER fix a test to match broken code — that hides the bug; docs + code must agree first
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER self-resolve a three-way conflict — always escalate via `AskUserQuestion` with evidence from all three sources
- **MANDATORY IMPORTANT MUST ATTENTION** "stale docs" verdict requires BOTH implementation code AND test code to agree — one source is never enough to declare docs wrong
