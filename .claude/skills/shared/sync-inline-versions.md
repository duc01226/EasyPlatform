# SYNC Inline Versions — Checklist Format (5-15 lines each)

> This file contains the canonical checklist versions of shared protocols.
> These are what gets copied into `<!-- SYNC:tag -->` blocks across all skills.
> To update: edit here first, then `grep SYNC:tag-name` and update all copies.

---

## SYNC:understand-code-first

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

---

## SYNC:evidence-based-reasoning

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

---

## SYNC:estimation-framework

> **Estimation Framework** — Story Points (Modified Fibonacci) + Man-Days for 3-5yr dev (6 productive hrs/day, .NET + Angular stack). AI estimate assumes Claude Code with good project context (code graph, patterns, hooks active).
>
> | SP  | Complexity | Description                                    | Traditional (code + test) | AI-Assisted (code+rev + test+rev) |
> | --- | ---------- | ---------------------------------------------- | ------------------------- | --------------------------------- |
> | 1   | Low        | Trivial: single field, config flag, CSS fix    | 0.5d (0.3d+0.2d)          | 0.25d (0.15d+0.1d)                |
> | 2   | Low        | Small: simple CRUD endpoint OR basic component | 1d (0.6d+0.4d)            | 0.35d (0.2d+0.15d)                |
> | 3   | Medium     | Medium: form + API + validation                | 2d (1.3d+0.7d)            | 0.65d (0.4d+0.25d)                |
> | 5   | Medium     | Large: multi-layer feature (BE + FE)           | 4d (2.5d+1.5d)            | 1.0d (0.6d+0.4d)                  |
> | 8   | High       | Very large: complex feature + migration        | 6d (4d+2d)                | 1.5d (1.0d+0.5d)                  |
> | 13  | Critical   | Epic: cross-service — SHOULD split             | 10d (6.5d+3.5d)           | 2.0d (1.3d+0.7d)                  |
> | 21  | Critical   | MUST split — not sprint-ready                  | >15d                      | ~3d                               |
>
> **AI speedup grows with task size:** SP 1 ≈ 2x · SP 2-3 ≈ 3x · SP 5-8 ≈ 4x · SP 13+ ≈ 5x. Pattern-heavy CQRS/Angular boilerplate eliminated in hours at any scale. Fixed overhead: human review.
> **AI column breakdown:** `(code_gen × 1.3) + (test_gen × 1.3)` — each artifact adds 30% human review overhead. Test writing with AI = few hours generation + 30% review, same model as coding.
> Output `story_points`, `complexity`, `man_days_traditional`, `man_days_ai` in plan/PBI frontmatter.

---

## SYNC:ui-system-context

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

---

## SYNC:plan-quality

> **Plan Quality** — Every plan phase MUST ATTENTION include test specifications.
>
> 1. Add `## Test Specifications` section with TC-{FEAT}-{NNN} IDs to every phase file
> 2. Map every functional requirement to ≥1 TC (or explicit `TBD` with rationale)
> 3. TC IDs follow `TC-{FEATURE}-{NNN}` format — reference by ID, never embed full content
> 4. Before any new workflow step: call `TaskList` and re-read the phase file
> 5. On context compaction: call `TaskList` FIRST — never create duplicate tasks
> 6. Verify TC satisfaction per phase before marking complete (evidence must be `file:line`, not TBD)
>
> **Mode:** TDD-first → reference existing TCs with `Evidence: TBD`. Implement-first → use TBD → `/tdd-spec` fills after.

---

## SYNC:rationalization-prevention

> **Rationalization Prevention** — AI skips steps via these evasions. Recognize and reject:
>
> | Evasion                      | Rebuttal                                                      |
> | ---------------------------- | ------------------------------------------------------------- |
> | "Too simple for a plan"      | Simple + wrong assumptions = wasted time. Plan anyway.        |
> | "I'll test after"            | RED before GREEN. Write/verify test first.                    |
> | "Already searched"           | Show grep evidence with `file:line`. No proof = no search.    |
> | "Just do it"                 | Still need TaskCreate. Skip depth, never skip tracking.       |
> | "Just a small fix"           | Small fix in wrong location cascades. Verify file:line first. |
> | "Code is self-explanatory"   | Future readers need evidence trail. Document anyway.          |
> | "Combine steps to save time" | Combined steps dilute focus. Each step has distinct purpose.  |

---

## SYNC:output-quality-principles

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

---

## SYNC:graph-assisted-investigation

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

---

## SYNC:cross-service-check

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

---

## SYNC:cross-service-check:reminder

- **IMPORTANT MUST ATTENTION** microservices/event-driven: scan producers, consumers, sagas, contracts in task scope. Per touchpoint: owner · message · consumers · risk (NONE/ADDITIVE/BREAKING). Missing consumer = silent regression.

---

## SYNC:root-cause-debugging

> **Root Cause Debugging** — Systematic approach, never guess-and-check.
>
> 1. **Reproduce** — Confirm the issue exists with evidence (error message, stack trace, screenshot)
> 2. **Isolate** — Narrow to specific file/function/line using binary search + graph trace
> 3. **Trace** — Follow data flow from input to failure point. Read actual code, don't infer.
> 4. **Hypothesize** — Form theory with confidence %. State what evidence supports/contradicts it
> 5. **Verify** — Test hypothesis with targeted grep/read. One variable at a time.
> 6. **Fix** — Address root cause, not symptoms. Verify fix doesn't break callers via graph `connections`
>
> **NEVER:** Guess without evidence. Fix symptoms instead of cause. Skip reproduction step.

---

## SYNC:scan-and-update-reference-doc

> **Scan & Update Reference Doc** — Surgical updates only, never full rewrite.
>
> 1. **Read existing doc** first — understand current structure and manual annotations
> 2. **Detect mode:** Placeholder (only headings, no content) → Init mode. Has content → Sync mode.
> 3. **Scan codebase** for current state (grep/glob for patterns, counts, file paths)
> 4. **Diff** findings vs doc content — identify stale sections only
> 5. **Update ONLY** sections where code diverged from doc. Preserve manual annotations.
> 6. **Update metadata** (date, counts, version) in frontmatter or header
> 7. **NEVER** rewrite entire doc. NEVER remove sections without evidence they're obsolete.

---

## SYNC:red-flag-stop-conditions

> **Red Flag Stop Conditions** — STOP and escalate to user via AskUserQuestion when:
>
> 1. Confidence drops below 60% on any critical decision
> 2. Changes would affect >20 files (blast radius too large)
> 3. Cross-service boundary is being crossed
> 4. Security-sensitive code (auth, crypto, PII handling)
> 5. Breaking change detected (interface, API contract, DB schema)
> 6. Test coverage would decrease after changes
> 7. Approach requires technology/pattern not in the project
>
> **NEVER proceed past a red flag without explicit user approval.**

---

## SYNC:double-round-trip-review

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

---

## SYNC:logic-and-intention-review

> **Logic & Intention Review** — Verify WHAT code does matches WHY it was changed.
>
> 1. **Change Intention Check:** Every changed file MUST ATTENTION serve the stated purpose. Flag unrelated changes as scope creep.
> 2. **Happy Path Trace:** Walk through one complete success scenario through changed code
> 3. **Error Path Trace:** Walk through one failure/edge case scenario through changed code
> 4. **Acceptance Mapping:** If plan context available, map every acceptance criterion to a code change
>
> **NEVER mark review PASS without completing both traces (happy + error path).**

---

## SYNC:behavioral-delta-matrix

> **Behavioral Delta Matrix** — MANDATORY for bugfix reviews. Produce this table BEFORE PASS/FAIL verdict. Narrative descriptions don't substitute.
>
> | Input state | Pre-fix behavior   | Post-fix behavior | Delta                                |
> | ----------- | ------------------ | ----------------- | ------------------------------------ |
> | {condition} | {current behavior} | {fixed behavior}  | Preserved ✓ / Fixed ✓ / REGRESSION ✗ |
>
> **Rules:** ≥3 rows · ≥1 row the bug report did NOT mention · REGRESSION delta → FAIL until a preservation test covers it (`tdd-spec-template.md#preservation-tests-mandatory-for-bugfix-specs`)
>
> **BLOCKED until:** ≥3 rows · ≥1 row outside bug report · no unmitigated REGRESSION

---

## SYNC:bug-detection

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

---

## SYNC:test-spec-verification

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

---

## SYNC:integration-test-sync-check

> **Integration Test Sync Check** — Verify changed business logic files have corresponding tests.
>
> 1. From changed files → identify **business logic files**: handlers, commands, queries, services, controllers, resolvers, event processors. Naming varies by stack — infer from project conventions (e.g., `*Service.*`, `*Handler.*`, `*Controller.*`, `*Command.*`, `*Query.*`, `*Resolver.*`).
> 2. For each identified file → search for a corresponding test file. Infer test naming from existing tests in the project (e.g., `*.test.ts`, `*Tests.java`, `*_test.py`, `*.spec.js`, `*Tests.cs`). Check standard test directories (`tests/`, `spec/`, `__tests__/`, or adjacent test projects/packages).
> 3. If test EXISTS → check if test methods cover changed behavior (new methods/parameters/logic paths)
> 4. If test MISSING → **MANDATORY**: use `AskUserQuestion`: "Business logic file `{file}` has no integration tests — run `/integration-test` before proceeding, or confirm tests already written?" Options: "Run `/integration-test` first" (Recommended) | "Tests already written/updated — proceed"
> 5. Severity: **HIGH** — missing tests for changed business logic MUST be surfaced to the user; do NOT silently flag and continue
>
> **Do NOT silently skip. Business logic changes without test coverage require an explicit user decision via `AskUserQuestion`.**

---

## SYNC:iterative-phase-quality

> **Iterative Phase Quality** — Score complexity BEFORE planning.
>
> **Complexity signals:** >5 files +2, cross-service +3, new pattern +2, DB migration +2
> **Score >=6 →** MUST ATTENTION decompose into phases. Each phase:
>
> - ≤5 files modified
> - ≤3h effort
> - Follows cycle: plan → implement → review → fix → verify
> - Do NOT start Phase N+1 until Phase N passes VERIFY
>
> **Phase success = all TCs pass + code-reviewer agent approves + no CRITICAL findings.**

---

## SYNC:design-patterns-quality

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

---

## SYNC:plan-granularity

> **Plan Granularity** — Every phase must pass 5-point check before implementation:
>
> 1. Lists exact file paths to modify (not generic "implement X")
> 2. No planning verbs (research, investigate, analyze, determine, figure out)
> 3. Steps ≤30min each, phase total ≤3h
> 4. ≤5 files per phase
> 5. No open decisions or TBDs in approach
>
> **Failing phases →** create sub-plan. Repeat until ALL leaf phases pass (max depth: 3).
> **Self-question:** "Can I start coding RIGHT NOW? If any step needs 'figuring out' → sub-plan it."

---

## SYNC:preservation-inventory

> **Preservation Inventory** — MANDATORY for bugfix plans. Trigger keywords in plan title/frontmatter: `fix`, `bug`, `regression`, `broken`, `defect`. Author MUST produce this table BEFORE writing implementation steps.
>
> **Columns:** `Invariant | file:line | Why (data consequence if broken) | Verification (TC-ID or grep)`
>
> **BLOCKED until:** ≥3 rows · every File cell has `file:line` · every Verification cell has TC-ID or grep (not "manually verify")

---

## SYNC:cross-cutting-quality

> **Cross-Cutting Quality** — Check across all changed files:
>
> 1. **Error handling consistency** — same error patterns across related files
> 2. **Logging** — structured logging with correlation IDs for traceability
> 3. **Security** — no hardcoded secrets, input validation at boundaries, auth checks present
> 4. **Performance** — no N+1 queries, unnecessary allocations, or blocking calls in async paths
> 5. **Observability** — health checks, metrics, tracing spans for new endpoints

---

## SYNC:scaffold-production-readiness

> **Scaffold Production Readiness** — Every scaffolded project MUST ATTENTION include 5 foundations:
>
> 1. **Code Quality Tooling** — linting, formatting, pre-commit hooks, CI gates. Specific tool choices → `docs/project-reference/` or `project-config.json`.
> 2. **Error Handling Foundation** — HTTP interceptor, error classification (4xx/5xx taxonomy), user notification, global uncaught handler.
> 3. **Loading State Management** — counter-based tracker (not boolean toggle), skip-token for background requests, 300ms flicker guard.
> 4. **Docker Development Environment** — compose profiles (`dev`/`test`/`infra`), multi-stage Dockerfile, health checks on all services, non-root production user.
> 5. **Integration Points** — document each outbound boundary; configure retry + circuit breaker + timeout; integration tests for happy path and failure path.
>
> **BLOCK `/cook` if any foundation is unchecked.** Present 2-3 options per concern via `AskUserQuestion` before implementing.

---

## SYNC:harness-setup

> **Harness Engineering** — An outer agent harness has two jobs: raise first-attempt quality + provide self-correction feedback loops before human review.
>
> **Controls split:**
>
> | Axis        | Type          | Examples                                                                      | Frequency        |
> | ----------- | ------------- | ----------------------------------------------------------------------------- | ---------------- |
> | Feedforward | Computational | `.editorconfig`, strict compiler flags, enforced module boundaries            | Always-on        |
> | Feedforward | Inferential   | `CLAUDE.md` conventions, skill prompts, architecture notes, pattern catalogs  | Always-on        |
> | Feedback    | Computational | Linters, type checks, pre-commit hooks, ArchUnit/arch-fitness tests, CI gates | Pre-commit → CI  |
> | Feedback    | Inferential   | `/code-review` skill, `/sre-review`, `/security`, LLM-as-judge passes         | Post-commit → CI |
>
> **Three harness types:**
>
> 1. **Maintainability** — Complexity, duplication, coverage, style. Easiest: rich deterministic tooling.
> 2. **Architecture fitness** — Module boundaries, dependency direction, performance budgets, observability conventions.
> 3. **Behaviour** — Functional correctness. Hardest: requires approved fixtures or strong spec-first discipline.
>
> **Keep quality left:** pre-commit sensors fire first (cheap), CI sensors fire second, post-review last (expensive).
>
> **Research-driven:** Never hardcode tool choices. Detect tech stack → research ecosystem → present top 2-3 options → user decides. Enforce strictest defaults; loosen only with explicit approval.
>
> **Harnessability signals:** Strong typing, explicit module boundaries, opinionated frameworks = easier to harness. Treat these as greenfield architectural choices, not just style preferences.

---

## SYNC:two-stage-task-review

> **Two-Stage Task Review** — Both stages MUST ATTENTION complete before marking task done.
>
> **Stage 1: Self-review** — Immediately after implementation:
>
> - Requirements met? No regressions? Code quality acceptable?
>
> **Stage 2: Cross-review** — Via `code-reviewer` subagent:
>
> - Catches blind spots, convention drift, missed edge cases
>
> **NEVER skip Stage 2.** Self-review alone misses 40%+ of issues.

---

## SYNC:web-research

> **Web Research** — Structured web search for evidence gathering.
>
> 1. Form 3-5 specific search queries (not generic questions)
> 2. Use WebSearch for each query, collect top 3-5 sources
> 3. Validate source credibility (official docs > blogs > forums)
> 4. Cross-validate claims across 2+ sources before citing
> 5. Write findings to research report with source URLs
>
> **NEVER cite a single source as authoritative. Always cross-validate.**

---

## SYNC:graph-impact-analysis

> **Graph Impact Analysis** — When `.code-graph/graph.db` exists, run `blast-radius --json` to detect ALL files affected by changes (7 edge types: CALLS, MESSAGE_BUS, API_ENDPOINT, TRIGGERS_EVENT, PRODUCES_EVENT, TRIGGERS_COMMAND_EVENT, INHERITS). Compute gap: impacted_files - changed_files = potentially stale files. Risk: <5 Low, 5-20 Medium, >20 High. Use `trace --direction downstream` for deep chains on high-impact files.

---

## SYNC:ui-wireframe

> **UI Wireframe** — Process visual design input (Figma URLs, screenshots, wireframes) via appropriate tool BEFORE creating wireframes. Use box-drawing ASCII characters for spatial layout. Classify every component into exactly ONE tier: Common (cross-app reusable) / Domain-Shared (cross-domain) / Page (single-page). Duplicate UI code = wrong tier. Search existing component libraries before creating new (>=80% match = reuse). Detail level varies by skill (idea=rough, story=full decomposition).

---

## SYNC:ui-wireframe-protocol

> **UI Wireframe Protocol** — Wireframe-to-implementation flow: (1) Process design input (Figma/screenshot/sketch via ai-multimodal). (2) Create ASCII wireframe with box-drawing chars. (3) Build component inventory with tier classification (Common/Domain-Shared/Page). (4) Document states (Default/Loading/Empty/Error). (5) Map to design tokens. (6) Define responsive breakpoints. Search existing component libraries before creating new. Progressive detail by skill level (idea=sketch, story=full tree+specs).

---

## SYNC:knowledge-graph-template

> **Knowledge Graph Template** — For each analyzed file, document: filePath, type (Entity/Command/Query/EventHandler/Controller/Consumer/Component/Store/Service), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), frameworkAbstractions, serviceContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Consumer/bus fields: messageBusMessage, messageBusProducers, crossServiceIntegration. Frontend fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.

---

## SYNC:module-detection

> **Module Detection** — Detect target module from PBI/idea keywords. Match against `docs/business-features/` directory names. Load `docs/business-features/{module}/` context for domain rules. If ambiguous, ask user. Module list derived from codebase — do NOT hardcode.

---

## SYNC:ba-team-decision-model

> **BA Team Decision Model** — 2/3 majority vote: Dev BA PIC + UX BA + Designer BA per squad. 2 of 3 agree = decision final. 3-way split = escalate to full squad + Tech Leads + Engineering Manager.
>
> **Technical Veto:** Dev BA PIC can unilaterally veto on: architecture feasibility, dependency correctness, cross-service impact, performance, security. CANNOT veto: UI/UX design, visual design, business value, user research.
>
> **Rules:** Disagree-and-commit after vote. Grooming override requires >75% non-BA squad vote. Record decisions in PBI Validation Summary (member, role, vote, notes).
>
> **Escalation:** Tech uncertainty → Engineering Manager. Business value → PO. Design feasibility → UX BA + Designer BA consensus.

---

## SYNC:refinement-dor-checklist

> **Refinement DoR Checklist** — ALL 7 criteria MUST ATTENTION pass before grooming:
>
> 1. **User story template** — "As a {role}, I want {goal}, so that {benefit}" format
> 2. **AC testable & unambiguous** — GIVEN/WHEN/THEN. No "should/might/TBD/various/appropriate". Min 3 scenarios (happy, edge, error) + 1 auth scenario
> 3. **Wireframes attached** — UI features: `## UI Layout` with wireframe + components + states + tokens. Backend-only: explicit "N/A"
> 4. **UI design ready** — Visual design + component decomposition tree. Backend-only: "N/A"
> 5. **AI pre-review passed** — `/refine-review` or `/pbi-challenge` returned PASS or WARN (not FAIL)
> 6. **Story points estimated** — Fibonacci 1-21 + complexity (Low/Medium/High). >13 SP → recommend split
> 7. **Dependencies table complete** — Dependency, Type (must-before/can-parallel/blocked-by/independent), Status
>
> **Failure fixes:** Vague AC → specify exact CRUD + roles. Missing auth → add roles × CRUD table. No wireframes → UX BA creates. TBD in AC → replace with decision.

---

## SYNC:graph-intelligence-queries

> **Graph Intelligence Queries** — CLI: `python .claude/scripts/code_graph {cmd} --json`. Use `--node-mode file` first (less noise), then `function` for detail.
>
> | Find                    | Command                                      |
> | ----------------------- | -------------------------------------------- |
> | All callers of function | `query callers_of <fn>`                      |
> | All importers of module | `query importers_of <mod>`                   |
> | Tests covering function | `query tests_for <fn>`                       |
> | Class hierarchy         | `query inheritors_of <class>`                |
> | Full connection network | `connections <file>`                         |
> | Multi-file batch        | `batch-query <f1> <f2>`                      |
> | Full system flow (BFS)  | `trace <file> --direction both --depth 3`    |
> | Find node by keyword    | `search <keyword> --kind Function --limit 5` |
> | Shortest path           | `find-path <source> <target>`                |
>
> **Orchestration:** grep → graph → grep (find files → expand network → verify). Iterative grep↔graph is encouraged.

---

## SYNC:design-system-check

> **Design System Check** — Before ANY frontend work, read docs relevant to task type:
>
> 1. `docs/project-reference/design-system/README.md` — tokens, components, icons, themes
> 2. `docs/project-reference/frontend-patterns-reference.md` — base classes, stores, forms, API services
> 3. `docs/project-reference/scss-styling-guide.md` — BEM, SCSS vars, mixins, responsive
>
> App-specific paths: check `docs/project-config.json` → `designSystem.appMappings[]` and `contextGroups[]`.

---

## SYNC:shared-protocol-duplication-policy

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

---

## SYNC:fresh-context-review

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

---

## SYNC:review-protocol-injection

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

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input | Pre-fix | Post-fix | Delta |
|-------|---------|----------|-------|
| Record exists (valid) | Reused | Always recreated → orphan | REGRESSION |
| Record missing (404) | Error | Recreated | Fixed |

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

---

## SYNC:repeatable-test-principle

> **Infinitely Repeatable Tests** — Tests MUST run N times without failure. Like manual QC — run the suite 100 times, each run just adds more data.
>
> 1. **Unique data per run:** Use the project's unique ID generator for ALL entity IDs created in tests. NEVER hardcode IDs.
> 2. **Additive only:** Tests create data, never delete/reset. Prior test runs MUST NOT interfere with current run.
> 3. **No schema rollback dependency:** Tests work with current schema only. Never rely on schema rollback or migration reversals.
> 4. **Idempotent seeders:** Fixture-level seeders use create-if-missing pattern (check existence before insert). Test-level data uses unique IDs per execution.
> 5. **No cleanup required:** No teardown, no database reset between runs. Each test is isolated by unique seed data, not by cleanup.
> 6. **Unique names/codes:** When entities require unique names/codes, append a unique suffix using the project's ID generator.

---

## SYNC:fix-layer-accountability

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

---

## SYNC:context-engineering-principles

> **Context Engineering Principles** — Research-backed principles for prompt quality. Source: Anthropic prompt engineering guide, Stanford "lost-in-the-middle" research, 2025-2026 LLM context optimization studies.
>
> 1. **Primacy-Recency Effect** — LLM performance drops 15-47% for middle-context information (Stanford). AI attention peaks at first/last 10% of text. **Action:** Place the 3 most critical rules in both the first 5 lines AND the last 5 lines of every prompt. Queries at end improve quality by up to 30% (Anthropic).
> 2. **High-Signal Density** — Anthropic: _"Identify the smallest collection of high-signal tokens that maximize the probability of the desired outcome."_ **Action:** Every line should change AI behavior. If removing a line doesn't change output → cut it. Target ≥8 rules (MUST ATTENTION/NEVER/ALWAYS) per 100 lines.
> 3. **Context Rot** — LLM performance degrades as context length grows — even when all content is relevant. Compression (5-20x) maintains or improves accuracy while saving 70-94% tokens. **Action:** Compress aggressively. Shorter, denser prompts outperform longer, diluted ones.
> 4. **Structured > Prose** — Tables, bullets, XML/markdown parse faster than paragraphs. Constrained formats reduce error rates vs free-text. **Action:** Convert narrative to tables/bullets. Use markdown headers for semantic sections.
> 5. **RCCF Framework** — Modern LLMs (2025+) already know how to reason. What they need: **R**ole (personality), **C**ontext (grounding), **C**onstraints (guardrails), **F**ormat (structure). Constraints and format matter more than verbose instructions.
> 6. **Checkbox Avoidance** — `[ ]` syntax triggers mechanical compliance — AI ticks boxes without reasoning. Bullet rules force reading and evaluation. **Action:** Replace `- [ ] Check X` with `- MUST ATTENTION verify X`.
> 7. **Example Economy** — 3-5 examples optimal for few-shot; diminishing returns after. **Action:** 1 best example per pattern. Use BAD→GOOD pairs (2-3 lines each) for anti-patterns.
> 8. **Deferred Tool Loading** — Claude Code delays loading tool definitions when they exceed 10% of context window. **Action:** Keep injected docs well under 10% of context budget. Docs exceeding ~3,000 lines are too large for injection — split or compress.
> 9. **Rule Density Verification** — Post-optimization rule count (MUST ATTENTION/NEVER/ALWAYS) must be ≥ pre-optimization count. Compression should preserve or increase density, never decrease it. **Action:** Count before and after every optimization pass.

---

## SYNC:prompt-enhancement-transforms-base

> **Prompt Enhancement Transforms (Base)** — Transforms 1-3 are identical across `prompt-enhance` / `prompt-expand`. Transform 4 is per-skill (conciseness pass for enhance; structural clarity pass for expand) and stays local to each skill.
>
> ### Transform 1: Inline Summaries for READ References
>
> **Problem:** AI sees `MUST ATTENTION READ file.md` and skips it.
> **Solution:** Add a 2-3 line summary of key rules BEFORE the read instruction.
>
> **Before:**
>
> ```
> MUST ATTENTION READ .claude/protocols/evidence.md
> ```
>
> **After:**
>
> ```
> > **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim requires `file:line` proof.
> > Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend.
>
> MUST ATTENTION READ .claude/protocols/evidence.md for full details.
> ```
>
> **Scope rules:**
>
> - `.claude/` protocol files → always add an inline summary (stable, belongs to framework)
> - `docs/project-reference/` files → NO inline summary (project-specific). Add: `(Claude may inject this via hooks; Codex must open this file directly using docs-index routing)`
>
> ### Transform 2: Top Summary Section
>
> Required structure (first 20 lines after frontmatter):
>
> ```markdown
> > **[IMPORTANT]** TaskCreate instruction...
>
> > **Protocol Name** — [inline summary]. MUST ATTENTION READ `path` for details.
>
> ## Quick Summary
>
> **Goal:** [One sentence — what this skill achieves]
>
> **Workflow:**
>
> 1. **[Step]** — [description]
>
> **Key Rules:**
>
> - [Most critical constraint]
> ```
>
> ### Transform 3: Bottom Closing Reminders
>
> Add at the very end of the file:
>
> ```markdown
> ---
>
> ## Closing Reminders
>
> - **IMPORTANT MUST ATTENTION** [echo rule #1 from the top section]
> - **IMPORTANT MUST ATTENTION** [echo rule #2]
> - **IMPORTANT MUST ATTENTION** [echo rule #3]
> - **IMPORTANT MUST ATTENTION** add a final review task to verify work quality
> ```
>
> Pick 3-5 rules AI most commonly violates. Bottom section re-anchors attention after the long middle.

---

## SYNC:subagent-return-contract

> **Sub-Agent Return Contract** — When this skill spawns a sub-agent, the sub-agent MUST return ONLY this structure. Main agent reads only this summary — NEVER requests full sub-agent output inline.
>
> ```markdown
> ## Sub-Agent Result: [skill-name]
>
> Status: ✅ PASS | ⚠️ PARTIAL | ❌ FAIL
> Confidence: [0-100]%
>
> ### Findings (Critical/High only — max 10 bullets)
>
> - [severity] [file:line] [finding]
>
> ### Actions Taken
>
> - [file changed] [what changed]
>
> ### Blockers (if any)
>
> - [blocker description]
>
> Full report: plans/reports/[skill-name]-[date]-[slug].md
> ```
>
> Main agent reads `Full report` file ONLY when: (a) resolving a specific blocker, or (b) building a fix plan.
> Sub-agent writes full report incrementally (per SYNC:incremental-persistence) — not held in memory.

---

## SYNC:incremental-persistence

> **Incremental Result Persistence** — MANDATORY for all sub-agents or heavy inline steps processing >3 files.
>
> 1. **Before starting:** Create report file `plans/reports/{skill}-{date}-{slug}.md`
> 2. **After each file/section reviewed:** Append findings to report immediately — never hold in memory
> 3. **Return to main agent:** Summary only (per SYNC:subagent-return-contract) with `Full report:` path
> 4. **Main agent:** Reads report file only when resolving specific blockers
>
> **Why:** Context cutoff mid-execution loses ALL in-memory findings. Each disk write survives compaction. Partial results are better than no results.
>
> **Report naming:** `plans/reports/{skill-name}-{YYMMDD}-{HHmm}-{slug}.md`

---

## SYNC:critical-thinking-mindset

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

---

## SYNC:ai-mistake-prevention

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

---

## SYNC:sub-agent-selection

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** NEVER use `code-reviewer` for specialized domains (architecture, security, performance, DB, E2E, integration-test, git).
