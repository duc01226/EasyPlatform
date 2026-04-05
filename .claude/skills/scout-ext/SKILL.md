---
name: scout-ext
version: 1.0.0
description: '[Investigation] Use external agentic tools to scout given directories'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

## Quick Summary

**Goal:** Use external agentic tools (Gemini, OpenCode) to quickly locate relevant files across the codebase.

**Workflow:**

1. **Scope** — Define search area and file patterns
2. **Search** — Use external tools for broad file discovery
3. **Report** — Return list of relevant files with context

**Key Rules:**

- Use for broad file discovery across large codebases
- Complements `/scout` with external tool capabilities
- Report file paths with brief context for each match

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Purpose

Utilize external agentic tools to scout given directories or explore the codebase for files needed to complete the task using a fast, token efficient agent.

## Variables

USER_PROMPT: $1
SCALE: $2 (defaults to 3)
RELEVANT_FILE_OUTPUT_DIR: Use `Report:` from `## Naming` section

## Workflow:

- Write a prompt for 'SCALE' number of agents to the `Task` tool that will immediately call the `Bash` tool to run these commands to kick off your agents to conduct the search:
    - `gemini -p "[prompt]" --model gemini-2.5-flash-preview-09-2025` (if count <= 3)
    - `opencode run "[prompt]" --model opencode/grok-code` (if count > 3 and count < 6)
    - if count >= 6, spawn `Explore` subagents to search the codebase in parallel

**Why use external agentic tools?**

- External agentic tools are faster and more efficient when using LLMs with large context windows (1M+ tokens).

**How to prompt the agents:**

- If `gemini` or `opencode` is not available, ask the user if they want to install it:
    - If **yes**, install it (if there are permission issues, instruct the user to install it manually, including authentication steps)
    - If **no**, use the default `Explore` subagents.
- IMPORTANT: Kick these agents off in parallel using the `Task` tool, analyze and divide folders for each agent to scout intelligently and quickly.
- IMPORTANT: These agents are calling OTHER agentic coding tools to search the codebase. DO NOT call any search tools yourself.
- IMPORTANT: That means with the `Task` tool, you'll immediately call the Bash tool to run the respective agentic coding tool (gemini, opencode, claude, etc.)
- IMPORTANT: Instruct the agents to quickly search the codebase for files needed to complete the task. This isn't about a full blown search, just a quick search to find the files needed to complete the task.
- Instruct the subagent to use a timeout of 3 minutes for each agent's bash call. Skip any agents that don't return within the timeout, don't restart them.
- **IMPORTANT:** Sacrifice grammar for the sake of concision when writing reports.
- **IMPORTANT:** In reports, list any unresolved questions at the end, if any.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following before starting:
  <!-- SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
    <!-- /SYNC:evidence-based-reasoning:reminder -->
