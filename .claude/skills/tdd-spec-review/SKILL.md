---
name: tdd-spec-review
version: 1.1.0
description: '[Code Quality] Review test specifications for coverage, completeness, and correctness before implementation. AI self-review gate after /tdd-spec.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

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

<!-- SYNC:graph-impact-analysis -->

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

<!-- /SYNC:graph-impact-analysis -->

- `docs/test-specs/` — Test specifications by module (cross-reference during review to verify TC completeness and avoid duplicates)
- `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)

## Quick Summary

**Goal:** Auto-review test specifications for coverage completeness, TC format correctness, and no missing test cases before implementation proceeds.

**Key distinction:** AI self-review (automatic), NOT user interview.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Adversarial Review Mindset (NON-NEGOTIABLE)

**Default stance: SKEPTIC probing test coverage gaps, not confirming coverage completeness.**

> **Coverage illusion trap:** A spec with many TCs feels complete. But TCs that test implementation details, trivial happy paths, or vague outcomes provide false coverage confidence. This section forces quality challenge beyond count.

### Adversarial Techniques (apply ALL before concluding)

**1. Mutation Analysis Mindset**
For each TC: "If I changed ONE line of the implementation this TC is testing, would this TC fail?" If the TC would still pass after a subtle bug is introduced — it is not testing behavior, it is testing presence. Flag it.

**2. Negative Test Adequacy**
List the 3 most likely production failures for this feature (invalid input, service timeout, data corruption, race condition). Does at least one TC cover each failure mode? If a production failure has no corresponding TC, it will not be caught until production.

**3. TC Quality Challenge**
For each TC, check its assertion: "Could this TC PASS even if the feature is broken?" (e.g., "Response is 200 OK" without checking response body). Flag TCs where the assertion is too coarse to catch regressions.

**4. Coverage Gap Hunt**
Identify code paths that EXIST but have NO corresponding TC. Common gaps: admin/superuser paths, concurrent access, partial data states, idempotency, rollback behavior. If a gap exists — flag it, don't rationalize it.

**5. Boundary Condition Probe**
For each TC that tests a value (count, length, amount): "Is there a TC for the value-1, value, value+1 boundary?" Off-by-one errors are the most common business logic bug. If boundary TCs are missing, flag them.

**6. Contrarian Pass**
Before writing any verdict, generate at least 2 sentences arguing the OPPOSITE conclusion. Then decide which argument is stronger.

### Forbidden Patterns

- **"Coverage looks complete"** → Count is NOT quality. Would a mutation pass these TCs?
- **"Happy path is tested"** → The happy path is the least likely failure mode in production.
- **"Edge cases included"** → Are they the RIGHT edge cases? Name the 3 most likely production failures.
- **"Assertions are clear"** → Can the feature be broken while the assertion still passes?
- **Approving test specs without adversarial quality challenge** → Forbidden.

### Anti-Bias Gate (MANDATORY before finalizing verdict)

- [ ] Applied mutation analysis to at least 1 TC per feature area
- [ ] Listed 3 production failure modes and verified TCs cover them
- [ ] Checked TC assertion specificity (can it pass even if feature breaks?)
- [ ] Identified at least 1 coverage gap (code path with no TC)
- [ ] Verified boundary TCs exist for value-based assertions
- [ ] Generated at least 2 sentences arguing the opposite verdict

If any box is unchecked → adversarial review incomplete. Go back.

## Workflow

1. **Locate test specs** — Find TCs in feature doc Section 15 or `docs/test-specs/`
2. **Load source** — Read stories/PBI/acceptance criteria that TCs should cover
3. **Evaluate checklist** — Score each check
4. **Calculate coverage** — % of stories/AC with corresponding TCs
5. **Classify** — PASS/WARN/FAIL
6. **Output verdict**

## Checklist

### Required (all must pass)

| #   | Check                                                                                     | Presence                                         | Quality Depth                                                                                               |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | **TC ID format** — All TCs follow `TC-{FEATURE}-{NNN}` format                             | Do all TCs use the `TC-{FEATURE}-{NNN}` pattern? | Are IDs unique per TC? Does the FEATURE code match the actual feature?                                      |
| 2   | **Story coverage** — Every user story has at least one corresponding TC                   | Does every story ID appear in at least one TC?   | Does each TC actually test the story behavior, or does it just reference the story ID in a comment?         |
| 3   | **AC coverage** — Every acceptance criterion has a test case                              | Is every AC traceable to at least one TC?        | Does each AC have a TC that would FAIL if the AC is violated?                                               |
| 4   | **Happy path** — Each story has at least one happy path TC                                | Is a happy path TC present per story?            | Does the happy path TC verify the full end-to-end scenario, or just a happy-path stub?                      |
| 5   | **Error path** — Each story has at least one error/failure TC                             | Is an error/failure TC present per story?        | Does the error TC verify the exact error response (code + message), not just that an error occurred?        |
| 6   | **No duplicates** — No duplicate TCs testing the same scenario                            | Are all TC IDs unique with distinct scenarios?   | Are there TCs that test the same scenario with slightly different input? Flag near-duplicates.              |
| 7   | **Testable assertions** — Each TC has clear expected result (not vague "should work")     | Does each TC have a specific expected result?    | Is each assertion specific enough to catch regressions? Would it pass if the return value is wrong?         |
| 8   | **Authorization TCs** — At least 1 TC per story verifying unauthorized access is rejected | Is an authorization TC present per story?        | Does the authorization TC test a realistic access scenario, not just "wrong role → 403 without body check"? |

### Recommended (>=50% should pass)

| #   | Check                                                                                                                                                       | Presence                                                                 | Quality Depth                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Edge cases** — Boundary values, empty inputs, max limits tested                                                                                           | Are edge case TCs listed?                                                | Are these the RIGHT edge cases? Do they cover the 3 most likely production failure modes for this feature?                  |
| 2   | **Integration points** — Cross-service scenarios covered                                                                                                    | Are cross-service TCs present where applicable?                          | Do integration TCs verify actual data flow across services, or just that a downstream call was made?                        |
| 3   | **Performance TCs** — Response time or throughput expectations where relevant; production-like data volume TCs if >1000 records expected (ref: protocol §4) | Are performance TCs present where data volume or SLA expectations exist? | Do performance TCs use production-like data volumes, not toy datasets that trivially pass?                                  |
| 4   | **Security TCs** — Auth, authorization, input validation tested                                                                                             | Are security TCs present for auth, authz, and input validation?          | Do security TCs attempt realistic attack vectors (SQLi, over-posting, privilege escalation) not just "invalid token → 401"? |
| 5   | **Seed data TCs** — If feature needs reference data, TCs verify data exists and seeder runs correctly (ref: protocol §2)                                    | If reference data is needed, does a seed data TC exist (or N/A)?         | If present, does the TC assert the exact seeded data shape, not just that the seeder ran without error?                     |
| 6   | **Data migration TCs** — If schema changes exist, TCs verify data transforms correctly, rollback works, no data loss (ref: protocol §5)                     | If schema changes exist, does a migration TC exist (or N/A)?             | If present, does the TC verify rollback behavior and zero data loss, not just forward migration success?                    |

## Output

```markdown
## Test Spec Review Result

**Status:** PASS | WARN | FAIL
**TCs reviewed:** {count}
**Coverage:** {X}% of stories, {Y}% of acceptance criteria

### Coverage Matrix

| Story/AC | TC IDs | Happy | Error | Edge |
| -------- | ------ | ----- | ----- | ---- |

### Required ({X}/{Y})

- ✅/❌ Check description

### Recommended ({X}/{Y})

- ✅/⚠️ Check description

### Missing Coverage

- {Stories/AC without TCs}

### Verdict

{PROCEED | REVISE_FIRST}
```

## Round 2+ : Fresh Sub-Agent Re-Review (MANDATORY)

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

After completing Round 1 checklist evaluation, spawn a **fresh `general-purpose` sub-agent** for Round 2 using the canonical Agent template from `SYNC:review-protocol-injection` above. Test specification reviews are NOT code reviews — use `subagent_type: "general-purpose"`. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Set `subagent_type: "general-purpose"`
3. Embed the full verbatim body of these SYNC blocks: `SYNC:evidence-based-reasoning`, `SYNC:rationalization-prevention`, `SYNC:understand-code-first` (omit code-specific protocols like `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:fix-layer-accountability` which are not applicable to test specification artifacts)
4. Set the Task as `"Review the test specification artifacts for coverage completeness and quality. Focus on: implicit assumptions not validated, missing story/AC coverage, edge cases not addressed, cross-references not verified, vague expected results, duplicate TCs, missing authorization TCs."`
5. Set Target Files as the explicit test specification file paths being reviewed
6. Set report path as `plans/reports/tdd-spec-review-round{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in the main report — DO NOT filter or override
3. **If FAIL:** fix issues in the specs, then spawn a NEW Round N+1 fresh sub-agent (new Agent call — never reuse Round 2's agent)
4. **Max 3 fresh rounds** — escalate to user via `AskUserQuestion` if still failing after 3 rounds
5. **Final verdict** must incorporate findings from ALL rounds

## Key Rules

- **FAIL blocks workflow** — If FAIL, do NOT proceed to implementation.
- **Coverage >= 100% required** — Every story and AC must have at least one TC.
- **No guessing** — Reference specific TC IDs and story references.
- **Quality over quantity** — Flag duplicate TCs, prefer fewer meaningful tests.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/plan (Recommended)"** — Create implementation plan with validated test specs
- **"/tdd-spec"** — Re-generate specs if FAIL verdict
- **"/integration-test"** — Generate integration test code from specs
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute TWO review rounds. Round 2 delegates to fresh code-reviewer sub-agent (zero prior context) — never skip or combine with Round 1.
  <!-- /SYNC:double-round-trip-review:reminder -->
  <!-- SYNC:graph-impact-analysis:reminder -->
- **IMPORTANT MUST ATTENTION** run graph blast-radius on changed files to find potentially stale consumers/handlers (when graph.db exists).
      <!-- /SYNC:graph-impact-analysis:reminder -->
