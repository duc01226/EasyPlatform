---
name: review-changes
version: 1.0.0
description: '[Code Quality] Review all uncommitted changes before commit'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

**Prerequisites:** **MUST ATTENTION READ** before executing:

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
> 1. **DRY via OOP:** Same-suffix classes (`*Entity`, `*Dto`, `*Service`) MUST ATTENTION share base class. 3+ similar patterns → extract to shared abstraction.
> 2. **Right Responsibility:** Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
> 3. **SOLID:** Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
> 4. **After extraction/move/rename:** Grep ENTIRE scope for dangling references. Zero tolerance.
> 5. **YAGNI gate:** NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
>
> **Anti-patterns to flag:** God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

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

<!-- SYNC:integration-test-sync-check -->

> **Integration Test Sync Check** — Verify changed handlers have corresponding integration tests.
>
> 1. From changed files → find `*Command.cs`, `*Query.cs`, `*Handler.cs` under `src/Services/`
> 2. For each changed handler → search for matching `*IntegrationTests.cs` in same service's test project
> 3. If integration test EXISTS → check if test methods cover changed behavior (new methods/parameters)
> 4. If integration test MISSING → flag as advisory: "Changed handler `{file}` has no integration tests. Consider `/integration-test`."
> 5. Severity: **MEDIUM** (advisory, not blocking)
>
> **This is advisory — do NOT block the review for missing integration tests.**

<!-- /SYNC:integration-test-sync-check -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both code AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix (ex *Entity, *Dto, \*Service, etc...) MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

## Quick Summary

**Goal:** Comprehensive code review of all uncommitted changes following project standards.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs:
>
> - `docs/project-reference/code-review-rules.md` — anti-patterns, review checklists, quality standards **(READ FIRST)**
> - `docs/project-reference/integration-test-reference.md` — Integration test patterns, fixture setup, seeder conventions, lessons learned (MUST READ before reviewing/writing integration tests)
> - `project-structure-reference.md` — service list, directory tree, conventions
> - `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins
> - `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> If files not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Phase 0: Blast Radius** — Call `/graph-blast-radius` skill first (MANDATORY)
2. **Phase 1: Collect** — Run git status/diff, create report file
3. **Phase 2: File Review** — Review each changed file, update report incrementally
4. **Phase 3: Holistic** — Spawn fresh-context sub-agent for unbiased holistic assessment
5. **Phase 4: Finalize** — Generate critical issues, recommendations, and suggested commit message

**Key Rules:**

- Report-driven: always write findings to `plans/reports/code-review-{date}-{slug}.md`
- Check logic placement (lowest layer: Entity > Service > Component)
- Must create todo tasks for all 5 phases before starting
- Be skeptical — every claim needs `file:line` proof
- Verify convention by grepping 3+ existing examples before flagging violations
- Actively check for DRY violations, YAGNI/KISS over-engineering, and correctness bugs
- Cross-reference changed files against related docs — flag stale feature docs, test specs, READMEs

# Code Review: Uncommitted Changes

Perform a comprehensive code review of all uncommitted changes following project standards.

## Review Scope

Target: All uncommitted changes (staged and unstaged) in the current working directory.

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

**YAGNI** — Flag code that solves problems that don't exist yet (unused parameters, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. Ask: "Is there a simpler way that meets the same requirement?"
**DRY** — Actively grep for similar/duplicate code across the codebase before accepting new code. If 3+ similar patterns exist, flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples in the codebase. The codebase convention wins over textbook rules.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary values). Check error handling covers failure modes.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation is forbidden.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag any doc that is stale or missing updates to reflect current code changes.

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

> Run `python .claude/scripts/code_graph batch-query <f1> <f2> --json` on changed files for test coverage and caller impact.

## Blast Radius Pre-Analysis (MANDATORY FIRST STEP)

> **IMPORTANT MANDATORY MUST ATTENTION:** This is the FIRST action in every review. Call `/graph-blast-radius` skill BEFORE any other review work.

If `.code-graph/graph.db` exists, run graph-blast-radius analysis before reviewing changes:

- Call `/graph-blast-radius` skill (which runs `python .claude/scripts/code_graph blast-radius --json`)
- Include in review: impacted files count, untested changes, risk level based on blast radius size
- Use results to prioritize file review order (highest-impact files first)

### Graph-Assisted Change Review

For each changed file, trace its full impact:

1. `python .claude/scripts/code_graph trace <changed-file> --direction downstream --json` — see all files affected by changes (including implicit MESSAGE_BUS consumers, event handlers)
2. Flag any affected file NOT covered by tests
3. This catches cross-service impact that simple diff review misses

## Review Approach (Report-Driven Two-Phase - CRITICAL)

**⛔ MANDATORY FIRST: Create Todo Tasks for Review Phases**
Before starting, call TaskCreate with:

- [ ] `[Review Phase 0] Run /graph-blast-radius to analyze change impact` - in_progress **(MUST ATTENTION BE FIRST)**
- [ ] `[Review Phase 1] Get changes and create report file` - pending
- [ ] `[Review Phase 2] Review file-by-file and update report` - pending
- [ ] `[Review Phase 3] Spawn fresh-context sub-agent for holistic assessment` - pending
- [ ] `[Review Phase 4] Generate final review findings` - pending
- [ ] `[Review Phase 5] Run /docs-update if staleness detected` - pending
      Update todo status as each phase completes. This ensures review is tracked.

> **Note:** If Phase 1 reveals 20+ changed files, replace Phase 2-4 tasks with Systematic Review Protocol tasks:
> `[Review Phase 2] Categorize and fire parallel sub-agents`, `[Review Phase 3] Synchronize and cross-reference`, `[Review Phase 4] Generate consolidated report`

**Phase 0: Run Graph Blast Radius Analysis (MANDATORY FIRST STEP)**

> **IMPORTANT MANDATORY MUST ATTENTION:** This is the FIRST action before ANY other review work. The blast radius analysis provides structural impact data (impacted files, untested changes, risk level) that informs the entire review.

- [ ] Call `/graph-blast-radius` skill (runs `python .claude/scripts/code_graph blast-radius --json`)
- [ ] Record in report: changed files count, impacted files count, untested changes, risk level
- [ ] Use blast radius output to prioritize which files to review most carefully in Phase 2
- [ ] If `.code-graph/graph.db` does not exist, note "Graph not available — skipping blast radius" and proceed to Phase 1

**Phase 0.5: Plan Compliance Check (CONDITIONAL — only when active plan exists)**

Check `## Plan Context` in injected context:

- If "Plan: none" → skip, log "No active plan — skipping plan compliance"
- If "Plan: {path}" → load plan and verify:

1. Read `{plan-path}/plan.md` — get phase list and scope
2. Read relevant `phase-*.md` files — extract files to modify, test specifications (TC IDs), success criteria
3. Verify:
    - [ ] **Scope match** — changed files listed in plan phases (warn on unplanned files)
    - [ ] **TC evidence** — TCs mapped to completed phases have evidence (file:line), not "TBD"
    - [ ] **Success criteria met** — phase success criteria satisfied by changes
4. Add "Plan Compliance" section to review report

**Phase 1: Get Changes and Create Report File**

- [ ] Run `git status` to see all changed files
- [ ] Run `git diff` to see actual changes (staged and unstaged)
- [ ] Create `plans/reports/code-review-{date}-{slug}.md`
- [ ] Initialize with Scope, Files to Review, and Blast Radius Summary sections

**Phase 2: File-by-File Review (Build Report Incrementally)**
For EACH changed file, read and **immediately update report** with:

- [ ] File path and change type (added/modified/deleted)
- [ ] Change Summary: what was modified/added
- [ ] Purpose: why this change exists
- [ ] **Convention check:** Grep for 3+ similar patterns in codebase — does new code follow existing convention?
- [ ] **Correctness check:** Trace logic paths — does the code handle null, empty, boundary values, error cases?
- [ ] **DRY check:** Grep for similar/duplicate code — does this logic already exist elsewhere?
- [ ] **Intention check:** Does this change serve the stated purpose? Flag unrelated modifications
- [ ] **Logic trace:** Trace one happy path + one error path. Does the logic match requirements?
- [ ] **Semantic correctness:** Does the code DO what it's supposed to? (filter logic, sort order, boundary conditions)
- [ ] Issues Found: naming, typing, responsibility, patterns, bugs, over-engineering, logic errors
- [ ] Continue to next file, repeat

**Phase 3: Holistic Review (Fresh Sub-Agent — Round 2)**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above in this file).

After ALL files reviewed in Phase 2 (Round 1), spawn a fresh `code-reviewer` sub-agent for Round 2 holistic assessment using the canonical Agent template from `SYNC:review-protocol-injection` above. The sub-agent has ZERO memory of the Phase 2 file-by-file review. When constructing the Agent call prompt:

1. Copy the Agent call shape from the `SYNC:review-protocol-injection` template verbatim
2. Embed the full verbatim body of these 9 SYNC blocks (all present inline above in this skill file): `SYNC:evidence-based-reasoning`, `SYNC:bug-detection`, `SYNC:design-patterns-quality`, `SYNC:logic-and-intention-review`, `SYNC:test-spec-verification`, `SYNC:fix-layer-accountability`, `SYNC:rationalization-prevention`, `SYNC:graph-assisted-investigation`, `SYNC:understand-code-first`
3. Set the Task as `"Review ALL uncommitted changes holistically. Focus on big picture — overall technical approach coherence, architecture layers, logic placement (lowest layer), backend mapping in Command/DTO, frontend constants in Model, DRY violations, service boundaries, YAGNI/KISS, function complexity."`
4. Set Target Files as `"run git diff to see all uncommitted changes"`
5. Set report path as `plans/reports/code-review-changes-round{N}-{date}.md`

After sub-agent returns:

1. **Read** the sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in the main report — DO NOT filter or override
3. **If FAIL:** fix issues, then spawn a NEW Round N+1 fresh sub-agent (new Agent call — never reuse Round 2's agent)
4. **Max 3 fresh rounds** — escalate to user via `AskUserQuestion` if still failing after 3 rounds
5. **Final verdict** must incorporate findings from ALL rounds
   The following checks are now handled by the sub-agent but can be verified in Phase 4:

**Clean Code & Over-engineering Checks:**

- [ ] **YAGNI:** Any code solving hypothetical future problems? Unused params, speculative interfaces, config for one-time ops?
- [ ] **KISS:** Any unnecessarily complex solution? Could this be simpler while meeting same requirement?
- [ ] **Function complexity:** Methods >30 lines? Nesting >3 levels? Multiple responsibilities in one function?
- [ ] **Over-engineering:** Abstractions for single-use cases? Generic where specific suffices? Feature flags for things that could just be changed?
- [ ] **Readability:** Would a new team member understand this without reading more than the function signature and 1-2 inline comments? Are names self-documenting?

**Documentation Staleness Check (REQUIRED):**

Cross-reference changed files against related documentation using this mapping:

| Changed file pattern   | Docs to check for staleness                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `.claude/hooks/**`     | `.claude/docs/hooks/README.md`, hook count tables in `.claude/docs/hooks/*.md`                                |
| `.claude/skills/**`    | `.claude/docs/skills/README.md`, skill count/catalog tables                                                   |
| `.claude/workflows/**` | `CLAUDE.md` workflow catalog table, `.claude/docs/` workflow references                                       |
| Service code `**`      | `docs/business-features/` doc for the affected service                                                        |
| Frontend code `**`     | `docs/project-reference/frontend-patterns-reference.md`, relevant business-feature docs                       |
| Frontend legacy `**`   | `docs/project-reference/frontend-patterns-reference.md`, relevant business-feature docs                       |
| `CLAUDE.md`            | `.claude/docs/README.md` (navigation hub must stay in sync)                                                   |
| Backend code `**`      | `docs/project-reference/backend-patterns-reference.md`, `docs/project-reference/domain-entities-reference.md` |
| `docs/templates/**`    | Any docs generated from those templates                                                                       |

- [ ] For each changed file, check if matching docs exist and are still accurate
- [ ] Flag docs where counts, tables, examples, or descriptions no longer match the code
- [ ] Flag missing docs for new features/components that should be documented
- [ ] Check test specs (`docs/business-features/**/test-*`) reflect current behavior
- [ ] **Do NOT auto-fix** — flag in report with specific stale section and what changed

**Correctness & Bug Detection (per bug-detection-protocol.md):**

- [ ] **Null safety:** New variables/params/returns — can they be null? Are they guarded?
- [ ] **Boundary conditions:** Off-by-one, empty collections, zero/negative/max values
- [ ] **Error handling:** Try-catch scope correct? Silent failures? Swallowed exceptions?
- [ ] **Resource cleanup:** Connections, streams, subscriptions properly disposed?
- [ ] **Concurrency:** Async code with shared state safe? Missing awaits? Race conditions?
- [ ] **Data types:** Implicit conversions, timezone issues, string/number confusion?
- [ ] **Business logic:** Does the logic match the requirement? Trace one complete happy path + one error path through the code.

**Test Spec Verification (per test-spec-verification-protocol.md):**

- [ ] **Locate specs:** From changed files → find TC-{FEAT}-{NNN} in feature docs or test-specs/
- [ ] **Coverage:** Each changed code path has a corresponding TC (or flag as "needs TC")
- [ ] **New code without TCs:** New functions/endpoints/handlers flagged for test spec creation
- [ ] **Cross-cutting:** Auth changes → TC-{FEAT}-02x exist? Data changes → TC-{FEAT}-01x exist?
- [ ] **Stale evidence:** Changed code referenced in TC Evidence fields — re-verify

**Integration Test Sync (per integration-test-sync-check protocol):**

- [ ] **Locate changed handlers:** Grep `*Command.cs`, `*Query.cs` in changed files
- [ ] **Match to tests:** For each handler, check `{Service}.IntegrationTests/` for corresponding test file
- [ ] **Flag gaps:** Missing integration tests flagged as MEDIUM advisory finding
- [ ] **Flag stale tests:** If handler behavior changed, verify test assertions still match

**Phase 4: Generate Final Review Result**
Update report with final sections:

- [ ] Overall Assessment (big picture summary)
- [ ] Critical Issues (must fix before merge)
- [ ] High Priority (should fix)
- [ ] Architecture Recommendations
- [ ] Documentation Staleness (list stale docs with what changed, or "No doc updates needed")
- [ ] Positive Observations
- [ ] Suggested commit message (based on changes)

## Phase 5: Docs-Update Triage (CONDITIONAL)

If the Documentation Staleness Check in Phase 4 identified stale docs:

1. Invoke `/docs-update` skill to update impacted documentation
2. If `/docs-update` produces changes, include them in the review summary
3. If no staleness detected in Phase 4, skip: "No doc updates needed — staleness check was clean"

> **Note:** This step runs the docs-update triage (Phase 0) which fast-exits when no docs are impacted. Overhead is minimal for non-doc-impacting changes.

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify the code is **easy to read, easy to maintain, easy to understand**:

- **Schema visibility** — If a function computes a data structure (object, map, config), a comment should show the output shape so readers don't have to trace the code
- **Non-obvious data flows** — If data transforms through multiple steps (A → B → C), a brief comment should explain the pipeline
- **Self-documenting signatures** — Function params should explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings should be named constants or have inline rationale
- **Naming clarity** — Variables/functions should reveal intent without reading the implementation

## Review Checklist

### 1. Architecture Compliance

- [ ] Follows Clean Architecture layers (Domain, Application, Persistence, Service)
- [ ] Uses correct repository pattern (search for: service-specific repository interface)
- [ ] CQRS pattern: Command/Query + Handler + Result in ONE file (search for: existing command patterns)
- [ ] No cross-service direct database access

### 2. Code Quality & Clean Code

- [ ] Single Responsibility Principle — each function/class does ONE thing. Event handlers/consumers/jobs: one handler = one independent concern (failures don't cascade)
- [ ] No code duplication (DRY) — grep for similar code, extract if 3+ occurrences
- [ ] Appropriate error handling with project validation patterns (search for: validation result pattern)
- [ ] No magic numbers/strings (extract to named constants)
- [ ] Type annotations on all functions
- [ ] No implicit any types
- [ ] Early returns/guard clauses used
- [ ] YAGNI — no speculative features, unused parameters, premature abstractions
- [ ] KISS — simplest solution that meets the requirement
- [ ] Function length <30 lines, nesting depth ≤3 levels
- [ ] Follows existing codebase conventions (verify with grep for 3+ examples)

### 2.5. Naming Conventions

- [ ] Names reveal intent (WHAT not HOW)
- [ ] Specific names, not generic (`employeeRecords` not `data`)
- [ ] Methods: Verb + Noun (`getEmployee`, `validateInput`)
- [ ] Booleans: is/has/can/should prefix (`isActive`, `hasPermission`)
- [ ] No cryptic abbreviations (`employeeCount` not `empCnt`)

### 3. Project Patterns (see docs/project-reference/backend-patterns-reference.md)

- [ ] Uses project validation fluent API (.And(), .AndAsync())
- [ ] No direct side effects in command handlers (use entity events)
- [ ] DTO mapping in DTO classes, not handlers
- [ ] Static expressions for entity queries

### 4. Security

- [ ] No hardcoded credentials
- [ ] Proper authorization checks
- [ ] Input validation at boundaries
- [ ] No SQL injection risks

### 5. Performance

- [ ] No O(n²) complexity (use dictionary for lookups)
- [ ] No N+1 query patterns (batch load related entities)
- [ ] Project only needed properties (don't load all then select one)
- [ ] Pagination for all list queries (never get all without paging)
- [ ] Parallel queries for independent operations
- [ ] Appropriate use of async/await
- [ ] Entity query expressions have database indexes configured
- [ ] Database collections have index management methods (search for: index setup pattern)
- [ ] Database migrations include indexes for WHERE clause columns

### 6. Common Issues to Check

- [ ] Unused imports or variables
- [ ] Console.log/Debug.WriteLine statements left in
- [ ] Hardcoded values that should be configuration
- [ ] Missing async/await keywords
- [ ] Incorrect exception handling
- [ ] Missing validation

### 7. Backend-Specific Checks

- [ ] CQRS patterns followed correctly
- [ ] Repository usage (no direct DbContext access)
- [ ] Entity DTO mapping patterns
- [ ] Validation using project validation patterns
- [ ] Seed data in data seeders, NOT in migration executors (if data must exist after DB reset → seeder)

### 8. Frontend-Specific Checks

- [ ] Component base class inheritance correct (search for: project base component classes)
- [ ] State management patterns (search for: project store base class)
- [ ] Memory leaks (search for: subscription cleanup pattern)
- [ ] Template binding issues
- [ ] BEM class naming on all elements

### 9. Documentation Staleness

- [ ] Changed service code → check `docs/business-features/` for affected service
- [ ] Changed frontend code → check `docs/project-reference/frontend-patterns-reference.md` + business-feature docs
- [ ] Changed backend code → check `docs/project-reference/backend-patterns-reference.md`
- [ ] Changed `.claude/hooks/**` → check `.claude/docs/hooks/README.md`
- [ ] Changed `.claude/skills/**` → check `.claude/docs/skills/README.md`, skill catalogs
- [ ] Changed `.claude/workflows/**` → check `CLAUDE.md` workflow catalog, `.claude/docs/` references
- [ ] New feature/component added → verify corresponding doc exists or flag as missing
- [ ] Test specs in `docs/business-features/**/` reflect current behavior after changes
- [ ] API changes reflected in relevant API docs or Swagger annotations

## Output Format

Provide feedback in this format:

**Summary:** Brief overall assessment

**Critical Issues:** (Must fix before commit)

- Issue 1: Description and suggested fix
- Issue 2: Description and suggested fix

**High Priority:** (Should fix)

- Issue 1: Description
- Issue 2: Description

**Suggestions:** (Nice to have)

- Suggestion 1
- Suggestion 2

**Documentation Staleness:** (Docs that may need updating)

- Doc 1: What is stale and why
- `No doc updates needed` — if no changed file maps to a doc

**Positive Notes:**

- What was done well

**Suggested Commit Message:**

```
type(scope): description

- Detail 1
- Detail 2
```

---

## Systematic Review Protocol (for 10+ changed files)

> **NON-NEGOTIABLE: When the changeset is large (10+ files), you MUST ATTENTION use this systematic protocol instead of reviewing files one-by-one sequentially.**
>
> **Principle:** Review carefully and systematically — break into groups, fire multiple agents to review in parallel. Ensure no flaws, no bugs, no stale info, and best practices in every aspect.

### Auto-Activation

In Phase 0, after running `git status`, count the changed files. If **10 or more files** changed:

1. **STOP** the sequential Phase 1-3 approach
2. **SWITCH** to this Systematic Review Protocol automatically
3. **ANNOUNCE** to user: `"Detected {N} changed files. Switching to systematic parallel review protocol."`

The sequential Phase 1-3 approach is ONLY for small changesets (<20 files). For large changesets, the parallel protocol produces better results with fewer missed issues.

### Step 1: Categorize Changes

Group all changed files into logical categories (e.g., by directory, concern, or layer):

| Category                        | Example Groupings                                             |
| ------------------------------- | ------------------------------------------------------------- |
| **Claude tooling**              | `.claude/hooks/`, `.claude/skills/`, `.claude/workflows.json` |
| **Root docs & instructions**    | `CLAUDE.md`, `README.md`, `.github/`                          |
| **System docs**                 | `.claude/docs/**`                                             |
| **Project docs & biz features** | `docs/business-features/`, `docs/*-reference.md`              |
| **Backend code**                | `src/Services/**/*.cs`                                        |
| **Frontend code**               | `src/{frontend}/**/*.ts`, `src/{legacy-frontend}/**/*.ts`     |

### Step 2: Fire Parallel Sub-Agents

Launch one `code-reviewer` sub-agent per category using the `Agent` tool with `run_in_background: true`. Each sub-agent receives:

- Full list of files in its category
- Category-specific review checklist
- Cross-reference verification instructions (counts, tables, links)

**All sub-agents run in parallel** to maximize speed and coverage.

### Step 3: Synchronize & Cross-Reference

After all sub-agents complete:

1. **Collect findings** from each agent's report
2. **Cross-reference** — verify counts, keyword tables, and references are consistent ACROSS categories
3. **Detect gaps** — issues that only appear when looking across categories (e.g., a workflow added in `.claude/` but missing from `CLAUDE.md` keyword table)
4. **Consolidate** into single holistic report with categorized findings

### Step 4: Holistic Big-Picture Assessment

With all category findings combined, assess:

- Overall coherence of changes as a unified plan
- Cross-category synchronization (do docs match code? do counts match reality?)
- Risk areas where categories interact
- Missing documentation updates for changed code

### Why This Protocol Matters

Sequential file-by-file review of 50+ files causes:

- Context window exhaustion before completing review
- Missed cross-file inconsistencies
- Shallow review of later files due to attention fatigue
- No big-picture assessment

Parallel categorized review ensures thorough coverage with holistic synthesis.

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use `AskUserQuestion` to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `review-changes` workflow** (Recommended) — review-changes → review-architecture → code-simplifier → code-review → performance → plan → plan-validate → cook → watzup
> 2. **Execute `/review-changes` directly** — run this skill standalone

---

## Architecture Boundary Check

For each changed file, verify it does not import from a forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match its path against each rule's `paths` glob patterns
3. **Scan imports** — Grep the file for `using` (C#) or `import` (TS) statements
4. **Check violations** — If any import path contains a layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` is not present in project-config.json, skip this check silently.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/code-review (Recommended)"** — Deeper code quality review
- **"/watzup"** — Wrap up session and review all changes
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

> **Completion ≠ Correctness.** Before reporting ANY work done, prove it:
>
> 1. **Grep every removed name.** Extraction/rename/delete touched N files? Grep confirms 0 dangling refs across ALL file types.
> 2. **Ask WHY before changing.** Existing values are intentional until proven otherwise. No "fix" without traced rationale.
> 3. **Verify ALL outputs.** One build passing ≠ all builds passing. Check every affected stack.
> 4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, and reachable by all consumers.

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

  <!-- SYNC:understand-code-first:reminder -->

- **IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
      <!-- /SYNC:understand-code-first:reminder -->
      <!-- SYNC:design-patterns-quality:reminder -->
- **IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.
      <!-- /SYNC:design-patterns-quality:reminder -->
      <!-- SYNC:graph-assisted-investigation:reminder -->
- **IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.
      <!-- /SYNC:graph-assisted-investigation:reminder -->
      <!-- SYNC:logic-and-intention-review:reminder -->
- **IMPORTANT MUST ATTENTION** verify WHAT code does matches WHY it changed. Trace happy + error paths.
      <!-- /SYNC:logic-and-intention-review:reminder -->
      <!-- SYNC:bug-detection:reminder -->
- **IMPORTANT MUST ATTENTION** check null safety, boundaries, error handling, resource management for every review.
      <!-- /SYNC:bug-detection:reminder -->
      <!-- SYNC:test-spec-verification:reminder -->
- **IMPORTANT MUST ATTENTION** map changed code paths to TC-{FEAT}-{NNN}. Flag untested paths.
      <!-- /SYNC:test-spec-verification:reminder -->
      <!-- SYNC:integration-test-sync-check:reminder -->
- **IMPORTANT MUST ATTENTION** check changed handlers for matching integration tests. Flag missing tests as advisory.
      <!-- /SYNC:integration-test-sync-check:reminder -->
