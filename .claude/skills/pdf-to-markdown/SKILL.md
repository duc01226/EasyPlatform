---
name: pdf-to-markdown
version: 1.0.0
description: '[Document Processing] Use when you need to convert PDF files to Markdown with support for native text PDFs and scanned documents (OCR).'
disable-model-invocation: false
---

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
- **Cross-OS:** Works on Windows, macOS, Linux
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

**IMPORTANT MUST ATTENTION Goal:** Convert PDF files to well-formatted Markdown with auto-detection of native text vs scanned documents.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Sequential thinking, traced `file:line` proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
