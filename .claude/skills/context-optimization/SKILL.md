---
name: context-optimization
version: 1.0.0
description: '[Utilities] Use when managing context window usage, compressing long sessions, or optimizing token usage.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Manage context window efficiently to maintain productivity in long Claude Code sessions.

**Workflow:**

1. **Write** — Save critical findings to persistent memory entities
2. **Select** — Retrieve relevant memories at session/task start
3. **Compress** — Create context anchors every 10 operations summarizing progress
4. **Isolate** — Delegate exploration tasks to sub-agents to reduce context usage

**Key Rules:**

- Write context anchor every 10 operations (re-read task, verify alignment, summarize)
- Use offset/limit and grep before reading large files
- Combine search patterns with OR instead of sequential searches
- At 100K tokens: required compression; at 150K: critical save and summarize

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Context Optimization & Management

Manage context window efficiently to maintain productivity in long sessions.

---

## Context Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Context Window (~200K tokens)           │
├─────────────────────────────────────────────────────────────┤
│ System Prompt (CLAUDE.md excerpts)          ~2,000 tokens   │
│ ─────────────────────────────────────────────────────────── │
│ Working Memory (current task state)         ~10,000 tokens  │
│ ─────────────────────────────────────────────────────────── │
│ Retrieved Context (RAG from codebase)       ~20,000 tokens  │
│ ─────────────────────────────────────────────────────────── │
│ Episodic Memory (past session learnings)    ~5,000 tokens   │
│ ─────────────────────────────────────────────────────────── │
│ Tool Descriptions (relevant tools only)     ~3,000 tokens   │
└─────────────────────────────────────────────────────────────┘
```

---

## Four Context Strategies

### 1. Writing (Save Important Context)

Save critical findings to persistent memory:

```javascript
// After discovering important patterns or decisions
mcp__memory__create_entities([
    {
        name: 'OrderValidation',
        entityType: 'Pattern',
        observations: [
            'Uses validation framework fluent API',
            'Async validation via ValidateRequestAsync',
            'Found in the application-layer command folder (per project structure reference)'
        ]
    }
]);
```

**When to Write:**

- Discovered architectural patterns
- Important business rules
- Cross-service dependencies
- Solution decisions

### 2. Selecting (Retrieve Relevant Context)

Load relevant memories at session start:

```javascript
// Search for relevant patterns
mcp__memory__search_nodes({ query: 'Order validation pattern' });

// Open specific entities
mcp__memory__open_nodes({ names: ['OrderValidation', 'ServiceAModule'] });
```

**When to Select:**

- Starting a related task
- Continuing previous work
- Cross-referencing patterns

### 3. Compressing (Summarize Long Trajectories)

Create context anchors every 10 operations:

```markdown
=== CONTEXT ANCHOR ===
Current Task: Implement order return request feature
Completed:

- Created Return entity with validation
- Added SaveReturnCommand with handler
- Implemented entity event handler for notifications

Remaining:

- Create GetReturnListQuery
- Add controller endpoint
- Write unit tests

Key Findings:

- Returns use service-specific repository
- Notifications via entity event handlers, not direct calls
- Validation uses validation framework fluent .AndAsync()

# Next Action: Create query handler with GetQueryBuilder pattern
```

#### Pre-Compaction Preservation Checklist (canonical for `/compact`)

Before a manual `/compact` (or any context compaction), confirm these are saved so they survive the cut — this is the canonical checklist the user-facing `/compact` alias delegates to:

- [ ] Current branch + uncommitted-changes status
- [ ] Active file paths being modified
- [ ] Any error messages / stack traces (preserve verbatim when mid-bug)
- [ ] Key decisions and their rationale
- [ ] Pending items from the todo list

**Preserve** decisions, files modified, current task state. **Drop** redundant tool outputs, repeated searches, verbose logs. Compact at natural breakpoints (after commits/PR), not mid-task; after compacting, restate the current objective.

### 4. Isolating (Use Sub-Agents)

Delegate specialized tasks to sub-agents:

```javascript
// Explore codebase (reduced context)
Task({ subagent_type: 'Explore', prompt: 'Find all entity event handlers in the target service' });

// Plan implementation (focused context)
Task({ subagent_type: 'Plan', prompt: 'Plan return approval workflow' });
```

**When to Isolate:**

- Broad codebase exploration
- Independent research tasks
- Parallel investigations

---

## Context Anchor Protocol

**Every 10 operations, write a context anchor:**

1. **Re-read original task** from todo list or initial prompt
2. **Verify alignment** with current work
3. **Write anchor** summarizing progress
4. **Save to memory** if discovering important patterns

```markdown
=== CONTEXT ANCHOR [10] ===
Task: [Original task description]
Phase: [Current phase number]
Progress: [What's been completed]
Findings: [Key discoveries]
Next: [Specific next step]
Confidence: [High/Medium/Low]
===========================
```

---

## Token-Efficient Patterns

### File Reading

```javascript
// ❌ Reading entire files
Read({ file_path: 'large-file.cs' });

// ✅ Read specific sections
Read({ file_path: 'large-file.cs', offset: 100, limit: 50 });

// ✅ Use grep to find specific content first
Grep({ pattern: 'class SaveOrderCommand', path: '<source-root>/' });
```

### Search Optimization

```javascript
// ❌ Multiple sequential searches
Grep({ pattern: 'CreateAsync' });
Grep({ pattern: 'UpdateAsync' });
Grep({ pattern: 'DeleteAsync' });

// ✅ Combined pattern
Grep({ pattern: 'CreateAsync|UpdateAsync|DeleteAsync', output_mode: 'files_with_matches' });
```

### Parallel Operations

```javascript
// ✅ Parallel reads for independent files
[Read({ file_path: 'file1.cs' }), Read({ file_path: 'file2.cs' }), Read({ file_path: 'file3.cs' })];
```

---

## Memory Management Commands

### Save Session Summary

```javascript
// Before ending session or hitting limits
const summary = {
    task: 'Implementing order return request feature',
    completed: ['Entity', 'Command', 'Handler'],
    remaining: ['Query', 'Controller', 'Tests'],
    discoveries: ['Use entity events for notifications'],
    files: ['Return.cs', 'SaveReturnCommand.cs']
};

// Save to memory
mcp__memory__create_entities([
    {
        name: `Session_${new Date().toISOString().split('T')[0]}`,
        entityType: 'SessionSummary',
        observations: [JSON.stringify(summary)]
    }
]);
```

### Load Previous Session

```javascript
// At session start
mcp__memory__search_nodes({ query: 'Session return request' });
```

---

## Anti-Patterns

| Anti-Pattern               | Better Approach                |
| -------------------------- | ------------------------------ |
| Reading entire large files | Use offset/limit or grep first |
| Sequential searches        | Combine with OR patterns       |
| Repeating same searches    | Cache results in memory        |
| No context anchors         | Write anchor every 10 ops      |
| Not using sub-agents       | Isolate exploration tasks      |
| Forgetting discoveries     | Save to memory entities        |

---

## Quick Reference

**Token Estimation:**

- 1 line of code ≈ 10-15 tokens
- 1 page of text ≈ 500 tokens
- Average file ≈ 1,000-3,000 tokens

**Context Thresholds:**

- 50K tokens: Consider compression
- 100K tokens: Required compression
- 150K tokens: Critical - save and summarize

**Memory Commands:**

- `mcp__memory__create_entities` - Save new knowledge
- `mcp__memory__search_nodes` - Find relevant context
- `mcp__memory__add_observations` - Update existing entities

## Related

- `memory-management`

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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
> **Keep domain concepts out of generic/shared/infrastructure layers.** A reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. The leak compiles and runs, so it passes review silently while coupling the "reusable" layer to one consumer. Push domain fields/logic down into the consumer via subclass or composition.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
