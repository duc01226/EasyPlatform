---
name: coding-level
version: 1.0.0
description: '[Utilities] Use when you need to set coding experience level for tailored explanations.'
disable-model-invocation: false
---

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
| 5     | God Mode  | Expert - maximum efficiency, minimal explanation            |

> **Default when unset:** `-1` (disabled — no style injection, saves tokens). Levels 0–5 are opt-in via `codingLevel` in `.claude/.ck.json`. (Canonical default `-1` — matches `ck-config-loader.cjs:284`; full settings reference: `/ck-help config`.)

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

**IMPORTANT MUST ATTENTION Goal:** Set the user's coding experience level to tailor explanation depth and detail.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** apply critical + sequential thinking; every claim traced, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
