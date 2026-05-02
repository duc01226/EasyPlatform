---
name: review-architecture
description: '[Code Quality] Architecture compliance review — clean architecture layers, messaging, service boundaries, CQRS, service pattern eras (legacy vs modern split), repos, entity event handlers. Default: changed files only.'
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

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

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `$cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** Round 2 of ANY review AND every recursive re-review iteration after fixes. NOT needed when Round 1 already PASSes with zero issues.
>
> **How:**
>
> 1. Spawn a NEW `spawn_agent` tool call — use `architect` subagent_type for architecture reviews (see Sub-Agent Type Override above)
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

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Architecture reviews spawn `architect` sub-agent, NOT `code-reviewer`.
> The canonical template below uses `agent_type: "architect"` — do NOT revert to `code-reviewer`.
> **Rationale:** `architect` carries cross-service impact analysis, ADR creation, and comprehensive multi-service security/performance context that `code-reviewer` lacks for architecture-level decisions.

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** NEVER use `code-reviewer` for specialized domains (architecture, security, performance, DB, E2E, integration-test, git).

<!-- /SYNC:sub-agent-selection -->

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 10 protocol blocks VERBATIM. The template below has ALL 10 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 10 protocol bodies pre-embedded.

### Subagent Type Selection

- `architect` — ALWAYS for architecture reviews (cross-service, ADR, security/performance at system level)
- `code-reviewer` — for code quality reviews only (NOT architecture)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "architect",
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
- DO choose `architect` subagent_type for architecture reviews — do NOT revert to `code-reviewer` (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** Architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.

> **External Memory:** Complex/lengthy work → write findings to `plans/reports/`. Prevents context loss, serves as deliverable.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

## Quick Summary

**Goal:** Validate code changes comply with project architecture — repository layout, tooling boundaries, generated artifact ownership, command flows, and project-specific implementation patterns.

**Default scope:** All uncommitted changes (staged + unstaged). Override: specify files, directories, services, or full codebase.

> **MANDATORY MUST ATTENTION** Plan tasks to READ architecture docs BEFORE reviewing:
>
> 1. `docs/project-reference/backend-patterns-reference.md` — CQRS, messaging, repos, validation, entity events, layer rules **(READ FIRST — primary rules source)**
> 2. `docs/project-reference/project-structure-reference.md` — service map, layer structure, DB ownership
> 3. `docs/project-reference/frontend-patterns-reference.md` — component hierarchy, store, API patterns **(frontend files only)**
> 4. `docs/project-reference/code-review-rules.md` — anti-patterns, conventions **(may be auto-injected by hook — check [Injected: ...] header first)**
>
> Not found → search: "architecture documentation", "service patterns", "messaging patterns". Rules come from docs — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project architecture docs
2. **Phase 1: Determine Scope** — Changed files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run `$graph-blast-radius` if graph.db exists
4. **Phase 3: Architecture Review** — Check each file against all applicable categories
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts

**Key Rules:**

- Write findings to `plans/reports/arch-review-{date}-{slug}.md`
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging
- Skill reviews only — NEVER fixes code

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag violations without reading actual code + tracing the dependency
- Every finding MUST include `file:line` evidence
- Before flagging pattern violation: grep 3+ existing examples — codebase convention wins
- Question: "Is this actually a violation, or an established exception?"

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project docs BEFORE reviewing. Rules come from docs, not general knowledge.

- MUST ATTENTION read `docs/project-reference/backend-patterns-reference.md` — extract messaging naming, layer rules, CQRS patterns, repo rules, entity event handler patterns, validation patterns
- MUST ATTENTION read `docs/project-reference/project-structure-reference.md` — extract service map, layer structure, DB ownership
- If frontend files in scope: MUST ATTENTION read `docs/project-reference/frontend-patterns-reference.md`
- `code-review-rules.md` auto-injected by hook — check conversation context before reading

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review
- Categorize: backend (.cs), frontend (.ts/.html), config, docs, other
- Filter to architecture-relevant files (skip pure docs, configs, tests unless architecture-relevant)

## Phase 2: Blast Radius (if graph.db exists)

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

- If `.code-graph/graph.db` exists: call `$graph-blast-radius` skill
- Record: impacted file count, cross-service impact, risk level
- Prioritize review by highest-impact files first
- Graph unavailable: note "Graph not available — skipping blast radius" and proceed

For each changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

Flag MESSAGE_BUS consumers or event handlers impacted by changes.

## Phase 3: Architecture Review

Create report: `plans/reports/arch-review-{date}-{slug}.md`

For EACH file in scope, evaluate against ALL applicable categories. Skip categories not applicable to the file type.

---

### Category 1: Clean Architecture Layers — Severity: BLOCKED

**Think:** What layer is this file in? What layers can it legally import from? Does any import break the inward-only flow (Service/API → Application → Domain ← Persistence)?

- Read `docs/project-config.json` → `architectureRules.layerBoundaries` for project-specific rules
- Determine layer from file path: Domain/, Application/, Persistence/, Service/
- Scan `using` (C#) or `import` (TS) — flag imports from forbidden layers
- MUST ATTENTION verify business logic in correct layer: Entity/Domain > Service/Application > Controller/Component
- NEVER allow direct infrastructure access from Domain (repo interfaces in Domain, implementations in Persistence)
- NEVER allow business logic in API/Controller layer

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
```

---

### Category 2: Message Bus Patterns — Severity: BLOCKED/WARN

**Think:** Does this message correctly name its type (event vs request)? Does it extend the right base class? Is the producer/consumer relationship correctly oriented — does the leader service own the event?

**Naming (BLOCKED):**

- Event messages: `{ServiceName}{Feature}{Action}EventBusMessage`
- Request messages: `{ConsumerServiceName}{Feature}RequestBusMessage`
- Grep existing examples before flagging: `grep -r "EventBusMessage" --include="*.cs"`

**Base classes (BLOCKED):**

- Bus messages MUST extend `PlatformTrackableBusMessage` or `PlatformBusMessage<TPayload>`
- Consumers MUST extend `PlatformApplicationMessageBusConsumer<TMessage>`
- Producers MUST extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`

**Upstream/Downstream (BLOCKED):**

- Leader service owns entity data → defines EventBusMessage
- Follower services consume events — NEVER produce events about data they don't own
- NO circular listening: A→B + B→A for same data = boundary violation
- Consumers MUST implement dependency waiting with `TryWaitUntilAsync` for cross-message data dependencies

**SubQueuePrefix (WARN):**

- Ordered messages MUST override `SubQueuePrefix()` with meaningful key
- Unordered messages return `null`

**Also verify:**

- NEVER direct cross-service DB access — MUST use message bus
- `LastMessageSyncDate` used for conflict resolution in consumers
- Inbox/Outbox pattern for reliable delivery (check `EnableInboxEventBusMessage`)

---

### Category 3: CQRS Compliance — Severity: BLOCKED/WARN

**Think:** Is Command+Result+Handler in one file? Is validation using fluent API (not exceptions)? Does DTO own mapping, not the handler? Are side effects in event handlers, not command handlers?

**File organization (BLOCKED):**

- Command + Result + Handler MUST be in ONE file under `UseCaseCommands/{Feature}/`
- Query + Result + Handler MUST be in ONE file under `UseCaseQueries/{Feature}/`

**Validation (BLOCKED):**

- MUST use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
- NEVER throw exceptions for validation — return validation result
- Sync validation in `command.Validate()`, async in `ValidateRequestAsync()`

**DTO mapping (BLOCKED):**

- DTOs MUST own mapping via `MapToEntity()` or `MapToObject()`
- NEVER map in command handlers

**Side effects (BLOCKED):**

- NEVER put side effects (notifications, sync, cascade updates) in command handlers
- Side effects go in Entity Event Handlers under `UseCaseEvents/`
- Each handler = one independent concern (failures don't cascade)

---

### Category 4: Repository Patterns — Severity: BLOCKED

**Think:** Is this using a service-specific repo interface, not the generic one? Are complex queries extracted to RepositoryExtensions?

- MUST use service-specific repo: `I{ServiceName}PlatformRootRepository<TEntity>` (e.g., `IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>`)
- NEVER use generic `IPlatformRootRepository<T>` directly
- Complex queries MUST use `RepositoryExtensions` with static expressions
- All query filter/FK/sort columns MUST have database indexes

**Violation format:**

```
BLOCKED: {filePath}:{line} uses generic IPlatformRootRepository instead of service-specific I{Service}RootRepository
```

---

### Category 5: Service Pattern Era (Legacy vs Modern Split) — Severity: BLOCKED (new services) / WARN (existing)

**Think:** When a project distinguishes legacy vs modern service patterns (e.g., auth scheme, telemetry stack, permission model, language-version syntax), is this a new service (must follow modern) or an existing legacy service (expect legacy patterns)? Is the modern pattern being partially mixed into a legacy service without a full migration?

**New services — BLOCKED if any legacy-only pattern is used.** Identify the project's modern-pattern checklist from injected reference docs (e.g., `project-structure-reference.md`, ADRs, scaffolding templates) and verify every item.

**Existing legacy services — WARN if modern patterns are partially mixed without full migration.** Do not flag legacy patterns as violations in their own context; flag them only when partial mixing creates inconsistency.

**Determining era:** Read the project's reference docs at review time — service-pattern era assignments are project-specific and listed authoritatively there. Do NOT hardcode service names in this skill.

---

### Category 6: Entity Event Handlers — Severity: BLOCKED/WARN

**Think:** Are side effects defined inline in command handlers (wrong) or in UseCaseEvents/ (correct)? Does each handler have a single concern?

**Location (BLOCKED):**

- Entity event handlers MUST be in `UseCaseEvents/` directory
- NEVER inline side effects in command handlers

**Implementation (BLOCKED):**

- MUST extend `PlatformCqrsEntityEventApplicationHandler<TEntity>`
- MUST implement `HandleWhen()` to filter by CRUD action
- One handler = one independent concern

**Naming (WARN):**

- Convention: `{Action}On{Trigger}EntityEventHandler`
- Grep existing examples before flagging

**Producer patterns (BLOCKED):**

- Bus message producers MUST extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`
- MUST implement `BuildMessage()` and `HandleWhen()`

---

### Category 7: Service Boundaries — Severity: BLOCKED

**Think:** Does any code reach directly into another service's database or project reference? All cross-service data flow MUST go through the message bus.

- NEVER direct DB access to another service's database
- NEVER `using` reference to another service's domain/persistence project
- Cross-service communication via message bus only (event bus or request bus)
- Shared data through shared message projects, not direct references
- Verify service-to-DB mapping from `project-structure-reference.md`

**Violation format:**

```
BLOCKED: {filePath}:{line} references {otherService} domain/persistence directly — must use message bus
```

---

### Category 8: Frontend Architecture (if frontend files in scope) — Severity: BLOCKED/WARN

**Think:** Are components extending the right base class? Is state going through the store? Are subscriptions properly cleaned up?

- Components MUST extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` (BLOCKED)
- State MUST use `PlatformVmStore` + `effectSimple()` — NEVER manual signals or direct HttpClient (BLOCKED)
- API services MUST extend `PlatformApiService` (BLOCKED)
- All subscriptions MUST use `.pipe(this.untilDestroyed())` — NEVER manual unsubscribe (BLOCKED)
- All template elements MUST have BEM classes (WARN)
- Logic in lowest layer: Model > Service > Component (WARN)

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                       |
| ----------- | ----------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge     |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide |
| **PASS**    | 0 BLOCKED, 0 WARN — architecture compliant      |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Services affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Architecture Health Summary

- Clean Architecture: {PASS/WARN/BLOCKED}
- Messaging Patterns: {PASS/WARN/BLOCKED}
- CQRS Compliance: {PASS/WARN/BLOCKED}
- Repository Patterns: {PASS/WARN/BLOCKED}
- Service Pattern Era: {PASS/WARN/BLOCKED}
- Entity Event Handlers: {PASS/WARN/BLOCKED}
- Service Boundaries: {PASS/WARN/BLOCKED}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
```

---

## Architecture Boundary Check (Automated)

For each changed file:

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries`
2. Determine layer — match file path against each rule's `paths` glob patterns
3. Scan imports — grep for `using` (C#) or `import` (TS) statements
4. Check violations — import path contains layer name in `cannotImportFrom` = violation
5. Exclude framework — skip files matching `architectureRules.excludePatterns`
6. BLOCK on violation: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` absent from project-config.json: skip silently.

---

## Systematic Review Protocol (10+ changed files)

1. **Categorize** — Group files by service/layer/concern
2. **Parallel Sub-Agents** — Launch one `architect` sub-agent per category with architecture-specific checklist
3. **Synchronize** — Collect findings, cross-reference service boundaries
4. **Consolidate** — Single holistic report with per-category verdicts

---

## Next Steps

**MANDATORY MUST ATTENTION — NO EXCEPTIONS:** After completing, use a direct user question to present:

- **"$code-simplifier" (Recommended)** — Simplify and refine code
- **"$code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — no "fix" without traced rationale
3. **Verify ALL outputs.** One build passing ≠ all builds passing — check every affected stack
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints
5. **New artifact = wired artifact.** Created something? Prove registered, imported, reachable by all consumers

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->
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

**MUST ATTENTION** break work into small tasks using task tracking BEFORE starting
**MUST ATTENTION** read project architecture docs BEFORE reviewing — rules come from docs, not general knowledge
**MUST ATTENTION** every violation requires `file:line` proof — NEVER speculate
**MUST ATTENTION** grep 3+ counterexamples before flagging any pattern violation
**MUST ATTENTION** run at least ONE graph command on key files when graph.db exists
**MUST ATTENTION** NEVER fix code — review and report only
**MUST ATTENTION** apply `Think:` reasoning prompt before checking each category — derive violations, don't recite checklists
**MUST ATTENTION** use a direct user question to present next steps after completing review

**Anti-Rationalization:**

| Evasion                              | Rebuttal                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| "Too simple for architecture review" | Simple code hides layer violations. Apply all phases.              |
| "Already read the docs"              | Show the extracted rule — no recall = no read.                     |
| "Just flag obvious violations"       | Gray areas matter most. Apply `Think:` prompt to all 8 categories. |
| "Graph not needed here"              | Run ONE trace. 5 seconds → full blast radius revealed.             |
| "Skill reviews only changed files"   | Default scope, not a limit. User can override.                     |

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
