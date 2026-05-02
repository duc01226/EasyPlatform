---
name: docx-to-markdown
version: 1.0.0
description: '[Document Processing] Convert Microsoft Word (.docx) files to Markdown with GFM support (tables, images, code blocks). Cross-platform.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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
- **Cross-Platform:** Works on Windows, macOS, Linux

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

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MANDATORY IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
