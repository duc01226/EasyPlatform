---
name: context-optimization
version: 1.0.0
description: '[Utilities] Use when managing context window usage, compressing long sessions, or optimizing token usage.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Manage context window efficiently to maintain productivity in long Claude Code sessions.

**Workflow:**

1. **Compress** — Create context anchors every 10 operations summarizing progress
2. **Isolate** — Delegate exploration tasks to sub-agents to reduce context usage

> Cross-session persistence (saving findings to survive a new session) is out of scope here — use file checkpoints via `/checkpoint` and restore with `/recover` (see the `memory-management` skill).

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

## Two Context Strategies

### 1. Compressing (Summarize Long Trajectories)

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

### 2. Isolating (Use Sub-Agents)

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
4. **Persist to a checkpoint** (`/checkpoint`) if discovering important patterns

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

## Anti-Patterns

| Anti-Pattern               | Better Approach                |
| -------------------------- | ------------------------------ |
| Reading entire large files | Use offset/limit or grep first |
| Sequential searches        | Combine with OR patterns       |
| Repeating same searches    | Reuse earlier results          |
| No context anchors         | Write anchor every 10 ops      |
| Not using sub-agents       | Isolate exploration tasks      |
| Forgetting discoveries     | Save findings to a checkpoint  |

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

## Related

- `memory-management`

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

## Closing Reminders

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act, never guess.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
