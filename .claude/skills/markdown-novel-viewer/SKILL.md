---
name: markdown-novel-viewer
version: 1.0.0
description: '[Content] Use when you need background HTTP server rendering markdown files with calm, book-like reading experience.'
disable-model-invocation: false
---

## Quick Summary

**Goal:** Background HTTP server that renders markdown files with a calm, book-like reading UI and browses directories.

**Workflow:**

1. **Start Server** — Point at a markdown file or directory with CLI options
2. **View Content** — Novel-themed reader (serif fonts, warm colors) or directory browser
3. **Navigate Plans** — Auto-detects plan structures with sidebar, phase status, keyboard shortcuts

**Key Rules:**

- Requires `npm install` before first use (marked, highlight.js, gray-matter)
- Use `/preview` slash command for quick access
- Supports background mode with local-only defaults

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# markdown-novel-viewer

Background HTTP server rendering markdown files with calm, book-like reading experience.

## ⚠️ Installation Required

**This skill requires npm dependencies.** Run one of the following:

```bash
# Option 1: Install via ClaudeKit CLI (recommended)
ck init  # Runs install.sh which handles all skills

# Option 2: Manual installation
cd .claude/skills/markdown-novel-viewer
npm install
```

**Dependencies:** `marked`, `highlight.js`, `gray-matter`

Without installation, you'll get **Error 500: Error rendering markdown**.

## Purpose

Universal viewer - pass ANY path and view it:

- **Markdown files** → novel-reader UI with serif fonts, warm theme
- **Directories** → file listing browser with clickable links

## Quick Start

```bash
# View a markdown file
node .claude/skills/markdown-novel-viewer/scripts/server.cjs \
  --file ./plans/my-plan/plan.md \
  --open

# Browse a directory
node .claude/skills/markdown-novel-viewer/scripts/server.cjs \
  --dir ./plans \
  --host localhost \
  --open

# Background mode
node .claude/skills/markdown-novel-viewer/scripts/server.cjs \
  --file ./README.md \
  --background

# Stop all running servers
node $HOME/.claude/skills/markdown-novel-viewer/scripts/server.cjs --stop
```

## Slash Command

Use `/preview` for quick access:

```bash
/preview plans/my-plan/plan.md    # View markdown file
/preview plans/                   # Browse directory
/preview --stop                   # Stop server
```

## Features

### Novel Theme

- Warm cream background (light mode)
- Dark mode with warm gold accents
- Libre Baskerville serif headings
- Inter body text, JetBrains Mono code
- Maximum 720px content width

### Directory Browser

- Clean file listing with emoji icons
- Markdown files link to viewer
- Folders link to sub-directories
- Parent directory navigation (..)
- Light/dark mode support

### Plan Navigation

- Auto-detects plan directory structure
- Sidebar shows all phases with status indicators
- Previous/Next navigation buttons
- Keyboard shortcuts: Arrow Left/Right

### Keyboard Shortcuts

- `T` - Toggle theme
- `S` - Toggle sidebar
- `Left/Right` - Navigate phases
- `Escape` - Close sidebar (mobile)

## CLI Options

| Option            | Description           | Default   |
| ----------------- | --------------------- | --------- |
| `--file <path>`   | Markdown file to view | -         |
| `--dir <path>`    | Directory to browse   | -         |
| `--port <number>` | Server port           | 3456      |
| `--host <addr>`   | Host to bind          | localhost |
| `--open`          | Auto-open browser     | false     |
| `--background`    | Run in background     | false     |
| `--stop`          | Stop all servers      | -         |

## Architecture

```
scripts/
├── server.cjs               # Main entry point
└── lib/
    ├── port-finder.cjs      # Dynamic port allocation
    ├── process-mgr.cjs      # PID file management
    ├── http-server.cjs      # Core HTTP routing (/view, /browse)
    ├── markdown-renderer.cjs # MD→HTML conversion
    └── plan-navigator.cjs   # Plan detection & nav

assets/
├── template.html            # Markdown viewer template
├── novel-theme.css          # Combined light/dark theme
├── reader.js                # Client-side interactivity
├── directory-browser.css    # Directory browser styles
```

## HTTP Routes

| Route                | Description                 |
| -------------------- | --------------------------- |
| `/view?file=<path>`  | Markdown file viewer        |
| `/browse?dir=<path>` | Directory browser           |
| `/assets/*`          | Static assets               |
| `/file/*`            | Local file serving (images) |

## Dependencies

- Node.js built-in: `http`, `fs`, `path`, `net`
- npm: `marked`, `highlight.js`, `gray-matter` (installed via `npm install`)

## Customization

### Theme Colors (CSS Variables)

Light mode variables in `assets/novel-theme.css`:

```css
--bg-primary: #faf8f3; /* Warm cream */
--accent: #8b4513; /* Saddle brown */
```

Dark mode:

```css
--bg-primary: #1a1a1a; /* Near black */
--accent: #d4a574; /* Warm gold */
```

### Content Width

```css
--content-width: 720px;
```

## Local Access

Start on localhost unless you have explicitly accepted the network exposure of serving local files:

```bash
# Start locally
node server.cjs --file ./README.md --host localhost --port 3456
```

The server returns the local URL in its output:

```json
{
    "success": true,
    "url": "http://localhost:3456/view?file=...",
    "port": 3456
}
```

## Troubleshooting

**Port in use**: Server auto-increments to next available port (3456-3500)

**Images not loading**: Ensure image paths are relative to markdown file

**Server won't stop**: Check the OS temp directory (`os.tmpdir()`, usually `%TEMP%` on Windows) for `md-novel-viewer-*.pid` stale PID files

**Remote access denied**: This viewer is intended for local use; keep `--host localhost` unless you have explicitly accepted the network exposure.

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
- **Critical Thinking:** sequential reasoning, traced `file:line` proof, confidence >80% to act.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
