---
name: markdown-to-docx
version: 1.0.0
description: '[Document Processing] Use when you need to convert markdown files to Microsoft Word ( DOCX) format with GFM support and math rendering.'
disable-model-invocation: false
---

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

**MUST ATTENTION Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** traced `file:line` proof, confidence >80% to act, NEVER guess as fact.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
