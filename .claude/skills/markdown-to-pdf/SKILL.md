---
name: markdown-to-pdf
version: 1.0.0
description: '[Document Processing] Use when you need to convert markdown files to PDF with syntax highlighting and custom CSS support.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Convert Markdown files to PDF with syntax highlighting and custom CSS support.

**Workflow:**

1. **Install** -- Ensure required tools (pandoc + wkhtmltopdf or weasyprint) are available
2. **Convert** -- Run conversion with syntax highlighting and optional CSS
3. **Verify** -- Check PDF output for formatting and completeness

**Key Rules:**

- Requires pandoc + a PDF engine (wkhtmltopdf or weasyprint)
- Supports syntax highlighting for code blocks
- Custom CSS can be applied for styling

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# markdown-to-pdf

Convert markdown files to high-quality PDF documents with code syntax highlighting and custom CSS support.

## Installation Required

**This skill requires npm dependencies.** Run one of the following:

```bash
# Option 1: Install via ClaudeKit CLI (recommended)
ck init  # Runs install.sh which handles all skills

# Option 2: Manual installation
cd .claude/skills/markdown-to-pdf
npm install
```

**Dependencies:** `md-to-pdf`, `gray-matter`

**Note:** First run may download Chromium (~150MB) unless system Chrome is detected.

## Quick Start

```bash
# Basic conversion
node .claude/skills/markdown-to-pdf/scripts/convert.cjs --input ./README.md

# Specify output path
node .claude/skills/markdown-to-pdf/scripts/convert.cjs --input ./doc.md --output ./output.pdf

# With custom CSS
node .claude/skills/markdown-to-pdf/scripts/convert.cjs --input ./doc.md --css ./my-style.css
```

## CLI Options

| Option           | Short | Description                 | Default       |
| ---------------- | ----- | --------------------------- | ------------- |
| `--input`        | `-i`  | Input markdown file path    | (required)    |
| `--output`       | `-o`  | Output PDF file path        | `{input}.pdf` |
| `--css`          | `-c`  | Custom CSS file path        | built-in      |
| `--no-highlight` |       | Disable syntax highlighting | false         |
| `--help`         | `-h`  | Show help message           |               |

## Features

- **Syntax Highlighting:** Code blocks rendered with highlight.js
- **Custom CSS:** Override default styles with your own CSS
- **Cross-OS:** Works on Windows, macOS, Linux
- **System Chrome:** Uses installed Chrome/Chromium when available
- **Frontmatter Support:** YAML frontmatter extracted for title/metadata

## Default Styling

The default PDF style includes:

- Serif font (Georgia) for body text
- Monospace font (Consolas/Monaco) for code
- Proper page margins (2cm)
- Code block background highlighting
- Table borders and alternating row colors

## Output

Returns JSON on success:

```json
{
    "success": true,
    "input": "/path/to/input.md",
    "output": "/path/to/output.pdf",
    "pages": 3
}
```

## Troubleshooting

**Chrome not found:** The skill will automatically download Chromium. Set `PUPPETEER_SKIP_DOWNLOAD=1` to prevent this.

**Memory issues:** Large documents may require more memory. Consider splitting into multiple files.

**Font issues:** Embed fonts via CSS `@font-face` with base64-encoded fonts for consistent rendering.

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

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act; NEVER present guess as fact.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
