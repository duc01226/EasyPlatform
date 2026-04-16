---
name: investigate
description: '[Fix & Debug] Investigate and explain how existing features or logic work. READ-ONLY exploration with no code changes.'
version: 2.1.0
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

<!-- SYNC:fix-layer-accountability -->

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

<!-- /SYNC:fix-layer-accountability -->

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Quick Summary

**Goal:** READ-ONLY exploration of existing features and logic — understand how code works without making changes.

> **MANDATORY IMPORTANT MUST ATTENTION** Plan ToDo Task to READ the following project-specific reference doc:
>
> - `project-structure-reference.md` -- project patterns and structure
>
> If file not found, search for: project documentation, coding standards, architecture docs.

**Workflow:**

1. **Discovery** — Search codebase for related files (Entities > Commands > Events > Controllers)
2. **Knowledge Graph** — Read and document purpose, symbols, dependencies per file
3. **Flow Mapping** — Trace entry points through pipeline to exit points
4. **Analysis** — Extract business rules, validation, authorization, error handling
5. **Synthesis** — Write executive summary with key files and flow diagrams
6. **Present** — Deliver findings, offer deeper dives on subtopics

**Key Rules:**

- Strictly READ-ONLY — no code changes allowed
- Evidence-based: every claim needs `file:line` proof (grep results, read confirmations)
- Mark unverified claims as "inferred" with low confidence
- Write analysis to `.ai/workspace/analysis/[feature-name]-investigation.md`
- For UI investigation, activate `visual-component-finder` skill FIRST

<!-- SYNC:root-cause-debugging -->

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

<!-- /SYNC:root-cause-debugging -->

## Investigation Mindset (NON-NEGOTIABLE)

**Be skeptical. Every claim needs `file:line` traced proof. Confidence >80% to act.**

- NEVER assume code works as named — MUST ATTENTION verify by reading actual implementations
- MUST ATTENTION include `file:line` evidence for every finding; unproven claims MUST ATTENTION be marked "inferred" with low confidence
- ALWAYS grep for related usages, consumers, and cross-service references — NEVER assume completeness
- ALWAYS trace actual call paths with evidence — NEVER rely on signatures alone

> **UI Investigation?** Activate `visual-component-finder` skill FIRST for screenshot/visual-based investigation. Uses `docs/component-index.json` to match visuals to Angular components with >=85% confidence.

## Workflow

1. **Discovery** - Search codebase for all files related to the feature/question. Prioritize: Entities > Commands/Queries > EventHandlers > Controllers > Consumers > Components.
2. **Graph Expand (MANDATORY — DO NOT SKIP)** - **YOU (the main agent) MUST ATTENTION run graph queries YOURSELF** on key files found in Step 1. This step is NOT optional — without graph, your understanding is incomplete. Sub-agents CANNOT use graph — only you can. Pick 2-3 key files (entities, commands, bus messages) and run:
    ```bash
    python .claude/scripts/code_graph connections <key_file> --json
    python .claude/scripts/code_graph query callers_of <FunctionName> --json
    python .claude/scripts/code_graph query importers_of <file_path> --json
    # If "ambiguous" → search to disambiguate, then retry with qualified name
    python .claude/scripts/code_graph search <keyword> --kind Function --json
    # Trace how two nodes connect
    python .claude/scripts/code_graph find-path <source> <target> --json
    # Filter by service, limit results
    python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
    ```
    Graph reveals the complete dependency network (callers, importers, tests, inheritance) that grep alone misses. This is essential for understanding features and workflows fully. Also run `/graph-connect-api` for frontend-to-backend API mapping.
3. **Knowledge Graph** - Read and analyze each file (from grep + graph results). Document purpose, symbols, dependencies, data flow. Batch in groups of 10, update progress after each batch.
4. **Flow Mapping** - Trace entry points through processing pipeline to exit points. Map data transformations, persistence, side effects, cross-service boundaries.
5. **Analysis** - Extract business rules, validation logic, authorization, error handling. Document happy path and edge cases.
6. **Synthesis** - Write executive summary answering the original question. Include key files, patterns used, and text-based flow diagrams.
7. **Present** - Deliver findings using the structured output format. Offer deeper dives on subtopics.

## ⚠️ MUST ATTENTION READ Before Investigation

**IMPORTANT: You MUST ATTENTION read these files before starting. Do NOT skip.**

- <!-- SYNC:knowledge-graph-template -->
    > **Knowledge Graph Template** — For each analyzed file, document: filePath, type (Entity/Command/Query/EventHandler/Controller/Consumer/Component/Store/Service), architecturalPattern, content summary, symbols, dependencies, businessContext, referenceFiles, relevanceScore (1-10), evidenceLevel (verified/inferred), frameworkAbstractions, serviceContext. Investigation fields: entryPoints, outputPoints, dataTransformations, errorScenarios. Consumer/bus fields: messageBusMessage, messageBusProducers, crossServiceIntegration. Frontend fields: componentHierarchy, stateManagementStores, dataBindingPatterns, validationStrategies.
                            <!-- /SYNC:knowledge-graph-template -->

**If preceded by `/scout`:** Use Scout's numbered file list as analysis targets. Skip redundant discovery. Prioritize HIGH PRIORITY files first.

## Investigation Techniques

### Discovery Search Patterns

Grep `{FeatureName}` combined with: `EventHandler`, `BackgroundJob`, `Consumer`, `Service`, `Component`.

**Priority order:** (1) Entities → (2) Commands/Queries (`UseCaseCommands/`) → (3) Event Handlers (`UseCaseEvents/`) → (4) Controllers → (5) Consumers (`*BusMessage.cs`) → (6) Background Jobs → (7) Components/Stores → (8) Services/Helpers

### Dependency Tracing

**Backend:** method callers (grep `*.cs`), service injectors (grep interface in constructors), entity events (`EntityEvent<Name>`), cross-service (`*BusMessage` across services), repository usage (`IRepository<Name>`).

**Frontend:** component users (grep selector in `*.html`), service importers (grep class in `*.ts`), store chains (`effectSimple` -> API -> `tapResponse` -> state), routes (grep component in `*routing*.ts`).

### Data Flow Mapping

Document as: `[Entry] → [Validation] → [Processing] → [Persistence] → [Side Effects]`

**MUST ATTENTION trace:** (1) Entry points, (2) Processing pipeline, (3) Data transformations, (4) Persistence points, (5) Exit points/responses, (6) Cross-service message bus boundaries.

### Common Investigation Scenarios

| Question Type               | Steps                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------- |
| "How does X work?"          | Entry points → command/query handlers → entity changes → side effects                   |
| "Where is logic for Y?"     | Keywords in commands/queries/entities → event handlers → helpers → frontend stores      |
| "What happens when Z?"      | Identify trigger → trace handler chain → document side effects + error handling         |
| "Why does A behave like B?" | Find code path → identify decision points → check config/feature flags → document rules |

### Project Pattern Recognition

**Backend** (see `backend-patterns-reference.md`): CQRS commands/queries, entity event handlers, message bus consumers, repository extensions, validation fluent API, authorization attributes.

**Frontend** (see `frontend-patterns-reference.md`): store component base, store base, `effectSimple`/`tapResponse`, `observerLoadingErrorState`, API service base class.

## Evidence Collection

**MANDATORY:** Write analysis to `.ai/workspace/analysis/[feature-name]-investigation.md`. MUST ATTENTION re-read ENTIRE file before presenting findings. Structure: Metadata (original question) → Progress → File List → Knowledge Graph (per-file entries per SYNC:knowledge-graph-template) → Data Flow → Findings.

**Rule:** After every 10 files, MUST ATTENTION update progress and re-check alignment with original question.

### Analysis Phases

**Phase 2 — Comprehensive Analysis:** (1) Happy path, (2) Error paths, (3) Edge cases, (4) Authorization checks, (5) Validation per layer. Extract: core business rules, state transitions, side effects.

**Phase 3 — Synthesis:** Executive summary (1-para answer, top 5-10 key files, patterns used) + step-by-step walkthrough with `file:line` references + flow diagrams.

### Output Format

MUST ATTENTION include: (1) Direct answer (1-2 paragraphs), (2) Step-by-step "How It Works" with `file:line` refs, (3) Key Files table, (4) Data Flow diagram, (5) "Want to Know More?" subtopics.

### Guidelines

- **Evidence-based**: Every claim needs code evidence. MUST ATTENTION mark unverified as "inferred".
- **Question-focused**: ALWAYS tie findings back to original question.
- **Read-only**: NEVER suggest changes unless explicitly asked.
- **Layered**: Start simple, offer deeper detail on request.

### Graph Intelligence (MANDATORY when graph.db exists)

**MUST ATTENTION orchestrate grep -> graph -> grep dynamically:** (1) Grep key terms to find entry files, (2) Use `connections`/`batch-query`/`trace --direction both` to expand dependency network, (3) Grep again to verify content. The `trace` command follows ALL edge types including MESSAGE_BUS and TRIGGERS_EVENT.

```bash
python .claude/scripts/code_graph connections <file> --json     # Full picture
python .claude/scripts/code_graph query callers_of <name> --json
python .claude/scripts/code_graph query importers_of <file> --json
python .claude/scripts/code_graph query tests_for <name> --json
python .claude/scripts/code_graph batch-query <f1> <f2> --json
```

## Related Skills

`scout` (pre-discovery) | `feature` (implementation) | `debug-investigate` (debugging) | `graph-query` (natural language queries)

---

## Investigation & Recommendation Protocol

Applies when recommending code changes (removal, refactoring, replacement). MUST ATTENTION complete full validation chain.

### Validation Chain (NEVER skip steps)

**NEVER recommend code changes without completing ALL steps:**

1. Interface/API identified → 2. ALL implementations found → 3. ALL registrations traced → 4. ALL usage sites verified → 5. Cross-service impact (ALL services) → 6. Impact assessment → 7. Confidence declaration → **ONLY THEN** output recommendation.

**If ANY step incomplete → STOP.** State "Insufficient evidence to recommend."

### Breaking Change Risk Matrix

| Risk       | Criteria                                                      | Required Evidence                                              |
| ---------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| **HIGH**   | Removing registrations, deleting classes, changing interfaces | Full usage trace + impact + cross-service check (all services) |
| **MEDIUM** | Refactoring methods, changing signatures                      | Usage trace + test verification + cross-service check          |
| **LOW**    | Renaming variables, formatting, comments                      | Code review only                                               |

### Removal Checklist (ALL MUST ATTENTION pass)

- [ ] No static references (`grep -r "ClassName" --include="*.cs"` = 0)
- [ ] No string literals / dynamic invocations (reflection, factory, message bus)
- [ ] No DI registrations (`services.Add*<ClassName>`)
- [ ] No config references (appsettings, env vars)
- [ ] No test dependencies
- [ ] Cross-service impact checked (ALL microservices)

**Incomplete checklist → state:** `Confidence: <90% — did not verify [missing items]`

### Evidence Hierarchy

(1) Code evidence (grep/read) → (2) Test evidence → (3) Documentation → (4) Inference. Recommendations based on inference alone are FORBIDDEN — MUST ATTENTION upgrade to code evidence.

### Confidence Levels

**95-100%** full trace + all services | **80-94%** main paths verified | **60-79%** partially traced | **<60% DO NOT RECOMMEND**

**Format:** `Confidence: 85% — Verified main usage in ServiceC, did not check ServiceA/ServiceB`

### Service Comparison Pattern

Find working reference → compare implementations → identify differences → verify WHY each difference exists → recommend based on proven pattern, NEVER assumptions.

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
- **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:understand-code-first:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns and read code BEFORE any modification. Run graph trace when graph.db exists.
    <!-- /SYNC:understand-code-first:reminder -->
    <!-- SYNC:graph-assisted-investigation:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → graph trace → grep verify.
    <!-- /SYNC:graph-assisted-investigation:reminder -->
    <!-- SYNC:evidence-based-reasoning:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
    <!-- SYNC:knowledge-graph-template:reminder -->
- **MANDATORY IMPORTANT MUST ATTENTION** document per-file: type, pattern, symbols, dependencies, relevanceScore, evidenceLevel.
  <!-- /SYNC:knowledge-graph-template:reminder -->
  <!-- SYNC:fix-layer-accountability:reminder -->
- **IMPORTANT MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.
    <!-- /SYNC:fix-layer-accountability:reminder -->
