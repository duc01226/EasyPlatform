---
name: integration-test-review
description: '[Code Quality] Review integration tests for assertion quality, bug protection, repeatability, and test-spec traceability. Use in review workflows or standalone.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting.
> **A test that cannot fail is not a test — it is decoration.** Every test MUST earn existence by proving it would FAIL if the bug it guards were reintroduced.
> Every finding requires `file:line` proof with confidence >80%.

## Quick Summary

**Goal:** Review integration tests for real bug-protection value, correct data assertions, infinite repeatability, spec alignment.

**Scope:** All test files in uncommitted changes (default), or user-specified scope.

**Workflow:** Phase 0 Detect → Collect → 6-Gate Review → Spec Cross-Check → Report → Fix issues → Fresh sub-agent re-review → Build & verify → If fail: investigate + fix plan

**Non-negotiable rules:**

- MUST read handler/service source BEFORE judging any test assertions
- MUST flag smoke-only tests (no-exception-only checks) as FAIL
- MUST flag DI-resolution-only tests (resolve + not-null) as FAIL — NOT integration tests
- MUST verify tests use unique IDs per run (infinitely repeatable)
- MUST use async polling/retry for ALL DB assertions — async delays are norm
- NEVER accept assertions that always pass regardless of handler correctness
- **NO smoke/fake/useless tests** — every test MUST execute actual operations and verify data state

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing) _(check for [Injected: ...] header before reading — may be auto-injected by hook)_

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
> **Round 3+ (recursive after fixes):** After ANY fix cycle, MANDATORY fresh sub-agent re-review. Spawn a **NEW** `spawn_agent` tool call each iteration — never reuse Round 2's agent. Each new agent re-reads ALL files from scratch with full protocol injection. Continue until PASS or **3 fresh-subagent rounds max**, then escalate to user via a direct user question.
>
> **Rules:**
>
> - NEVER declare PASS after Round 1 alone
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via a direct user question (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `spawn_agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `spawn_agent` call
> - NEVER skip fresh-subagent review because "last round was clean" — every fix triggers a fresh round
> - Max 3 fresh-subagent rounds per review — escalate via a direct user question if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

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
6. If no specs exist → log gap and recommend $tdd-spec.
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
- DO choose `code-reviewer` subagent_type for code reviews and `general-purpose` for plan / doc / artifact reviews
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /SYNC:review-protocol-injection -->

---

## Phase 0: Scope Detection

Classify BEFORE any gate review. Route wrong → waste all effort.

| Signal                  | Classification      | Action                                                              |
| ----------------------- | ------------------- | ------------------------------------------------------------------- |
| No user-specified files | Uncommitted changes | Run `git diff --name-only` to collect scope                         |
| User specifies files    | Explicit scope      | Use provided list directly                                          |
| 10+ test files          | Large scope         | Parallel sub-agents grouped by module                               |
| 1-9 test files          | Normal scope        | Single review pass                                                  |
| 0 test files in changes | No tests            | Report gap — ask user for explicit scope via a direct user question |

**Search for test reference docs** — NEVER hardcode paths. Grep for `integration-test-reference`, `test-patterns`, `integration-test-guide` near changed test files to discover project-specific conventions before starting gate review.

---

## The 6 Quality Gates

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

<!-- SYNC:repeatable-test-principle -->

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.

<!-- /SYNC:repeatable-test-principle -->

**FAIL:** Hardcoded IDs, hardcoded business keys without unique suffix, teardown/cleanup, ordering dependency, seeders without existence check.

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

**PASS:** Test has spec annotation linking to TC ID. TC ID exists in spec docs. Method name matches TC.

**FAIL (WARN, not BLOCK):** Missing annotation, orphaned TC ID, or spec says "Planned" but test exists.

### Gate 6: Three-Way Sync — "Do test, code, and docs agree?"

> **Think:** Have I read ALL 3 sources? Where exactly do they disagree? Does evidence support a verdict, or must I escalate?

Hardest gate. Identify discrepancy, classify using source-of-truth hierarchy — NEVER silently pick winner.

#### Source of Truth Hierarchy (highest → lowest)

| Priority    | Source                                                   | Why                                                                |
| ----------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| 1 (Highest) | Feature docs (`docs/business-features/…/Section 15 TCs`) | Business intent — defines WHAT must happen                         |
| 2           | Test-spec docs (`docs/specs/`)                           | TC scenarios derived from feature docs — defines HOW to verify     |
| 3           | Implementation code (handler/entity/service)             | What WAS built — may reflect intentional evolution not yet in docs |
| 4 (Lowest)  | Integration test code                                    | What IS being tested — most likely to be wrong or stale            |

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

1. **Feature doc:** Read Section 15 — scenario title, preconditions, steps, expected results
2. **Test-spec doc:** Find same TC — Planned/Implemented status and described scenario
3. **Implementation code:** Read handler/entity/service — fields written, events fired, validation rules
4. **Test code:** Read test method — arrange, execute, assert

Compare each pair with `file:line` evidence for each source.

**PASS:** All three agree. **WARN:** Minor wording, same semantic. **FAIL:** Semantic disagreement on field/rule/outcome. **ESCALATE:** All three differ and evidence cannot resolve.

---

## Review Protocol (9 Phases)

Use task tracking for EACH phase before starting.

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

1. Verify TC entry exists in both `docs/business-features/` (Section 15) and `docs/specs/`
2. Read what TC describes in each doc
3. Read what implementation code actually does
4. Read what test asserts
5. Classify conflict pattern (Gate 6 table) and record action
6. Flag gaps both directions: TC in code but not in docs, or "Implemented" TC in docs but no test found

**Phase 4 — Initial Report:** Write to `plans/reports/integration-test-review-{date}-{slug}.md`

**Phase 5 — Fix All Issues (MANDATORY):** Fix every CRITICAL and HIGH issue. MEDIUM: fix if straightforward, document as tech debt otherwise.

1. Prioritize: CRITICAL → HIGH → MEDIUM
2. Per fix: read handler source, understand domain logic, write/fix assertion
3. NEVER weaken assertions to make tests pass — fix root cause (timing, data, setup) instead
4. Re-read changed files to verify fix correctness
5. Record each fix with `file:line` under `## Fixes Applied`

**Phase 6 — Fresh Sub-Agent Re-Review (MANDATORY):**

After Phase 5 fixes, spawn fresh `code-reviewer` sub-agents (parallel by module for 10+ files; single agent otherwise) using canonical Agent template from `SYNC:review-protocol-injection`. Each sub-agent re-reads ALL target test files from scratch with ZERO memory of Phase 2/5. When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Set `agent_type: "code-reviewer"`
3. Embed full verbatim body of 9 SYNC blocks (all present inline in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
4. Task field: `"Review integration tests in {file-list} against 6 quality gates: assertion value, data state, infinite repeatability, domain logic, test-spec traceability, three-way sync. Read handler source AND feature docs before judging assertions. Flag smoke-only, existence-only, dead assertions as FAIL. Source-of-truth hierarchy: feature docs > test-spec docs > implementation code > test code. Classify every disagreement as: wrong test, code bug, stale docs, or escalate (three-way conflict)."`
5. Target Files: explicit file list (never pass inline contents)
6. Reference Docs: include `docs/project-reference/integration-test-reference.md`
7. Report path: `plans/reports/integration-test-review-round{N}-{date}.md`

After sub-agents return:

1. **Read** each sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` — DO NOT filter or override
3. **If new CRITICAL/HIGH:** fix → spawn NEW Round N+1 fresh sub-agents (never reuse prior agents)
4. **Max 3 fresh rounds** — escalate via a direct user question if still failing after 3 rounds
5. **Exit criteria:** Fresh-round review returns 0 CRITICAL and 0 HIGH issues

**Phase 7 — Build & Run Tests (MANDATORY):** Build and run ALL changed/reviewed test files.

1. Build test project
2. Run changed tests (filter by reviewed test classes)
3. NEVER mark review complete until all tests pass — unverified reviews have zero value
4. Record results under `## Test Execution Results`

**Phase 8 — Failure Investigation (if Phase 7 fails):** Never just retry — investigate systematically.

1. **Classify failure:** Test bug (assertion/setup wrong) vs Service bug (handler broken) vs Environment (service not running, DB timeout)
2. **Root cause:** Read failing output, trace handler source, identify exact mismatch
3. **Fix plan per failure:** failing test (`file:line`, TC-ID), error summary, root cause + confidence %, proposed fix
4. **Apply and rerun** — loop until pass or environment blockers identified
5. **Environment blockers:** Document as `BLOCKED — requires running system`; do NOT mark as test failures
6. Append under `## Failure Investigation`

**10+ files:** Parallel sub-agents grouped by module. Each gets file list + 6 gates + handler paths + feature doc paths. Consolidate into single report.

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
| **Self-resolved three-way conflict**             | AI picked winner without evidence — silent lie   |
| **Stale docs assumed without two-source proof**  | Docs may be right; code may be the bug           |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, MUST use a direct user question to ask user:
>
> 1. **Activate `write-integration-test` workflow** (Recommended) — scout → investigate → tdd-spec → tdd-spec-review → integration-test → integration-test-review → integration-test-verify → tdd-spec [direction=sync] → docs-update → watzup → workflow-end
> 2. **Execute `$integration-test-review` directly** — run standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing, MUST use a direct user question:

- **"$integration-test-verify (Recommended)"** — Run integration tests to verify all pass
- **"$workflow-review-changes"** — Review all changes before committing
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                      | Relationship                                                           | When to Call                                                                   |
| -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `$integration-test`        | **Producer** — generates tests this skill reviews                      | Always preceded by $integration-test                                           |
| `$integration-test-verify` | **Successor** — runs tests after review clears                         | Call after review passes all 6 gates                                           |
| `$tdd-spec`                | **TC source** — Gate 5 checks TCs exist in feature doc Section 15      | If Gate 5 fails (orphaned test) → run $tdd-spec UPDATE                         |
| `$spec-discovery`          | **Spec authority** — Gate 6 compares test code vs spec bundle          | If Gate 6 finds conflict: spec is authority                                    |
| `$feature-docs`            | **Business doc** — Gate 6 compares tests vs feature doc business rules | If Gate 6 finds conflict: check feature-docs vs spec-discovery alignment first |
| `$docs-update`             | **Orchestrator** — includes tdd-spec sync                              | Call when Gate 6 reveals doc staleness                                         |

## Standalone Chain

> When called outside a workflow, follow this chain after running integration-test-review.

```
integration-test-review (you are here)
  │
  ├─ PREREQUISITE: integration tests must already exist
  │    [REQUIRED] Verify: IntegrationTests/ directory has test files with [Trait("TestSpec", ...)] annotations
  │
  ├─ Gate 1-5 findings → fix tests (re-run integration-test if test code needs regeneration)
  │
  ├─ Gate 6 (Three-Way Sync) conflict resolution:
  │    │
  │    ├─ Test code ≠ spec (feature doc says behavior A, test asserts behavior B):
  │    │    → Determine: spec authoritative or test authoritative?
  │    │    → If SPEC is correct: fix test → re-run $integration-test
  │    │    → If TEST reflects correct new behavior (spec stale): $spec-discovery [update] → $feature-docs [update] → $tdd-spec [UPDATE] → update test
  │    │
  │    ├─ Test code ≠ implementation (test asserts X, code does Y):
  │    │    → If CODE is correct: fix test → $tdd-spec UPDATE (update TC to match code's correct behavior)
  │    │    → If TEST is correct (code bug): do NOT update test → fix code → $prove-fix → re-run tests
  │    │
  │    └─ Feature doc ≠ spec bundle (business doc says A, engineering spec says B):
  │         → Feature doc has higher authority for business rules
  │         → Run $spec-discovery [update] to reconcile engineering spec with business doc
  │         → Do NOT self-resolve — escalate to user if ambiguous
  │
  ├─ [REQUIRED] → $integration-test-verify
  │     After all fixes, run actual tests to confirm all gates pass.
  │
  ├─ [REQUIRED] → $tdd-spec [direction=sync]
  │     If TCs were updated (Gate 5/6 fix), sync QA dashboard.
  │
  └─ [RECOMMENDED] → $docs-update
        If Gate 6 revealed doc staleness, $docs-update runs full chain to update all layers.
```

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** use task tracking for ALL phases BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** test that cannot fail is decoration — if it can't catch the bug, delete or fix it
- **MANDATORY IMPORTANT MUST ATTENTION** read handler source BEFORE judging assertions — cannot review without understanding
- **MANDATORY IMPORTANT MUST ATTENTION** tests MUST be infinitely repeatable — unique data per run, no cleanup, no rollback
- **MANDATORY IMPORTANT MUST ATTENTION** ALWAYS use async polling/retry for DB assertions
- **MANDATORY IMPORTANT MUST ATTENTION** flag smoke-only as FAIL unless justified with explicit design comment
- **MANDATORY IMPORTANT MUST ATTENTION** write findings to report file — never just return text
- **MANDATORY IMPORTANT MUST ATTENTION** fix ALL CRITICAL and HIGH issues BEFORE running tests — Phase 5 NOT optional
- **MANDATORY IMPORTANT MUST ATTENTION** spawn fresh sub-agent after fixes — Phase 6 NOT optional; Round 1 alone NEVER declares PASS
- **MANDATORY IMPORTANT MUST ATTENTION** build and run ALL tests after fixes — Phase 7 NOT optional; unverified reviews have zero value
- **MANDATORY IMPORTANT MUST ATTENTION** if tests fail, classify and investigate root cause — Phase 8 generates fix plan; NEVER retry blindly
- **MANDATORY IMPORTANT MUST ATTENTION** Gate 6: read ALL three sources before classifying — never classify from two sources alone
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER fix a test to match broken code — hides the bug
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER self-resolve a three-way conflict — escalate via a direct user question
- **MANDATORY IMPORTANT MUST ATTENTION** "stale docs" requires BOTH impl code AND test to agree — one source never enough

**Anti-Rationalization:**

| Evasion                                   | Rebuttal                                                          |
| ----------------------------------------- | ----------------------------------------------------------------- |
| "Smoke test is fine for now"              | No smoke test earns its place. Fix or delete.                     |
| "Handler source too long to read"         | Cannot judge assertion quality without reading. REQUIRED.         |
| "Fresh sub-agent is overkill"             | Round 1 alone NEVER declares PASS. Non-negotiable.                |
| "Tests were passing before"               | Passing ≠ correct. Dead assertions always pass.                   |
| "Conflict is obvious, I can self-resolve" | Three-way conflict requires escalation. NEVER self-resolve.       |
| "Phase 6/7/8 optional for small fixes"    | No exceptions. Every fix requires re-review + build verification. |
| "0 test files, nothing to review"         | Report gap and ask user — do NOT silently exit.                   |

---

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
