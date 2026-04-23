---
name: coding-level
version: 1.0.0
description: '[Utilities] Set coding experience level for tailored explanations'
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

## Quick Summary

**Goal:** Set the user's coding experience level to tailor explanation depth and detail.

**Workflow:**

1. **Ask** -- Query user for their experience level (beginner/intermediate/expert)
2. **Configure** -- Adjust response verbosity and explanation depth accordingly

**Key Rules:**

- Expert: minimal explanation, focus on code and architecture
- Intermediate: moderate explanation with key concepts
- Beginner: detailed explanation with examples and context

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

Set your coding experience level for tailored explanations and output format.

## Usage

`/coding-level [0-5]`

## Levels

| Level | Name      | Description                                                 |
| ----- | --------- | ----------------------------------------------------------- |
| 0     | ELI5      | Zero coding experience - analogies, no jargon, step-by-step |
| 1     | Junior    | 0-2 years - concepts explained, WHY not just HOW            |
| 2     | Mid-Level | 3-5 years - design patterns, system thinking                |
| 3     | Senior    | 5-8 years - trade-offs, business context, architecture      |
| 4     | Tech Lead | 8-10 years - risk assessment, business impact, strategy     |
| 5     | God Mode  | Expert - default behavior, maximum efficiency (default)     |

## How It Works

1. Set `codingLevel` in `.claude/.ck.json`
2. Guidelines are **automatically injected** on every session start
3. No manual activation needed - it just works!

## Example

Set level 1 in `.claude/.ck.json`:

```json
{
  "codingLevel": 1,
  ...
}
```

Next session, Claude will automatically:

- Explain concepts and techniques clearly
- Always explain WHY, not just HOW
- Point out common mistakes
- Add "Key Takeaways" after implementations

## Optional: Manual Output Styles

For finer control, you can also use `/output-style` with these styles:

- `coding-level-0-eli5`
- `coding-level-1-junior`
- `coding-level-2-mid`
- `coding-level-3-senior`
- `coding-level-4-lead`
- `coding-level-5-god`

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
