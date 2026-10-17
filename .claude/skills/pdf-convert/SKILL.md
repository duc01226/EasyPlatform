---
name: pdf-convert
version: 2.0.1
description: '[Document Processing] Use when converting between PDF and Markdown: text PDFs to Markdown (scanned PDFs are reported, not OCR''d), Markdown to styled PDF. --to={markdown|pdf}.'
disable-model-invocation: true
---

## Quick Summary

**Goal:** Convert PDF to Markdown, or Markdown to PDF, through one entry point.

**Summary:** Select the required direction → probe its dependencies → install only if missing → convert → check JSON status and the output file. Native text extraction and PDF rendering are supported; scanned-PDF OCR is unavailable.

**Workflow:**

1. **Pick a direction** — `--to markdown` (PDF in, Markdown out) or `--to pdf` (Markdown in, PDF out)
2. **Check that direction** — probe its dependencies; each has its own `package.json`, so install only missing dependencies for the selected direction
3. **Convert** — run `scripts/convert.cjs --to <direction>` with the direction's own options
4. **Output** — the converter returns JSON with the success status and output path

**Key Rules:**

- `--to` is required. There is no default direction — converting the wrong way silently is worse than an error.
- Every other argument is passed straight to the chosen converter, so each direction keeps its own CLI.
- Dependencies are per direction: `--to markdown` never pulls in the PDF renderer, and vice versa.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

## Contents

- [Quick Summary](#quick-summary)
- [pdf-convert](#pdf-convert)
- [Directions](#directions)
- [Installation Required](#installation-required)
- [Quick Start](#quick-start)
- [CLI Options](#cli-options)
- [Features](#features)
- [Conversion Modes (`--to markdown`)](#conversion-modes---to-markdown)
- [Default Styling (`--to pdf`)](#default-styling---to-pdf)
- [Output](#output)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [Tests](#tests)
- [Closing Reminders](#closing-reminders)

# pdf-convert

Convert PDF files to Markdown (with automatic detection of native text vs scanned documents) and
Markdown files to high-quality PDF (with code syntax highlighting and custom CSS).

## Directions

| Flag              | Converts        | Lives in     | Dependencies                             |
| ----------------- | --------------- | ------------ | ---------------------------------------- |
| `--to markdown`   | PDF → Markdown  | `to-markdown/` | `@opendocsg/pdf2md`, `pdfjs-dist`      |
| `--to pdf`        | Markdown → PDF  | `to-pdf/`      | `md-to-pdf`, `gray-matter`             |

## Installation Required

Use Node.js >=18 for PDF → Markdown; for Markdown → PDF, use the runtime range in `to-pdf/package.json`. From the project root, probe the selected consumer's dependencies with `createRequire` before installing:

```bash
node -e "const p=require('node:path'); const r=require('node:module').createRequire(p.resolve('.claude/skills/pdf-convert/to-markdown/package.json')); r.resolve('@opendocsg/pdf2md');"
node -e "const p=require('node:path'); const r=require('node:module').createRequire(p.resolve('.claude/skills/pdf-convert/to-pdf/package.json')); r.resolve('md-to-pdf'); r.resolve('gray-matter');"
```

**Each direction installs separately.** Run only the probe and setup for the direction you need; its manifest owns package versions. Install missing dependencies with:

```bash
# PDF -> Markdown
cd .claude/skills/pdf-convert/to-markdown
npm install

# Markdown -> PDF
cd .claude/skills/pdf-convert/to-pdf
npm install
```

`ck init` (which runs `install.sh`) handles every skill at once.

**Note:** `--to pdf` may download Chromium (~150MB) on first run unless system Chrome is detected.
Scanned-PDF OCR is unimplemented. Installing optional OCR packages does not enable it.

## Quick Start

```bash
# PDF -> Markdown (auto-detects native text vs scanned)
node .claude/skills/pdf-convert/scripts/convert.cjs --to markdown --input ./document.pdf

# PDF -> Markdown with an explicit output path and forced native mode
node .claude/skills/pdf-convert/scripts/convert.cjs --to markdown -i ./doc.pdf -o ./out.md --mode native

# Markdown -> PDF
node .claude/skills/pdf-convert/scripts/convert.cjs --to pdf --input ./README.md

# Markdown -> PDF with custom CSS
node .claude/skills/pdf-convert/scripts/convert.cjs --to pdf -i ./doc.md --css ./my-style.css
```

`--to=markdown` and `--to markdown` are equivalent. A missing or unknown `--to` prints the valid
directions and exits 1.

## CLI Options

### Dispatcher

| Option   | Description                                    | Default    |
| -------- | ---------------------------------------------- | ---------- |
| `--to`   | Conversion direction: `markdown` or `pdf`      | (required) |

### `--to markdown` (PDF → Markdown)

| Option     | Short | Description                              | Default      |
| ---------- | ----- | ---------------------------------------- | ------------ |
| `--input`  | `-i`  | Input PDF file path                      | (required)   |
| `--output` | `-o`  | Output markdown file path                | `{input}.md` |
| `--mode`   | `-m`  | Conversion mode: `auto`, `native`, `ocr` | `auto`       |
| `--help`   | `-h`  | Show help message                        |              |

### `--to pdf` (Markdown → PDF)

| Option           | Short | Description                 | Default       |
| ---------------- | ----- | --------------------------- | ------------- |
| `--input`        | `-i`  | Input markdown file path    | (required)    |
| `--output`       | `-o`  | Output PDF file path        | `{input}.pdf` |
| `--css`          | `-c`  | Custom CSS file path        | built-in      |
| `--no-highlight` |       | Disable syntax highlighting | false         |
| `--help`         | `-h`  | Show help message           |               |

Run `scripts/convert.cjs --to <direction> --help` to see a direction's full help.

## Features

**PDF → Markdown**

- **Auto-Detection:** determines whether the PDF has native text or needs OCR
- **Native PDFs:** fast extraction via `@opendocsg/pdf2md`
- **Tables:** basic table structure preservation
- **No System Dependencies:** pure JavaScript

**Markdown → PDF**

- **Syntax Highlighting:** code blocks rendered with highlight.js
- **Custom CSS:** override the default stylesheet with your own
- **System Chrome:** uses installed Chrome/Chromium when available
- **Frontmatter Support:** YAML frontmatter supplies the title and metadata

Both directions work on Windows, macOS and Linux.

## Conversion Modes (`--to markdown`)

### Auto (default)

Checks whether the first page has extractable text. Uses native extraction if it does, otherwise
reports that the document appears to be scanned.

### Native

Fast direct text extraction. Best for PDFs with selectable text.

### OCR (scanned PDFs) — unsupported

The converter returns a failure for OCR mode. Report the limitation for scanned documents; native mode is suitable only when the PDF contains selectable text.

## Default Styling (`--to pdf`)

- Serif body font (Georgia), monospace code font (Consolas/Monaco)
- 2cm page margins
- Code block background highlighting
- Table borders with alternating row colors

Override any of it with `--css`.

## Output

Both directions return JSON on success:

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

`--to pdf` returns `pages` instead of `stats`. On failure both return
`{ "success": false, "error": "..." }` and exit 1.

## Limitations

- Complex multi-column layouts may not preserve structure
- Scanned PDFs cannot be transcribed by this converter
- Mathematical formulas may not convert perfectly
- Large documents converted to PDF may need more memory — consider splitting the input

## Troubleshooting

**Chrome not found (`--to pdf`):** the converter downloads Chromium automatically. Set
`PUPPETEER_SKIP_DOWNLOAD=1` to prevent that.

**Missing dependencies:** the error output carries a `hint` with the exact `cd … && npm install`
command for the direction you invoked.

**Font issues:** embed fonts via CSS `@font-face` with base64-encoded fonts for consistent rendering.

## Tests

```bash
cd .claude/skills/pdf-convert && node tests/dispatcher.test.cjs   # routing and --to validation
cd .claude/skills/pdf-convert/to-markdown && node tests/run-tests.cjs
cd .claude/skills/pdf-convert/to-pdf && node tests/run-tests.cjs
```

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting. This prevents context loss from long files. Keep task depth proportional to the work.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Convert PDF to Markdown, or Markdown to PDF, through one entry point — `scripts/convert.cjs --to {markdown|pdf}`.

**MUST ATTENTION Route:** select direction → probe dependencies → install only if missing → convert → verify JSON status and the output file. Report unsupported OCR; optional package installation cannot enable it.

**IMPORTANT MUST ATTENTION** `--to` is required — never guess the direction for the user
**IMPORTANT MUST ATTENTION** each direction installs its own dependencies; the error `hint` names the exact directory
**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
