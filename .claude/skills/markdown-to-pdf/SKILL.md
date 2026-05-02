---
name: markdown-to-pdf
version: 1.0.0
description: '[Document Processing] Convert markdown files to PDF with syntax highlighting and custom CSS support. Cross-platform (Windows, macOS, Linux).'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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
- **Cross-Platform:** Works on Windows, macOS, Linux
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
