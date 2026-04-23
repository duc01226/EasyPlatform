---
name: skill-add
version: 2.0.0
description: '[Skill Management] Add new reference files or scripts to a skill. Triggers on: add reference, add script, skill reference, skill script.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> - **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> - **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> - **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> - **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> - **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> - **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> - **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> - **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> - **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> - **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:shared-protocol-duplication-policy -->

> **Shared Protocol Duplication Policy** — Inline protocol content in skills (wrapped in `<!-- SYNC:tag -->`) is INTENTIONAL duplication. Do NOT extract, deduplicate, or replace with file references. AI compliance drops significantly when protocols are behind file-read indirection. To update: edit `.claude/skills/shared/sync-inline-versions.md` first, then grep `SYNC:protocol-name` and update all occurrences.

<!-- /SYNC:shared-protocol-duplication-policy -->

## Quick Summary

**Goal:** Add new reference files or scripts to an existing skill directory.

**Workflow:**

1. **Identify** — Determine target skill and required additions
2. **Create** — Add reference/script files following progressive disclosure (<100 lines each)
3. **Update SKILL.md** — Add SYNC blocks if new protocols apply, update references
4. **Enhance** — Call `/prompt-enhance` on the updated SKILL.md
5. **Validate** — Verify files work, scripts pass tests

**Key Rules:**

- Reference files under 100 lines each (progressive disclosure)
- Scripts must have tests and respect `.env` loading order
- If adding shared protocol content → use `<!-- SYNC:tag -->` inline blocks from `sync-inline-versions.md`
- MUST ATTENTION call `/prompt-enhance` on SKILL.md after modifications

## Arguments

$1: skill name (required)
$2: reference or script prompt (required)
If $1 or $2 is not provided, ask via `AskUserQuestion`.

## Mission

Add new reference files or scripts to `.claude/skills/$1` directory.

<reference-or-script-prompt>$2</reference-or-script-prompt>

## Rules

- Token-efficient: SKILL.md short and concise, references under 100 lines each
- If given a URL → use `Explore` subagent to explore all internal links
- If given multiple URLs → use parallel `Explore` subagents
- If given a GitHub URL → use `repomix` to summarize + parallel `Explore` subagents
- Skills are instructions, not documentation. Teach Claude HOW to do the task.
- If new content involves shared protocols → inline via SYNC tags, never file references

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** inline shared protocols via `<!-- SYNC:tag -->` blocks — NEVER use file references
- **IMPORTANT MUST ATTENTION** call `/prompt-enhance` on updated SKILL.md as final quality pass
- **IMPORTANT MUST ATTENTION** keep reference files under 100 lines each (progressive disclosure)
      <!-- SYNC:shared-protocol-duplication-policy:reminder -->
- **IMPORTANT MUST ATTENTION** follow duplication policy: inline protocols are INTENTIONAL, never extract to file references
      <!-- /SYNC:shared-protocol-duplication-policy:reminder -->
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
