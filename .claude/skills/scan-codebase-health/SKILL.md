---
name: scan-codebase-health
version: 1.0.0
description: '[Documentation] Detect codebase health issues: unused exports, doc count-drift, orphan files, stale config references. Generic — reads project structure from project-config.json dynamically.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — AI can `grep | wc -l`. Counts go stale instantly
> 2. No directory trees — AI can `glob`/`ls`. Use 1-line path conventions
> 3. No TOCs — AI reads linearly. TOC wastes tokens
> 4. No examples that repeat what rules say — one example only if non-obvious
> 5. Lead with answer, not reasoning. Skip filler words and preamble
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end, if any

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Detect structural rot in AI-assisted codebases — dead code, count-drift, orphan files, stale configs. Works on any project via `docs/project-config.json`.

**Workflow:**

1. **Read Config** — Load `docs/project-config.json` for source paths, doc paths, config patterns
2. **Run Detections** — Execute 5 detection categories (graph-dependent checks skipped if no graph.db)
3. **Generate Report** — Write findings to `plans/reports/codebase-health-scan-{YYMMDD}.md`
4. **Present Summary** — Show actionable findings with severity levels

**Key Rules:**

- Generic — reads all paths from project-config.json, never hardcodes project names
- Graceful degradation — graph-dependent checks skipped if `.code-graph/graph.db` not found
- Report format — each finding has file path, category, severity (HIGH/MEDIUM/LOW), suggested action

# Scan Codebase Health

## Phase 0: Read Configuration

Read `docs/project-config.json` for the `codebaseHealth` section:

```json
{
    "codebaseHealth": {
        "sourcePaths": ["src/"],
        "docPaths": ["docs/"],
        "configPatterns": ["**/appsettings*.json", "**/environment*.ts"],
        "excludePaths": ["node_modules", "dist", "bin", "obj"]
    }
}
```

If `codebaseHealth` section is missing, use defaults: `sourcePaths: ["src/"]`, `docPaths: ["docs/"]`, `configPatterns: []`, `excludePaths: ["node_modules", "dist", "bin", "obj"]`.

## Phase 1: Doc Count-Drift Detection (No Graph Required)

Scan `docs/` for numeric claims like "N files", "N tests", "N hooks", "N services", "N skills".
For each claim found:

1. Extract the number and what it counts
2. Glob/grep to verify the actual count
3. Flag if actual differs from claimed (drift)

**Example:** Doc says "133 markdown files" → glob `docs/**/*.md` → actual is 135 → flag as MEDIUM drift.

## Phase 2: Stale Config Reference Detection (No Graph Required)

For each file matching `configPatterns`:

1. Extract class names, module names, or connection strings referenced
2. Grep codebase to verify each reference still exists
3. Flag missing references as HIGH severity

## Phase 3: Unused Exports Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist.**

For key exported symbols in source files:

1. Run `python .claude/scripts/code_graph query importers_of <symbol> --json`
2. Flag symbols with zero importers as MEDIUM severity
3. Focus on public API surface (exported classes, functions, constants)

## Phase 4: Orphan File Detection (Graph Required)

**Skip if `.code-graph/graph.db` does not exist.**

Find source files (.ts, .cs, .py, etc.) with zero inbound edges:

1. Run `python .claude/scripts/code_graph query importers_of <file> --json`
2. Flag files with zero importers as LOW severity (may be entry points)
3. Exclude known entry points (main files, test files, config files)

## Phase 5: Pattern Drift Detection (No Graph Required)

Compare the same pattern across services/modules:

1. Pick a pattern (e.g., repository registration, service configuration)
2. Grep across all services/modules
3. Flag inconsistencies as MEDIUM severity

## Phase 6: Generate Report

Write to `plans/reports/codebase-health-scan-{YYMMDD}.md`:

```markdown
# Codebase Health Scan Report

**Date:** {YYYY-MM-DD}
**Categories Scanned:** {N}/5
**Findings:** {total} ({HIGH} high, {MEDIUM} medium, {LOW} low)

## Summary

| Category          | Status          | Findings   |
| ----------------- | --------------- | ---------- |
| Doc Count-Drift   | Scanned         | N findings |
| Stale Config Refs | Scanned         | N findings |
| Unused Exports    | Scanned/Skipped | N findings |
| Orphan Files      | Scanned/Skipped | N findings |
| Pattern Drift     | Scanned         | N findings |

## Findings

### HIGH Severity

- {file}: {description} — Suggested action: {action}

### MEDIUM Severity

- {file}: {description} — Suggested action: {action}

### LOW Severity

- {file}: {description} — Suggested action: {action}
```

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
    <!-- SYNC:output-quality-principles:reminder -->
- **MUST** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
    <!-- /SYNC:output-quality-principles:reminder -->
