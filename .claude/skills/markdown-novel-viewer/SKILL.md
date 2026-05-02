---
name: markdown-novel-viewer
version: 1.0.0
description: '[Content] Background HTTP server rendering markdown files with calm, book-like reading experience.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

**Server won't stop**: Check `/tmp/md-novel-viewer-*.pid` for stale PID files

**Remote access denied**: This viewer is intended for local use; keep `--host localhost` unless you have explicitly accepted the network exposure.

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
