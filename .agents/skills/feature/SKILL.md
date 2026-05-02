---
name: feature
description: '[Implementation] Use when the user asks to implement a new feature, enhancement, add functionality, build something new, or create new capabilities. Triggers on keywords like "implement", "add feature", "build", "create new", "develop", "enhancement".'
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (Codex has no hook injection — open this file directly before proceeding)

## Quick Summary

**Goal:** Implement new features or enhancements with comprehensive knowledge graph analysis and external memory management.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `project-structure-reference.md` -- project patterns and structure
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Phase 1A: Discovery** — Initialize analysis file, semantic/grep search, build file list
2. **Phase 1B: Knowledge Graph** — Analyze files in batches of 10, document business context, dependencies
3. **Phase 1C: Overall Analysis** — Comprehensive end-to-end workflow summary
4. **Phase 2: Plan Generation** — Detailed implementation plan following project patterns
5. **Phase 3: Approval Gate** — Present plan, await user confirmation
6. **Phase 4: Execution** — Implement with safeguards, update external memory

**Key Rules:**

- **External Memory**: All analysis in `.ai/workspace/analysis/{task}.analysis.md`
- **Evidence-Based**: grep/search to verify assumptions, never assume service ownership
- **High Priority**: Domain Entities, Commands, Queries, EventHandlers, Controllers, BackgroundJobs, Consumers, Components MUST ATTENTION be analyzed
- **Approval Required**: STOP at Phase 3, do NOT proceed without user confirmation
- **New Tech/Lib Gate**: If implementation requires new packages/libraries not in project, task tracking to evaluate top 3 alternatives → compare → recommend with confidence % → a direct user question to confirm before installing

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

> **Skill Variant:** Use this skill for **interactive feature development** where the user is actively engaged and can provide feedback. For investigating existing features without changes, use `feature-investigation`.

# Implementing a New Feature or Enhancement

You are to operate as an expert full-stack dotnet angular principal developer, software architecture to implement the new requirements in `[task-description-or-task-info-file-path]`.

**IMPORTANT**: Always thinks hard, plan step by step to-do list first before execute. Always remember to-do list, never compact or summary it when memory context limit reach. Always preserve and carry your to-do list through every operation. Todo list must cover all phases, from start to end, include child tasks in each phases too, everything is flatted out into a long detailed todo list.

---

## PHASE 1: EXTERNAL MEMORY-DRIVEN KNOWLEDGE MODEL CONSTRUCTION

Your sole objective is to build a structured knowledge model in a Markdown analysis file at `.ai/workspace/analysis/[some-sort-semantic-name-of-this-task].analysis.md` with systematic external memory management.

### PHASE 1A: INITIALIZATION AND DISCOVERY

First, **initialize** the analysis file with a `## Metadata` heading and under it is the full original prompt in a markdown box, like this: `markdown [content of metadata in here]` (MUST ATTENTION 5 chars for start and end of markdown box), then continue add the task description and full details of the `Source Code Structure` from `docs/project-reference/backend-patterns-reference.md` and `docs/project-reference/frontend-patterns-reference.md` into this `## Metadata` section, with all content in `## Metadata` section must be in a markdown box, like this: `markdown [content of metadata in here]` (MUST ATTENTION 6 chars for start and end of markdown box).

You **MANDATORY IMPORTANT MUST ATTENTION** also create the following top-level headings:

- `## Progress`
- `## Errors`
- `## Assumption Validations`
- `## Performance Metrics`
- `## Memory Management`
- `## Processed Files`
- `## File List`
- `## Knowledge Graph`

Populate the `## Progress` section with:

- **Phase**: 1
- **Items Processed**: 0
- **Total Items**: 0
- **Current Operation**: "initialization"
- **Current Focus**: "[original task summary]"

Next, do semantic search and grep search all keywords of the task to find all related files, prioritizing the discovery of core logic files like **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components.ts**.

**CRITICAL:** Save ALL file paths immediately as a numbered list under a `## File List` heading.

After semantic search, perform additional targeted searches to ensure no critical infrastructure is missed:

- `grep search` with patterns: `.*EventHandler.*{EntityName}|{EntityName}.*EventHandler`
- `grep search` with patterns: `.*BackgroundJob.*{EntityName}|{EntityName}.*BackgroundJob`
- `grep search` with patterns: `.*Consumer.*{EntityName}|{EntityName}.*Consumer`
- `grep search` with patterns: `.*Service.*{EntityName}|{EntityName}.*Service`
- `grep search` with patterns: `.*Helper.*{EntityName}|{EntityName}.*Helper`
- All files (include pattern: `**/*.{cs,ts,html}`)

High Priority files MUST ATTENTION be analyzed: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components.ts**.

Update the `Total Items` count in the `## Progress` section.

### PHASE 1B: KNOWLEDGE GRAPH CONSTRUCTION

**IMPORTANT MUST ATTENTION DO WITH TODO LIST**

Count total files in file list, split it into many batches of 10 files in priority order, each group insert in the current todo list new task for Analyze each batch of files group for all of files in file list.

**CRITICAL:** You must analyze all files in the file list identified as belonging to the highest IMPORTANT priority categories: **Domain Entities, Commands, Queries, Event Handlers, Controllers, Background Jobs, Consumers and front-end Components.ts**.

For each file in the `## File List` (following the prioritized order if applicable), read and analyze it, add result into `## Knowledge Graph` section. The heading of each analyzed file must have the item order number in heading. Each file analyzing result detail the following information:

**Core Fields:**

- **`filePath`**: The full path to the file
- **`type`**: The component's classification
- **`architecturalPattern`**: The main design pattern used
- **`content`**: A summary of purpose and logic
- **`symbols`**: Important classes, interfaces, methods
- **`dependencies`**: All imported modules or `using` statements
- **`businessContext`**: Comprehensive detail all business logic, how it contributes to the requirements
- **`referenceFiles`**: Other files that use this file's symbols
- **`relevanceScore`**: A numerical score (1-10)
- **`evidenceLevel`**: "verified" or "inferred"
- **`uncertainties`**: Any aspects you are unsure about
- **`frameworkAbstractions`**: Any framework base classes used
- **`serviceContext`**: Which microservice this file belongs to
- **`dependencyInjection`**: Any DI registrations
- **`genericTypeParameters`**: Generic type relationships

**For Consumer Files (CRITICAL):**

- **`messageBusAnalysis`**: When analyzing any Consumer file (files ending with `Consumer.cs` that extend the project message bus consumer base class), identify the `*BusMessage` type used. Then perform a grep search across ALL services to find files that **send/publish** this message type. List all producer files and their service locations in the `messageBusProducers` field. This analysis is crucial for understanding cross-service integration.

**Targeted Aspect Analysis:**
Populate `specificAspects:` key with deeper analysis:

- **For Front-End items:** `componentHierarchy`, `routeConfig`, `routeGuards`, `stateManagementStores`, `dataBindingPatterns`, `validationStrategies`
- **For Back-End items:** `authorizationPolicies`, `commands`, `queries`, `domainEntities`, `repositoryPatterns`, `businessRuleImplementations`
- **For Consumer items:** `messageBusMessage`, `messageBusProducers`, `crossServiceIntegration`, `handleLogicWorkflow`

**MANDATORY PROGRESS TRACKING**: After processing every 10 files, you **MANDATORY IMPORTANT MUST ATTENTION** update `Items Processed` in `## Progress`, run a `CONTEXT_ANCHOR_CHECK`, and explicitly state your progress. After each file, add its path to the `## Processed Files` list.

### PHASE 1C: OVERALL ANALYSIS

Write comprehensive `overallAnalysis:` summary showing:

- Complete end-to-end workflows discovered
- Key architectural patterns and relationships
- All business logic work flow: From front-end to back-end. (Example: Front-end Component => Controller Api Service => Command/Query => EventHandler => Others (Send email, producer bus message); From background job => event handler => others)
- Integration points and dependencies

---

## PHASE 2: PLAN GENERATION

You MUST ATTENTION ensure all files are analyzed. Then read the ENTIRE Markdown analysis notes file. Then Generate a detailed implementation plan under a `## Plan` heading. Your plan **MANDATORY IMPORTANT MUST ATTENTION** follow coding convention and patterns in `docs/project-reference/backend-patterns-reference.md` and `docs/project-reference/frontend-patterns-reference.md`, must ultrathink and think step-by-step todo list to make code changes, for each step must read these pattern references to follow code convention and patterns.

### PHASE 2.1: VERIFY AND REFACTOR

First, verify and ensure your implementation plan that code patterns, solution must follow code patterns and example in these files:

- `docs/project-reference/backend-patterns-reference.md`
- `docs/project-reference/frontend-patterns-reference.md`
- `docs/project-reference/code-review-rules.md`

Then verify and ensure your implementation plan satisfies clean code rules in `docs/project-reference/code-review-rules.md`

---

## PHASE 3: APPROVAL GATE

You must present the plan for my explicit approval. **DO NOT** proceed without it.

**Format for Approval Request:**

```markdown
## Implementation Plan Complete - Approval Required

### Summary

[Brief description of what will be implemented]

### Files to Create

1. `path/to/file.cs` - [purpose]
2. `path/to/file.ts` - [purpose]

### Files to Modify

1. `path/to/existing.cs:line` - [change description]
2. `path/to/existing.ts:line` - [change description]

### Implementation Order

1. [Step 1]
2. [Step 2]
3. [Step N]

### Risks & Considerations

- [Risk 1]
- [Risk 2]

**Awaiting approval to proceed with implementation.**
```

---

## PHASE 4: EXECUTION

Once approved, execute the plan. Before creating or modifying **ANY** file, you **MANDATORY IMPORTANT MUST ATTENTION** first load its relevant entry from your `## Knowledge Graph`. Use all **EXECUTION_SAFEGUARDS**. If any step fails, **HALT**, report the failure, and return to the APPROVAL GATE.

**EXECUTION_SAFEGUARDS:**

- Verify file exists before modification
- Read current content before editing
- Check for conflicts with existing code
- Validate changes against project patterns

---

## SUCCESS VALIDATION

Before completion, verify the implementation against all requirements. Document this under a `## Success Validation` heading and summarize changes in `changelog.md`.

---

## Coding Guidelines

- **Evidence-based approach:** Use `grep` and semantic search to verify assumptions
- **Service boundary discovery:** Find endpoints before assuming responsibilities
- **Never assume service ownership:** Verify patterns with code evidence
- **Project-patterns-first approach:** Use established templates
- **Cross-service sync:** Use an event bus, not direct database access
- **CQRS adherence:** Follow established Command/Query patterns
- **Clean architecture respect:** Maintain proper layer dependencies

---

## Architecture Reference

### Backend Layers

```
Presentation:   Controllers, API endpoints
Application:    Commands, Queries, EventHandlers, DTOs
Domain:         Entities, ValueObjects, Expressions
Infrastructure: Repositories, External services, Messaging
```

### Key CQRS Flow

```
Controller → Command/Query → Handler → Repository → Entity
                                  ↓
                            EventHandler → Side Effects (notifications, external APIs)
```

### Message Bus Flow

```
Service A: EntityEventProducer → message broker → Service B: Consumer
```

### Frontend Flow

```
Component → Store.effect() → ApiService → Backend
     ↑           ↓
   Template ← Store.state
```

### Project Framework Patterns (see docs/project-reference/backend-patterns-reference.md)

```
// Command/Query handlers — search for: CqrsCommandApplicationHandler, CqrsQueryApplicationHandler
// Entity event handlers (for side effects) — search for: EntityEventApplicationHandler
// Message bus consumers — search for: MessageBusConsumer
// Repositories — search for: service-specific repository interface
```

### Frontend Patterns

```typescript
// Component hierarchy
project base component (search for: base component class)            // Simple display
project store component base (search for: store component base class)     // State management
project form component base (search for: form component base class)        // Forms with validation

// Store pattern
project store base (search for: store base class)<TState>
effectSimple(() => api.call().pipe(tapResponse(...)))
```

---

## See Also

- `.claude/docs/AI-DEBUGGING-PROTOCOL.md` - Debugging protocol
- `docs/project-reference/backend-patterns-reference.md` - Backend patterns and context
- `docs/project-reference/frontend-patterns-reference.md` - Frontend patterns and context
- `CLAUDE.md` - Codebase instructions
- `feature-investigation` skill - For exploring existing features (READ-ONLY)

## Related

- `planning`
- `code-review`
- `tdd-spec`

---

<!-- SYNC:understand-code-first:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
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
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

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
