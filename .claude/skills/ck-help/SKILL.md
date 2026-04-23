---
name: ck-help
version: 1.0.0
description: '[Utilities] ClaudeKit usage guide - just type naturally'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

**Goal:** Provide ClaudeKit usage guidance by running the help script and presenting results based on output type.

**Workflow:**

1. **Translate** — Convert user arguments to English if needed
2. **Execute** — Run `python .claude/scripts/ck-help.py "$ARGUMENTS"`
3. **Detect Type** — Read `@CK_OUTPUT_TYPE` marker (comprehensive-docs, category-guide, command-details, search-results, task-recommendations)
4. **Present** — Show COMPLETE script output verbatim, then add practical context and examples

**Key Rules:**

- Never replace or summarize script output; always show it fully then enhance
- `/plan` then `/code` is the correct flow; NEVER suggest `/plan` then `/cook`
- `/cook` is standalone (has its own planning)

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

Workflow guides for command categories (fix, plan, cook, etc.).

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

Never replace or summarize the script output. Always show it fully, then enhance with your knowledge and context.

## Important: Correct Workflows

- **`/plan` → `/code`**: Plan first, then execute the plan
- **`/cook`**: Standalone - plans internally, no separate `/plan` needed
- **NEVER** suggest `/plan` → `/cook` (cook has its own planning)

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
      <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
      <!-- /SYNC:critical-thinking-mindset:reminder -->
      <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
      <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
