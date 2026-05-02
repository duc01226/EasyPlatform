---
name: scout
version: 1.1.0
description: '[Investigation] Fast codebase file discovery for task-related files. Use when quickly locating relevant files across a large codebase, beginning work on features spanning multiple directories, or before making changes that might affect multiple parts. Triggers on "find files", "locate", "scout", "search codebase", "what files".'
execution-mode: subagent
context-budget: medium
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

<!-- SYNC:rationalization-prevention -->

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

<!-- /SYNC:rationalization-prevention -->

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

> **External Memory:** Complex/lengthy work → write findings incrementally to `plans/reports/`. Prevents context loss.

> **Evidence Gate:** MANDATORY MUST ATTENTION — every claim, finding, recommendation requires `file:line` proof with confidence % (>80% act, <80% verify first).

## Quick Summary

**Goal:** Fast, parallel codebase file discovery to locate all files relevant to a task.

**Workflow:**

1. **Phase 0: Classify** — Detect search scope (backend/frontend/both) + keyword type
2. **Analyze Request** — Extract entity names, feature keywords, file types from prompt
3. **Parallel Search** — Spawn agents searching backend core, backend infra, frontend paths
4. **Graph Expand (MANDATORY — DO NOT SKIP)** — **MUST ATTENTION** run graph commands on 2-3 key files. Graph reveals complete dependency network grep CANNOT find.
5. **Low-Result Check** — If <5 files returned, re-examine keywords and run second pass
6. **Synthesize** — Combine grep + graph into numbered, prioritized file list

**Key Rules:**

- Speed over depth — return file paths only, no content analysis
- Target 3-5 minutes total; 3-minute timeout per agent
- NEVER skip graph expansion when `.code-graph/graph.db` exists

# Scout — Fast Codebase File Discovery

---

## Phase 0: Classify Search Scope

**Before spawning agents**, classify the request:

| Scope         | Detection                                     | Agent Strategy           |
| ------------- | --------------------------------------------- | ------------------------ |
| Backend-only  | C# class names, domain entities, API handlers | Agents 1+2, skip Agent 3 |
| Frontend-only | Component names, TypeScript, Angular features | Agent 3 only             |
| Full-stack    | Feature name spanning both layers             | All 3 agents             |
| Unknown       | Ambiguous prompt                              | Default to all 3 agents  |

**Think:** Does prompt mention a specific layer? Does entity exist in backend, frontend, or both? Adjust agent count — avoid spawning unnecessary agents.

---

## When to Use

- Quickly locating relevant files across large codebase
- Beginning work on features spanning multiple directories
- Before changes affecting multiple parts
- Mapping file landscape before investigation or implementation

**NOT for:** Deep code analysis (→ `feature-investigation`), debugging (→ `debug-investigate`), implementation (→ `feature-implementation`).

---

## Workflow

### Step 1: Analyze Search Request

Extract from USER_PROMPT:

- Entity names (User, Customer, Order)
- Feature names (authentication, notification)
- File types needed (backend, frontend, or both)

### Step 2: Execute Parallel Search

Spawn SCALE number of `scout` subagents in parallel via Agent tool (`subagent_type: "scout"`).

**WHY `scout` not `Explore`:** Custom `scout` agents read `.claude/agents/scout.md` — includes graph CLI knowledge + Bash access. Built-in `Explore` agents have NO graph awareness.

#### Agent Distribution

- **Agent 1 - Backend Core**: `src/Services/*/Domain/`, `src/Services/*/UseCaseCommands/`, `src/Services/*/UseCaseQueries/`
- **Agent 2 - Backend Infra**: `src/Services/*/UseCaseEvents/`, `src/Services/*/Controllers/`, `src/Services/*/BackgroundJobs/`
- **Agent 3 - Frontend**: `{frontend-apps-dir}/`, `{frontend-libs-dir}/{domain-lib}/`, `{frontend-libs-dir}/{common-lib}/`

Per agent: 3-minute timeout. Return file paths only — no content analysis. Use Glob (patterns), Grep (content), Bash (graph CLI).

### Step 3: Graph Expand (MANDATORY — DO NOT SKIP)

**YOU (main agent) MUST ATTENTION run graph commands YOURSELF after sub-agents return.** NOT optional — without graph, results are incomplete. Sub-agents cannot use graph — only main agent can.

```bash
# Check graph exists
ls .code-graph/graph.db 2>/dev/null && echo "GRAPH_AVAILABLE" || echo "NO_GRAPH"
```

If GRAPH_AVAILABLE, pick 2-3 key files from sub-agent results (entities, commands, bus messages):

```bash
# Full dependency network of key file
python .claude/scripts/code_graph connections <key_file> --json

# All callers of key command/handler
python .claude/scripts/code_graph query callers_of <FunctionName> --json

# All importers of bus message class
python .claude/scripts/code_graph query importers_of <file_path> --json

# Batch query multiple files (most efficient)
python .claude/scripts/code_graph batch-query <file1> <file2> <file3> --json

# If graph returns "ambiguous" — disambiguate first
python .claude/scripts/code_graph search <keyword> --kind Function --json

# Trace shortest path between two nodes
python .claude/scripts/code_graph find-path <source_qn> <target_qn> --json

# Filter by service, limit results
python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
```

**Grep-First Discovery (semantic queries):** When prompt describes behavior/flow (not specific file), grep key terms FIRST to discover entry files, then use those as graph input:

1. Grep class names, commands, handlers, endpoints
2. Use discovered files as input to `connections`, `batch-query`, or `trace`
3. Use `trace --direction both` on middle files (controllers, commands) for full upstream + downstream

Graph results get HIGHER priority than grep — structural relationships > text matches. After graph expansion, grep again to verify content in discovered files.

### Step 4: Low-Result Check

If total files found <5 after Steps 2-3:

1. Re-examine keywords — too specific? Try broader synonyms
2. Spawn second scout agent with alternate search terms
3. Try `python .claude/scripts/code_graph search <keyword> --json` to find nodes by name

### Step 5: Synthesize Results

Combine grep + graph into numbered, prioritized file list (see Results Format).

---

## Search Patterns by Priority

```
# HIGH PRIORITY - Core Logic
**/Domain/Entities/**/*{keyword}*.cs
**/UseCaseCommands/**/*{keyword}*.cs
**/UseCaseQueries/**/*{keyword}*.cs
**/UseCaseEvents/**/*{keyword}*.cs
**/*{keyword}*.component.ts
**/*{keyword}*.store.ts

# MEDIUM PRIORITY - Infrastructure
**/Controllers/**/*{keyword}*.cs
**/BackgroundJobs/**/*{keyword}*.cs
**/*Consumer*{keyword}*.cs
**/*{keyword}*-api.service.ts

# LOW PRIORITY - Supporting
**/*{keyword}*Helper*.cs
**/*{keyword}*Service*.cs
**/*{keyword}*.html
```

---

## Graph Intelligence (MANDATORY when graph.db exists)

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

## Results Format

```markdown
## Scout Results: {USER_PROMPT}

### High Priority - Core Logic

1. `src/Services/{Service}/Domain/Entities/{Entity}.cs`
2. `src/Services/{Service}/UseCaseCommands/{Feature}/Save{Entity}Command.cs`
   ...

### Medium Priority - Infrastructure

10. `src/Services/{Service}/Controllers/{Entity}Controller.cs`
11. `src/Services/{Service}/UseCaseEvents/{Feature}/SendNotificationOn{Entity}CreatedEventHandler.cs`
    ...

### Low Priority - Supporting

20. `src/Services/{Service}/Helpers/{Entity}Helper.cs`
    ...

### Frontend Files

30. `{frontend-libs-dir}/{domain-lib}/src/lib/{feature}/{feature}-list.component.ts`
    ...

**Total Files Found:** {count}
**Search Completed In:** {time}

### Suggested Starting Points

1. `{most relevant file}` - {reason}
2. `{second most relevant}` - {reason}

### Unresolved Questions

- {any questions that need clarification}
```

---

## Quality Standards

| Standard       | Expectation                            |
| -------------- | -------------------------------------- |
| **Speed**      | Complete in 3-5 minutes                |
| **Accuracy**   | Return only relevant files             |
| **Coverage**   | Search all likely directories          |
| **Efficiency** | Minimize tool calls                    |
| **Structure**  | Always use numbered, prioritized lists |

---

## Workflow Recommendation

> **MANDATORY MUST ATTENTION — NO EXCEPTIONS:** If NOT already in workflow, MUST ATTENTION use `AskUserQuestion` to ask user:
>
> 1. **Activate `investigation` workflow** (Recommended) — scout → investigate
> 2. **Execute `/scout` directly** — run this skill standalone

---

## Next Steps

**MANDATORY MUST ATTENTION — NO EXCEPTIONS** after completing, MUST ATTENTION use `AskUserQuestion` to present:

- **"/investigate (Recommended)"** — Deep-dive into discovered files
- **"/plan"** — If scouted files sufficient to start planning
- **"Skip, continue manually"** — user decides

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:rationalization-prevention:reminder -->

**MUST ATTENTION** never skip steps via evasions. Plan anyway. Test first. Show grep evidence with `file:line`.

<!-- /SYNC:rationalization-prevention:reminder -->
<!-- SYNC:graph-assisted-investigation:reminder -->

**MUST ATTENTION** run at least ONE graph command on key files before concluding when `.code-graph/graph.db` exists.

<!-- /SYNC:graph-assisted-investigation:reminder -->
<!-- SYNC:fix-layer-accountability:reminder -->

**MUST ATTENTION** trace full data flow and fix at the owning layer, not the crash site. Audit all access sites before adding `?.`.

<!-- /SYNC:fix-layer-accountability:reminder -->
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

**MUST ATTENTION** run Phase 0 classification BEFORE spawning agents — scope determines agent count
**MUST ATTENTION** graph expand is NOT optional — run at least ONE graph command on key files when `.code-graph/graph.db` exists
**MUST ATTENTION** if <5 files found, re-check keywords and run second pass with alternates
**MUST ATTENTION** use `AskUserQuestion` after completing — NEVER auto-proceed to next step
**MUST ATTENTION** break work into `TaskCreate` tasks BEFORE starting
**MUST ATTENTION** write incremental findings to `plans/reports/` — NEVER hold all results in memory
**MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = DO NOT recommend.

**Anti-Rationalization:**

| Evasion                                | Rebuttal                                                   |
| -------------------------------------- | ---------------------------------------------------------- |
| "Graph step too slow, skip it"         | Graph finds what 50 greps miss. NEVER skip.                |
| "Only 2 files, no need for report"     | Incremental write costs nothing. Skip = context loss risk. |
| "Scope obvious, skip Phase 0"          | Wrong agent set = missed files. Always classify first.     |
| "Already searched, results complete"   | Show grep + graph evidence. No proof = incomplete.         |
| "Simple scout, skip workflow question" | User decides scope. NEVER assume standalone is acceptable. |

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
