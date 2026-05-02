---
name: scan-backend-patterns
description: '[Documentation] Scan project and populate/sync docs/project-reference/backend-patterns-reference.md with repository patterns, CQRS, validation, entities, events, migrations.'
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

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan backend codebase → populate `docs/project-reference/backend-patterns-reference.md` with actual patterns (repositories, CQRS, validation, entities, events, migrations, DI, authorization). Every example from real project files with `file:line`. (Codex has no hook injection — open this file directly before proceeding)

**Workflow:**

1. **Assess** — Read target doc, detect init vs sync mode, classify framework
2. **Scan** — Parallel sub-agents discover patterns with `file:line` evidence
3. **Anti-pattern pass** — Dedicated sub-agent hunts violations
4. **Report** — Write structured findings to report file (incremental, not batched)
5. **Generate** — Surgical update of reference doc from report
6. **Verify** — Multi-round fresh-eyes review validates examples and coverage

**Key Rules:**

**MUST ATTENTION** detect framework FIRST — scan strategy derives from framework, not hardcoded
**MUST ATTENTION** every code example from actual project files with `file:line` — NEVER fabricate
**MUST ATTENTION** run graph command on key files before concluding — grep finds text, graph finds structure

- Surgical update only — NEVER rewrite entire doc, NEVER remove section without evidence it's obsolete

---

# Scan Backend Patterns

## Phase 0: Classify & Assess

**Before any other step**, run in parallel:

1. Read `docs/project-reference/backend-patterns-reference.md`
    - Detect mode: Init (placeholder — headings only) or Sync (populated)
    - In Sync mode: list already-documented sections → skip re-scanning those unless staleness suspected
2. Detect backend framework:

| Signal                                  | Framework            | Next Step                                              |
| --------------------------------------- | -------------------- | ------------------------------------------------------ |
| `.csproj` + `MediatR`/`PlatformCqrs`    | .NET / Easy.Platform | Scan for CQRS, PlatformValidationResult, entity events |
| `package.json` + express/fastify/nestjs | Node.js              | Scan for DI decorators, class-validator, TypeORM       |
| `pom.xml` / `build.gradle`              | Java/Kotlin          | Scan for Spring annotations, JPA patterns              |
| `requirements.txt` / `pyproject.toml`   | Python               | Scan for Pydantic, SQLAlchemy, FastAPI patterns        |

3. Load service paths from `docs/project-config.json` contextGroups/modules if available
4. Run graph command on primary service entry point: `python .claude/scripts/code_graph trace <entry-file> --direction both --json`

**Evidence gate:** Confidence <60% on framework detection → report uncertainty, DO NOT proceed with framework-specific scan.

## Phase 1: Plan Scan Strategy

From detected framework, derive:

- Repository interface naming pattern (e.g., `I{Service}RootRepository<T>` vs `extends Repository<T>`)
- Handler base class (e.g., `IRequestHandler<TCmd, TResult>` vs `@CommandHandler`)
- Validation mechanism (e.g., `PlatformValidationResult` vs `FluentValidation` vs class-validator)
- Event mechanism (e.g., `PlatformEntityEvent` vs domain events vs integration events)
- Migration tool (e.g., EF migrations vs Flyway vs Alembic)

**Create task tracking entries** for each sub-agent and each phase before proceeding.

NEVER assume these patterns — derive from actual file evidence.

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **4 general-purpose sub-agents** in parallel. Each sub-agent MUST:

- Write findings incrementally after each file/section — NEVER batch at end
- Cite `file:line` for every pattern example
- Confidence: >80% document as pattern; 60-80% document as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-backend-patterns-{YYMMDD}-{HHMM}-report.md`

### Sub-Agent 1: Repository & Entity Patterns

**Think:** What is the complete chain from domain entity → persistence → retrieval? Where does business logic live — in the entity, the service, or the handler? What makes a "repository" in this project (naming, base class, interface)?

Scan targets (derive grep terms from detected framework):

- Repository interfaces — naming convention, base classes, service-specific vs generic
- Entity/model base classes — inheritance chain, property conventions, factory methods
- Domain logic placement — business rules in entities vs services vs handlers
- DTO classes — mapping ownership (DTO-owned vs handler-mapped vs AutoMapper)
- Repository extension methods — static query expressions, reusable filters

For each pattern found: record `file:line`, extract 5-15 line snippet, note GOOD vs BAD if anti-pattern present.

### Sub-Agent 2: CQRS & Validation Patterns

**Think:** How does a request travel from controller to handler? What validates it? What wraps the result? Where does authorization live?

Scan targets:

- Command handlers — file structure, naming conventions, base class, result types
- Query handlers — pagination patterns, projection patterns, caching if any
- Validation — mechanism, where validation lives (handler vs pipeline vs entity), error response format
- Request/response wrappers — `Result<T>`, `ApiResponse`, `PlatformValidationResult` equivalents
- Controller/endpoint patterns — route conventions, auth attributes, request binding
- Authorization — attribute/decorator placement, policy-based vs role-based, permission check location

### Sub-Agent 3: Events, Messaging & Infrastructure

**Think:** How do side effects happen — synchronous or async? How do services communicate? What triggers background work?

Scan targets:

- Domain events — trigger mechanism, handler discovery, side-effect placement rules
- Integration events / message bus — publisher conventions, consumer conventions, message contract naming
- Background jobs — scheduler, recurring vs one-time, failure handling
- Middleware/pipeline — order, cross-cutting concerns (logging, tracing, error handling)
- DI registration — service lifetime conventions, module registration patterns
- Migration patterns — migration file naming, up/down conventions, data migration approach

For message bus: capture FULL naming pattern for message contracts (ownership prefix matters).

### Sub-Agent 4: Anti-Pattern Detection

**Think:** Where has the team violated the conventions found by Agents 1-3? Look for the 8 most common backend anti-patterns: wrong repo type, wrong logic layer, exception-based validation, cross-service DB access, handler-owned DTO mapping, uncleaned async scopes, unnamed bus contracts, hardcoded config.

Run AFTER Agents 1-3 complete. Checklist:

- Generic repository usage where service-specific required
- Business logic in handlers/components that belongs in entities/models
- Validation via exceptions instead of validation result type
- Direct DB access across service boundaries
- DTO mapping in handlers instead of DTO-owned mapping
- Bus message naming without ownership prefix
- Hard-coded config values that should be injected

For each violation: record `file:line`, classify severity (CRITICAL/MAJOR/MINOR), suggest fix.

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory of Round 1):** Sub-agent re-reads report + draft doc independently.

- Does every code example match an actual existing file (Glob verify)?
- Do class names in examples match actual class definitions (Grep verify)?
- Are anti-patterns documented alongside patterns?
- Coverage gaps: which Target Sections have no examples?

**Round 3 only if Round 2 finds issues.** Max 3 rounds → escalate to user if unresolved.

### Target Sections

| Section                 | Content                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Repository Pattern**  | Interface naming, base classes, service-specific repos, extension methods with examples |
| **CQRS Patterns**       | Command structure, query structure, handler patterns, file organization                 |
| **Validation Patterns** | Mechanism, common rules, error response format, DO/DON'T examples                       |
| **Entity Patterns**     | Base classes, property conventions, factory methods, domain logic placement             |
| **DTO Mapping**         | Mapping ownership (who maps: DTO vs handler vs service), examples                       |
| **Event Handlers**      | Domain vs integration events, handler discovery, side-effect placement                  |
| **Message Bus**         | Cross-service patterns, consumer conventions, message contract naming                   |
| **DI & Configuration**  | Service lifetime conventions, module registration, config injection                     |
| **Migrations**          | Strategy, file naming, data migration patterns                                          |
| **Background Jobs**     | Scheduler, recurring vs one-time, failure handling                                      |
| **Authorization**       | Auth mechanism, permission checks, policy vs role                                       |
| **Anti-Patterns**       | Confirmed violations with `file:line`, severity, fix guidance                           |

### Content Rules

- Code snippets 5-15 lines from actual project files with `file:line`
- DO/DON'T pairs where anti-patterns confirmed (BAD: `file:line` / GOOD: `file:line`)
- Tables for convention summaries (naming, file locations, base classes)
- Anti-Patterns section: list violations found in Phase 2 Sub-Agent 4

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve sections with no staleness, update only diverged sections
3. Verify (Glob check): ALL code example file paths exist — not just 5
4. Verify (Grep check): class names in examples match actual class definitions
5. Verify: Anti-Patterns section populated with actual `file:line` violations (not hypothetical)
6. Run graph command on 2-3 key pattern files to validate call chain accuracy
7. Report: sections updated / unchanged / coverage gaps / violations found

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates class names/signatures. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Always trace full chain.
> **Holistic-first — resist nearest-attention trap.** List EVERY precondition (config, env, DI regs, data) before forming code-layer hypothesis.
> **Surgical changes — apply diff test.** Every changed line traces directly to the task. Announce enhancements explicitly.
> **Surface ambiguity before coding.** Multiple interpretations → present each with effort estimate. NEVER pick silently.
> **Assume existing values intentional.** Ask WHY before changing constants/limits/flags.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small task tracking tasks BEFORE starting — one task per sub-agent, one per phase
**IMPORTANT MUST ATTENTION** detect framework FIRST in Phase 0 — all grep terms derive from detection, never hardcoded
**IMPORTANT MUST ATTENTION** cite `file:line` for every pattern (confidence >80% to document; <60% omit)
**IMPORTANT MUST ATTENTION** run graph command on key files — grep finds text, graph finds structure (callers, event chains, blast radius)
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each file — NEVER batch at end (context loss)
**IMPORTANT MUST ATTENTION** read existing doc FIRST, diff findings, surgical update only — NEVER rewrite entire doc
**IMPORTANT MUST ATTENTION** Anti-Patterns section requires real `file:line` violations — NEVER fabricate hypothetical examples
**IMPORTANT MUST ATTENTION** multi-round fresh-eyes review — main agent rationalizes its own mistakes; Round 2 sub-agent catches what main agent dismissed

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| "Framework already known, skip Phase 0 detection" | Phase 0 is BLOCKING — derive grep terms from evidence, not assumption               |
| "Only 3 agents needed, skip anti-pattern agent"   | Anti-pattern detection is separate concern — NEVER merge with discovery             |
| "Doc has content, skip re-read"                   | Show section list extracted from doc as proof of re-read                            |
| "Examples look right"                             | Glob-verify ALL file paths + Grep-verify ALL class names — looking right ≠ verified |
| "Round 2 review not needed for small scan"        | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable.            |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using task tracking.

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
