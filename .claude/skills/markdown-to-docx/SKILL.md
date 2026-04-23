---
name: markdown-to-docx
version: 1.0.0
description: '[Document Processing] Convert markdown files to Microsoft Word (.docx) format with GFM support and math rendering'
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

**Goal:** Convert Markdown files to Microsoft Word (.docx) format with GFM support and proper formatting.

**Workflow:**

1. **Install** -- Ensure pandoc is available (required dependency)
2. **Convert** -- Run pandoc with docx output, apply reference template if provided
3. **Verify** -- Check output file for formatting fidelity

**Key Rules:**

- Requires pandoc installed on the system
- Supports GFM tables, code blocks, and images
- Optional reference.docx template for custom styling

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# markdown-to-docx

Convert markdown files to editable Microsoft Word documents with support for tables, code blocks, images, and LaTeX math equations.

## Installation Required

**This skill requires npm dependencies.** Run one of:

```bash
# Option 1: ClaudeKit CLI (recommended)
ck init

# Option 2: Manual
cd .claude/skills/markdown-to-docx
npm install
```

**Dependencies:** `markdown-docx`, `gray-matter`

## Quick Start

```bash
# Basic conversion
node .claude/skills/markdown-to-docx/scripts/convert.cjs --input ./README.md

# Specify output path
node .claude/skills/markdown-to-docx/scripts/convert.cjs -i ./doc.md -o ./output.docx

# With custom theme
node .claude/skills/markdown-to-docx/scripts/convert.cjs -i ./doc.md --theme ./theme.json
```

## CLI Options

| Option     | Short | Description         | Default        |
| ---------- | ----- | ------------------- | -------------- |
| `--input`  | `-i`  | Input markdown file | (required)     |
| `--output` | `-o`  | Output DOCX path    | `{input}.docx` |
| `--theme`  | `-t`  | Custom theme JSON   | built-in       |
| `--title`  |       | Document title      | filename       |
| `--help`   | `-h`  | Show help           |                |

## Features

- **GFM Support:** Tables, strikethrough, task lists
- **Code Blocks:** Syntax preserved with monospace font
- **Images:** Local and URL images embedded
- **Math:** LaTeX equations rendered by default (`$...$`, `$$...$$`)
- **Frontmatter:** YAML metadata extracted for title
- **No System Dependencies:** Pure JavaScript, no Chrome needed

## Output

Returns JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.md",
    "output": "/path/to/output.docx"
}
```

## Compatibility

Generated DOCX files work with:

- Microsoft Word (2007+)
- Google Docs (upload to Drive)
- LibreOffice Writer
- Apple Pages

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
