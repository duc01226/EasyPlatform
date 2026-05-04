---
name: mcp-management
description: '[AI & Tools] Manage Model Context Protocol (MCP) servers - discover, analyze, and execute tools/prompts/resources from configured MCP servers. Use when working with MCP integrations, need to discover available MCP capabilities, filter MCP tools for specific tasks, execute MCP tools programmatically, access MCP prompts/resources, or implement MCP client functionality. Supports intelligent tool selection, multi-server management, and context-efficient capability discovery.'
disable-model-invocation: true
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

## Quick Summary

**Goal:** Discover, analyze, and execute MCP tools/prompts/resources from configured servers without polluting main context.

**Workflow:**

1. **Config Management** — Use `.claude/.mcp.json`, symlink to `.gemini/settings.json` for Gemini CLI
2. **Capability Discovery** — `npx tsx scripts/cli.ts list-tools` saves to `assets/tools.json`
3. **Intelligent Selection** — LLM analyzes tools.json for task-relevant capabilities
4. **Execution** — Primary: Gemini CLI with stdin piping; Secondary: Direct scripts; Fallback: general-purpose subagent

**Key Rules:**

- **Gemini CLI Primary**: Use stdin piping (`echo "task" | gemini`), NOT `-p` flag (skips MCP init)
- **GEMINI.md Auto-Load**: Project root file enforces structured JSON responses from Gemini
- **Progressive Disclosure**: Load only needed capabilities, subagents handle discovery
- **Persistent Catalog**: list-tools saves complete schemas to assets/tools.json for fast reference

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# MCP Management

Skill for managing and interacting with Model Context Protocol (MCP) servers.

## Prerequisites

**⚠️ MUST ATTENTION READ** `references/configuration.md` and `references/gemini-cli-integration.md` before executing — contain MCP server configuration format, Gemini CLI setup, execution patterns, and troubleshooting required by Core Capabilities and Implementation Patterns sections below. For protocol internals, also **⚠️ MUST ATTENTION READ** `references/mcp-protocol.md`.

## Overview

MCP is an open protocol enabling AI agents to connect to external tools and data sources. This skill provides scripts and utilities to discover, analyze, and execute MCP capabilities from configured servers without polluting the main context window.

**Key Benefits**:

- Progressive disclosure of MCP capabilities (load only what's needed)
- Intelligent tool/prompt/resource selection based on task requirements
- Multi-server management from single config file
- Context-efficient: subagents handle MCP discovery and execution
- Persistent tool catalog: automatically saves discovered tools to JSON for fast reference

## When to Use This Skill

Use this skill when:

1. **Discovering MCP Capabilities**: Need to list available tools/prompts/resources from configured servers
2. **Task-Based Tool Selection**: Analyzing which MCP tools are relevant for a specific task
3. **Executing MCP Tools**: Calling MCP tools programmatically with proper parameter handling
4. **MCP Integration**: Building or debugging MCP client implementations
5. **Context Management**: Avoiding context pollution by delegating MCP operations to subagents

## Core Capabilities

### 1. Configuration Management

MCP servers configured in `.claude/.mcp.json`.

**Gemini CLI Integration** (recommended): Create symlink to `.gemini/settings.json`:

```bash
mkdir -p .gemini && ln -sf .claude/.mcp.json .gemini/settings.json
```

See [references/configuration.md](references/configuration.md) and [references/gemini-cli-integration.md](references/gemini-cli-integration.md).

**GEMINI.md Response Format**: Project root contains `GEMINI.md` that Gemini CLI auto-loads, enforcing structured JSON responses:

```json
{"server":"name","tool":"name","success":true,"result":<data>,"error":null}
```

This ensures parseable, consistent output instead of unpredictable natural language. The file defines:

- Mandatory JSON-only response format (no markdown, no explanations)
- Maximum 500 character responses
- Error handling structure
- Available MCP servers reference

**Benefits**: Programmatically parseable output, consistent error reporting, DRY configuration (format defined once), context-efficient (auto-loaded by Gemini CLI).

### 2. Capability Discovery

```bash
npx tsx scripts/cli.ts list-tools  # Saves to assets/tools.json
npx tsx scripts/cli.ts list-prompts
npx tsx scripts/cli.ts list-resources
```

Aggregates capabilities from multiple servers with server identification.

### 3. Intelligent Tool Analysis

LLM analyzes `assets/tools.json` directly - better than keyword matching algorithms.

### 4. Tool Execution

**Primary: Gemini CLI** (if available)

```bash
# IMPORTANT: Use stdin piping, NOT -p flag (deprecated, skips MCP init)
echo "Take a screenshot of https://example.com" | gemini -y -m gemini-2.5-flash
```

**Secondary: Direct Scripts**

```bash
npx tsx scripts/cli.ts call-tool memory create_entities '{"entities":[...]}'
```

**Fallback: General-Purpose Subagent**

See [references/gemini-cli-integration.md](references/gemini-cli-integration.md) for complete examples.

## Implementation Patterns

### Pattern 1: Gemini CLI Auto-Execution (Primary)

Use Gemini CLI for automatic tool discovery and execution. Gemini CLI auto-loads `GEMINI.md` from project root to enforce structured JSON responses.

**Quick Example**:

```bash
# IMPORTANT: Use stdin piping, NOT -p flag (deprecated, skips MCP init)
# Add "Return JSON only per GEMINI.md instructions" to enforce structured output
echo "Take a screenshot of https://example.com. Return JSON only per GEMINI.md instructions." | gemini -y -m gemini-2.5-flash
```

**Expected Output**:

```json
{ "server": "puppeteer", "tool": "screenshot", "success": true, "result": "screenshot.png", "error": null }
```

**Benefits**:

- Automatic tool discovery
- Structured JSON responses (parseable by Claude)
- GEMINI.md auto-loaded for consistent formatting
- Faster than subagent orchestration
- No natural language ambiguity

See [references/gemini-cli-integration.md](references/gemini-cli-integration.md) for complete guide.

### Pattern 2: Subagent-Based Execution (Fallback)

Use `general-purpose` agent when Gemini CLI unavailable. Subagent discovers tools, selects relevant ones, executes tasks, reports back.

**Benefit**: Main context stays clean, only relevant tool definitions loaded when needed.

### Pattern 3: LLM-Driven Tool Selection

LLM reads `assets/tools.json`, intelligently selects relevant tools using context understanding, synonyms, and intent recognition.

### Pattern 4: Multi-Server Orchestration

Coordinate tools across multiple servers. Each tool knows its source server for proper routing.

## Scripts Reference

### scripts/mcp-client.ts

Core MCP client manager class. Handles:

- Config loading from `.claude/.mcp.json`
- Connecting to multiple MCP servers
- Listing tools/prompts/resources across all servers
- Executing tools with proper error handling
- Connection lifecycle management

### scripts/cli.ts

Command-line interface for MCP operations. Commands:

- `list-tools` - Display all tools and save to `assets/tools.json`
- `list-prompts` - Display all prompts
- `list-resources` - Display all resources
- `call-tool <server> <tool> <json>` - Execute a tool

**Note**: `list-tools` persists complete tool catalog to `assets/tools.json` with full schemas for fast reference, offline browsing, and version control.

## Quick Start

**Method 1: Gemini CLI** (recommended)

```bash
npm install -g gemini-cli
mkdir -p .gemini && ln -sf .claude/.mcp.json .gemini/settings.json
# IMPORTANT: Use stdin piping, NOT -p flag (deprecated, skips MCP init)
# GEMINI.md auto-loads to enforce JSON responses
echo "Take a screenshot of https://example.com. Return JSON only per GEMINI.md instructions." | gemini -y -m gemini-2.5-flash
```

Returns structured JSON: `{"server":"puppeteer","tool":"screenshot","success":true,"result":"screenshot.png","error":null}`

**Method 2: Scripts**

```bash
cd .claude/skills/mcp-management/scripts && npm install
npx tsx cli.ts list-tools  # Saves to assets/tools.json
npx tsx cli.ts call-tool memory create_entities '{"entities":[...]}'
```

**Method 3: General-Purpose Subagent**

See [references/gemini-cli-integration.md](references/gemini-cli-integration.md) for complete guide.

## Technical Details

See [references/mcp-protocol.md](references/mcp-protocol.md) for:

- JSON-RPC protocol details
- Message types and formats
- Error codes and handling
- Transport mechanisms (stdio, HTTP+SSE)
- Best practices

## Integration Strategy

### Execution Priority

1. **Gemini CLI** (Primary): Fast, automatic, intelligent tool selection
    - Check: `command -v gemini`
    - Execute: `echo "<task>" | gemini -y -m gemini-2.5-flash`
    - **IMPORTANT**: Use stdin piping, NOT `-p` flag (deprecated, skips MCP init)
    - Best for: All tasks when available

2. **Direct CLI Scripts** (Secondary): Manual tool specification
    - Use when: Need specific tool/server control
    - Execute: `npx tsx scripts/cli.ts call-tool <server> <tool> <args>`

3. **General-Purpose Subagent** (Fallback): Context-efficient delegation
    - Use when: Gemini unavailable or failed
    - Keeps main context clean

### Integration with Agents

The `general-purpose` agent uses this skill to:

- Check Gemini CLI availability first
- Execute via `gemini` command if available
- Fallback to direct script execution
- Discover MCP capabilities without loading into main context
- Report results back to main agent

This keeps main agent context clean and enables efficient MCP integration.

## Related

- `mcp-builder`
- `claude-code`

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
**IMPORTANT MUST ATTENTION** READ `references/configuration.md` before starting
**IMPORTANT MUST ATTENTION** READ `references/mcp-protocol.md` before starting

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
