---
name: plans-kanban
version: 1.0.0
description: '[Planning] Plans dashboard server with progress tracking and timeline visualization.'
disable-model-invocation: true
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**Goal:** Visual dashboard server for viewing plan directories with progress tracking and timeline visualization.

**Workflow:**

1. **Start Server** — Point at a plans directory with CLI options
2. **Browse Dashboard** — View plan cards with progress bars, phase status, activity heatmap
3. **Inspect Plans** — Gantt-style timeline, priority indicators, issue/branch links

**Key Rules:**

- Requires `npm install` before first use (gray-matter)
- Use `/kanban` slash command for quick access
- Scans for directories containing `plan.md` files

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# plans-kanban

Plans dashboard server with progress tracking and timeline visualization.

## ⚠️ Installation Required

**This skill requires npm dependencies.** Run one of the following:

```bash
# Option 1: Install via ClaudeKit CLI (recommended)
ck init  # Runs install.sh which handles all skills

# Option 2: Manual installation
cd .claude/skills/plans-kanban
npm install
```

**Dependencies:** `gray-matter`

Without installation, you'll get **Error 500** when viewing plan details.

## Purpose

Visual dashboard for viewing plan directories with:

- Progress tracking per plan
- Timeline/Gantt visualization
- Phase status indicators
- Activity heatmap

## Quick Start

```bash
# View plans dashboard
node .claude/skills/plans-kanban/scripts/server.cjs \
  --dir ./plans \
  --open

# Explicit local host
node .claude/skills/plans-kanban/scripts/server.cjs \
  --dir ./plans \
  --host localhost \
  --open

# Background mode
node .claude/skills/plans-kanban/scripts/server.cjs \
  --dir ./plans \
  --background

# Stop all running servers
node .claude/skills/plans-kanban/scripts/server.cjs --stop
```

## Slash Command

Use `/kanban` for quick access:

```bash
/kanban plans/           # View plans dashboard
/kanban --stop           # Stop kanban server
```

## Features

### Dashboard View

- Plan cards with progress bars
- Phase status breakdown (completed, in-progress, pending)
- Last modified timestamps
- Issue and branch links
- Priority indicators

### Timeline Visualization

- Gantt-style timeline of plans
- Duration tracking
- Activity heatmap

### Design

- Glassmorphism UI with dark mode
- Responsive grid layout
- Warm accent colors

## CLI Options

| Option            | Description       | Default   |
| ----------------- | ----------------- | --------- |
| `--dir <path>`    | Plans directory   | -         |
| `--port <number>` | Server port       | 3500      |
| `--host <addr>`   | Host to bind      | localhost |
| `--open`          | Auto-open browser | false     |
| `--background`    | Run in background | false     |
| `--stop`          | Stop all servers  | -         |

## Architecture

```
scripts/
├── server.cjs               # Main entry point
└── lib/
    ├── port-finder.cjs      # Port allocation (3500-3550)
    ├── process-mgr.cjs      # PID management
    ├── http-server.cjs      # HTTP routing
    ├── plan-parser.cjs      # Plan.md parsing
    ├── plan-scanner.cjs     # Directory scanning
    ├── plan-metadata-extractor.cjs  # Rich metadata
    └── dashboard-renderer.cjs       # HTML generation

assets/
├── dashboard-template.html  # Dashboard HTML template
├── dashboard.css           # Styles
└── dashboard.js            # Client interactivity
```

## HTTP Routes

| Route                   | Description                      |
| ----------------------- | -------------------------------- |
| `/` or `/kanban`        | Dashboard view                   |
| `/kanban?dir=<path>`    | Dashboard for specific directory |
| `/api/plans`            | JSON API for plans data          |
| `/api/plans?dir=<path>` | JSON API for specific directory  |
| `/assets/*`             | Static assets                    |
| `/file/*`               | Local file serving               |

## Local Access

Start on localhost unless you have explicitly accepted the network exposure of serving local files:

```json
{
    "success": true,
    "url": "http://localhost:3500/kanban?dir=...",
    "port": 3500
}
```

## Plan Structure

The dashboard scans for directories containing `plan.md` files:

```
plans/
├── 251215-feature-a/
│   ├── plan.md              # Required - parsed for phases
│   ├── phase-01-setup.md
│   └── phase-02-impl.md
├── 251214-feature-b/
│   └── plan.md
└── templates/               # Excluded by default
```

## Troubleshooting

**Port in use**: Server auto-increments from 3500-3550

**No plans found**: Ensure directories contain `plan.md` files

**Remote access denied**: This dashboard is intended for local use; keep `--host localhost` unless you have explicitly accepted the network exposure.

**PID files**: Located at `/tmp/plans-kanban-*.pid`

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
**IMPORTANT MUST ATTENTION** include Test Specifications section and story_points in plan frontmatter

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
