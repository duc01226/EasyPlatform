---
name: review-architecture
version: 1.1.0
description: '[Code Quality] Review architecture compliance — clean architecture layers, messaging patterns, service boundaries, CQRS, v1/v2 service patterns, repository usage, entity event handlers. Default: changed files only.'
allowed-tools: Read, Grep, Glob, Bash, Write, TaskCreate, TaskUpdate, Agent, AskUserQuestion
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

> **Critical Purpose:** Ensure architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Validate that code changes comply with project architecture rules — clean architecture, messaging, service boundaries, CQRS, v1/v2, repositories, entity event handlers.

**Default scope:** All uncommitted changes (staged + unstaged). User can override scope via prompt (e.g., specific files, directories, services, or full codebase).

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference docs BEFORE reviewing:
>
> 1. `docs/project-reference/backend-patterns-reference.md` — CQRS, messaging, repositories, validation, entity events, layer rules **(READ FIRST — primary architecture rules source)**
> 2. `docs/project-reference/project-structure-reference.md` — service map, layer structure, database ownership
> 3. `docs/project-reference/adr-service-pattern-v1-v2-split.md` — v1 legacy vs v2 standard (Growth), auth/permissions/observability differences
> 4. `docs/project-reference/frontend-patterns-reference.md` — component hierarchy, store, API service patterns **(READ only if frontend files in scope)**
> 5. `docs/project-reference/code-review-rules.md` — anti-patterns, conventions **(content may be auto-injected by hook — check for [Injected: ...] header before reading)**
>
> If any file not found, search for: architecture documentation, service patterns, messaging patterns.
>
> These docs contain the **project-specific** architecture rules. This skill is a generic checklist — the rules come from the docs above.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project-specific architecture docs listed above
2. **Phase 1: Determine Scope** — Get changed files (default) or use user-specified scope
3. **Phase 2: Blast Radius** — Run `/graph-blast-radius` if graph.db exists
4. **Phase 3: Architecture Review** — Check each file against architecture rules
5. **Phase 4: Finalize** — Generate architecture compliance report with PASS/BLOCKED/WARN verdicts

**Key Rules:**

- Report-driven: write findings to `plans/reports/arch-review-{date}-{slug}.md`
- BLOCKED = hard stop (must fix before merge)
- WARN = flag for attention (review and decide)
- PASS = compliant
- Be skeptical — every violation needs `file:line` proof + grep for 3+ counterexamples before flagging
- This skill does NOT fix code — it only reviews and reports

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT flag violations without reading the actual code and tracing the dependency
- Every finding must include `file:line` evidence
- Before flagging a pattern violation, grep for 3+ existing examples — the codebase convention wins
- Question: "Is this actually a violation, or is it an established exception?"

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **IMPORTANT MANDATORY MUST ATTENTION:** Read project-specific architecture docs BEFORE reviewing any code. The rules come from these docs, not from general knowledge.

- [ ] Read `docs/project-reference/backend-patterns-reference.md` — extract messaging naming conventions, layer rules, CQRS patterns, repository rules, entity event handler patterns, validation patterns
- [ ] Read `docs/project-reference/project-structure-reference.md` — extract service map, layer structure, database ownership
- [ ] Read `docs/project-reference/adr-service-pattern-v1-v2-split.md` — extract v1/v2 differences, which services are v1 vs v2
- [ ] If frontend files in scope: Read `docs/project-reference/frontend-patterns-reference.md`
- [ ] Note: `code-review-rules.md` is auto-injected by hook on Skill invocation — check conversation context before reading

After reading, you now have the **project-specific rules** to validate against. Do NOT rely on general architecture knowledge — use what the docs say.

## Phase 1: Determine Scope

**Default (no user override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

**User-specified scope:** If user specifies files, directories, services, or "full codebase" — use that instead.

- [ ] Collect list of files to review
- [ ] Categorize files: backend (.cs), frontend (.ts/.html), config, docs, other
- [ ] Filter to architecture-relevant files only (skip pure docs, configs, tests unless architecture-relevant)

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

- [ ] If `.code-graph/graph.db` exists: Call `/graph-blast-radius` skill
- [ ] Record: impacted files count, cross-service impact, risk level
- [ ] Use results to prioritize review (highest-impact files first)
- [ ] If graph not available: note "Graph not available — skipping blast radius" and proceed

For each changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

Flag any MESSAGE_BUS consumers or event handlers impacted by changes.

## Phase 3: Architecture Review

Create report file: `plans/reports/arch-review-{date}-{slug}.md`

For EACH file in scope, evaluate against ALL applicable categories below. Skip categories that don't apply to the file type.

---

### Category 1: Clean Architecture Layers — Severity: BLOCKED

**What to check:** Dependency direction violations. Dependencies MUST ATTENTION flow inward only: Service/API → Application → Domain ← Persistence.

**How to check:**

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries` for project-specific layer rules
2. For each file, determine its layer from path (Domain/, Application/, Persistence/, Service/)
3. Scan `using` (C#) or `import` (TS) statements
4. Flag any import from a layer that is forbidden for the current layer

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
```

**Also check:**

- [ ] Business logic in correct layer? (Entity/Domain > Service/Application > Controller/Component)
- [ ] No business logic in API/Controller layer (should delegate to Application layer)
- [ ] No direct infrastructure access from Domain layer (repositories are interfaces in Domain, implementations in Persistence)

---

### Category 2: Message Bus Patterns — Severity: BLOCKED/WARN

**What to check:** Naming conventions, base classes, producer/consumer patterns, upstream/downstream rules.

**How to check (rules from backend-patterns-reference.md):**

**Naming (BLOCKED if wrong):**

- Event messages: `{ServiceName}{Feature}{Action}EventBusMessage`
- Request messages: `{ConsumerServiceName}{Feature}RequestBusMessage`
- Grep for existing examples to verify naming convention: `grep -r "EventBusMessage" --include="*.cs"`

**Base classes (BLOCKED if wrong):**

- All bus messages MUST ATTENTION extend `PlatformTrackableBusMessage` or `PlatformBusMessage<TPayload>`
- Consumers MUST ATTENTION extend `PlatformApplicationMessageBusConsumer<TMessage>`
- Producers MUST ATTENTION extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`

**Upstream/Downstream (BLOCKED if violated):**

- Leader service owns entity data and defines EventBusMessage
- Follower services consume events — they do NOT produce events about data they don't own
- NO circular listening: if A→B events exist, B→A events for same data = boundary violation
- Consumers MUST ATTENTION implement dependency waiting with `TryWaitUntilAsync` when depending on data from other messages

**SubQueuePrefix (WARN if missing for ordered messages):**

- Messages requiring ordered processing MUST ATTENTION override `SubQueuePrefix()` with a meaningful key
- Messages not requiring ordering should return `null`

**Also check:**

- [ ] No direct cross-service database access (MUST ATTENTION use message bus)
- [ ] `LastMessageSyncDate` used for conflict resolution in consumers
- [ ] Inbox/Outbox pattern used for reliable delivery (check `EnableInboxEventBusMessage`)

---

### Category 3: CQRS Compliance — Severity: BLOCKED/WARN

**What to check:** Command/Query handler patterns, validation, DTO mapping.

**How to check (rules from backend-patterns-reference.md):**

**File organization (BLOCKED):**

- Command + Result + Handler MUST ATTENTION be in ONE file under `UseCaseCommands/{Feature}/`
- Query + Result + Handler MUST ATTENTION be in ONE file under `UseCaseQueries/{Feature}/`

**Validation (BLOCKED):**

- MUST ATTENTION use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
- NEVER throw exceptions for validation — return validation result
- Sync validation in `command.Validate()`, async validation in `ValidateRequestAsync()`

**DTO mapping (BLOCKED):**

- DTOs MUST ATTENTION own mapping via `MapToEntity()` or `MapToObject()`
- NEVER map in command handlers — mapping belongs in DTO/Command class

**Side effects (BLOCKED):**

- NEVER put side effects (notifications, sync, cascade updates) in command handlers
- Side effects go in Entity Event Handlers under `UseCaseEvents/`
- Each handler = one independent concern (failures don't cascade)

---

### Category 4: Repository Patterns — Severity: BLOCKED

**What to check:** Service-specific repository usage.

**How to check (rules from backend-patterns-reference.md):**

- MUST ATTENTION use service-specific repository: `I{ServiceName}PlatformRootRepository<TEntity>` (e.g., `IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>`)
- NEVER use generic `IPlatformRootRepository<T>` directly
- Complex queries MUST ATTENTION use `RepositoryExtensions` with static expressions
- All query filter/FK/sort columns MUST ATTENTION have database indexes

**Violation format:**

```
BLOCKED: {filePath}:{line} uses generic IPlatformRootRepository instead of service-specific I{Service}RootRepository
```

---

### Category 5: V1/V2 Service Pattern — Severity: BLOCKED (new services) / WARN (existing)

**What to check:** Service startup patterns, auth, permissions, observability.

**How to check (rules from adr-service-pattern-v1-v2-split.md):**

**For NEW services (BLOCKED if v1 pattern used):**

- MUST ATTENTION use multi-scheme auth (JWT Bearer + Azure AD Teams)
- MUST ATTENTION use `UsePermissionProviderClaimGenerationByProductScope()`
- MUST ATTENTION use OpenTelemetry via Aspire (NO ApplicationInsights)
- MUST ATTENTION use modern C# collection syntax `[...]`

**For EXISTING v1 services (WARN if new v2 patterns mixed in without full migration):**

- Single JWT Bearer is expected — don't flag as violation
- `UsePermissionProviderClaimGeneration()` without params is expected
- Warn if ApplicationInsights is still present (being deprecated)

**How to determine v1 vs v2:**

- Growth service = v2 standard
- All other services = v1 legacy
- Check `project-structure-reference.md` for service list

---

### Category 6: Entity Event Handlers — Severity: BLOCKED/WARN

**What to check:** Side effect implementation patterns.

**How to check (rules from backend-patterns-reference.md):**

**Location (BLOCKED):**

- Entity event handlers MUST ATTENTION be in `UseCaseEvents/` directory
- NEVER inline side effects in command handlers

**Implementation (BLOCKED):**

- MUST ATTENTION extend `PlatformCqrsEntityEventApplicationHandler<TEntity>`
- MUST ATTENTION implement `HandleWhen()` to filter by CRUD action
- One handler = one independent concern

**Naming (WARN):**

- Convention: `{Action}On{Trigger}EntityEventHandler`
- Grep for existing examples before flagging

**Producer patterns (BLOCKED):**

- Entity event bus message producers MUST ATTENTION extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`
- MUST ATTENTION implement `BuildMessage()` and `HandleWhen()`

---

### Category 7: Service Boundaries — Severity: BLOCKED

**What to check:** Cross-service isolation.

**How to check:**

- [ ] No direct database access to another service's database (BLOCKED)
- [ ] No direct `using` reference to another service's domain/persistence project (BLOCKED)
- [ ] Cross-service communication via message bus only (event bus or request bus)
- [ ] Shared data goes through shared message projects, not direct references
- [ ] Each service owns its own database — verify from `project-structure-reference.md` service-to-DB mapping

**Violation format:**

```
BLOCKED: {filePath}:{line} references {otherService} domain/persistence directly — must use message bus
```

---

### Category 8: Frontend Architecture (if frontend files in scope) — Severity: BLOCKED/WARN

**What to check:** Component hierarchy, state management, API patterns.

**How to check (rules from frontend-patterns-reference.md):**

- [ ] Components MUST ATTENTION extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` (BLOCKED)
- [ ] State management MUST ATTENTION use `PlatformVmStore` + `effectSimple()` — no manual signals or direct HttpClient (BLOCKED)
- [ ] API services MUST ATTENTION extend `PlatformApiService` (BLOCKED)
- [ ] All subscriptions MUST ATTENTION use `.pipe(this.untilDestroyed())` — no manual unsubscribe (BLOCKED)
- [ ] All template elements MUST ATTENTION have BEM classes (WARN)
- [ ] Logic in lowest layer: Model > Service > Component (WARN)

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

Count findings by severity:

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
- V1/V2 Compliance: {PASS/WARN/BLOCKED}
- Entity Event Handlers: {PASS/WARN/BLOCKED}
- Service Boundaries: {PASS/WARN/BLOCKED}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
```

---

## Architecture Boundary Check (Automated)

For each changed file, verify it does not import from a forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match its path against each rule's `paths` glob patterns
3. **Scan imports** — Grep the file for `using` (C#) or `import` (TS) statements
4. **Check violations** — If any import path contains a layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` is not present in project-config.json, skip this check silently.

---

## Systematic Review Protocol (for 10+ changed files)

> When 10+ files in scope, switch to parallel review:

1. **Categorize** — Group files by service/layer/concern
2. **Parallel Sub-Agents** — Launch one `code-reviewer` sub-agent per category with architecture-specific checklist
3. **Synchronize** — Collect findings, cross-reference service boundaries
4. **Consolidate** — Single holistic report with per-category verdicts

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/code-simplifier" (Recommended)** — Simplify and refine code
- **"/code-review"** — Deep code quality review
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
**MANDATORY IMPORTANT MUST ATTENTION** read project-specific architecture docs BEFORE reviewing — rules come from docs, not general knowledge.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

  <!-- SYNC:evidence-based-reasoning:reminder -->

- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
    <!-- SYNC:graph-assisted-investigation:reminder -->
- **IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.
    <!-- /SYNC:graph-assisted-investigation:reminder -->
