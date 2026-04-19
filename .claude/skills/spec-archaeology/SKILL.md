---
name: spec-archaeology
version: 2.0.0
description: 'Reverse-engineer a complete, tech-agnostic specification bundle from an existing codebase — scout holistically first, plan a per-module task breakdown, then investigate each module deeply — producing domain model, business rules, API contracts, integration events, and user journeys sufficient to re-implement the system on any tech stack.'
---

> **[BLOCKING]** Each phase MUST ATTENTION invoke its `Skill` tool — marking a task `completed` without skill invocation is a workflow violation. NEVER batch-complete validation gates.

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

---

## What Is Spec Archaeology?

**Spec Archaeology** is the reverse of product discovery. Instead of going from an idea to a backlog, you go from an **existing codebase to a reimplementation-grade specification bundle**.

The output is a structured set of documents that describe **what the system does and why** — stripped of all technology choices, implementation details, and programming language constructs. Any engineering team could read the bundle and build the same product on a completely different tech stack.

**Primary Use Cases:** AI-driven replatforming, tech stack migration, compliance documentation, knowledge capture before team turnover, spec-driven development bootstrap.

**Critical Reality:** Real-world codebases can have thousands of files across dozens of modules. This skill is designed for that scale. The scout-first → plan-decompose → investigate-deeply approach prevents context window overrun and ensures complete coverage.

---

## Step 0 — Scope Gate (MANDATORY FIRST)

Before reading any code, use `AskUserQuestion` to confirm:

| Dimension        | Question                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| **Scan scope**   | Full system (all modules) OR a specific module/service/feature area?              |
| **Output depth** | Full spec bundle (all 6 extraction phases) OR targeted (select phases)?           |
| **Focus areas**  | Which of: domain model / business rules / API contracts / events / UI flows?      |
| **Source entry** | Where to start? (e.g., main entry files, a named module, a specific directory)    |
| **Scale hint**   | Approximately how many modules/services does this codebase have? (rough estimate) |

> **Scale routing:** If scope is 1–3 modules → single-session extraction. If scope is 4+ modules → MUST use sub-agent parallel extraction (see Sub-Agent Pattern). If scope is entire large system → MUST use incremental coverage: one module per session.

> **[BLOCKING SCALE GATE]** If `module_count ≥ 4` at the end of Step 2 (Plan): you **MUST** use sub-agent parallel extraction. Attempting single-session inline extraction with 4+ modules is a workflow violation. Do NOT proceed past Step 2 without spawning sub-agents.

---

## Step 1 — Holistic Scout (MANDATORY BEFORE ANY EXTRACTION)

**Goal:** Build a complete picture of the codebase at the highest level BEFORE reading any module in detail. This is the foundation for the plan.

> **HARD GATE:** No extraction work begins until this step produces the Module Registry. Without a complete registry, the plan will miss modules and produce an incomplete spec.

### What to Scout

1. **Directory structure** — Map the top-level directory tree. Identify: where is business logic? where are API entry points? where are data access layers? where are shared utilities?
2. **Entry point files** — Find the application bootstrap (main config, dependency injection container, router registration, service composition root). These reveal the full module surface.
3. **Module/service boundaries** — For each top-level module, note: name, primary responsibility (one sentence), approximate file count, and which layers it contains (presentation / application / domain / infrastructure).
4. **Cross-cutting concerns** — Authentication, logging, error handling, caching — note which files implement these and which modules consume them.
5. **Data store access points** — Find where each data store is accessed. Note which modules own which stores.
6. **Integration points** — Find message bus subscribers/publishers, external HTTP clients, webhook handlers, scheduled job runners.

### Output: Module Registry

Create `specs/{date}-{system-name}/00-module-registry.md`:

```markdown
# Module Registry

Generated: {date} | Scope: {full-system / module-scoped}

## System Summary

[2-3 sentences: what this system does, who uses it, approximate scale]

## Module Catalog

| #   | Module Name | Responsibility | Layer Structure | File Count (est.) | Data Store | Integration Points |
| --- | ----------- | -------------- | --------------- | ----------------- | ---------- | ------------------ |
| 1   | ...         | ...            | ...             | ...               | ...        | ...                |

## Cross-Cutting Concerns

| Concern | Implementation Location | Consumed By |
| ------- | ----------------------- | ----------- |

## Integration Boundary Map

[Which modules communicate, via what mechanism, in what direction]

## Data Store Ownership

| Store Type | Owner Module(s) | Access Pattern |
| ---------- | --------------- | -------------- |
```

---

## Step 2 — Extraction Plan (MANDATORY — MUST BREAK BIG INTO SMALL)

**Goal:** Produce a concrete, ordered task list that decomposes the full extraction into the smallest possible independent units. This is the critical step that prevents context window overrun.

> **HARD GATE:** `TaskCreate` MUST be called for EVERY task in the plan BEFORE any extraction begins. No extraction starts without a complete task list.

### Planning Rules

**Rule 1: One task per module per phase.**
If the system has 8 modules and you're extracting 4 phases, the plan produces 32 tasks minimum. Each task is: `"Extract [Phase Name] for [Module Name]"`.

**Rule 2: Scope each task to ≤50 files.**
If a module has >50 files, split it: `"Extract Business Rules for Order Module (Part 1: Commands)"`, `"Extract Business Rules for Order Module (Part 2: Event Handlers)"`.

**Rule 3: Dependency-order tasks.**
Phase 2 (Domain Model) tasks must complete before Phase 3 (Business Rules) tasks for the same module. Mark dependencies.

**Rule 4: Prioritize by value.**
High-value modules (the core business domain) first. Infrastructure/utility modules last.

**Rule 5: Each task gets its own focused investigation.**
Do NOT attempt to extract all phases for a module in a single context pass. Each extraction task is a separate, focused, depth-first investigation.

### Plan Output

The plan produces:

1. A task list (created via `TaskCreate`) — one task per module × phase combination
2. A `specs/{date}-{system-name}/extraction-plan.md` file tracking which tasks cover which modules

```markdown
# Extraction Plan

## Task Breakdown

Phase 1 (Domain Model) — {N} tasks

- [ ] Extract Domain Model: Module A
- [ ] Extract Domain Model: Module B
      ...

Phase 2 (Business Rules) — {N} tasks

- [ ] Extract Business Rules: Module A (Part 1: Validation)
- [ ] Extract Business Rules: Module A (Part 2: State Machines)
      ...

## Dependency Map

[Which tasks must complete before others can start]

## Completion Tracker

| Task | Status | Output File | Evidence Lines |
| ---- | ------ | ----------- | -------------- |
```

### Task Count Verification Gate

> **[BLOCKING GATE]** Before proceeding to `/plan-review`:
>
> 1. Run `TaskList` — count all created extraction tasks
> 2. Compute expected minimum: `module_count × phase_count`
> 3. If `TaskList` count < expected: plan is **INCOMPLETE** — create missing tasks before continuing
> 4. If `TaskList` count ≥ expected: proceed to `/plan-review`
>
> An incomplete task list is not a plan — it is a guarantee of missing spec sections.

---

## Step 3 — Per-Task Deep Investigation + Extraction

**Goal:** Execute each planned task as a focused, depth-first investigation. Each task reads ALL relevant files in its scope before writing a single spec line.

> **HARD GATE:** For each task, read target files BEFORE writing output. Never write spec content from memory or assumption.

### Per-Task Protocol

For each extraction task, follow this sequence:

```
1. READ   — Read all source files in this task's scope (grep → read → understand)
2. TRACE  — Trace code paths: what calls what, what triggers what, what validates what
3. EXTRACT — Extract the relevant spec content (only what this task covers)
4. WRITE  — Write the extracted content to the spec file with [Source: file:line] on every claim
5. VERIFY — Re-read the written spec against the source. Any claim without a source → mark [UNVERIFIED]
6. COMPLETE — Mark the task completed. Move to next task.
```

### Investigation Depth Requirements

| Task Type            | What to Read                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Domain Model         | Entity/model files, value object files, aggregate roots, enum definitions                  |
| Business Rules       | Validator files, guard clauses in command handlers, entity invariant methods, policy files |
| API Contracts        | Controller/router files, request/response DTO files, middleware/filter files               |
| Integration & Events | Message publisher files, message consumer files, scheduler files, external client files    |
| User Journeys        | Frontend route files (if any), API integration tests, acceptance test files                |

### Context Window Management

> **Critical for large codebases:** A system with 1000+ files cannot be read in one context window. Strict per-task discipline prevents overrun.

Rules:

- **Write output immediately** after each task completes — never accumulate across tasks
- **Never load more files than needed** for the current task — resist the temptation to read adjacent modules
- **If a task's scope is still too large** — split it further (e.g., one file per sub-task if necessary)
- **Use Grep first** to narrow the file set before reading: `grep` for the entity name → read only the files that match
- **Each task is a fresh investigation** — never rely on memory from a previous task

### Context Compaction / Session Resume Guard

> **[BLOCKING — MANDATORY at every session start or after context compaction]**
>
> 1. Run `TaskList` BEFORE any other action — identify `in_progress` or `pending` tasks; NEVER create duplicates
> 2. Read `specs/{date}-{system-name}/README.md` completeness table — identify already-extracted modules (marked ✅)
> 3. Skip re-extraction for any module marked ✅ complete — append only to incomplete sections
> 4. Continue from the first non-completed task in the task list
> 5. NEVER re-run Step 1 (Scout) or Step 2 (Plan) in a resumed session — the Module Registry and task list already exist
>
> This guard is the primary safeguard against wasted re-extraction and duplicate spec sections on large systems.

---

## Phase Extraction Standards (Per-Task Content Requirements)

### Phase A — Domain Model

For each entity/aggregate in scope:

```markdown
### {EntityName}

- **Purpose:** [one sentence — what business concept this represents]
- **Identity:** [auto-generated / natural key: field name]
- **Attributes:**
  | Name | Type | Required | Constraint | Business Meaning |
  |------|------|----------|------------|-----------------|
- **Lifecycle:** [created-modified-deleted / append-only / state machine: list states]
- **Invariants:** [list of rules the entity always enforces — plain language]
- **Domain Events:** [what significant things happen when this entity changes state]
  [Source: path/to/entity-file.ext:line_range]
```

For each value object:

```markdown
### {ValueObjectName}

- **Represents:** [what real-world concept]
- **Attributes:** [name | type | constraint]
- **Immutable:** yes/no
- **Validation:** [what makes an instance valid]
  [Source: path/to/file.ext:line_range]
```

For each aggregate:

```markdown
### {AggregateName} Aggregate

- **Root:** {EntityName}
- **Members:** [list]
- **Consistency Boundary:** [what changes must happen atomically]
- **Invariants Enforced:** [cross-entity rules the aggregate protects]
  [Source: path/to/file.ext:line_range]
```

### Phase B — Business Rules

```markdown
## {ModuleName} — Business Rules

### Validation Rules: {OperationName}

| Field | Rule | Error Condition | Error Message |
| ----- | ---- | --------------- | ------------- |

[Source: path/to/validator.ext:line_range]

### Authorization Rules

| Operation | Who Can Perform | Condition |
| --------- | --------------- | --------- |

[Source: path/to/policy.ext:line_range]

### Invariants

| #   | Invariant | Always True Because | Enforcement |
| --- | --------- | ------------------- | ----------- |

[Source: path/to/entity.ext:line_range]

### Calculations

| Name | Inputs | Formula / Description | Output |
| ---- | ------ | --------------------- | ------ |

[Source: path/to/file.ext:line_range]

### State Machine: {EntityName} Lifecycle

States: [list with descriptions]
Transitions:
| From State | Event/Trigger | Guard Condition | To State |
|-----------|---------------|-----------------|----------|
[Source: path/to/file.ext:line_range]
```

### Phase C — API Contracts

```markdown
## {ModuleName} — Operations

### {OperationName}

- **Purpose:** [one sentence]
- **Transport:** [HTTP method + path / scheduled / message consumer / CLI]
- **Auth Required:** yes/no | Role: [role] | Permission: [permission]
- **Idempotent:** yes/no — [why]
- **Input:**
  | Field | Type | Required | Constraint | Description |
  |-------|------|----------|------------|-------------|
- **Output (success):**
  | Field | Type | Description |
  |-------|------|-------------|
- **Errors:**
  | Code | Condition | Retryable |
  |------|-----------|-----------|
  [Source: path/to/controller.ext:line_range]
```

### Phase D — Integration & Events

```markdown
## Published Events

### {EventName}

- **Trigger:** [what causes this to be published]
- **Payload:**
  | Field | Type | Description |
  |-------|------|-------------|
- **Ordering:** guaranteed / best-effort
  [Source: path/to/publisher.ext:line_range]

## Consumed Events

### {EventName}

- **Producer:** [system or module name]
- **Processing:** [what this system does when received]
- **Idempotency:** [how duplicate delivery is handled]
- **Failure handling:** [retry? dead-letter? discard?]
  [Source: path/to/consumer.ext:line_range]

## Scheduled Jobs

| Job | Schedule | Purpose | Side Effects | Abort Condition |
| --- | -------- | ------- | ------------ | --------------- |

[Source: path/to/job.ext:line_range]
```

### Phase E — User Journeys

```markdown
## Journey: {JourneyName}

- **Actor:** [role or user type]
- **Trigger:** [what starts this journey]
- **Happy Path:**
    1. [Step 1]
    2. [Step 2]
       ...
- **Alternative Paths:** [conditions and branches]
- **Outcome:** [what the actor achieves]
- **Acceptance Criteria:**
    - GIVEN [precondition] WHEN [action] THEN [observable outcome]
    - GIVEN [precondition] WHEN [invalid action] THEN [error outcome]
      [Source: path/to/tests-or-ui.ext:line_range]
```

### Phase F — Spec Bundle Assembly

After all per-module tasks complete:

1. Write `specs/{date}-{system-name}/06-reimplementation-guide.md` — system overview, build order, architecture constraints, data migration notes
2. Write `specs/{date}-{system-name}/README.md` — index with completeness status table
3. Cross-check: every module in the registry has a spec section. Missing modules → `[NOT EXTRACTED — scope excluded]`

---

## Sub-Agent Pattern (Required for 4+ Modules)

When the codebase has 4 or more modules to extract, use sub-agents for parallel module extraction:

**Pattern:**

1. Complete Step 1 (Scout) and Step 2 (Plan) in the main context
2. Spawn one sub-agent per module (or group of related small modules)
3. Each sub-agent receives: the Module Registry, the extraction task list for its module(s), and the spec output path
4. Sub-agents run in parallel, each writing to their module's spec file
5. Main context assembles the final spec bundle from all sub-agent outputs

> **[BLOCKING — PARALLEL SPAWN PROTOCOL]** Spawn ALL module sub-agents in a **SINGLE response** with multiple `Agent` tool calls. Never spawn module sub-agents one at a time sequentially — that eliminates the parallelism benefit and extends wall-clock time by N× for an N-module system.
>
> ```
> Agent(module=Orders, ...)   ← all in ONE message
> Agent(module=Users, ...)    ← same response
> Agent(module=Billing, ...)  ← same response
> ```
>
> Each sub-agent is independent — no shared mutable state, no ordering dependency between modules.

**Sub-Agent Prompt Template:**

```
You are extracting the spec for module: {ModuleName}.

Module Registry: specs/{date}-{system-name}/00-module-registry.md — read this FIRST to understand your module's boundaries and the full system context.
Your assigned tasks: {list of TaskUpdate IDs for this module — call TaskList to confirm}
Output path: specs/{date}-{system-name}/{module-name}-spec.md

---

MANDATORY PROTOCOLS — apply throughout your entire execution:

> Critical Thinking & Anti-Hallucination — every claim needs traced proof. Confidence >80% → write with [Source]. 60-80% → mark [NEEDS-VERIFY]. <60% → mark [UNVERIFIED]. Never present a guess as fact. Never invent field names, method signatures, or business rules.

> Evidence-Based Reasoning — BLOCKED until: source file read AND file:line citation exists. Forbidden words without proof: "obviously", "I think", "should be", "probably". If you cannot find evidence: write "Insufficient evidence. Verified: [...]. Not verified: [...]."

> Incremental Persistence — MANDATORY: after EACH task completes, append findings to your output file immediately. Never hold content in memory across tasks. Context cutoff loses all in-memory work — disk writes survive.

> Cross-Scope Boundary — HARD GATE: Do NOT read files outside your assigned module's scope. If you discover a dependency on an unlisted module, note it as [CROSS-REF: {module-name} — not in scope] in the spec output and stop — do not follow the reference into that module.

> Tech-Agnostic Output — FORBIDDEN in all spec output: framework names (e.g., Entity Framework, Django), ORM types, language generics (List<T>), nullable annotations (string?), file paths or class names from source, architectural pattern names (CQRS, middleware). Use business-meaning descriptions only.

---

Per-task execution protocol — follow in order for EACH assigned task:

1. READ   — grep to narrow file set to this task's scope; read only matching files
2. TRACE  — trace code paths: what calls what, what validates what, what triggers what
3. EXTRACT — extract spec content for this phase/module only
4. WRITE  — append to output file immediately with [Source: file:line] on every claim
5. VERIFY — re-read written spec vs source; mark [UNVERIFIED] for any claim without traceable source
6. COMPLETE — call TaskUpdate to mark task completed; move to next task

Never skip ahead. Never accumulate across tasks. Each task is a fresh investigation.
```

---

## Spec Quality Review (After All Tasks Complete)

Before writing the final spec bundle assembly (Phase F), run a quality review of all generated spec files:

### Review Checklist

For each spec file:

- [ ] Every entity/operation/rule has at least one `[Source: file:line]` citation
- [ ] No technology-specific terms (no framework names, ORM types, language constructs)
- [ ] All state machines have complete transitions (no dead-end states without explanation)
- [ ] All operations have at least one error case documented
- [ ] All modules from the registry are covered (none skipped silently)
- [ ] Unverifiable items are marked `[UNVERIFIED]` not left blank

### Fix Loop

If any check fails:

1. Create a fix task: `"Fix spec quality gap: [specific issue] in [spec file]"`
2. Re-investigate the relevant source file
3. Either add the citation or mark `[UNVERIFIED]`
4. Re-run the review checklist for the fixed section

### Fresh Sub-Agent Re-Review Gate (After Any Fix)

> **[BLOCKING]** After any fix loop iteration, the main agent has rationalization bias toward its own output. Do NOT re-review inline.
>
> **Spawn a NEW `Agent` tool call** (`subagent_type: "code-reviewer"`) with:
>
> - Target: all generated spec files in `specs/{date}-{system-name}/`
> - Protocol: re-read ALL spec files from scratch; check every `[UNVERIFIED]` item; flag any tech-specific term; verify every entity/operation has at least one `[Source: file:line]`
> - Report path: `plans/reports/spec-archaeology-review-round{N}-{date}.md`
>
> **Rules:**
>
> - Max 2 fresh sub-agent rounds — if still failing after round 2, surface remaining gaps via `AskUserQuestion` with explicit list
> - PASS = fresh sub-agent finds zero `[UNVERIFIED]` items without an explicit exclusion reason AND zero tech-specific terms
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW `Agent` call

---

## Tech-Agnostic Output Contract

Every document in the spec bundle MUST be free of:

| ❌ Forbidden                                           | ✅ Use Instead                                       |
| ------------------------------------------------------ | ---------------------------------------------------- |
| Framework names (Express, Django, etc.)                | "HTTP router", "request handler", "middleware"       |
| ORM/database type names                                | "string", "number", "boolean", "date", "list", "map" |
| Language generics (`List<T>`, `Optional<>`)            | "list of X", "optional X"                            |
| Nullable annotations (`string?`)                       | "X (optional)"                                       |
| Architectural pattern names (CQRS handler, middleware) | "command processor", "request interceptor"           |
| File paths or class names from source                  | Business-name descriptions only                      |
| Stack-specific patterns (IoC container, DI)            | "dependency injection", "service registry"           |

---

## Evidence Standards

Every spec claim MUST have a source reference:

```
[Source: path/to/file.ext:line_number]
```

- Attribute types → entity/model layer files
- Validation rules → validator/command layer files
- State transitions → handler/service layer files
- API contracts → controller/router/resolver layer files
- Events → publisher/consumer layer files

**BLOCKED:** Any spec section without source evidence MUST be marked `[UNVERIFIED — needs manual review]`. Never invent or assume.

---

## Selective Phase Mode

When the user requests only specific phases:

| User Goal                                | Phases to Run             |
| ---------------------------------------- | ------------------------- |
| "I need the data model only"             | Scout + Plan + Phase A    |
| "Extract the API contracts"              | Scout + Plan + Phase C    |
| "Document the business rules"            | Scout + Plan + Phase B    |
| "Generate acceptance criteria from code" | Scout + Plan + Phase E    |
| "Extract the event flow"                 | Scout + Plan + Phase D    |
| "Full reimplementation spec"             | Scout + Plan + All phases |

Scout and Plan are ALWAYS mandatory regardless of phase selection.

---

## Incremental Coverage for Large Systems

For systems too large to extract in a single session (>10 modules):

1. **Session 1:** Scout + Plan for the full system. Prioritize modules by business value.
2. **Session 2–N:** Extract one module-group per session, updating the completeness tracker.
3. **Final session:** Spec bundle assembly — compile all module specs into the bundle.

Track completeness in `specs/{date}-{system-name}/README.md` completeness table. Each session appends to existing spec files — never overwrites.

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting — one task per module per phase; verify TaskList count ≥ N×M (task count gate) before proceeding to `/plan-review`
- **MANDATORY IMPORTANT MUST ATTENTION** scout the FULL codebase holistically BEFORE creating the plan — the plan requires complete module registry
- **MANDATORY IMPORTANT MUST ATTENTION** each task must deeply investigate its scope: read files → trace paths → extract → write output immediately
- **MANDATORY IMPORTANT MUST ATTENTION** write spec output after EACH task — never accumulate; large codebases will overflow context
- **MANDATORY IMPORTANT MUST ATTENTION** all output must be tech-agnostic — no framework names, no language constructs
- **MANDATORY IMPORTANT MUST ATTENTION** every claim must cite `[Source: file:line]` — mark `[UNVERIFIED]` rather than guessing
- **MANDATORY IMPORTANT MUST ATTENTION** 4+ modules → BLOCKING: spawn all sub-agents in ONE message; inline extraction with 4+ modules is a violation
- **MANDATORY IMPORTANT MUST ATTENTION** confirm scope with user via `AskUserQuestion` BEFORE Step 1 — never auto-start
- **MANDATORY IMPORTANT MUST ATTENTION** context compaction / session resume → `TaskList` FIRST, read completeness tracker, NEVER re-run scout or plan
- **MANDATORY IMPORTANT MUST ATTENTION** after any fix in spec quality review → spawn fresh `code-reviewer` sub-agent (max 2 rounds) — NEVER inline re-review

          <!-- SYNC:critical-thinking-mindset:reminder -->

- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->
