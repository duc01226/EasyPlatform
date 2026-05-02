---
name: ai-dev-tools-sync
version: 1.0.0
description: '[AI & Tools] Synchronize and update Claude Code and GitHub Copilot development tool configurations to work similarly. Use when asked to update Claude Code setup, update Copilot setup, sync AI dev tools, add new skills/prompts/agents across both platforms, or ensure Claude and Copilot configurations are aligned. Covers skills, prompts, agents, instructions, workflows, and chat modes.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Synchronize Claude Code and GitHub Copilot configurations to maintain feature parity across both AI dev tools.

**Workflow:**

1. **Understand** — Read current configs (CLAUDE.md, copilot-instructions.md, agents, workflows)
2. **Research** — Search for latest features across both platforms
3. **Compare** — Identify gaps in skills, prompts, agents, or instructions
4. **Sync** — Implement changes in both platforms maintaining compatibility

**Key Rules:**

- Copilot reads `.claude/skills/` automatically (backward compatibility)
- Both platforms read `.github/prompts/*.prompt.md` and `.github/agents/*.md`
- Always update both `CLAUDE.md` and `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` for instruction changes

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# AI Dev Tools Sync

Synchronize Claude Code and GitHub Copilot configurations to maintain feature parity.

## When to Use

Activate this skill when:

- User asks to update Claude Code or Copilot setup
- User wants to add/modify skills, prompts, agents, or instructions
- User wants both tools to work similarly
- User asks about AI dev tool configuration

## Quick Reference

| Claude Code     | GitHub Copilot           | Location                               |
| --------------- | ------------------------ | -------------------------------------- |
| SKILL.md        | SKILL.md                 | `.claude/skills/` + `.github/skills/`  |
| SKILL.md        | prompts/\*.prompt.md     | `.claude/skills/` + `.github/prompts/` |
| agents/\*.md    | agents/\*.md             | `.github/agents/` (shared)             |
| workflows/\*.md | -                        | `.claude/workflows/`                   |
| CLAUDE.md       | copilot + instructions/  | Root + `.github/`                      |
| -               | chatmodes/\*.chatmode.md | `.github/chatmodes/`                   |

## Sync Process

### Step 1: Understand Current Setup

Read these files to understand current configuration:

```
.claude/workflows/orchestration-protocol.md
.claude/workflows/primary-workflow.md
.github/copilot-instructions.md
.github/instructions/*.instructions.md
.github/AGENTS.md
CLAUDE.md
```

### Step 2: Research Latest Features

Search web for:

- "GitHub Copilot features setup 2026"
- "GitHub Copilot custom instructions agents skills prompts"
- "GitHub Copilot agent mode workspace context"

See [references/copilot-features.md](references/copilot-features.md) for feature catalog.

### Step 3: Identify Sync Opportunities

Compare capabilities and identify gaps:

- Skills missing in one platform
- Inconsistent prompt/instruction behavior
- Agent definitions that differ

### Step 4: Implement Changes

For each change:

1. **Skills**: Create in both `.claude/skills/` and `.github/skills/`
2. **Prompts**: Create in both `.claude/skills/` and `.github/prompts/`
3. **Instructions**: Update `CLAUDE.md` + `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md`
4. **Agents**: Update `.github/agents/` (shared by both)

## Compatibility Notes

- Copilot reads `.claude/skills/` automatically (backward compatibility)
- Both read `.github/prompts/*.prompt.md`
- Both read `.github/agents/*.md`
- Both read `AGENTS.md` in root or `.github/`
- Both support path-based instruction files via `applyTo` in frontmatter

## References

- [Copilot Features Catalog](references/copilot-features.md)
- [Sync Patterns](references/sync-patterns.md)

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

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
