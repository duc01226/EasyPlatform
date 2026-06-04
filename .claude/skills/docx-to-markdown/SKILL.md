---
name: docx-to-markdown
version: 1.0.0
description: '[Document Processing] Use when you need to convert Microsoft Word ( DOCX) files to Markdown with GFM support (tables, images, code blocks).'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Convert Microsoft Word (.docx) files to Markdown with GFM support (tables, images, formatting).

**Workflow:**

1. **Install** -- Ensure pandoc is available (required dependency)
2. **Convert** -- Run pandoc with GFM output format and image extraction
3. **Clean** -- Post-process markdown for consistency

**Key Rules:**

- Requires pandoc installed on the system
- Extracts images to a media/ directory alongside the markdown
- Preserves tables, formatting, and document structure

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# docx-to-markdown

Convert Microsoft Word (.docx) files to Markdown format with GitHub-Flavored Markdown support.

## Installation Required

**This skill requires npm dependencies.** Run one of the following:

```bash
# Option 1: Install via ClaudeKit CLI (recommended)
ck init  # Runs install.sh which handles all skills

# Option 2: Manual installation
cd .claude/skills/docx-to-markdown
npm install
```

**Dependencies:** `mammoth`, `turndown`, `turndown-plugin-gfm`

## Quick Start

```bash
# Basic conversion
node .claude/skills/docx-to-markdown/scripts/convert.cjs --input ./document.docx

# Specify output path
node .claude/skills/docx-to-markdown/scripts/convert.cjs -i ./doc.docx -o ./output.md

# Preserve images to folder
node .claude/skills/docx-to-markdown/scripts/convert.cjs -i ./doc.docx --images ./images/
```

## CLI Options

| Option     | Short | Description                    | Default       |
| ---------- | ----- | ------------------------------ | ------------- |
| `--input`  | `-i`  | Input DOCX file path           | (required)    |
| `--output` | `-o`  | Output markdown file path      | `{input}.md`  |
| `--images` |       | Directory for extracted images | inline base64 |
| `--help`   | `-h`  | Show help message              |               |

## Features

- **GFM Tables:** Properly converts Word tables to markdown tables
- **Images:** Extracts embedded images (base64 inline or to folder)
- **Lists:** Ordered and unordered lists preserved
- **Code Blocks:** Monospace text converted to code blocks
- **Links:** Hyperlinks preserved
- **Headings:** Heading levels maintained
- **Cross-OS:** Works on Windows, macOS, Linux

## Conversion Pipeline

```
DOCX → mammoth → HTML → turndown → Markdown
```

The two-stage conversion (DOCX→HTML→MD) follows mammoth's official recommendation for best results.

## Output

Returns JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.docx",
    "output": "/path/to/output.md",
    "stats": {
        "images": 3,
        "tables": 2,
        "headings": 5
    }
}
```

## Limitations

- Complex layouts (columns, text boxes) may not preserve structure
- Merged table cells produce basic markdown tables
- Comments and track changes are stripped
- Some formatting (fonts, colors) lost in conversion

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

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** MUST ATTENTION sequential thinking, traced `file:line` proof, confidence >80% to act.

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
