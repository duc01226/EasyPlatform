---
name: pdf-to-markdown
version: 1.0.0
description: '[Document Processing] Convert PDF files to Markdown with support for native text PDFs and scanned documents (OCR). Cross-platform.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Convert PDF files to well-formatted Markdown with auto-detection of native text vs scanned documents.

**Workflow:**

1. **Auto-Detect** — Determine if PDF has native text or needs OCR
2. **Convert** — Run `scripts/convert.cjs` with input path and optional mode/output flags
3. **Output** — Returns JSON with success status, page count, and output path

**Key Rules:**

- Use `--mode auto` (default) to let the tool decide native vs OCR
- OCR for scanned PDFs requires additional `tesseract.js` setup
- Complex multi-column layouts may not preserve structure perfectly

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# pdf-to-markdown

Convert PDF files to Markdown format with automatic detection of native text vs scanned documents.

## Installation Required

**This skill requires npm dependencies.** Run one of the following:

```bash
# Option 1: Install via ClaudeKit CLI (recommended)
ck init  # Runs install.sh which handles all skills

# Option 2: Manual installation
cd .claude/skills/pdf-to-markdown
npm install
```

**Dependencies:** `@opendocsg/pdf2md` (native PDFs), `pdfjs-dist` (PDF parsing)

**Note:** OCR for scanned PDFs requires additional setup (see OCR section).

## Quick Start

```bash
# Basic conversion (auto-detect native vs scanned)
node .claude/skills/pdf-to-markdown/scripts/convert.cjs --input ./document.pdf

# Specify output path
node .claude/skills/pdf-to-markdown/scripts/convert.cjs -i ./doc.pdf -o ./output.md

# Force native mode (skip OCR detection)
node .claude/skills/pdf-to-markdown/scripts/convert.cjs -i ./doc.pdf --mode native
```

## CLI Options

| Option     | Short | Description                              | Default      |
| ---------- | ----- | ---------------------------------------- | ------------ |
| `--input`  | `-i`  | Input PDF file path                      | (required)   |
| `--output` | `-o`  | Output markdown file path                | `{input}.md` |
| `--mode`   | `-m`  | Conversion mode: `auto`, `native`, `ocr` | `auto`       |
| `--help`   | `-h`  | Show help message                        |              |

## Features

- **Auto-Detection:** Automatically determines if PDF has native text or requires OCR
- **Native PDFs:** Fast extraction using @opendocsg/pdf2md
- **Tables:** Basic table structure preservation
- **Cross-Platform:** Works on Windows, macOS, Linux
- **No System Dependencies:** Pure JavaScript implementation

## Conversion Modes

### Auto (Default)

Checks if PDF has extractable text on first page. Uses native extraction if text found, otherwise falls back to OCR warning.

### Native

Fast direct text extraction. Best for PDFs with selectable text (not scanned images).

### OCR (Scanned PDFs) - Coming Soon

For scanned documents. Currently not implemented - the skill will notify you if a PDF appears to be scanned.

## Output

Returns JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.pdf",
    "output": "/path/to/output.md",
    "stats": {
        "pages": 5,
        "mode": "native"
    }
}
```

## Limitations

- Complex multi-column layouts may not preserve structure
- Scanned PDF OCR accuracy depends on image quality
- Mathematical formulas may not convert perfectly
- First-run OCR downloads language data (~15MB)

## OCR Setup (Optional)

For scanned PDF support, install additional dependencies:

```bash
npm install tesseract.js pdfjs-dist canvas
```

**Note:** The `canvas` package may require build tools on some systems.

---

<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:
**Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
**Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
**Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
**Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
**When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
**Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
**Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
**Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
**Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
**Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
