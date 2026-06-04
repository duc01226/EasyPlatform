---
name: compact
version: 2.0.0
description: '[Utilities] Use when you need to compress context to optimize token usage (user-facing alias for context-optimization Strategy #3 Compress).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Compress conversation context to optimize token usage while preserving critical information.

> **Thin alias.** `/compact` is the user-facing entry point to the **Compress** strategy (Strategy #3) owned by `context-optimization`. That skill is `disable-model-invocation: true` (not directly user-invocable), so this command is the canonical way to trigger a manual compaction. `/compact` is also a **CLI-native command** — this alias keeps the harness-specific preservation guidance attached to it without re-implementing the compress logic, which lives once in `context-optimization`.

**Workflow:**

1. **Analyze** — Identify essential vs. expendable context
2. **Compress** — Remove redundant tool outputs / repeated searches / verbose logs; summarize findings
3. **Verify** — Ensure critical decisions, files modified, and current task state are preserved

**Key Rules:**

- Canonical compress protocol + the full 4-strategy framework (write/select/compress/isolate) + token thresholds live in `context-optimization` — this skill is the command surface only
- Preserve: decisions made, files modified, current task state, error/stack traces, todos
- Use `/compact` at natural breakpoints (after commits, PR), not mid-task

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Compact Context

Proactively compress the current conversation context to optimize token usage. This is the user-invocable alias for `context-optimization`'s Compress strategy.

## When to Use

- Before starting a new task in a long session
- When working on multiple unrelated features
- At natural workflow checkpoints (after commits, PR creation)
- When the context indicator shows high usage (≥100K tokens → required; ≥150K → critical)

## Instructions

1. **Run the Pre-Compaction Preservation Checklist** — canonical in `.claude/skills/context-optimization/SKILL.md` (Strategy #3 → "Pre-Compaction Preservation Checklist"): branch + uncommitted-changes status, active file paths, error messages / stack traces, key decisions + rationale, pending todos.
2. **Compress** — summarize completed work + key decisions; clear redundant history (old exploration, superseded plans); keep active file paths, current task, blockers.
3. **Restate objective** — after compacting, briefly restate the current objective and confirm critical file paths are still accessible.

For the full context-management framework (Write / Select / Compress / Isolate strategies, context-anchor protocol, memory commands, token-efficient patterns), see `context-optimization`.

## Related Commands

- `context-optimization` — full 4-strategy context-management framework (canonical owner)
- `/checkpoint` — save analysis context to an external file before compaction
- `/recover` — restore workflow context from the latest checkpoint

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
