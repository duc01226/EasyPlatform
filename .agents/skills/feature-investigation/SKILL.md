---
name: feature-investigation
description: '[Investigation] Use when the user asks to investigate, explore, understand, explain, or analyze how an existing feature or logic works. Triggers on keywords like "how does", "explain", "what is the logic", "investigate", "understand", "where is", "trace", "walk through", "show me how".'
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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract — HARD-GATE** — Skill runs as workflow step? Parent `[Workflow] /{skill}` row = **container, NOT tracking**. MUST expand internal phases as child tasks. Workflow-step invocation = **MORE strict, not less**.
>
> **Why:** task tracking flat (no `parent_id`). Without expansion: hierarchy invisible, transitions batched, mid-skill compaction loses phase state, next agent cannot resume. `[N.M]` prefix + `addBlockedBy` restore visual hierarchy + structural ordering.
>
> ### Child skill contract (this skill, when nested)
>
> 1. **DETECT** — the current task list FIRST. Active `[Workflow] /{this-skill}` `in_progress`? Record `id` → `parentTaskId`, set `nested=true`. Else `nested=false` (standalone).
> 2. **EXPAND** — task tracking one task per declared phase. Never collapse, never lazy-create.
> 3. **PREFIX** (when nested) — `[N.M] $skill-name — phase` (N=workflow step #, M=phase #). Example parent step 1 = `$review-changes` → children `[1.1] $review-changes — Load references`, `[1.2] $review-changes — Run graph trace`, …. Standalone: omit prefix.
> 4. **LINK** (when nested) — immediately after creating children: `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`. Tool then blocks parent `completed` until children resolve.
> 5. **EXECUTE** — child `in_progress` BEFORE work, `completed` IMMEDIATELY after evidence. One `in_progress` at a time. Parent stays `in_progress` throughout.
> 6. **GATE** — parent → `completed` ONLY after ALL children `completed` (or `cancelled` with written reason). Skipping = workflow violation.
>
> ### Orchestrator contract (`workflow-*` skills)
>
> 1. **PRE-EXPAND** — before skill invocation/`spawn_agent` call, read child's phase list, task tracking rows with `[N.M] $skill-name — phase` prefix.
> 2. **LINK PARENT** — `TaskUpdate(workflowStepTaskId, addBlockedBy: [childIds])`.
> 3. **POST-VERIFY** — after child returns, the current task list. Any `[N.M] …` row still `pending`/`in_progress`? Child exited early → a direct user question BEFORE marking workflow row done.
> 4. **NEVER** let `[Workflow] /child-skill` row stand alone as "tracking complete".
>
> ### Standalone invocation
>
> Same phase expansion + one-`in_progress` discipline. Omit `[N.M] $skill-name —` prefix; omit `addBlockedBy` linkage (no parent).
>
> ### Anti-rationalization
>
> | Excuse                                        | Rebuttal                                                                                                           |
> | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
> | "Parent workflow task tracks this"            | Tracks workflow STEP, not phases                                                                                   |
> | "Children clutter the list"                   | Visible hierarchy IS the point — compaction wipes opaque rows                                                      |
> | "Skip task tracking for quick phases"         | Every phase = recovery anchor                                                                                      |
> | "I know what I'm doing, expansion = ceremony" | Expansion is for the NEXT agent post-compaction. Cognitive completion bias = the exact failure mode prevented here |
>
> **BLOCKED until:** `- [ ]` the current task list called, `nested` set `- [ ]` All phases expanded via task tracking `- [ ]` Children prefixed `[N.M] $skill-name — phase` when nested `- [ ]` `TaskUpdate(parentTaskId, addBlockedBy: [...])` when nested `- [ ]` First child `in_progress` BEFORE any other tool call

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs — HARD-GATE (Pre-Fetch Before First Task)** — `docs/project-reference/` carries project-specific conventions, patterns, rules, and lessons that override generic framework defaults. Skipping this gate = output that compiles but violates the project's actual architecture.
>
> ### MANDATORY MUST-DO (BEFORE first file read / grep / edit / task tracking decomposition)
>
> 1. **SCOPE EVALUATION:** Identify task scope — touched file types, domain area (backend handler, frontend component, styles, tests, specs, feature docs), and operation (read/write/review/refactor/migrate).
> 2. **MAP TO REQUIRED DOCS:** Use the canonical doc trigger table in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:project-reference-docs-guide` to enumerate ALL docs whose "When to Read" trigger matches the scope. Enumerate every match — do NOT cherry-pick.
> 3. **CHECK INJECTED:** For each required doc, scan conversation for an `[Injected: <path>]` header from session hooks. If present → already in context, do NOT re-read.
> 4. **READ NON-INJECTED REQUIRED DOCS:** For every required doc NOT carrying `[Injected:]` → call `Read` now. No exceptions, no "I'll read it if I need to".
> 5. **ALWAYS READ `lessons.md`:** Hard-won project lessons apply to every task. If not `[Injected:]`, read it before first action.
> 6. **CITE EVIDENCE:** Before first execution step, state inline: `Reference docs read: <doc1>, <doc2>, ... | Already injected: <doc3>, ...`. Proves the gate ran; creates audit trail.
>
> **BLOCKED until:** `- [ ]` Scope evaluated `- [ ]` Required docs enumerated from table `- [ ]` `[Injected:]` headers checked `- [ ]` Non-injected required docs read `- [ ]` `lessons.md` confirmed in context `- [ ]` Citation line emitted
>
> **Note:** The doc list is the canonical fixed set initialized by session hooks. If a doc is absent from `docs/project-reference/`, it does not apply to the current project — skip it. Compaction wipes prior reads — re-fetch on resume if `[Injected:]` headers are absent.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — HARD-GATE for plan/review skills. Apply BEFORE any file read, grep, edit, or analysis step.
>
> 1. **BREAK BEFORE DO:** Decompose work into small tasks via task tracking BEFORE any execution. Every step (read file, grep, analyze, write) is a tracked task. On context loss → call the current task list FIRST, never duplicate.
> 2. **TRANSITION DISCIPLINE:** Mark `in_progress` BEFORE step starts; mark `completed` IMMEDIATELY after — never batch. One `in_progress` at a time.
> 3. **EXTERNAL REPORT (mandatory):** Create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` BEFORE first finding. Append result after EACH file/section/decision — NEVER hold synthesis in memory. Each disk write survives compaction.
> 4. **SYNTHESIZE FROM DISK:** At end of skill run, RE-READ the report file to compose final summary/conclusion. Never synthesize from in-memory recall — context may have been compacted, findings lost.
> 5. **HAND-OFF:** Final response cites `Full report: plans/reports/{filename}` so downstream skills/agents can resume.
>
> **Why:** Plan/review skills run long, span many files, and are prone to mid-execution compaction. Memory-only state = silent loss. Task tracker keeps execution recoverable; report file keeps findings recoverable.
>
> **BLOCKED until:** `- [ ]` task tracking called with full step breakdown `- [ ]` Report file path declared `- [ ]` First finding written to disk before second step begins

<!-- /SYNC:task-tracking-external-report -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate via ask the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (api-design, debug, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

<!-- SYNC:cross-service-check -->

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

<!-- /SYNC:cross-service-check -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (Codex has no hook injection — open this file directly before proceeding)

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

## Quick Summary

**Goal:** Investigate and explain how existing features or logic work through READ-ONLY code exploration -- no modifications.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `project-structure-reference.md` -- project patterns and structure
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Setup** — Create analysis file, define investigation scope and metadata
2. **Discovery (Phase 1A)** — Glob/Grep to find all relevant files across backend and frontend
3. **Deep Analysis (Phase 1B)** — Read each file, build knowledge graph of relationships
4. **Synthesis (Phase 2)** — Map workflows, integration points, data flows, business logic
5. **Report** — Present findings with evidence chains and code references

**Key Rules:**

- READ-ONLY: never modify code, only explore and explain
- Every claim must have code evidence (no speculation or hallucination)
- Use anti-hallucination protocols: validate assumptions, chain evidence, anchor to original question
- Re-read original question every 10 operations to prevent context drift

> **Skill Variant:** READ-ONLY exploration - no code changes. For implementing features, use `feature-implementation`. For debugging, use `debug-investigate`.

# Feature Investigation & Logic Exploration

Investigate and explain how existing features or logic work as an expert full-stack architect.

**KEY PRINCIPLE**: READ-ONLY investigation. Build understanding and explain how things work.

## Investigation Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT assume code works as named — verify by reading actual implementations
- Every finding must include `file:line` evidence (grep results, read confirmations)
- If you cannot prove a claim with a code trace, mark it as "inferred" with low confidence
- Question assumptions: "Does this actually do what I think?" → read the implementation, not just the signature
- Challenge completeness: "Is this all?" → grep for related usages, consumers, and cross-service references
- Verify relationships: "Does A really call B?" → trace the actual call path with evidence
- No "looks like it works" without proof — state what you verified and how

## ⚠️ MANDATORY: Confidence & Evidence Gate

**MANDATORY IMPORTANT MUST ATTENTION** declare `Confidence: X%` with evidence list + `file:line` proof for EVERY finding.
**95%+** verified fact | **80-94%** with caveats | **60-79%** "partially verified" | **<60% "inferred — needs verification", NOT fact.**

**IMPORTANT**: Always use task tracking to plan step-by-step tasks.

---

## Prerequisites

**⚠️ CRITICAL**: Read all protocol sections below before starting investigation.

---

## Anti-Hallucination Protocols

### ASSUMPTION_VALIDATION_CHECKPOINT

Before every major operation:

1. "What assumptions am I making about [X]?"
2. "Have I verified this with actual code evidence?"
3. "Could I be wrong about [specific pattern/relationship]?"

### EVIDENCE_CHAIN_VALIDATION

Before claiming any relationship:

- "I believe X calls Y because..." -> show actual code
- "This follows pattern Z because..." -> cite specific examples
- "Service A owns B because..." -> grep for actual boundaries

### TOOL_EFFICIENCY_PROTOCOL

- Batch multiple Grep searches into single calls with OR patterns
- Use parallel Read operations for related files
- Combine semantic searches with related keywords

### CONTEXT_ANCHOR_SYSTEM

Every 10 operations:

1. Re-read the original question from the `## Metadata` section
2. Verify the current operation aligns with answering the question
3. Check if we're investigating the right thing
4. Update the `Current Focus` bullet point within the `## Progress` section

### Quick Reference Checklist

Before any major operation:

- [ ] ASSUMPTION_VALIDATION_CHECKPOINT
- [ ] EVIDENCE_CHAIN_VALIDATION
- [ ] TOOL_EFFICIENCY_PROTOCOL

Every 10 operations:

- [ ] CONTEXT_ANCHOR_CHECK
- [ ] Update 'Current Focus' in `## Progress` section

Emergency:

- **Context Drift** -> Re-read `## Metadata` section
- **Assumption Creep** -> Halt, validate with code
- **Evidence Gap** -> Mark as "inferred"

---

## Analysis File Structure

Create at `.ai/workspace/analysis/[feature-name]-investigation.analysis.md`:

```markdown
## Metadata

**Original Prompt:** [Full original question/prompt]

**Task Description:** [Parsed investigation question]

**Investigation Scope:** [What needs to be understood]

**Source Code Structure:**

- Backend: services directory/{ServiceA,ServiceB,ServiceC}/
- Frontend: frontend directory/apps/, frontend directory/libs/
- Framework: framework directory/

## Progress

- **Phase**: 1A
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original task summary]"

## Errors

[Track all errors encountered during analysis]

## Assumption Validations

[Document all assumptions and their validation status]

## Performance Metrics

[Track operation times and efficiency]

## Memory Management

[Track context usage and optimization strategies]

## Processed Files

[Numbered list of processed files with status]

## File List

[Complete numbered list of all discovered files - populated during discovery]

## Knowledge Graph

[Detailed analysis of each file - populated during Phase 1B]

## Workflow Analysis

[End-to-end workflow documentation]

## Integration Points

[Cross-service and cross-component integration analysis]

## Business Logic Mapping

[Complete business logic workflows and rules]

## Data Flow Analysis

[How data flows through the system]

## Framework Pattern Usage

[Documentation of platform patterns used]
```

---

## File Discovery Search Patterns

```bash
# Domain Entities (HIGH PRIORITY)
grep: "class.*{EntityName}.*:.*RootEntity|RootAuditedEntity"

# Commands & Queries (HIGH PRIORITY)
grep: ".*Command.*{EntityName}|{EntityName}.*Command"
grep: ".*Query.*{EntityName}|{EntityName}.*Query"

# Event Handlers (HIGH PRIORITY)
grep: ".*EventHandler.*{EntityName}|{EntityName}.*EventHandler"

# Controllers (HIGH PRIORITY)
grep: ".*Controller.*{EntityName}|{EntityName}.*Controller"

# Background Jobs (MEDIUM PRIORITY)
grep: ".*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob"

# Message Bus Consumers (MEDIUM PRIORITY)
grep: ".*Consumer.*{EntityName}|{EntityName}.*Consumer"
grep: "MessageBusConsumer.*{EntityName}" # search for project message bus consumer base class

# Services & Helpers (LOW PRIORITY)
grep: ".*Service.*{EntityName}|{EntityName}.*Service"
grep: ".*Helper.*{EntityName}|{EntityName}.*Helper"

# Frontend Components & Stores (HIGH PRIORITY)
grep: "{feature-name}" in **/*.{ts,html}
grep: ".*Store.*{FeatureName}|{FeatureName}.*Store"
grep: ".*Component.*{FeatureName}|{FeatureName}.*Component"
```

### File List Organization

```markdown
## File List

### High Priority - Core Logic (MUST ATTENTION ANALYZE FIRST)

1. [Domain Entity path]
2. [Command/Query Handler path]
3. [Event Handler path]
4. [Controller path]
5. [Frontend Component path]
   ...

### Medium Priority - Supporting Infrastructure

10. [Background Job path]
11. [Consumer path]
12. [API Service path]
    ...

### Low Priority - Configuration/Utilities

20. [Helper path]
21. [Utility path]
    ...

**Total Files**: [count]
```

---

## Knowledge Graph Entry Template

For each file, document:

````markdown
### {ItemNumber}. {FilePath}

**File Analysis:**

- **filePath**: Full path to the file
- **type**: Entity | Command | Query | EventHandler | Controller | BackgroundJob | Consumer | Component | Store | Service | Helper
- **architecturalPattern**: CQRS | Repository | Event-Driven | Component-Store | etc.
- **content**: Summary of purpose and logic
- **symbols**: Important classes, interfaces, methods
- **dependencies**: All imported modules or `using` statements
- **businessContext**: What business problem, rules, contribution to feature
- **referenceFiles**: Other files that use this file's symbols
- **relevanceScore**: 1-10 for current investigation
- **evidenceLevel**: "verified" or "inferred"
- **uncertainties**: Aspects you are unsure about
- **frameworkAbstractions**: Framework base classes used
- **serviceContext**: Which microservice (ServiceB, ServiceA, ServiceC)
- **dependencyInjection**: DI registrations
- **genericTypeParameters**: Generic type relationships

**Message Bus Analysis (FOR CONSUMERS ONLY):**

- **messageBusMessage**: Message type consumed
- **messageBusProducers**: Files that publish this message (MUST ATTENTION grep across ALL services)
- **crossServiceIntegration**: Cross-service data flow description

**Targeted Aspect Analysis:**

**For Frontend Components:**

- `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`
- `dataBindingPatterns`, `validationStrategies`, `apiIntegration`, `userInteractionFlow`

**For Backend Components:**

- `authorizationPolicies`, `commands`, `queries`, `domainEntities`
- `repositoryPatterns`, `businessRuleImplementations`, `eventHandlers`, `backgroundJobs`

**For Consumer Components:**

- `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`
- `handleLogicWorkflow`, `dependencyWaiting`

**Code Examples:**

```csharp
// Include relevant code snippets that demonstrate key logic
```

**Key Insights:**

[Important observations about this file's role in the overall feature]
````

---

## Overall Analysis Template

````markdown
## Overall Analysis

### 1. Complete End-to-End Workflows Discovered

**Workflow: {Feature Name} - Main Flow**

```

[User Action] -> [Frontend Component] -> [API Service] -> [Controller]
|
[Command/Query Handler]
|
[Domain Entity] -> [Repository]
|
[Event Handler] -> [Side Effects]

```

**Detailed Flow:**

1. **Frontend Entry Point**: `Component.ts:line` - User interaction, validation, API call
2. **API Layer**: `Controller.cs:line` - Endpoint, authorization, command dispatch
3. **Application Layer**: `CommandHandler.cs:line` - Validation, business logic, repository ops
4. **Domain Layer**: `Entity.cs:line` - Business rules, state changes, domain events
5. **Event Handling**: `EventHandler.cs:line` - Events handled, side effects, integrations
6. **Cross-Service**: `Consumer.cs:line` - Message consumed, producer service, sync logic

### 2. Key Architectural Patterns and Relationships

- **CQRS**: Commands, queries, separation of concerns
- **Event-Driven**: Domain events, handlers, message bus
- **Repository**: Repositories used, query builders, extensions
- **Frontend**: Component hierarchy, state management, forms

### 3. Business Logic Workflows

Frontend-to-backend flow tree and cross-service integration flow.

### 4. Integration Points and Dependencies

API endpoints, message bus integration, database dependencies, external services.

### 5. Business Rules Discovered

Validation rules, business constraints, authorization rules.

### 6. Framework Pattern Usage

Backend: CQRS, repository, event handlers, message bus, background jobs, validation
Frontend: Component hierarchy, stores, forms, API services, reactive patterns

### 7. Key Insights and Observations

Critical findings, recommendations, uncertainties requiring clarification.
````

---

## Presentation Template

```markdown
## Answer

[Direct answer to the question in 1-2 paragraphs]

## How It Works

### 1. [First Step]

[Explanation with code reference at `file:line`]

### 2. [Second Step]

[Explanation with code reference at `file:line`]

## Key Files

| File                  | Purpose   |
| --------------------- | --------- |
| `path/to/file.cs:123` | [Purpose] |

## Data Flow
```

[Text diagram showing the flow]

```

## Want to Know More?

I can explain further:

- [Topic 1]
- [Topic 2]
- [Topic 3]
```

---

## Common Investigation Scenarios

### "How does feature X work?"

1. Find entry points (API, UI, job)
2. Trace through command/query handlers
3. Document entity changes
4. Map side effects (events, notifications)

### "Where is the logic for Y?"

1. Search for keywords in commands, queries, entities
2. Check event handlers for side effect logic
3. Look in helper/service classes
4. Check frontend stores and components

### "What happens when Z occurs?"

1. Identify the trigger (user action, event, schedule)
2. Trace the handler chain
3. Document all side effects
4. Map error handling

### "Why does A behave like B?"

1. Find the relevant code path
2. Identify decision points
3. Check configuration/feature flags
4. Document business rules

---

## Project-Specific Investigation Patterns

### Backend Patterns to Look For (see docs/project-reference/backend-patterns-reference.md)

- CQRS command / query base classes - CQRS entry points
- Entity event application handler - Side effects
- Message bus consumer base class - Cross-service consumers
- Service-specific repository interfaces - Data access
- Project validation fluent API - Validation logic
- Project authorization attributes - Authorization

### Frontend Patterns to Look For (see docs/project-reference/frontend-patterns-reference.md)

- Project store component base (search for: store component base class) - State management components
- Project store base (search for: store base class) - Store implementations
- `effectSimple` / `tapResponse` - Effect handling
- `observerLoadingErrorState` - Loading/error states
- API services extending project API service base class

---

## Investigation Flow

### Phase 1A: Initialize & Discover

1. **Create analysis file** at `.ai/workspace/analysis/[feature-name]-investigation.analysis.md`
    - **Use the Analysis File Structure template** above
2. **Search for all related files** using grep patterns organized by priority
    - **Use the File Discovery Search Patterns** above
3. **Save all discovered paths** as numbered list under `## File List`, organized by priority
4. Update `Total Items` count in `## Progress`

### Phase 1B: Knowledge Graph Construction

1. Count total files, split into batches of 10 (priority order)
2. Insert batch analysis tasks into todo list
3. For each file, document in `## Knowledge Graph`
    - **Use the Knowledge Graph Entry Template** above
4. **Every 10 files**: Update progress, run CONTEXT_ANCHOR_CHECK

### Phase 1C: Overall Analysis

After ALL files analyzed, write comprehensive analysis:

- End-to-end workflows, architectural patterns, business logic
- Integration points, business rules, platform patterns, key insights
- **Use the Overall Analysis Template** above

### Phase 2: Presentation

Present findings in clear format with: Answer, How It Works (with code refs), Key Files table, Data Flow diagram, "Want to Know More?" topics.

- **Use the Presentation Template** above

---

## Anti-Hallucination Protocols (Investigation-Specific)

**Prerequisites:**

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

<!-- SYNC:incremental-persistence -->

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

<!-- /SYNC:incremental-persistence -->

<!-- SYNC:subagent-return-contract -->

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

<!-- /SYNC:subagent-return-contract -->

---

## Investigation Guidelines

- **Evidence-based**: Every claim must have code evidence
- **Service boundary awareness**: Understand which service owns what
- **Framework pattern recognition**: Identify project framework patterns used
- **Cross-service tracing**: Follow message bus flows across services
- **Read-only exploration**: Never suggest changes unless asked
- **Question-focused**: Always tie findings back to the original question
- **Layered explanation**: Start simple, offer deeper detail if requested

---

### Graph Intelligence

> **RECOMMENDED** if `.code-graph/graph.db` exists.

### Graph-Trace for Feature Flow

When graph DB is available, use `trace` to understand the complete feature flow:

- `python .claude/scripts/code_graph trace <entry-file> --direction both --json` — full upstream (who triggers) + downstream (what it affects) flow
- Use `--direction downstream` when investigating "what happens after X"
- Use `--direction upstream` when investigating "what triggers X"
- Trace reveals implicit connections (MESSAGE_BUS, events) that grep misses

## See Also

- `feature-implementation` - For implementing new features (code changes)
- `debug-investigate` - For debugging and fixing issues
- `planning` - For creating implementation plans
- `graph-query` - Natural language graph queries for code relationships

## References

**Note:** All content from `references/investigation-protocols.md` has been merged into this skill file above. The reference file is kept for historical purposes.

| File                                    | Contents                                         |
| --------------------------------------- | ------------------------------------------------ |
| `references/investigation-protocols.md` | (Archived - content merged into this skill file) |

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `investigation` workflow** (Recommended) — scout → investigate
> 2. **Execute `$investigate` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use a direct user question to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"$plan-hard (Recommended)"** — Create implementation plan from investigation findings
- **"$domain-analysis"** — If investigation reveals entity-heavy feature (new aggregates, complex invariants), model domain before planning
- **"$fix"** — If investigating a bug to fix
- **"Skip, continue manually"** — user decides

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

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY MUST ATTENTION** break work into tasks via task tracking BEFORE doing — `in_progress`/`completed` per step, never batch.
- **MANDATORY MUST ATTENTION** write findings to `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` incrementally; re-read at end to synthesize — never synthesize from memory.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY MUST ATTENTION** before first task: enumerate required docs from `SYNC:project-reference-docs-guide` table → check `[Injected:]` headers → `Read` every non-injected required doc → always include `lessons.md` → emit `Reference docs read: ...` citation line.
- **MANDATORY MUST ATTENTION** project-specific conventions in these docs override generic framework defaults — acting without them in context produces architecture violations regardless of how clean the code looks.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY MUST ATTENTION** a parent workflow task does NOT satisfy this skill's own task tracking — always expand internal phases via task tracking, even when nested.
- **MANDATORY MUST ATTENTION** when nested, prefix children `[N.M] $skill-name — phase` AND link the parent via `TaskUpdate(parentTaskId, addBlockedBy: [childIds])` so the parent cannot complete until all children resolve.
- **MANDATORY MUST ATTENTION** orchestrator (workflow-\*) skills MUST pre-expand the child skill's manifest into the tracker BEFORE invoking the child — the workflow row is only the parent container, never a substitute for phase tracking.

<!-- /SYNC:nested-task-creation:reminder -->

## Closing Reminders

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user via a direct user question — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

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
