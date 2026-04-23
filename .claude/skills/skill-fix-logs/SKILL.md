---
name: skill-fix-logs
version: 2.0.0
description: '[Skill Management] Fix the agent skill based on `logs.txt` file. Triggers on: fix skill logs, skill error, skill broken, skill not working.'
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

## Quick Summary

**Goal:** Fix a skill based on error analysis from its `logs.txt` file.

**Workflow:**

1. **Read** — Analyze the skill's `logs.txt` for errors and failures
2. **Diagnose** — Identify root cause of skill malfunction
3. **Fix** — Apply corrections to SKILL.md, scripts, or references
4. **Verify SYNC compliance** — Ensure fix doesn't break SYNC tag balance or remove inline protocols
5. **Enhance** — Call `/prompt-enhance` on the fixed SKILL.md if structural changes were made
6. **Test** — Run the skill again to verify fix

**Key Rules:**

- Focus on the specific errors reported in logs
- When fixing SKILL.md structure: maintain SYNC tag balance, keep inline protocols
- MUST ATTENTION call `/prompt-enhance` if structural changes were made to SKILL.md
- STOP after 3 failed fix attempts — report outcomes, ask user before #4

## Mission

Fix the agent skill based on `logs.txt` file (project root).

<user-prompt>$ARGUMENTS</user-prompt>

## Rules

- If given nothing → use `AskUserQuestion` for clarifications
- If given a URL → use `Explore` subagent to explore all internal links
- If given a GitHub URL → use `repomix` + parallel `Explore` subagents
- When modifying SKILL.md: verify `<!-- SYNC:tag -->` blocks remain balanced
- Reference canonical protocols: `.claude/skills/shared/sync-inline-versions.md`

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** preserve SYNC tag balance when editing SKILL.md
- **IMPORTANT MUST ATTENTION** call `/prompt-enhance` on SKILL.md after structural fixes
- **IMPORTANT MUST ATTENTION** STOP after 3 failed fix attempts — report outcomes, ask user before #4
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
