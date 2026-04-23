---
name: design-fast
version: 1.0.0
description: '[Design] Create a quick design'
disable-model-invocation: false
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

Think hard to plan & start working on these tasks follow the Orchestration Protocol, Core Responsibilities, Subagents Team and Development Rules:
<tasks>$ARGUMENTS</tasks>

> **Skill Variant:** Variant of design skills — quick design implementation.

## Quick Summary

**Goal:** Create a quick UI design using design intelligence databases and subagents.

**Workflow:**

1. **Research** — Run `ui-ux-pro-max` searches for design intelligence
2. **Design** — Use `ui-ux-designer` subagent to create the design
3. **Review** — Present to user for approval

**Key Rules:**

- Always activate `ui-ux-pro-max` FIRST for design intelligence
- Default to pure HTML/CSS/JS if user doesn't specify framework
- Use `ai-multimodal` for generating real visual assets

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Required Skills (Priority Order)

1. **`ui-ux-pro-max`** - Design intelligence database (ALWAYS ACTIVATE FIRST)
2. **`frontend-design`** - Quick implementation

**Ensure token efficiency while maintaining high quality.**

## Workflow:

1. **FIRST**: Run `ui-ux-pro-max` searches to gather design intelligence:
    ```bash
    python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<product-type>" --domain product
    python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<style-keywords>" --domain style
    python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<mood>" --domain typography
    python3 $HOME/.claude/skills/ui-ux-pro-max/scripts/search.py "<industry>" --domain color
    ```
2. Use `ui-ux-designer` subagent to start the design process.
3. If user doesn't specify, create the design in pure HTML/CSS/JS.
4. Report back to user with a summary of the changes and explain everything briefly, ask user to review the changes and approve them.
5. If user approves the changes, update the `./docs/design-guidelines.md` docs if needed.

## Notes:

- Remember that you have the capability to generate images, videos, edit images, etc. with `ai-multimodal` skills. Use them to create the design and real assets.
- Always review, analyze and double check generated assets with `ai-multimodal` skills to verify quality.
- Maintain and update `./docs/design-guidelines.md` docs if needed.

---

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
    <!-- SYNC:critical-thinking-mindset:reminder -->
- **MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.
    <!-- /SYNC:critical-thinking-mindset:reminder -->
    <!-- SYNC:ai-mistake-prevention:reminder -->
- **MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.
    <!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
