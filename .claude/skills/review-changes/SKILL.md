---
name: review-changes
version: 2.1.0
description: '[Code Quality] Review all uncommitted changes before commit'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[CRITICAL — TOP 3 RULES]**
>
> 1. **MUST ATTENTION Phase 0 graph blast-radius FIRST** — NEVER skip; informs entire review order
> 2. **NEVER declare PASS after Round 1 alone** — fresh sub-agent review mandatory (Round 2+)
> 3. **MUST ATTENTION TaskCreate ALL phases** before starting; missing tests MUST surface via `AskUserQuestion` — NOT silently logged

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. Prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

## Quick Summary

**Goal:** Comprehensive review of all uncommitted changes following project standards. No flaws, no bugs, no missing updates, no stale content. Applies to any project type — code, docs, config, infrastructure, or non-coding artifacts.

**Workflow:**

1. **Phase 0: Blast Radius** — Call `/graph-blast-radius` skill FIRST (if `.code-graph/graph.db` exists)
2. **Phase 0.3: Change Types** — Detect high-risk change types; create risk tasks
3. **Phase 0.5: Plan Compliance** — Verify against active plan (conditional)
4. **Phase 0.7: Surface Detection** — AI categorizes changed files; creates dimension tasks
5. **Phase 1: Collect** — Run git status/diff, create report file
6. **Phase 2: File Review** — Review each changed file, update report incrementally
7. **Phase 3: Holistic** — Spawn fresh-context sub-agent for unbiased holistic assessment
8. **Phase 4: Finalize** — Generate critical issues, recommendations, suggested commit message
9. **Phase 5: Docs Triage** — Invoke `/docs-update` if staleness detected

**Key Rules:**

- Report-driven: ALWAYS write findings to `plans/reports/code-review-{date}-{slug}.md`
- MUST ATTENTION create todo tasks for ALL phases before starting
- Skeptical: every claim needs `file:line` proof
- Verify convention by grepping 3+ existing examples before flagging violations
- Actively check DRY violations, YAGNI/KISS over-engineering, correctness bugs
- Cross-reference changed files against related docs — flag stale docs, test specs, READMEs

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to discover and READ project-specific reference docs:
>
> 1. Search for code standards docs: `*code-review*`, `*patterns*`, `*conventions*`, `*style-guide*` — read any found
> 2. Search for architecture docs: `*architecture*`, `*adr-*`, `README.md` at service/module roots
> 3. Look for docs referencing changed technology areas (backend, frontend, infra, etc.)
> 4. Read docs most relevant to the categories of files changed

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:complexity-prevention -->

> **Complexity Prevention (Ousterhout)** — MANDATORY. Measure code by cost of change: one business change should map to one code change. Flag ALL of the following in review:
>
> 1. **Change amplification** — small business change forces edits in >3 places → structural flaw. Count edit sites for a plausible future change (add variant, add field, add authorization). >3 = reject.
> 2. **Cognitive load** — reader must hold too much context to safely modify. Flag deep inheritance, long parameter lists, boolean traps, implicit ordering dependencies.
> 3. **Cross-cutting duplication at entry points** — logging, error handling, validation, auth, transactions reimplemented per controller/handler/route. Lift to middleware / interceptor / filter / decorator / aspect.
> 4. **Leaked implementation technology** — repos returning `IQueryable`/`QuerySet`/`Criteria`/raw cursors/ORM entities to callers. Return finished results + intent-revealing methods (`GetActiveVipUsers()` not `Query()`).
> 5. **Type-switch scattering** — `switch`/`if`-chains on enum/discriminator in >1 place. New variant = new file, not N edits. One factory/registry switch at the boundary OK; scattered switches = reject.
> 6. **Anemic models** — domain objects with only getters/setters, logic floats in services. Move invariants/behavior onto the object (`order.Checkout()`, not `order.Status = ...`).
> 7. **Primitive obsession** — raw `string`/`int`/`decimal` for account numbers, emails, money, percentages, date ranges, with re-validation at every entry. Wrap in value objects / records / structs that validate once at construction.
> 8. **Inline cross-cutting concerns** — authorization/tenant isolation/audit/sanitization hand-written at top of every handler. Flag intent with declarative markers (`@RequirePermission("Order.Delete")`), enforce once centrally.
> 9. **Shallow modules** — tiny class, big interface (many public methods, many flags, many ctor params) wrapping little logic. A module is deep when a small interface hides a lot of implementation. If interface ≈ implementation cost to learn → inline.
> 10. **Missing base class for repeated component/handler lifecycle** — 3+ forms/CRUD handlers/list views reimplementing loading/dirty/submit/pagination → extract to base class / hook / composable / mixin / trait.
> 11. **Premature vs delayed abstraction** — rule-of-three. First occurrence: write it. Second: notice duplication. Third: extract. Don't build generic frameworks before real variation; don't copy-paste for the 4th time.
> 12. **Embedded utility logic not extracted to helpers** — inline paging loops (`while (hasMore) { skip += take; ... }`), ad-hoc datetime math, string parsing/formatting, collection partitioning, retry/backoff loops, URL/query-string building. If the algorithm is non-trivial AND stack-generic (not business-specific), extract to `util`/`helper`/`extensions` and let consumers call one line. Inline duplicates → duplicated bug surface.
> 13. **Logic in wrong (higher) layer — downshift to callee** — business/derivation logic written in the caller when the callee owns the data. Defaults: Controller code that should be App Service. App Service code that should be Domain Service or Entity. Component code that should be ViewModel/Store/Service. Caller reaching into callee's data shape to compute something → move the computation behind an intent-revealing method on the callee. Lowest responsible layer wins (Entity > Domain Service > App Service > Controller · Model/VM > Store > Component). Higher-layer placement = duplicated logic when a sibling caller needs the same thing.
> 14. **Owner owns the rule — extract on first write** — if a caller inlines logic that derives, normalizes, validates, or computes from another type's data, MOVE it to the owning type. Single use is sufficient — the trigger is wrong responsibility, not duplication. Sibling callers always arrive; inline copies drift silently with no compile error and no name to grep. **Common offenders:** _Backend_ — inlined rules in application-layer handlers / commands / queries / services / controllers that belong on the domain entity / value object / domain service. _Frontend_ — inlined derivations / formatting / validation in components that belong on the model / store / view-model / API service. **Fix:** name the rule once as a method (static or instance) on the owning type; callers invoke by name. Future variant → SECOND named method on the owner, never an inline near-duplicate. **Right responsibility first; reuse is the consequence.**
>
> **Extraction target — where the named rule lives:**
>
> | Shape of the rule                             | Goes to                       |
> | --------------------------------------------- | ----------------------------- |
> | Pure function over an entity's own data       | static method on the entity   |
> | Behavior that mutates / guards entity state   | instance method on the entity |
> | Always-true invariant on a primitive value    | value object constructor      |
> | Needs DI (repo / settings / clock)            | helper class registered in DI |
> | Domain-agnostic algorithm reused across types | util / extension method       |
> | Pure shape / projection conversion            | DTO mapping                   |
>
> **Pre-commit edit-site test (reject if answer is "many"):**
>
> | Change Scenario                                 | Should touch              |
> | ----------------------------------------------- | ------------------------- |
> | Add new variant (customer type, payment method) | 1 new file                |
> | Change HTTP error response format               | 1 middleware/filter       |
> | Add timestamp field to every persisted entity   | 1 base entity/interceptor |
> | Add authorization to a new endpoint             | 1 declarative marker      |
> | Swap database/ORM                               | Data layer only           |
> | Change business calculation rule                | 1 method on owning entity |
> | Add loading indicator pattern to forms          | 1 base component/hook     |
> | Add validation rule to a domain primitive       | 1 value-object ctor       |
> | Change paging/retry/datetime algorithm          | 1 helper/util function    |
> | Change a derivation of entity data              | 1 method on the entity    |
>
> **Operating heuristics:**
>
> - Write the call site first.
> - Count edit sites for plausible future change.
> - Prefer removing code over adding it.
> - Surface assumptions at boundaries, hide details inside.
> - **Pre-reuse scan** — before writing a non-trivial block, grep for similar algorithms (`while.*skip`, `DateTime.*Add`, `split`/`join` chains, paging loops, retry loops). Match existing helper → call it. None exists but pattern is stack-generic → extract to util before second caller appears.
> - **Layer placement test** — ask "if a sibling caller needed this tomorrow, would they re-derive it?" If yes, the logic is in the wrong layer. Move it down.
> - **Open-case-for-future-reuse** — if reviewer spots a block that is likely to appear in another feature (domain-agnostic algorithm, shared lifecycle, recurring derivation), do NOT rationalize with pure YAGNI. Either extract now (if cheap) or create a tracked TODO with the exact extraction target so the second caller does not duplicate silently. Silent duplication is the default failure mode.
> - When in doubt ask: "What would need to change if the requirement shifts?"
>
> **The measure of good code is the cost of change.** Not shortest. Not cleverest. Not most abstracted. Cheapest to safely modify having read a small local portion.

<!-- /SYNC:complexity-prevention -->

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
> 1. Spawn a NEW `Agent` tool call — choose `subagent_type` based on the review's dominant concern (see Sub-Agent Type Selection in `SYNC:review-protocol-injection`)
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

### Sub-Agent Type Selection

Choose `subagent_type` based on the dominant concern of the review:

| Dominant Concern                               | `subagent_type`         |
| ---------------------------------------------- | ----------------------- |
| Code logic, architecture, correctness          | `code-reviewer`         |
| Security, auth, permissions, vulnerabilities   | `security-auditor`      |
| Performance, latency, query efficiency, memory | `performance-optimizer` |
| Documentation, plans, specs, ADRs, configs     | `general-purpose`       |
| Infrastructure, CI/CD, build tooling           | `general-purpose`       |
| Mixed concerns (default fallback)              | `code-reviewer`         |

For large changesets with multiple distinct dominant concerns — spawn ONE sub-agent per concern type in parallel.

### Canonical Agent Call Template (Copy Verbatim)

```
Agent({
description: "Fresh Round {N} review",
subagent_type: "{code-reviewer | security-auditor | performance-optimizer | general-purpose}",
prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Security review of auth changes" | "Review plan files under {plan-dir}" | "Performance review of data access layer changes"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-boundary validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null/undefined? Are they guarded? .find()/.get() returns checked before use?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally/defer?
4. Resource Management: Connections/streams closed? Long-lived resources released? Memory bounded?
5. Concurrency (if async): Missing await/promise handling? Race conditions on shared state? Retry storms?
6. Language/Stack-Specific: Apply known failure modes for the language/runtime in this project — use your domain knowledge of the stack.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer. Never business logic in top-layer orchestrators.
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
1. Identify the project's test spec format — grep for test case files (e.g., docs/**/test-*, docs/specs/**, *.feature, *.spec.md, test-cases/).
2. For each changed code path, locate the corresponding test case — or flag as "needs test case".
3. New functions/endpoints/handlers → flag for test spec creation.
4. If test spec evidence fields exist in the project, verify they point to actual code (file:line, not stale).
5. If no specs exist for a changed path → log gap and recommend /tdd-spec.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers. Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point.
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

### Category Review Thinking
For EACH category of changed files — THINK, do not fill in a checklist. DO NOT limit to the examples below.
Step 1 — Understand the category's role: What is its purpose? What invariants govern it? Who consumes it and what do they expect?
Step 2 — Read project conventions: grep for reference docs, style guides, READMEs for this area. Examine 3+ existing similar files to surface established patterns.
Step 3 — Derive concerns from first principles. Apply ALL that are relevant — expand based on domain knowledge:
- Correctness: logic matches intent? happy path AND error path traced?
- Contracts: interfaces/APIs/events/protocols honored? no implicit coupling introduced?
- Project conventions: follows patterns found in Step 2? evidence-confirmed, not assumed?
- Security: auth enforced? input validated at boundaries? no secrets in diff?
- Performance: unbounded operations? N+1? blocking in async context? unindexed queries?
- Maintainability: DRY? single responsibility? complexity reasonable? names reveal intent?
- Test coverage: changed paths covered? existing tests still valid after the change?
- Documentation: related docs/specs reflect the changes?
Step 4 — For each concern identified: verify with file:line evidence or flag as finding.
Examples only — your knowledge exceeds this list:
- Logic files (any stack): handler/service structure, validation placement, side effect isolation, cross-boundary coupling, data access layer separation
- Data/Schema: rollback path, lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
- Config files: all environments covered? no secrets committed? app fails fast if missing?
- Infrastructure: dev/prod parity? no hardcoded dev values? pinned versions? CI impact documented?
- Styles/Assets: naming conventions? design variables/tokens used (no magic values)? scope correct?
- Documentation: accurate? links valid? examples match current code/behavior?
- Tests: assertions verify specific outcomes (not just no-exception)? idempotent (repeatable N times)? edge cases covered?
- Security artifacts: all code paths reach the gate? negative tests exist? both enforcement AND display control updated?
- Build/Tooling: rule changes apply consistently? violations not silently swallowed? CI runtime impact?

## Reference Docs (READ before reviewing)
{Discover by searching *patterns*, *conventions*, *style-guide*, *architecture*, README at service/module roots — list what you find}

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
- DO choose `subagent_type` based on the dominant concern (see Sub-Agent Type Selection above)
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
> 1. **Null Safety:** Can params/returns be null/undefined? Are they guarded? `.find()`/`.get()` returns checked before use?
> 2. **Boundary Conditions:** Off-by-one (`<` vs `<=`)? Empty collections handled? Zero/negative values? Max limits?
> 3. **Error Handling:** Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally/defer?
> 4. **Resource Management:** Connections/streams closed? Long-lived resources released? Memory bounded?
> 5. **Concurrency (if async):** Missing await/promise handling? Race conditions on shared state? Retry storms?
> 6. **Language/Stack-Specific:** Apply known failure modes for the language/runtime in this project — use your domain knowledge of the stack.
>
> **Classify:** CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO

<!-- /SYNC:bug-detection -->

<!-- SYNC:test-spec-verification -->

> **Test Spec Verification** — Map changed code to test specifications.
>
> 1. Identify the project's test spec format — grep for test case files (e.g., `docs/**/test-*`, `docs/specs/**`, `*.feature`, `*.spec.md`, `test-cases/`)
> 2. For each changed code path, locate the corresponding test case — or flag as "needs test case"
> 3. New functions/endpoints/handlers → flag for test spec creation
> 4. If test spec evidence fields exist in the project, verify they point to actual code (`file:line`, not stale references)
> 5. If no specs exist for a changed path → log gap and recommend `/tdd-spec`
>
> **NEVER skip test mapping.** Untested code paths are the #1 source of production bugs.

<!-- /SYNC:test-spec-verification -->

<!-- SYNC:integration-test-sync-check -->

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`).
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use `AskUserQuestion`: "Business logic file `{file}` has no integration tests — run `/integration-test` before proceeding, or confirm tests already written?" Options: "Run `/integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Do NOT silently skip. Business logic changes without test coverage require an explicit user decision via `AskUserQuestion`.**

<!-- /SYNC:integration-test-sync-check -->

<!-- SYNC:translation-sync-check -->

> **Translation Sync Check** — Verify multilingual UI changes include translation updates.
>
> 1. Determine multilingual mode from project config: `localization.enabled === true` and `supportedLocales.length > 1`
> 2. Detect UI-facing file changes via extensions/path patterns (`.ts`, `.tsx`, `.html`, `.css`, `.scss` plus `localization.uiPathPatterns` when configured)
> 3. For multilingual UI changes, verify translation resource diffs exist (`localization.translationFilePatterns` when configured)
> 4. If translation updates are missing → **MANDATORY**: use `AskUserQuestion`: "UI text changed in a multilingual project, but translation updates were not detected. Run translation sync now or proceed with explicit risk acceptance?" Options: "Run translation sync first" (Recommended) | "Proceed with explicit risk acceptance"
> 5. Severity: **HIGH** — no silent pass for multilingual UI text changes without explicit translation-sync decision
>
> **Do NOT silently skip. Multilingual UI text changes require explicit translation-sync confirmation.**

<!-- /SYNC:translation-sync-check -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files.
> This is NOT a fixed checklist. Derive concerns from domain knowledge — the examples are starting points only.
> Your knowledge of the category exceeds any list here. Trust it.

**Step 1: Understand the category's role**

- What is this category's responsibility in the overall system?
- What invariants must it uphold?
- What are its consumer contracts (who depends on it, what do they expect)?

**Step 2: Read project conventions for this category**

- Search for reference docs, style guides, ADRs, or READMEs specific to this area
- Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes
- If no docs exist, derive conventions empirically from existing code

**Step 3: Derive concerns from first principles**

Apply all that are relevant — expand beyond this list based on the actual category:

- **Correctness:** Does the logic match the intent? Trace happy path AND error path.
- **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
- **Project conventions:** Does new code follow patterns found in Step 2? Evidence-confirmed, not assumed.
- **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in diff?
- **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
- **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
- **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
- **Documentation:** Do related docs, specs, or READMEs reflect the changes?

**Step 4: Create sub-tasks and execute**

For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done.

> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ Handler/service structure conventions, validation layer placement, side effect isolation, cross-service boundary enforcement, data access layer separation, error propagation strategy
> - _Client-side logic:_ Component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ Migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ Present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ Dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ Follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ Accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ Assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ All code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ Rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

> **Critical Purpose:** Ensure quality — no flaws, no bugs, no missing updates, no stale content. Verify both artifacts AND documentation.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **OOP & DRY Enforcement:** MANDATORY IMPORTANT MUST ATTENTION — flag duplicated patterns that should be extracted to a base class, generic, or helper. Classes in the same group or suffix MUST ATTENTION inherit a common base (even if empty now — enables future shared logic and child overrides). Verify project has code linting/analyzer configured for the stack.

# Code Review: Uncommitted Changes

Comprehensive review of all uncommitted changes following project standards.

## Review Scope

Target: All uncommitted changes (staged and unstaged) in current working directory.

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80%.**

- Do NOT accept correctness at face value — verify by reading actual implementations
- Every finding MUST include `file:line` evidence (grep results, read confirmations)
- Cannot prove claim with trace → do NOT include in report
- Question assumptions: "Does this actually work?" → trace call path to confirm
- Challenge completeness: "Is this all?" → grep related usages
- Verify side effects: "What else does this change break?" → check consumers and dependents
- No "looks fine" without proof — state what was verified and how

## Core Principles (ENFORCE ALL)

**YAGNI** — Flag code solving hypothetical future problems (unused parameters, speculative interfaces, premature abstractions)
**KISS** — Flag unnecessarily complex solutions. "Is there a simpler way meeting same requirement?"
**DRY** — Actively grep for similar/duplicate code before accepting new code. 3+ similar patterns → flag for extraction.
**Clean Code** — Readable > clever. Names reveal intent. Functions do one thing. No deep nesting.
**Follow Convention** — Before flagging ANY pattern violation, grep for 3+ existing examples. Codebase convention wins over textbook rules.
**No Flaws/No Bugs** — Trace logic paths. Verify edge cases (null, empty, boundary values). Check error handling covers failure modes.
**Proof Required** — Every claim backed by `file:line` evidence or grep results. Speculation FORBIDDEN.
**Doc Staleness** — Cross-reference changed files against related docs (feature docs, test specs, READMEs). Flag stale or missing updates.

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

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST action in every review. Call `/graph-blast-radius` BEFORE any other review work.

If `.code-graph/graph.db` exists, run graph-blast-radius analysis before reviewing changes:

- Call `/graph-blast-radius` skill (runs `python .claude/scripts/code_graph blast-radius --json`)
- Include in review: impacted files count, untested changes, risk level based on blast radius size
- Use results to prioritize file review order (highest-impact files first)

### Graph-Assisted Change Review

For each changed file, trace full impact:

1. `python .claude/scripts/code_graph trace <changed-file> --direction downstream --json` — all files affected by changes
2. Flag any affected file NOT covered by tests
3. Catches cross-service impact simple diff review misses

## Review Approach (Report-Driven Two-Phase — CRITICAL)

**MANDATORY FIRST: Create Todo Tasks for Review Phases**
Before starting, call TaskCreate with:

- [ ] `[Review Phase 0] Run /graph-blast-radius to analyze change impact` - in_progress **(MUST ATTENTION BE FIRST)**
- [ ] `[Review Phase 0.3] Detect high-risk change types, create risk tasks` - pending
- [ ] `[Review Phase 0.7] Categorize changed files, create dimension review tasks` - pending
- [ ] `[Review Phase 0.5] Plan compliance check (skip if no active plan)` - pending
- [ ] `[Review Phase 1] Get changes and create report file` - pending
- [ ] `[Review Phase 2] Review file-by-file and update report` - pending
- [ ] `[Review Phase 3] Spawn fresh-context sub-agent for holistic assessment` - pending
- [ ] `[Review Phase 4] Generate final review findings` - pending
- [ ] `[Review Phase 5] Run /docs-update if staleness detected` - pending

Update todo status as each phase completes.

> **Note:** If Phase 1 reveals 10+ changed files, replace Phase 2-4 tasks with Systematic Review Protocol tasks:
> `[Review Phase 2] Categorize and fire parallel sub-agents`, `[Review Phase 3] Synchronize and cross-reference`, `[Review Phase 4] Generate consolidated report`

**Phase 0: Run Graph Blast Radius Analysis (MANDATORY FIRST STEP)**

> **IMPORTANT MANDATORY MUST ATTENTION:** FIRST action before ANY other review work.

- MUST ATTENTION Call `/graph-blast-radius` skill
- MUST ATTENTION Record in report: changed files count, impacted files count, untested changes, risk level
- MUST ATTENTION Use blast radius output to prioritize which files to review most carefully in Phase 2
- If `.code-graph/graph.db` does not exist, note "Graph not available — skipping blast radius" and proceed to Phase 0.3

**Phase 0.3: Change Type Detection + Risk Tasks (MANDATORY)**

> **Purpose:** Identify HIGH-RISK change types in this diff before dimensional review.
> Each detected type creates a focused risk task. Change types are ORTHOGONAL to file category:
> the same file can be both a migration AND a security change — detect all independently.

**Step 1: Detect change types**

```bash
git diff --name-only HEAD       # unstaged
git diff --cached --name-only   # staged
```

Evaluate each change type for this diff:

| Change Type        | Detection Signal (adapt to project's actual conventions)                                                                            | TRUE if...                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **DepUpgrade**     | Dependency manifest changed (`package.json`, `*.csproj`, `Gemfile`, `go.mod`, `requirements.txt`, `Cargo.toml`, `pom.xml`, etc.)    | A version number changed in any dependency manifest       |
| **Migration**      | File path or name suggests schema change (contains `migration`, `schema`, `alter_table`, or matches project's migration convention) | Any migration-convention file appears in the diff         |
| **BusEvent**       | New or modified event/message definition or consumer (infer from project conventions: consumer naming, message type directories)    | A consumer or event class is new or its contract changed  |
| **ApiContract**    | API definition file changed (controller, route handler, OpenAPI/GraphQL schema) with route or field differences                     | Diff shows route/action/field additions or removals       |
| **SecurityChange** | Auth/permission definition changed — infer from project conventions (auth middleware, permission constants, policy definitions)     | Any auth or permission gate is added, removed, or changed |
| **ConfigChange**   | Configuration files changed (e.g., `*.json`, `*.yaml`, `*.env*`, `*Config*`, `*Options*`, `*Settings*`, `*.toml`)                   | Any config-convention file appears                        |
| **InfraChange**    | Infrastructure definition changed (`Dockerfile`, `docker-compose*.yml`, CI/CD pipelines, k8s manifests, IaC files)                  | Any infra-convention file appears                         |

Record in report:

```
## Change Type Analysis
DepUpgrade: [YES/NO] | Migration: [YES/NO] | BusEvent: [YES/NO]
ApiContract: [YES/NO] | SecurityChange: [YES/NO] | ConfigChange: [YES/NO] | InfraChange: [YES/NO]
```

**Step 2: Create change-type risk tasks (ALWAYS before any review work)**

> **MANDATORY:** Call `TaskCreate` for each TRUE signal. Do NOT create tasks for FALSE signals.
> The concerns listed are starting points — apply domain knowledge beyond them.

| Condition           | TaskCreate subject                                                                                   | Key concerns to investigate (starting points — expand with domain knowledge)                                                                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DepUpgrade TRUE     | `[Review-DepUpgrade] Dependency upgrade — semver, breaking changes, security advisories`             | Major/minor/patch? Read upstream CHANGELOG for breaking API changes. Grep deprecated API usage. Check transitive dependency changes. Known security advisories for new version? Peer dependency compatibility? Tests still passing?                                   |
| Migration TRUE      | `[Review-Migration] DB migration — rollback path, volume impact, zero-downtime`                      | Rollback/Down script exists? Table size estimate — large tables need lock analysis. NOT NULL column without default on non-empty table? Indexes created with no-lock option? Deployment ordering (before/after service deploy)? Backfill idempotent if run twice?     |
| BusEvent TRUE       | `[Review-BusEvent] Cross-service event/message — consumer, idempotency, retry, poison pill`          | Consumer exists for new event? Retry strategy: prerequisite data not synced → wait-retry vs silent skip? Handler safe to run twice (idempotency)? Malformed message handling / dead-letter configured? Ordering assumptions vs broker guarantees?                     |
| ApiContract TRUE    | `[Review-ApiContract] API contract change — backward compat, client alignment, auth`                 | Additive or breaking? Breaking → versioning or coordinated deploy required. All callers (UI, other services, tests) still compatible? New endpoint protected appropriately? No required response fields added without client update?                                  |
| SecurityChange TRUE | `[Review-SecurityChange] Security/permission change — all paths covered, no privilege escalation`    | All code paths reaching the gate covered? Negative test verifying unauthorized access DENIED? Privilege escalation possible? BOTH enforcement AND display control updated? Permission definition in single authoritative place (no duplicated strings risking drift)? |
| ConfigChange TRUE   | `[Review-ConfigChange] Config/env change — all environments, no secrets committed`                   | New config key present in ALL environment configs? Hardcoded default masking missing production config? Any secret value in the diff? → CRITICAL if yes. Documented in setup guide? App fails fast if config missing?                                                 |
| InfraChange TRUE    | `[Review-InfraChange] Infrastructure change — env parity, no dev values in prod, reproducible build` | Change affects all environments consistently? Hardcoded dev values (localhost, debug flags, dev credentials)? Pinned image/dependency versions? Local dev impact documented? CI/CD secret/permission requirements documented?                                         |

**Step 3: Work through change-type tasks before dimensional review**

For each created change-type task:

1. Set task to `in_progress`
2. Work through ALL applicable concerns — the table above is a starting point, not a ceiling
3. For each concern: cite `file:line` for PASS or describe finding for FAIL/WARN
4. Write findings under `## {Task Subject} Findings` in report
5. Set task to `completed`

> **IMPORTANT:** Complete ALL change-type tasks FIRST, then proceed to Phase 0.7.
> If no change-type signals detected, log `"No high-risk change types detected"` and proceed.

**Phase 0.7: Change Surface Detection + Dynamic Review Tasks (MANDATORY)**

> **Purpose:** Let AI categorize the changes by nature and create review tasks accordingly.
> Do NOT assume fixed categories — derive them from what the project's actual changed files are.
> **Think, don't classify into a preset grid.** The AI owns this step entirely.

**Step 1: Derive categories from the diff**

```bash
git diff --name-only HEAD        # unstaged
git diff --cached --name-only    # staged
```

For each changed file, infer its category by examining:

- **Language/extension:** What technology or domain does this file belong to?
- **Directory semantics:** What layer, module, or concern does this path represent in the project?
- **Change nature:** Is this logic, data schema, configuration, documentation, infrastructure, styling, testing, or tooling?

**Do NOT map to fixed buckets.** Derive categories that fit THIS project's actual structure and vocabulary.

Common category types to consider as starting points (not exhaustive — derive what fits):

- _Server-side logic_ — business rules, API handlers, services, consumers, event processors
- _Client-side logic_ — UI components, state management, API integration
- _Data/Schema_ — migrations, schemas, seed data, domain models
- _Styles/Assets_ — CSS/SCSS, design tokens, images, fonts
- _Configuration_ — app settings, env vars, feature flags
- _Infrastructure_ — Docker, CI/CD, pipelines, cloud manifests
- _Documentation/Specs_ — markdown docs, ADRs, feature specs, test specs
- _Tests_ — unit, integration, E2E test files
- _Build/Tooling_ — build scripts, linters, formatters, bundlers, agent scripts
- _Security_ — auth config, permission definitions, certificates

Record in report:

```
## Change Surface
{Category name} ({category type}): {N} files
{Category name} ({category type}): {M} files
...
```

**Step 2: For each category, enumerate concerns and create a task**

> **This is where you THINK, not fill in blanks.** Apply `SYNC:category-review-thinking` for each category.

For EACH identified category:

1. **Understand the domain:** What is this category's purpose? What invariants govern it? Who depends on it?
2. **Read project conventions:** Grep for style guides, patterns docs, READMEs specific to this area
3. **Derive concerns from first principles** — DO NOT limit to any fixed list; trust your domain knowledge
4. **Create a `TaskCreate` task** named `[Review-{Category}] {brief concern summary}` listing derived concerns
5. **Select the appropriate sub-agent type** (see Sub-Agent Type Selection)

> **ALWAYS create:** `[Review-General]` — universal quality: correctness, YAGNI/KISS/DRY, doc staleness, test coverage. Runs across ALL changed files regardless of other categories.

**Sub-Agent Type Selection:**

| Category Nature                        | `subagent_type`         |
| -------------------------------------- | ----------------------- |
| Code logic (any stack)                 | `code-reviewer`         |
| Security, auth, permissions            | `security-auditor`      |
| Performance, query efficiency, latency | `performance-optimizer` |
| Documentation, plans, specs, ADRs      | `general-purpose`       |
| Infrastructure, CI/CD, config          | `general-purpose`       |
| Mixed or default                       | `code-reviewer`         |

**Step 3: Work through tasks in order**

For each created task:

1. Set task to `in_progress` before starting
2. Review ONLY files in that category's scope
3. Apply `SYNC:category-review-thinking` — trust your domain knowledge beyond the examples there
4. Write findings to report under `## {Task Subject} Findings` section
5. Set task to `completed` before starting next task

> **NEVER mark a dimension task completed by scanning.** Work through each relevant file explicitly.
> For large categories (10+ files): escalate to a parallel sub-agent using the Systematic Review Protocol.

**Phase 0.5: Plan Compliance Check (CONDITIONAL — only when active plan exists)**

Check `## Plan Context` in injected context:

- If "Plan: none" → skip, log "No active plan — skipping plan compliance"
- If "Plan: {path}" → load plan and verify:

1. Read `{plan-path}/plan.md` — get phase list and scope
2. Read relevant phase files — extract files to modify, test specifications, success criteria
3. Verify:
    - MUST ATTENTION verify **Scope match** — changed files listed in plan phases (warn on unplanned files)
    - MUST ATTENTION verify **Test evidence** — tests mapped to completed phases have evidence (file:line), not "TBD"
    - MUST ATTENTION verify **Success criteria met** — phase success criteria satisfied by changes
4. Add "Plan Compliance" section to review report

**Phase 1: Get Changes and Create Report File**

- MUST ATTENTION Run `git status` to see all changed files
- MUST ATTENTION Run `git diff` to see actual changes (staged and unstaged)
- MUST ATTENTION Create `plans/reports/code-review-{date}-{slug}.md`
- MUST ATTENTION Initialize with Scope, Files to Review, Blast Radius Summary sections

**Phase 2: File-by-File Review (Build Report Incrementally)**

For EACH changed file, read and **immediately update report** with:

- File path and change type (added/modified/deleted)
- Change Summary: what modified/added
- Purpose: why change exists
- **Convention check:** Grep 3+ similar patterns — does new code follow existing convention?
- **Correctness check:** Trace logic paths — handles null, empty, boundary values, error cases?
- **DRY check:** Grep similar/duplicate code — does this logic already exist elsewhere?
- **Intention check:** Does change serve stated purpose? Flag unrelated modifications
- **Logic trace:** Trace one happy path + one error path. Logic matches requirements?
- **Semantic correctness:** Does the artifact DO what it's supposed to?
- Issues Found: naming, typing, responsibility, patterns, bugs, over-engineering, logic errors
- Continue to next file, repeat

**Phase 3: Second-Round Review (Conditional Protocol — branch on Phase 0.7 surface)**

> **Protocol:** `SYNC:double-round-trip-review` + `SYNC:fresh-context-review` + `SYNC:review-protocol-injection` (all inlined above).
> **INVARIANT:** Phase 3 ALWAYS fires a fresh sub-agent. NEVER declare PASS after Phase 2 alone.

Check categories from Phase 0.7 — if multiple distinct domains changed (e.g., server-side + client-side), run **Synthesis Mode**. Otherwise run **Holistic Mode**.

---

**[SYNTHESIS MODE — when multiple distinct domains changed]**

Spawn a **Synthesis Agent** as Round 2. Purpose: catch cross-boundary issues individual dimensional tasks cannot see.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim, `subagent_type: "code-reviewer"`
2. Embed all 10 universal SYNC blocks verbatim
3. Set Task as:

    ```
    Synthesis review — cross-boundary concerns ONLY across the changed domains in this diff.
    You have these dimensional findings as context: {summary from each dimensional task}.
    Re-read ALL changed files from scratch via your own tool calls.

    Focus ONLY on cross-boundary concerns — do NOT re-review each domain's internals:
    1. Contract Alignment: Do callers match what callees expose? (routes, parameters, field names, types)
    2. Data Consistency: Are field names/types consistent across layer boundaries?
    3. Security Boundary: Is auth enforced on BOTH sides (enforcement AND display control)?
    4. Cross-Layer Naming: Same concept named differently across layers?
    5. Missing Wiring: New producer with no consumer? New consumer with no producer? New feature with no doc?
    6. Documentation: Docs reflect changes in BOTH domains together?
    ```

4. Set Target Files as `"run git diff to see all uncommitted changes"`
5. Set report path as `plans/reports/synthesis-review-{date}.md`

After sub-agent returns:

1. **Read** synthesis report
2. **Integrate** findings as `## Synthesis Round Findings` in main report — DO NOT filter or override
3. **If FAIL:** fix issues, spawn NEW synthesis sub-agent (new Agent call)
4. **Max 3 fresh rounds** — escalate via `AskUserQuestion` if still failing

---

**[HOLISTIC MODE — when single domain changed]**

No cross-boundary synthesis needed. Spawn standard holistic Round 2.

When constructing Agent call prompt:

1. Copy Agent call shape from `SYNC:review-protocol-injection` template verbatim
2. Select `subagent_type` based on domain's dominant concern (see Sub-Agent Type Selection)
3. Set Task as: `"Review ALL uncommitted changes holistically. Focus on big picture — overall technical approach coherence, architecture layers, logic placement (lowest layer), DRY violations, YAGNI/KISS, function complexity. Domain: {category from Phase 0.7} — apply domain knowledge for this category accordingly."`
4. Set Target Files as `"run git diff to see all uncommitted changes"`
5. Set report path as `plans/reports/code-review-changes-round{N}-{date}.md`

After sub-agent returns:

1. **Read** sub-agent's report
2. **Integrate** findings as `## Round {N} Findings (Fresh Sub-Agent)` in main report — DO NOT filter or override
3. **If FAIL:** fix issues, spawn NEW Round N+1 fresh sub-agent (new Agent call — never reuse Round 2's agent)
4. **Max 3 fresh rounds** — escalate to user via `AskUserQuestion` if still failing
5. **Final verdict** must incorporate findings from ALL rounds

The following checks are handled by sub-agent but can be verified in Phase 4:

**Clean Code & Over-engineering Checks:**

- MUST ATTENTION **YAGNI:** Code solving hypothetical future problems? Unused params, speculative interfaces?
- MUST ATTENTION **KISS:** Unnecessarily complex solution? Could this be simpler while meeting the same requirement?
- MUST ATTENTION **Function complexity:** Methods too long? Nesting too deep? Multiple responsibilities?
- MUST ATTENTION **Readability:** Would a new team member understand without reading the full implementation?

**Documentation Staleness Check (REQUIRED):**

For each changed file, identify related documentation:

- Search for feature docs, architecture references, READMEs at module/service roots, API docs, test specs, setup guides
- Flag any doc where content no longer matches the changed artifact
- Flag missing docs for new features or components that should be documented
- **Do NOT auto-fix** — flag in report with specific stale section and what changed

**Correctness & Bug Detection:** Apply `SYNC:bug-detection` — null safety, boundaries, error handling, resource cleanup, concurrency.

**Test Spec Verification:** Apply `SYNC:test-spec-verification` — locate specs, verify coverage, flag gaps.

**Integration Test Sync:** Apply `SYNC:integration-test-sync-check` — surface missing tests via `AskUserQuestion`.

**Translation Sync:** Apply `SYNC:translation-sync-check` — for multilingual UI text changes, require translation updates or explicit user risk acceptance.

**Phase 4: Generate Final Review Result**

Update report with final sections:

- MUST ATTENTION Overall Assessment (big picture summary)
- MUST ATTENTION Critical Issues (must fix before merge)
- MUST ATTENTION High Priority (should fix)
- MUST ATTENTION Architecture Recommendations
- MUST ATTENTION Documentation Staleness (list stale docs with what changed, or "No doc updates needed")
- MUST ATTENTION Positive Observations
- MUST ATTENTION Suggested commit message (based on changes)

## Phase 5: Docs-Update Triage (CONDITIONAL)

If Documentation Staleness Check in Phase 4 identified stale docs:

1. Invoke `/docs-update` skill to update impacted documentation
2. If `/docs-update` produces changes, include in review summary
3. If no staleness detected, skip: "No doc updates needed — staleness check was clean"

## Readability Checklist (MUST ATTENTION evaluate)

Before approving, verify artifacts are **easy to read, maintain, understand**:

- **Schema visibility** — Function computes data structure? Comment shows output shape so readers don't trace code
- **Non-obvious data flows** — Data transforms through multiple steps? Brief comment explains pipeline
- **Self-documenting signatures** — Params explain their role; flag unused params
- **Magic values** — Unexplained numbers/strings → named constants or inline rationale
- **Naming clarity** — Variables/functions reveal intent without reading implementation

## Review Checklist

### 1. Architecture Compliance

- MUST ATTENTION Follows project's layer/module boundaries (read `docs/project-config.json` or equivalent)
- MUST ATTENTION No cross-module/service direct data access where boundaries exist
- MUST ATTENTION Logic placed in lowest responsible layer (not in orchestrators/top-layer classes)

### 2. Code Quality & Clean Code

- MUST ATTENTION Single Responsibility Principle — each function/class does ONE thing
- MUST ATTENTION No code duplication (DRY) — grep for similar code, extract if 3+ occurrences
- MUST ATTENTION Appropriate error handling following project patterns
- MUST ATTENTION No magic numbers/strings (extract to named constants)
- MUST ATTENTION Type annotations on all functions (where language requires)
- MUST ATTENTION Early returns/guard clauses used
- MUST ATTENTION YAGNI — no speculative features, unused parameters, premature abstractions
- MUST ATTENTION KISS — simplest solution meeting requirement
- MUST ATTENTION Follows existing codebase conventions (verify with grep for 3+ examples)

### 2.5. Naming Conventions

- MUST ATTENTION Names reveal intent (WHAT not HOW)
- MUST ATTENTION Specific names, not generic (`employeeRecords` not `data`)
- MUST ATTENTION Booleans: prefix with state-indicating verb (`isActive`, `hasPermission`, `canEdit`)
- MUST ATTENTION No cryptic abbreviations

### 3. Project-Specific Patterns

- MUST ATTENTION Read project's patterns/conventions reference docs BEFORE flagging violations
- MUST ATTENTION Verify 3+ existing examples before concluding a pattern is a violation
- MUST ATTENTION Flag deviation from project patterns with evidence (`file:line` showing existing pattern)

### 4. Security

- MUST ATTENTION No hardcoded credentials, tokens, or secrets
- MUST ATTENTION Proper authorization checks at all entry points
- MUST ATTENTION Input validation at system boundaries (user input, external APIs, message payloads)
- MUST ATTENTION No injection risks (SQL, command, template, etc.)

### 5. Performance

- MUST ATTENTION No O(n²) complexity where O(n) or O(1) is possible (use lookup structures)
- MUST ATTENTION No N+1 query patterns (batch load related data before iterating)
- MUST ATTENTION Pagination for all list queries (never fetch unbounded result sets)
- MUST ATTENTION Parallel operations where independent (not forced sequential)
- MUST ATTENTION Async/await used correctly (no blocking in async context)
- MUST ATTENTION Query patterns have appropriate indexes

### 6. Common Issues

- MUST ATTENTION Unused imports or variables
- MUST ATTENTION Debug/logging statements left in that should not be in production
- MUST ATTENTION Hardcoded values that should be configuration
- MUST ATTENTION Missing async/await or promise handling
- MUST ATTENTION Incorrect or absent exception handling
- MUST ATTENTION Missing validation at boundaries

### 7. Documentation Staleness

- MUST ATTENTION For each changed file: identify related docs (feature docs, architecture references, READMEs)
- MUST ATTENTION Changed logic → verify relevant feature/module docs still accurate
- MUST ATTENTION Changed tooling (scripts, configs, CI) → verify setup/getting-started docs still accurate
- MUST ATTENTION New feature/component added → flag if corresponding doc missing
- MUST ATTENTION Test specs reflect current behavior after changes
- MUST ATTENTION API changes reflected in relevant API docs or specs

## Output Format

Provide feedback in this format:

**Summary:** Brief overall assessment

**Critical Issues:** (Must fix before commit)

- Issue 1: Description and suggested fix

**High Priority:** (Should fix)

- Issue 1: Description

**Suggestions:** (Nice to have)

- Suggestion 1

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

> **NON-NEGOTIABLE: When changeset is large (10+ files), MUST ATTENTION use this systematic protocol instead of reviewing files one-by-one sequentially.**
>
> **Principle:** Review carefully and systematically — break into groups, fire multiple specialized agents to review in parallel. Ensure no flaws, no bugs, no stale info, and best practices in every aspect.

### Auto-Activation

In Phase 0, after running `git status`, count changed files. If **10 or more files** changed:

1. **STOP** sequential Phase 1-3 approach
2. **SWITCH** to Systematic Review Protocol automatically
3. **ANNOUNCE** to user: `"Detected {N} changed files. Switching to systematic parallel review protocol."`

### Step 1: Categorize Changes

Group all changed files into logical categories derived from the project's actual structure (see Phase 0.7). Example groupings to orient thinking (derive what fits the project):

| Category Type           | Example Groupings                                                     |
| ----------------------- | --------------------------------------------------------------------- |
| **Agent/Tooling**       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
| **Root config/docs**    | Root README, project config, CI/CD pipeline configs                   |
| **Reference docs**      | Architecture docs, patterns references, setup guides                  |
| **Feature/domain docs** | Business feature documentation, spec files, ADRs                      |
| **Backend logic**       | Service/handler/controller source (infer from project structure)      |
| **Frontend logic**      | UI component/state/API source (infer from project structure)          |
| **Data/Schema**         | Migrations, schema files, seed data                                   |
| **Tests**               | Unit, integration, E2E test files                                     |
| **Infrastructure**      | Docker, k8s, CI/CD, cloud manifests                                   |

Derive the actual groupings from what THIS project contains — do not force files into categories that don't fit.

### Step 2: Fire Parallel Specialized Sub-Agents

Launch one sub-agent per category via `Agent` tool with `run_in_background: true`.

**Sub-agent type selection per category:**

- Code logic (any stack) → `code-reviewer`
- Security-sensitive changes → `security-auditor`
- Performance-critical paths → `performance-optimizer`
- Docs, plans, specs, configs, infra → `general-purpose`

Each sub-agent receives:

- Full list of files in its category
- The `SYNC:category-review-thinking` framework as its primary thinking model
- Project reference docs relevant to its category (discovered by searching `*patterns*`, `*conventions*`, `*style-guide*`)
- Cross-reference verification instructions (counts, tables, links where applicable)

**All sub-agents run in parallel** to maximize speed and coverage.

### Step 3: Synchronize & Cross-Reference

After all sub-agents complete:

1. **Collect findings** from each agent's report
2. **Cross-reference** — verify counts, tables, references consistent ACROSS categories
3. **Detect gaps** — issues only visible when looking across categories (e.g., new feature added in code but missing from docs; new API endpoint with no client call)
4. **Consolidate** into single holistic report with categorized findings

### Step 4: Holistic Big-Picture Assessment

With all category findings combined, assess:

- Overall coherence of changes as a unified intent
- Cross-category synchronization (do docs match code? do contracts match callers?)
- Risk areas where categories interact
- Missing documentation updates for changed artifacts

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If NOT already in a workflow, MUST use `AskUserQuestion` to ask user. Do NOT judge task complexity or decide "simple enough to skip" — user decides, not you:
>
> 1. **Activate `review-changes` workflow** (Recommended) — review-changes → review-architecture → code-simplifier → code-review → performance → plan → plan-validate → cook → watzup
> 2. **Execute `/review-changes` directly** — run this skill standalone

---

## Architecture Boundary Check

For each changed file, verify no import from forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match path against each rule's `paths` glob patterns
3. **Scan imports** — Grep file for import statements
4. **Check violations** — If any import path contains layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` not present in project-config.json, skip silently.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, MUST use `AskUserQuestion` to present options. Do NOT skip because task seems "simple" or "obvious" — user decides:

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
> 5. **New artifact = wired artifact.** Created something? Prove it's registered, imported, reachable by all consumers.

## Related Skills

| Skill                      | Relationship                                                              | When to Call                                                                  |
| -------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/docs-update`             | **Primary downstream** — called when staleness detected                   | Triggered by Documentation Staleness findings                                 |
| `/spec-discovery [update]` | **Spec updater** — called when artifact behavior differs from spec bundle | Call BEFORE docs-update if spec-was-wrong scenario detected                   |
| `/feature-docs [update]`   | **Feature doc updater** — called for feature doc section changes          | Called internally by docs-update; call directly for targeted update           |
| `/tdd-spec [update]`       | **Test spec updater** — called when test cases may be stale               | Called internally by docs-update; call directly for targeted test case update |
| `/integration-test-review` | **Test quality gate** — detects test/spec mismatches                      | Call when changes touch areas covered by integration tests                    |
| `/code-review`             | **Code quality** — deeper review of changed code                          | Always follows review-changes quality pass                                    |

## Standalone Chain

> **When called outside a workflow** (i.e., user ran /review-changes directly):

```
review-changes (you are here)
  │
  ├─ Code quality checks (code-simplifier → review-architecture → code-review → performance)
  │
  ├─ Phase 5: Documentation Staleness Triage
  │    → If stale docs detected: [REQUIRED] → /docs-update
  │
  ├─ Integration test check (SYNC:integration-test-sync-check):
  │    → If logic changes touch tested areas: [REQUIRED] → /integration-test [from-changes]
  │    → Then: /integration-test-review → /integration-test-verify
  │
  ├─ Translation sync check (SYNC:translation-sync-check):
  │    → If multilingual UI text changes lack locale updates: [REQUIRED] AskUserQuestion + explicit decision
  │
  ├─ Bugfix-specific: "Was spec wrong?" check:
  │    If this review is post-bugfix AND spec describes the bug as expected behavior:
  │    → [REQUIRED] Flag to user: "The spec may document the bug as correct behavior."
  │    → If spec bug confirmed → [REQUIRED]: /spec-discovery [update] FIRST → /feature-docs [update relevant sections]
  │    → Do NOT let /docs-update update test cases to document broken behavior.
  │
  └─ [RECOMMENDED] → /watzup
        Summary of all review findings, doc changes, and test coverage status.
```

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:understand-code-first:reminder -->

**IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->
<!-- SYNC:design-patterns-quality:reminder -->

**IMPORTANT MUST ATTENTION** check DRY via OOP, right responsibility layer, SOLID. Grep for dangling refs after moves.

<!-- /SYNC:design-patterns-quality:reminder -->
<!-- SYNC:complexity-prevention:reminder -->

**IMPORTANT MUST ATTENTION** apply complexity prevention — one business change = one code change. Flag change amplification (>3 edit sites for future change), scattered type-switches, anemic models, primitive obsession, leaked technology through abstractions, shallow modules, un-extracted utility logic (paging/datetime/string/retry → helpers), and logic in the wrong higher layer (downshift to callee/entity/VM). Don't rationalize silent duplication with pure YAGNI.

<!-- /SYNC:complexity-prevention:reminder -->
<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->
<!-- SYNC:logic-and-intention-review:reminder -->

**IMPORTANT MUST ATTENTION** verify WHAT code does matches WHY it changed. Trace happy + error paths.

<!-- /SYNC:logic-and-intention-review:reminder -->
<!-- SYNC:bug-detection:reminder -->

**IMPORTANT MUST ATTENTION** check null safety, boundaries, error handling, resource management for every review.

<!-- /SYNC:bug-detection:reminder -->
<!-- SYNC:test-spec-verification:reminder -->

**IMPORTANT MUST ATTENTION** map changed code paths to test cases. Flag untested paths.

<!-- /SYNC:test-spec-verification:reminder -->
<!-- SYNC:integration-test-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** check changed logic files for matching tests. Surface missing tests via `AskUserQuestion` — mandatory, not advisory.

<!-- /SYNC:integration-test-sync-check:reminder -->
<!-- SYNC:translation-sync-check:reminder -->

**IMPORTANT MUST ATTENTION** for multilingual UI text changes, verify translation updates. If missing, require explicit user decision via `AskUserQuestion`.

<!-- /SYNC:translation-sync-check:reminder -->
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
> **Business terminology in Application/Domain layers.** Comments and naming in Application/Domain must stay business-oriented and technical-agnostic; avoid implementation terms (say `background job`, not `Hangfire background job`).

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

> **[CRITICAL — TOP 3 RULES REPEATED]**
>
> 1. **MUST ATTENTION Phase 0 graph blast-radius FIRST** — NEVER skip; informs entire review priority order
> 2. **NEVER declare PASS after Round 1 alone** — fresh sub-agent review mandatory (Round 2+)
> 3. **MUST ATTENTION TaskCreate ALL phases** before starting; missing tests MUST surface via `AskUserQuestion`

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via `AskUserQuestion` — NEVER auto-decide
- **MANDATORY IMPORTANT MUST ATTENTION** add final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** discover and READ project-specific reference docs before starting
- **MANDATORY IMPORTANT MUST ATTENTION** Phase 0 graph blast-radius is FIRST step — NEVER skip it
- **MANDATORY IMPORTANT MUST ATTENTION** NEVER declare PASS after Round 1 alone — fresh sub-agent review is mandatory
- **MANDATORY IMPORTANT MUST ATTENTION** documentation staleness check is REQUIRED in every review — flag stale docs even if not auto-fixing
- **MANDATORY IMPORTANT MUST ATTENTION** missing tests for changed business logic MUST surface to user via `AskUserQuestion` — NOT silently logged
- **MANDATORY IMPORTANT MUST ATTENTION** run `/why-review` after completing this review to validate design rationale, alternatives considered, and risk assessment

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze task size and break into many small todo tasks systematically before starting — critical for context preservation.

---
