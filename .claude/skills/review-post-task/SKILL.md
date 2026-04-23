---
name: review-post-task
version: 1.2.0
description: '[Code Quality] Two-pass code review for task completion'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

<!-- SYNC:design-patterns-quality -->

> **Design Patterns Quality** — Priority checks for every code change:
>
> 1. **DRY via OOP:** Identify classes/modules with the same purpose, naming pattern, or lifecycle. Apply your knowledge of the project's language/framework to determine the idiomatic abstraction (base class, mixin, trait, protocol, decorator). 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.
>
> **Serial Attention for Design Quality** — DO NOT scan all quality concerns simultaneously. Split attention misses violations that focused passes catch.
>
> 1. **Identify applicable dimensions** — Based on the code's language, domain, and patterns, determine which quality dimensions apply: DRY, SOLID principles (SRP/OCP/LSP/ISP/DIP), OOP idioms, cohesion/coupling, GRASP, Law of Demeter, CQRS invariants, etc. Your list is NOT fixed — derive from what the code actually does.
> 2. **One focused pass per dimension** — Dedicate single-focus attention to EACH dimension in sequence. Do NOT mix concerns across passes.
> 3. **Threshold: 3+ similar patterns = MANDATORY extraction** — Not optional suggestion. Flag as mandatory structural fix requiring action.
> 4. **2+ violations of same kind = structural finding** — Report as "pattern problem" needing architectural resolution, not a list of individual instances.

<!-- /SYNC:design-patterns-quality -->

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

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

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

- DO copy the template wholesale — including all 10 embedded protocol sections
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

<!-- SYNC:logic-and-intention-review -->

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

<!-- /SYNC:logic-and-intention-review -->

<!-- SYNC:bug-detection -->

> **Bug Detection** — MUST ATTENTION check categories 1-4 for EVERY review. Never skip.
>
> 1. **Null Safety:** Can params/returns be null? Are they guarded? Optional chaining gaps? `.find()` returns checked?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
> 4. **Resource Management:** Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
> 5. **Concurrency (if async):** Missing `await`? Race conditions on shared state? Stale closures? Retry storms?
> 6. **Stack-Specific:** JS: `===` vs `==`, `typeof null`. C#: `async void`, missing `using`, LINQ deferred execution.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. From changed files → find TC-{FEAT}-{NNN} in `docs/business-features/{Service}/detailed-features/{Feature}.md` Section 15
> 2. Every changed code path MUST ATTENTION map to a corresponding TC (or flag as "needs TC")
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. Verify TC evidence fields point to actual code (`file:line`, not stale references)
> 5. Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
> 6. If no specs exist → log gap and recommend `/tdd-spec`
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists, quality standards **(READ FIRST)** (content auto-injected by hook — check for [Injected: ...] header before reading)
> - `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
> - `project-structure-reference.md` — service list, directory tree, conventions
>
> If files not found, search for: project documentation, coding standards, architecture docs.

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Two-pass code review after task completion to catch issues before commit.

**Workflow:**

1. **Pass 1: File-by-File** — Review each changed file individually
2. **Pass 2: Holistic** — Assess overall approach, architecture, consistency
3. **Report** — Summarize critical issues and recommendations

**Key Rules:**

- Ensure quality: no flaws, no bugs, no missing updates, no stale content
- Check both code AND documentation for completeness
- Evidence-based findings with `file:line` references

Execute mandatory two-pass review protocol after completing code changes.
Focus: $ARGUMENTS

Activate `code-review` skill and follow its workflow with **post-task two-pass** protocol:

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT accept code correctness at face value — verify by reading actual implementations
- Every finding must include `file:line` evidence (grep results, read confirmations)
- If you cannot prove a claim with a code trace, do NOT include it in the report
- Question assumptions: "Does this actually work?" → trace the call path to confirm
- Challenge completeness: "Is this all?" → grep for related usages across services
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what you verified and how

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused params, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. Ask: "Is there a simpler way?"
**DRY** — Grep for similar/duplicate code across the codebase. If 3+ similar patterns exist, flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting (≤3 levels). Methods <30 lines.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples. Codebase convention wins.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary). Check error handling.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation is forbidden.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag any doc that is stale or missing updates to reflect current code changes.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify the code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If a function computes a data structure (object, map, config), a comment should show the output shape so readers don't have to trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Protocol

**Pass 1:** Gather changes (`git diff`), apply project review checklist:

- Backend: platform repos, validation, events, DTOs
- Backend: seed data in data seeders (not migrations) — if data must exist after DB reset, it's a seeder
- Frontend: base classes, stores, untilDestroyed, BEM
- Architecture: layer placement, service boundaries
- **Convention:** grep for 3+ similar patterns to verify code follows codebase conventions
- **Correctness:** trace logic paths, check edge cases (null, empty, boundary values)
- **DRY:** grep for duplicate/similar code across codebase
- **YAGNI/KISS:** flag over-engineering, unnecessary abstractions, speculative features
- **Doc staleness:** cross-reference changed files against `docs/business-features/`, test specs, READMEs — flag stale docs

> **[IMPORTANT] Database Performance Protocol (MANDATORY):**
>
> 1. **Paging Required** — ALL list/collection queries MUST ATTENTION use pagination. NEVER load all records into memory. Verify: no unbounded `GetAll()`, `ToList()`, or `Find()` without `Skip/Take` or cursor-based paging.
> 2. **Index Required** — ALL query filter fields, foreign keys, and sort columns MUST ATTENTION have database indexes configured. Verify: entity expressions match index field order, database collections have index management methods, migrations include indexes for WHERE/JOIN/ORDER BY columns.

Fix issues found.

**Pass 2 (MANDATORY — Fresh Sub-Agent Round 2):**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

Spawn a fresh `code-reviewer` sub-agent for Round 2 using the canonical Agent template from `SYNC:review-protocol-injection` above. The sub-agent has ZERO memory of Pass 1 findings or fixes. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Embed the full verbatim body of these 9 SYNC blocks (all present inline above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Set the Task as `"Review ALL uncommitted changes holistically. Focus on cross-cutting concerns, interaction bugs, convention drift, missing pieces, subtle edge cases (null/empty/boundary/off-by-one), over-engineering, naming inconsistencies, logic errors, test spec gaps."`
4. Set Target Files as `"run git diff to see all uncommitted changes"`
5. Set report path as `plans/reports/review-post-task-round{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in the main report — DO NOT filter or override
3. **If FAIL:** fix issues, then spawn a NEW Round N+1 fresh sub-agent (new Agent call — never reuse Round 2's agent)
4. **Max 3 fresh rounds** — escalate to user via `AskUserQuestion` if still failing after 3 rounds
5. **Final verdict** must incorporate findings from ALL rounds

**Final Report:** Task description, Pass 1/2 results, changes summary, issues fixed, remaining concerns.

## Integration Notes

- Auto-triggered by workflow orchestration after `/cook`, `/fix`, `/code`
- Can be manually invoked with `/review-post-task`
- For PR reviews, use `/code-review` instead
- Use `code-reviewer` subagent for complex reviews

---

## Systematic Review Protocol (for 10+ changed files)

> **When the changeset is large (10+ files), categorize files by concern, fire parallel `code-reviewer` sub-agents per category, then synchronize findings into a holistic report.** See `review-changes/SKILL.md` § "Systematic Review Protocol" for the full 4-step protocol (Categorize → Parallel Sub-Agents → Synchronize → Holistic Assessment).

---

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **IMPORTANT MUST ATTENTION** execute two review rounds (Round 1: understand, Round 2: catch missed issues)
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
    <!-- SYNC:understand-code-first:reminder -->
- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
    <!-- SYNC:design-patterns-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.
    <!-- /SYNC:design-patterns-quality:reminder -->
    <!-- SYNC:double-round-trip-review:reminder -->
- **IMPORTANT MUST ATTENTION** execute TWO review rounds. Round 2 delegates to fresh code-reviewer sub-agent (zero prior context).
    <!-- /SYNC:double-round-trip-review:reminder -->
    <!-- SYNC:graph-impact-analysis:reminder -->
- **IMPORTANT MUST ATTENTION** run graph impact analysis on changed files. Compute gap: impacted minus changed = potentially stale.
    <!-- /SYNC:graph-impact-analysis:reminder -->
    <!-- SYNC:logic-and-intention-review:reminder -->
- **IMPORTANT MUST ATTENTION** verify WHAT code does matches WHY it changed. Trace happy + error paths.
    <!-- /SYNC:logic-and-intention-review:reminder -->
    <!-- SYNC:bug-detection:reminder -->
- **IMPORTANT MUST ATTENTION** check null safety, boundaries, error handling, resource management for every review.
    <!-- /SYNC:bug-detection:reminder -->
    <!-- SYNC:test-spec-verification:reminder -->
- **IMPORTANT MUST ATTENTION** map changed code paths to TC-{FEAT}-{NNN}. Flag untested paths.
    <!-- /SYNC:test-spec-verification:reminder -->
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
  <!-- /SYNC:critical-thinking-mindset:reminder -->
  <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
  <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->
