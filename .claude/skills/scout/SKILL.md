---
name: scout
version: 1.0.0
description: "[Investigation] Fast codebase file discovery for task-related files. Use when quickly locating relevant files across a large codebase, beginning work on features spanning multiple directories, or before making changes that might affect multiple parts. Triggers on "find files", "locate", "scout", "search codebase", "what files"."

allowed-tools: Glob, Grep, Read, Bash, Task, TaskCreate
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

> **Rationalization Prevention** — AI consistently skips steps via: "too simple for a plan", "I'll test after", "already searched", "code is self-explanatory". These are EVASIONS — not valid reasons. Plan anyway. Test first. Show grep evidence with file:line. Never combine steps to "save time".
> MUST READ `.claude/skills/shared/rationalization-prevention-protocol.md` for full protocol and checklists.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Fast, parallel codebase file discovery to locate all files relevant to a task.

**Workflow:**

1. **Analyze Request** — Extract entity names, feature keywords, file types from prompt
2. **Parallel Search** — Spawn 3 agents searching backend core, backend infra, and frontend paths
3. **Graph Expand (MANDATORY — DO NOT SKIP)** — **YOU MUST** run `/graph-query` on 2-3 key files found in Step 2. This is NOT optional. Graph reveals the complete dependency network that grep alone CANNOT find. Use `/graph-connect-api` for frontend↔backend API tracing. Without this step, investigation results are incomplete.
4. **Synthesize** — Combine grep + graph results into numbered, prioritized file list with suggested starting points

**Key Rules:**

- Speed over depth -- return file paths only, no content analysis
- Target 3-5 minutes total completion time
- 3-minute timeout per agent; skip agents that don't return in time

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Scout - Fast Codebase File Discovery

Fast codebase search to locate files needed for a task. Token-efficient, parallel execution.

**KEY PRINCIPLE**: Speed over depth. Return file paths only - no content analysis. Target 3-5 minutes total.

---

## When to Use

- Quickly locating relevant files across a large codebase
- Beginning work on features spanning multiple directories
- Before making changes that might affect multiple parts
- Mapping file landscape before investigation or implementation
- Finding all files related to an entity, feature, or keyword

**NOT for**: Deep code analysis (use `feature-investigation`), debugging (use `debug`), or implementation (use `feature-implementation`).

> **UI Work Detected?** If the task involves updating UI, fixing UI, or finding a component from a screenshot/image, activate `visual-component-finder` skill FIRST before scouting. It uses a pre-built component index for fast visual-to-code matching.

---

## Quick Reference

| Input               | Description                                         |
| ------------------- | --------------------------------------------------- |
| `USER_PROMPT`       | What to search for (entity names, feature keywords) |
| `SCALE`             | Number of parallel agents (default: 3)              |
| `REPORT_OUTPUT_DIR` | Use `Report:` path from `## Naming` section         |

---

## Workflow

### Step 1: Analyze Search Request

Extract keywords from USER_PROMPT to identify:

- Entity names (e.g., User, Customer, Order)
- Feature names (e.g., authentication, notification)
- File types needed (backend, frontend, or both)

### Step 2: Execute Parallel Search

Spawn SCALE number of `scout` subagents in parallel using Agent tool (`subagent_type: "scout"`).

**WHY `scout` not `Explore`:** Custom `scout` agents read `.claude/agents/scout.md` which includes graph CLI knowledge and Bash access. Built-in `Explore` agents have NO graph awareness.

#### Agent Distribution Strategy

- **Agent 1 - Backend Core**: `src/Services/*/Domain/`, `src/Services/*/UseCaseCommands/`, `src/Services/*/UseCaseQueries/`
- **Agent 2 - Backend Infra**: `src/Services/*/UseCaseEvents/`, `src/Services/*/Controllers/`, `src/Services/*/BackgroundJobs/`
- **Agent 3 - Frontend**: `{frontend-apps-dir}/`, `{frontend-libs-dir}/{domain-lib}/`, `{frontend-libs-dir}/{common-lib}/`

#### Agent Instructions

- **Timeout**: 3 minutes per agent
- Skip agents that don't return within timeout
- Use Glob for file patterns, Grep for content search, Bash for graph CLI
- Return only file paths, no content

### Step 3: Graph Expand (MANDATORY — DO NOT SKIP)

**YOU (the main agent) MUST run these graph commands YOURSELF after sub-agents return.** This step is NOT optional — without graph, results are incomplete. Sub-agents cannot use graph — only you can.

```bash
# Check graph exists
ls .code-graph/graph.db 2>/dev/null && echo "GRAPH_AVAILABLE" || echo "NO_GRAPH"
```

If GRAPH_AVAILABLE, pick 2-3 key files from sub-agent results (entities, commands, bus messages) and run:

```bash
# Get full dependency network of a key file
python .claude/scripts/code_graph connections <key_file> --json

# Find ALL callers of a key command/handler
python .claude/scripts/code_graph query callers_of <FunctionName> --json

# Find ALL importers of a bus message class
python .claude/scripts/code_graph query importers_of <file_path> --json

# Batch query multiple files at once
python .claude/scripts/code_graph batch-query <file1> <file2> <file3> --json

# If graph returns "ambiguous" — search to disambiguate, then retry with qualified name
python .claude/scripts/code_graph search <keyword> --kind Function --json

# Find shortest path between two nodes (trace how A connects to B)
python .claude/scripts/code_graph find-path <source_qn> <target_qn> --json

# Filter results by service and limit count
python .claude/scripts/code_graph query callers_of <name> --limit 5 --filter "ServiceName" --json
```

Merge graph results with sub-agent grep results. Graph discovers files that grep missed (structural relationships).

### Step 4: Synthesize Results

Combine grep + graph results into a **numbered, prioritized file list** (see Results Format below).

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

> > **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding. Pattern: Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details. Use `connections` for 1-hop, `callers_of`/`tests_for` for specific queries, `batch-query` for multiple files.
> > MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.

If `.code-graph/graph.db` exists, **orchestrate grep ↔ graph ↔ glob** to find files faster:

### Grep-First Discovery (When Query is Semantic)

When the user's prompt describes a behavior or flow (not a specific file), use Grep/Glob/Search FIRST to discover entry point files before using graph tools:

1. Grep for key terms from the user's query (class names, commands, handlers, endpoints)
2. Use discovered files as input to `connections`, `batch-query`, or `trace` commands
3. Use `trace --direction both` on middle files (controllers, commands) to see full upstream + downstream flow

### After grep/glob finds entry files, use graph to expand the network:

```bash
# Check graph exists
ls .code-graph/graph.db 2>/dev/null && echo "AVAILABLE" || echo "MISSING"

# Full picture of a key file (callers + importers + tests in one call)
python .claude/scripts/code_graph connections <file> --json

# Find all callers of a function/command (e.g., after finding a handler)
python .claude/scripts/code_graph query callers_of <name> --json

# Find all importers of a module/entity (e.g., after finding a BusMessage)
python .claude/scripts/code_graph query importers_of <file> --json

# Batch query multiple files at once (most efficient)
python .claude/scripts/code_graph batch-query <f1> <f2> <f3> --json
```

**Key:** Graph results get HIGHER priority than grep (structural relationships > text matches). After graph expansion, grep again to verify content in discovered files.

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

## Report Output

Use naming pattern: `plans/reports/scout-{date}-{slug}.md`

**Output Standards:**

- Sacrifice grammar for concision
- List unresolved questions at end
- Always provide numbered file list with priority ordering

---

## See Also

- `feature-investigation` skill - Deep analysis of discovered files
- `feature-implementation` skill - Implementing features after scouting
- `planning` skill - Creating implementation plans from scouted files

---

## Workflow Recommendation

> **IMPORTANT MUST:** If you are NOT already in a workflow, use `AskUserQuestion` to ask the user:
>
> 1. **Activate `investigation` workflow** (Recommended) — scout → investigate
> 2. **Execute `/scout` directly** — run this skill standalone

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/investigate (Recommended)"** — Deep-dive into discovered files to understand logic and relationships
- **"/plan"** — If scouted files are sufficient to start planning implementation
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
