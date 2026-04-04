---
name: skill-fix-logs
version: 2.0.0
description: '[Skill Management] Fix the agent skill based on `logs.txt` file. Triggers on: fix skill logs, skill error, skill broken, skill not working.'
disable-model-invocation: false
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

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
- MUST call `/prompt-enhance` if structural changes were made to SKILL.md
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

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** preserve SYNC tag balance when editing SKILL.md
- **MUST** call `/prompt-enhance` on SKILL.md after structural fixes
- **MUST** STOP after 3 failed fix attempts — report outcomes, ask user before #4
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
