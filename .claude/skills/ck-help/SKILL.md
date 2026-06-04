---
name: ck-help
version: 1.0.0
description: '[Utilities] Use when you need claudeKit usage guide - just type naturally.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Provide ClaudeKit usage guidance by running the help script and presenting results based on output type.

**Workflow:**

1. **Translate** — Convert user arguments to English if needed
2. **Execute** — Run `python .claude/scripts/ck-help.py "$ARGUMENTS"`
3. **Detect Type** — Read `@CK_OUTPUT_TYPE` marker (comprehensive-docs, category-guide, command-details, search-results, task-recommendations)
4. **Present** — Show COMPLETE script output verbatim, then add practical context and examples

**Key Rules:**

- Always show script output fully, then enhance — never replace or summarize it
- `/plan` then `/plan-execute` is the correct flow; NEVER suggest `/plan` then `/feature-implement`
- `/feature-implement` is standalone (has its own planning)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Think harder.
All-in-one ClaudeKit guide. Run the script and present output based on type markers.

## Pre-Processing

**IMPORTANT: Always translate `$ARGUMENTS` to English before passing to script.**

The Python script only understands English keywords. If `$ARGUMENTS` is in another language:

1. Translate `$ARGUMENTS` to English
2. Pass the translated English string to the script

## Execution

```bash
python .claude/scripts/ck-help.py "$ARGUMENTS"
```

## Output Type Detection

The script outputs a type marker on the first line: `@CK_OUTPUT_TYPE:<type>`

**Read this marker and adjust your presentation accordingly:**

### `@CK_OUTPUT_TYPE:comprehensive-docs`

Full documentation (config, schema, setup guides).

**Presentation:**

1. Show the **COMPLETE** script output verbatim - every section, every code block
2. **THEN ADD** helpful context:
    - Real-world usage examples ("For example, if you're working on multiple projects...")
    - Common gotchas and tips ("Watch out for: ...")
    - Practical scenarios ("This is useful when...")
3. End with a specific follow-up question

**Example enhancement after showing full output:**

```
## Additional Tips

**When to use global vs local config:**
- Use global (~/.claude/.ck.json) for personal preferences like language, issue prefix style
- Use local (./.claude/.ck.json) for project-specific paths, naming conventions

**Common setup for teams:**
Each team member sets their locale globally, but projects share local config via git.

Need help setting up a specific configuration?
```

### `@CK_OUTPUT_TYPE:category-guide`

Workflow guides for command categories (fix, plan, feature-implement, etc.).

**Presentation:**

1. Show the complete workflow and command list
2. **ADD** practical context:
    - When to use this workflow vs alternatives
    - Real example: "If you encounter a bug in authentication, start with..."
    - Transition tips between commands
3. Offer to help with a specific task

### `@CK_OUTPUT_TYPE:command-details`

Single command documentation.

**Presentation:**

1. Show full command info from script
2. **ADD**:
    - Concrete usage example with realistic input
    - When this command shines vs alternatives
    - Common flags or variations
3. Offer to run the command for them

### `@CK_OUTPUT_TYPE:search-results`

Search matches for a keyword.

**Presentation:**

1. Show all matches from script
2. **HELP** user navigate:
    - Group by relevance if many results
    - Suggest most likely match based on context
    - Offer to explain any specific command
3. Ask what they're trying to accomplish

### `@CK_OUTPUT_TYPE:task-recommendations`

Task-based command suggestions.

**Presentation:**

1. Show recommended commands from script
2. **EXPLAIN** the reasoning:
    - Why these commands fit the task
    - Suggested order of execution
    - What each step accomplishes
3. Offer to start with the first recommended command

## Key Principle

**Script output = foundation. Your additions = value-add.**

Always show the script output fully, then enhance with your knowledge and context — never replace or summarize it.

## Important: Correct Workflows

- **`/plan` → `/plan-execute`**: Plan first, then execute the plan
- **`/feature-implement`**: Standalone - plans internally, no separate `/plan` needed
- **NEVER** suggest `/plan` → `/feature-implement` (feature-implement has its own planning)

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced proof per claim, confidence >80% to act, never guess as fact.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
