---
name: graph-query
description: '[Code Intelligence] Use when you need to query code relationships and connections using the structural knowledge graph.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

## Quick Summary

**Goal:** [Code Intelligence] Query code relationships and connections using the structural knowledge graph. Show related files, callers, callees, imports, tests, inheritance, and file structure. Requires graph to be built first via $graph-build. Triggers on "who calls", "what imports", "related files", "connections of", "depends on", "tests for", "inherits from", "file structure", "graph query".

**Workflow:**

1. **Detect** — classify request scope and target artifacts.
2. **Execute** — apply required steps with evidence-backed actions.
3. **Verify** — confirm constraints, output quality, and completion evidence.

**Key Rules:**

- MUST ATTENTION keep claims evidence-based (`file:line`) with confidence >80% to act.
- MUST ATTENTION keep task tracking updated as each step starts/completes.
- NEVER skip mandatory workflow or skill gates.

## Prerequisites

1. **Graph must exist** -- check `.code-graph/graph.db`. If missing, tell user to run `$graph-build` first.
2. Requires Python 3.10+ with tree-sitter, tree-sitter-language-pack, networkx.

## Intent Mapping

Map user's question to the appropriate query pattern(s):

| User asks...                                                   | Pattern(s) / Command                   |
| -------------------------------------------------------------- | -------------------------------------- |
| "who/what calls X", "callers of X"                             | `callers_of`                           |
| "what does X call", "callees of X"                             | `callees_of`                           |
| "what does X import", "X depends on", "deps of X"              | `imports_of`                           |
| "who/what imports X", "importers of X", "who references X"     | `importers_of`                         |
| "who uses X", "what uses X", "reverse deps of X"               | `importers_of`                         |
| "what's inside X", "structure of X", "contents"                | `file_summary` (files) / `children_of` |
| "what tests cover X", "tests for X"                            | `tests_for`                            |
| "who inherits/extends X", "subclasses of X"                    | `inheritors_of`                        |
| "show all connections/related files of X", "graph connections" | `connections` command (see below)      |

For composite queries ("show all connections", "related files", "full picture"), use the **`connections`** command instead of running multiple queries manually.

## Workflow

### Step 1: Check graph exists

```bash
ls .code-graph/graph.db 2>/dev/null && echo "OK" || echo "MISSING"
```

If MISSING: stop and tell user to run `$graph-build`.

### Step 2: Identify target

Extract the target from user's question (file path, function name, or class name).

- For files: use relative path (e.g., `{source-root}/utils`)
- For functions/classes: use the name (e.g., `validateInput`) or qualified name (e.g., `{source-root}/utils::validateInput`)

### Step 3: Run query

Execute via Bash with `--json` flag:

```bash
python .claude/scripts/code_graph query <pattern> <target> --json
```

For composite "show all connections" queries, use the **`connections`** command instead:

```bash
python .claude/scripts/code_graph connections <target> --json
```

This returns `file_summary`, `imports_of`, `importers_of`, `callers_of`, and `tests_for` in one call (capped at 20 results per section).

**Tip:** Add `--node-mode file` to `query`, `connections`, or `trace` for a file-level overview with 10-30x less noise. Options: `file`, `function`, `class`, `all` (default).

### Step 4: Handle response status

- **`status: "ok"`** -- Parse `results[]` and `edges[]`, format report (Step 5)
- **`status: "ambiguous"`** -- Multiple matches found. Show `candidates[]` list and ask user to pick one using a direct user question
- **`status: "not_found"`** -- No match. Suggest: check spelling, use relative file path, try a different name. Optionally run `file_summary` on the parent file to show available names.
- **`status: "error"`** -- Show error message. Common: graph.db missing, Python version too old.

### Step 5: Format results

Present results grouped by relationship type. For each result show:

- **Name** and **kind** (function, class, method)
- **File path** with line numbers (`file:line_start-line_end`)
- **Relationship** (calls, imports, tests, inherits)

**Single query output format:**

```
## {Pattern Description} for `{target}`

Found {N} result(s).

| Name | Kind | File | Lines |
|------|------|------|-------|
| ... | function | {source-root}/file | 10-25 |
```

**Composite query output format:**

```
## Connections of `{target}`

### File Summary
{N} nodes: {list functions/classes}

### Imports (outgoing)
{What this file/module imports}

### Importers (incoming)
{Who imports this file/module}

### Callers
{Functions that call functions in this file}

### Test Coverage
{Tests covering functions in this file}
```

## Semantic Query Protocol (When User Query is Not File-Specific)

When the user asks about a FLOW or BEHAVIOR (not a specific file), follow this protocol:

### Step 0: Grep/Glob/Search to find trace anchors

Use Grep/Glob/Search to find key classes/functions related to the user's query.

- Bug/failure symptom: find the final output reader first (renderer, query, assertion, aggregate, log, stored field), then trace upstream.
- Feature-flow question: find entry points (`CreateX`, `XCommand`, `XHandler`) and trace both directions.

### Step 1: Use graph to expand

Run `connections` or `batch-query` on the grep-discovered files to find ALL related files. For bugs, group results by final reader, storage/projection, writer, consumer/job, and producer/origin.

### Step 2: Trace full system flow

Run the `trace` command to follow the complete chain through all edge types:

```bash
python .claude/scripts/code_graph trace <entry-file> --direction both --depth 3 --json
```

This traces upstream (who calls this?) AND downstream (what does this trigger?) through:
CALLS → TRIGGERS_EVENT → PRODUCES_EVENT → MESSAGE_BUS → API_ENDPOINT

For bug/failure symptoms, run an upstream-first pass from the final output before expanding the suspected producer:

```bash
python .claude/scripts/code_graph trace <final-reader-or-output-file> --direction upstream --depth 5 --json
python .claude/scripts/code_graph batch-query <final-reader> <writer> <producer> --json
```

### Step 3: Verify with grep

For any graph edge that seems surprising, verify with grep that the connection is real.

## Available Query Patterns

| Pattern         | Description                              | Edge Kind             |
| --------------- | ---------------------------------------- | --------------------- |
| `callers_of`    | Functions that call the target function  | CALLS                 |
| `callees_of`    | Functions called by the target function  | CALLS                 |
| `imports_of`    | What the target file/module imports      | IMPORTS_FROM          |
| `importers_of`  | Files that import the target file/module | IMPORTS_FROM          |
| `children_of`   | Nodes contained in a file or class       | CONTAINS              |
| `tests_for`     | Tests covering the target function/class | TESTED_BY + naming    |
| `inheritors_of` | Classes inheriting from the target class | INHERITS / IMPLEMENTS |
| `file_summary`  | All nodes (functions, classes) in a file | (direct lookup)       |
| `trace`         | Full system flow from a target node      | All edge types (BFS)  |

**Aliases** (natural language mappings):

| Alias           | Resolves to     |
| --------------- | --------------- |
| `references_of` | `importers_of`  |
| `uses_of`       | `callers_of`    |
| `who_calls`     | `callers_of`    |
| `who_imports`   | `importers_of`  |
| `depends_on`    | `imports_of`    |
| `subclasses_of` | `inheritors_of` |
| `extends`       | `inheritors_of` |

## Search (Find Nodes by Keyword)

When you don't know the exact name, search first to find candidates:

```bash
python .claude/scripts/code_graph search <keyword> --json
python .claude/scripts/code_graph search <keyword> --kind Function --json
python .claude/scripts/code_graph search <keyword> --kind Class --limit 5 --json
```

Use search to **disambiguate** when a query returns `status: "ambiguous"` — narrow results by `--kind` (Function, Class, File, Type, Test) then use the full qualified_name.

## Find Path (Shortest Path Between Nodes)

Discover how two nodes are connected through the dependency graph:

```bash
python .claude/scripts/code_graph find-path <source> <target> --json
```

Returns the shortest path as a list of nodes. Useful for tracing how a command reaches an event handler, or how a frontend component connects to a backend entity.

**Tip:** If ambiguous, search for exact qualified names first, then use those in find-path.

## Query Filtering and Limiting

Control result size for large codebases:

```bash
# Limit results
python .claude/scripts/code_graph query callers_of <target> --limit 5 --json

# Filter by file path regex
python .claude/scripts/code_graph query importers_of <target> --filter "ServiceName" --json

# Limit connections per section
python .claude/scripts/code_graph connections <target> --limit 10 --json
```

**Implicit connection edge types** (created by `connect-implicit`):

| Edge Kind                | Meaning                                     |
| ------------------------ | ------------------------------------------- |
| `TRIGGERS_EVENT`         | Entity CRUD triggers event handler          |
| `PRODUCES_EVENT`         | Event handler triggers bus message producer |
| `MESSAGE_BUS`            | Message bus producer to consumer            |
| `TRIGGERS_COMMAND_EVENT` | Command triggers command event handler      |

## Batch Query (Multiple Files)

When reviewing multiple files, use batch mode for deduplicated results:

```bash
python .claude/scripts/code_graph batch-query file1 file2 file3 --json
```

Returns: deduplicated nodes + edges (internal + 1-hop external) across all queried files. Single DB connection, no duplicate data.

## Trace (Full System Flow)

Trace all connections from a target node through multiple edge types using BFS:

```bash
python .claude/scripts/code_graph trace <target> --json
python .claude/scripts/code_graph trace <target> --direction both --json
python .claude/scripts/code_graph trace <target> --direction upstream --depth 2 --json
python .claude/scripts/code_graph trace <target> --edge-kinds CALLS,MESSAGE_BUS --json
python .claude/scripts/code_graph trace <target> --direction both --node-mode file --json  # file-level overview
```

Direction options:

- `downstream` (default): Follow outgoing edges. "What happens after X?"
- `upstream`: Follow incoming edges. "What calls/triggers X?"
- `both`: Both directions. "Full flow through X" — use when entry point is a middle file (controller, command handler)

Returns a multi-level tree of connected nodes grouped by BFS depth, with edge types at each level.

## Post-Grep Trace Trigger (run a trace after grep surfaces a key file)

When a grep/glob surfaces an important entry-point file — an entity, command, query, event/command handler, controller, bus message/consumer, component, store, or api-service — immediately run a graph trace on it before concluding. Grep finds files; the trace reveals callers, consumers, bus messages, event chains, and tests that grep CANNOT find:

```bash
python .claude/scripts/code_graph trace <key-entry-file> --direction both --json
```

**Pattern: grep finds files → graph trace reveals full system flow → grep verifies specific details.**

## Anti-Patterns

- **Don't rebuild graph** -- use `$graph-build` for that. This skill only queries.
- **Don't use for change-driven analysis** -- use `$graph-blast-radius` for git-diff-based impact.
- **Don't use for bulk export** -- use `$graph-export` for full graph dump.
- **Don't use for diagrams** -- use `$graph-export --format=mermaid` for Mermaid visualization.
- **Always use `--json` flag** -- ensures structured parseable output.

## Related Skills

- `$graph-build` -- Build or update the graph (prerequisite)
- `$graph-blast-radius` -- Change-driven impact analysis from git diff
- `$graph-export` -- Export full graph to JSON (`--format=json`) or a single file as a Mermaid diagram (`--format=mermaid`)

---

# Graph Query

Query code relationships using the structural knowledge graph. Maps natural language questions to graph CLI queries and formats structured reports.

<!-- SYNC:end-to-start-debugger-trace -->

> **End-to-Start Debugger Trace** — For non-trivial bugs, failed verification, regression fixes, behavior-changing code, or unclear code flow, start from the observed final state and walk backward before proposing a fix.
>
> 1. **Frame 0: observed end state** — Name the exact user-visible output, failing assertion, log line, persisted value, API response, rendered UI, or aggregate bucket. Record the reader/query/renderer that produced it with `file:line` evidence.
> 2. **Walk backward one hop at a time** — Trace final reader -> projection/cache/storage -> writer -> consumer/handler/job -> producer/caller -> original trigger. At every hop record: input, transformation, output, owner, and evidence.
> 3. **Enumerate all feeder paths** — Find every upstream producer/caller/event/job that can write into the final path, including retry, async, cache, background, and alternate UI/API paths. Mark each path verified, ruled out, or still unknown.
> 4. **Build the hypothesis matrix** — For each plausible cause, list evidence for, evidence against, how to reproduce/verify, blast radius, and status (`primary`, `contributing`, `ruled out`, `latent`). Do not fix until competing causes are explicitly resolved or bounded.
> 5. **Choose the owning fix layer** — Identify the invariant owner and the lowest shared point that protects all downstream consumers. A fix at the symptom site is rejected unless the symptom site owns the invariant.
> 6. **Prove convergence forward** — After choosing the fix, walk start -> end again and show how the corrected state reaches the observed final output. Map each root cause to a fix part and each fix part to a test/proof.
>
> **BLOCKED until:** final state named · backward trace written · all feeder paths enumerated · hypothesis matrix completed · owning fix layer justified · forward convergence proof mapped to tests.
>
> **NEVER:** Start at the first suspicious code path. Collapse multiple producers into one "flow". Treat duplicate symptoms as duplicate records without proving the read model. Skip ruled-out hypotheses.

<!-- /SYNC:end-to-start-debugger-trace -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** debugger trace gate: for non-trivial bug/fix/investigation/review work, start at the observed final output and trace backward through reader -> storage/projection -> writer -> consumer/job -> producer/trigger. Enumerate all feeder paths and hypotheses before fixing. **BLOCKED until** trace, hypothesis matrix, owning fix layer, and forward convergence proof exist.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **End-To-Start Debugger Trace:** start at observed final output, trace backward, hypothesis matrix before fixing.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** every claim needs traced `file:line` proof, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
