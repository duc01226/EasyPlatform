---
name: memory-management
description: '[Utilities] Use when saving or retrieving important patterns, decisions, and learnings across sessions. Also use for external memory checkpoints during long-running tasks to prevent context loss. Triggers on keywords like "remember", "save pattern", "recall", "memory", "persist", "knowledge base", "learnings", "checkpoint", "save context", "preserve progress".'
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

**Goal:** Persist patterns, decisions, and task progress across sessions using two complementary memory systems.

**Workflow:**

1. **File Checkpoints** — Save task-specific context to `plans/reports/checkpoint-*.md` every 30-60 min
2. **MCP Memory Graph** — Store reusable knowledge (patterns, decisions, bug fixes) as typed entities with relations
3. **Recovery** — On context loss, find latest checkpoint via Glob, read it, resume from documented next steps

**Key Rules:**

- Use file checkpoints for task-specific progress; MCP memory for cross-session knowledge
- Create checkpoints before expected context compaction and at key milestones
- Always include Recovery Instructions in checkpoint files

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Memory Management & Knowledge Persistence

Build and maintain a knowledge graph of patterns, decisions, and learnings across sessions. Also provides external file-based checkpoints for long-running tasks.

## Two Memory Systems

| System               | Storage                  | Use Case                       | Persistence     |
| -------------------- | ------------------------ | ------------------------------ | --------------- |
| **MCP Memory Graph** | In-memory graph database | Patterns, decisions, learnings | Cross-session   |
| **File Checkpoints** | `plans/reports/*.md`     | Task progress, analysis        | Permanent files |

Use MCP Memory for **reusable knowledge**. Use File Checkpoints for **task-specific context**.

---

## Part 1: File-Based External Memory (Checkpoints)

### When to Create File Checkpoints

- Starting complex multi-step tasks (investigation, planning, implementation)
- Every 30-60 minutes during long tasks
- At key milestones
- Before expected context compaction
- After completing significant analysis phases

### Checkpoint File Location

Files saved to: `plans/reports/checkpoint-{timestamp}-{slug}.md`

### CHECKPOINT_CREATE Protocol

Create a checkpoint file with this structure:

```markdown
# Memory Checkpoint: {Task Description}

> Created: {ISO timestamp}
> Task Type: {investigation|planning|bugfix|feature|docs}
> Phase: {current phase number/name}

## Task Context

{What you're working on and why}

## Key Findings

{Critical discoveries and insights - be specific with file paths and line numbers}

## Files Analyzed

| File              | Purpose     | Status   |
| ----------------- | ----------- | -------- |
| path/file.cs:line | description | ✅/🔄/⏳ |

## Progress

- [x] Completed items
- [ ] In-progress items
- [ ] Remaining items

## Important Context

{Information that must be preserved - decisions, assumptions, rationale}

## Next Steps

1. {Immediate next action}
2. {Following action}

## Recovery Instructions

{Exact steps to resume: which file to read, which line to continue from}
```

### CHECKPOINT_RECOVER Protocol

When recovering from a checkpoint:

1. Search for latest checkpoint: `Glob("plans/reports/checkpoint-*.md")`
2. Read the checkpoint file
3. Load any referenced analysis files
4. Review Progress section
5. Continue from documented Next Steps
6. Create new checkpoint after resuming

### Auto-Checkpoint (PreCompact Hook)

The system automatically creates checkpoints before context compaction. These auto-checkpoints are minimal - for better context preservation, create manual checkpoints using `$checkpoint`.

---

## Part 2: MCP Memory Graph (Knowledge Persistence)

---

## Memory Entity Types

| Entity Type       | Purpose                                | Examples                       |
| ----------------- | -------------------------------------- | ------------------------------ |
| `Pattern`         | Recurring code patterns                | CQRS, Validation, Repository   |
| `Decision`        | Architectural/design decisions         | Why we chose X over Y          |
| `BugFix`          | Bug solutions for future reference     | Race condition fixes           |
| `ServiceBoundary` | Service ownership and responsibilities | Growth owns Employees          |
| `SessionSummary`  | End-of-session progress snapshots      | Task progress, next steps      |
| `Dependency`      | Cross-service dependencies             | Growth depends on Accounts     |
| `AntiPattern`     | Patterns to avoid                      | Don't call side effects in cmd |

---

## Memory Operations

### Create New Entity

```javascript
mcp__memory__create_entities([
    {
        name: 'EmployeeValidationPattern',
        entityType: 'Pattern',
        observations: [
            'Use project validation fluent API (see docs/project-reference/backend-patterns-reference.md)',
            'Chain with .And() and .AndAsync()',
            "Return validation result, don't throw",
            'Location: {Service}.Application/UseCaseCommands/'
        ]
    }
]);
```

### Create Relationships

```javascript
mcp__memory__create_relations([
    {
        from: 'ServiceA',
        to: 'ServiceB',
        relationType: 'depends_on'
    },
    {
        from: 'EmployeeEntity',
        to: 'UserEntity',
        relationType: 'syncs_from'
    }
]);
```

### Add Observations

```javascript
mcp__memory__add_observations([
    {
        entityName: 'EmployeeValidationPattern',
        contents: [
            'Also supports .AndNot() for negative validation',
            'Use .Of<ICqrsRequest>() for type conversion (see docs/project-reference/backend-patterns-reference.md)'
        ]
    }
]);
```

### Search Knowledge

```javascript
// Search by query
mcp__memory__search_nodes({ query: 'validation pattern' });

// Open specific entities
mcp__memory__open_nodes({
    names: ['EmployeeValidationPattern', 'ServiceAModule']
});

// Read entire graph
mcp__memory__read_graph();
```

### Delete Outdated Knowledge

```javascript
// Delete entities
mcp__memory__delete_entities({ entityNames: ['OutdatedPattern'] });

// Delete specific observations
mcp__memory__delete_observations([
    {
        entityName: 'EmployeeValidationPattern',
        observations: ['Outdated observation text']
    }
]);

// Delete relations
mcp__memory__delete_relations([
    {
        from: 'OldService',
        to: 'NewService',
        relationType: 'depends_on'
    }
]);
```

---

## When to Save to Memory

### Always Save

1. **Discovered Patterns**: New code patterns not in documentation
2. **Bug Solutions**: Complex bugs with non-obvious solutions
3. **Service Boundaries**: Which service owns what
4. **Architectural Decisions**: Why a particular approach was chosen
5. **Anti-Patterns**: Mistakes to avoid

### Save at Session End

```javascript
// Session summary template
mcp__memory__create_entities([
    {
        name: `Session_${taskName}_${date}`,
        entityType: 'SessionSummary',
        observations: [
            `Task: ${taskDescription}`,
            `Completed: ${completedItems.join(', ')}`,
            `Remaining: ${remainingItems.join(', ')}`,
            `Key Files: ${keyFiles.join(', ')}`,
            `Discoveries: ${discoveries.join(', ')}`,
            `Next Steps: ${nextSteps.join(', ')}`
        ]
    }
]);
```

---

## Memory Retrieval Patterns

### Session Start Protocol

```javascript
// 1. Search for related context
const results = mcp__memory__search_nodes({
    query: 'current feature or task keywords'
});

// 2. Load relevant entities
mcp__memory__open_nodes({
    names: results.entities.map(e => e.name)
});

// 3. Check for incomplete sessions
mcp__memory__search_nodes({ query: 'SessionSummary Remaining' });
```

### Before Implementation

```javascript
// Check for existing patterns
mcp__memory__search_nodes({ query: 'CQRS command pattern' });

// Check for anti-patterns
mcp__memory__search_nodes({ query: 'AntiPattern command' });

// Check for related decisions
mcp__memory__search_nodes({ query: 'Decision validation' });
```

### After Bug Fix

```javascript
// Save the fix
mcp__memory__create_entities([
    {
        name: `BugFix_${bugName}`,
        entityType: 'BugFix',
        observations: [
            `Symptom: ${symptomDescription}`,
            `Root Cause: ${rootCause}`,
            `Solution: ${solution}`,
            `Files: ${affectedFiles.join(', ')}`,
            `Prevention: ${preventionTip}`
        ]
    }
]);
```

---

## Knowledge Graph Structure

```
┌─────────────────────────────────────────────────────────────┐
│                     Project Knowledge                       │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  ├── ServiceA ──depends_on──> AccountsService               │
│  ├── ServiceB ──depends_on──> AccountsService               │
│  └── ServiceC ──depends_on──> AccountsService               │
│                                                             │
│  Patterns                                                   │
│  ├── CQRSCommandPattern                                     │
│  ├── CQRSQueryPattern                                       │
│  ├── EntityEventPattern                                     │
│  └── ValidationPattern                                      │
│                                                             │
│  Entities                                                   │
│  ├── Employee ──syncs_from──> User                          │
│  ├── Company ──syncs_from──> Organization                   │
│  └── LeaveRequest ──owned_by──> ServiceA                     │
│                                                             │
│  Sessions                                                   │
│  ├── Session_LeaveRequest_2025-01-15                        │
│  └── Session_EmployeeImport_2025-01-14                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Importance Scoring

When saving observations, prioritize:

| Score | Criteria                                    |
| ----- | ------------------------------------------- |
| 10    | Critical bug fixes, security issues         |
| 8-9   | Architectural decisions, service boundaries |
| 6-7   | Code patterns, best practices               |
| 4-5   | Session summaries, progress notes           |
| 1-3   | Temporary notes, exploration results        |

---

## Memory Maintenance

### Weekly Cleanup

```javascript
// Find old session summaries (> 30 days)
mcp__memory__search_nodes({ query: 'SessionSummary' });

// Delete outdated sessions
mcp__memory__delete_entities({
    entityNames: ['Session_OldTask_2024-12-01']
});
```

### Consolidation

When multiple observations cover same topic:

```javascript
// 1. Read existing entity
mcp__memory__open_nodes({ names: ['PatternName'] });

// 2. Delete fragmented observations
mcp__memory__delete_observations([
    {
        entityName: 'PatternName',
        observations: ['Fragment 1', 'Fragment 2']
    }
]);

// 3. Add consolidated observation
mcp__memory__add_observations([
    {
        entityName: 'PatternName',
        contents: ['Consolidated comprehensive observation']
    }
]);
```

---

## Quick Reference

**Create**: `mcp__memory__create_entities` / `mcp__memory__create_relations`
**Read**: `mcp__memory__read_graph` / `mcp__memory__open_nodes` / `mcp__memory__search_nodes`
**Update**: `mcp__memory__add_observations`
**Delete**: `mcp__memory__delete_entities` / `mcp__memory__delete_observations` / `mcp__memory__delete_relations`

---

## Part 3: Integration with Workflows

### Long-Running Task Memory Pattern

All long-running workflows should follow this pattern:

```
┌─────────────────────────────────────────────────────────┐
│ TASK START                                               │
│   └── Create initial checkpoint with task context        │
│   └── Initialize todo list                               │
│                                                          │
│ EVERY 20-30 OPERATIONS                                   │
│   └── Update checkpoint with progress                    │
│   └── Update todo list status                            │
│                                                          │
│ MILESTONE REACHED                                         │
│   └── Create detailed checkpoint                         │
│   └── Save key findings to MCP memory (if reusable)      │
│                                                          │
│ BEFORE COMPACTION (auto via PreCompact hook)             │
│   └── Auto-checkpoint created by system                  │
│                                                          │
│ AFTER COMPACTION / SESSION RESUME                        │
│   └── Read latest checkpoint                             │
│   └── Search MCP memory for relevant context             │
│   └── Continue from documented Next Steps                │
│                                                          │
│ TASK COMPLETE                                             │
│   └── Final checkpoint with summary                      │
│   └── Save reusable patterns to MCP memory               │
│   └── Clean up temporary checkpoints                     │
└─────────────────────────────────────────────────────────┘
```

### Checkpoint Naming Convention

| Type              | Format                                      | Example                                |
| ----------------- | ------------------------------------------- | -------------------------------------- |
| Manual checkpoint | `checkpoint-{YYMMDD}-{HHMM}-{slug}.md`      | `checkpoint-250106-1430-user-auth.md`  |
| Auto checkpoint   | `memory-checkpoint-{timestamp}.md`          | `memory-checkpoint-20250106-143000.md` |
| Analysis notes    | `{type}-{date}-{slug}.md`                   | `analysis-250106-payment-flow.md`      |
| Task notes        | `.ai/workspace/analysis/{slug}.analysis.md` | Used by feature-implementation         |

### Related Commands & Skills

| Command/Skill            | Purpose                             |
| ------------------------ | ----------------------------------- |
| `$checkpoint`            | Create manual memory checkpoint     |
| `$context`               | Load project context                |
| `$compact`               | Manually trigger context compaction |
| `$watzup`                | Generate progress summary           |
| `feature-implementation` | Uses task analysis notes pattern    |
| `debug-investigate`      | Uses investigation logs             |
| `feature-investigation`  | Uses analysis report pattern        |

### Memory Decision Matrix

| Context Type            | Storage         | Why                      |
| ----------------------- | --------------- | ------------------------ |
| Task progress           | File checkpoint | Specific to current task |
| Code patterns           | MCP memory      | Reusable across sessions |
| Bug solutions           | MCP memory      | Helps future debugging   |
| Service boundaries      | MCP memory      | Architectural knowledge  |
| Investigation findings  | File checkpoint | Task-specific analysis   |
| Architectural decisions | MCP memory      | Long-term knowledge      |

## Related

- `learn`
- `context-optimization`

---

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
