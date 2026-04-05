---
name: scan-all
version: 1.0.0
description: '[Documentation] Orchestrate all reference doc scans in parallel. Refreshes all 11 docs/project-reference/ files and clears the staleness gate. Use for project onboarding, periodic refresh, or when the staleness gate blocks prompts.'
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

**Goal:** Run all 11 scan-\* skills in parallel and clear the staleness gate.

**Workflow:**

1. **Check Prerequisites** — Verify project has content (not empty)
2. **Launch Parallel Scans** — All 11 skills simultaneously
3. **Collect Results** — Read scan output from reference docs
4. **Clear Staleness Flag** — Remove `.claude/.scan-stale` so the gate unblocks
5. **Build Knowledge Graph** — Run `/graph-build` to update structural graph
6. **Enhance Docs** — Run `/prompt-enhance` on all 11 scanned docs
7. **Summarize** — Report what was refreshed

**Key Rules:**

- All 11 scans run in PARALLEL for speed
- Does NOT modify code — only populates docs/project-reference/
- Clears `.claude/.scan-stale` flag after completion
- `/prompt-enhance` ensures AI attention anchoring on all generated docs

## When to Use

- Staleness gate blocks prompts ("BLOCKED: Reference docs are stale")
- First time using easy-claude on an existing project (project onboarding)
- Periodic refresh when codebase has changed significantly
- User runs `/scan-all` manually

## When to Skip

- Empty/greenfield project (no code to scan)
- All reference docs are already fresh (no staleness warning)

## Execution

Launch all 11 scan skills in parallel:

| #   | Skill                     | Target Doc                       |
| --- | ------------------------- | -------------------------------- |
| 1   | `/scan-project-structure` | `project-structure-reference.md` |
| 2   | `/scan-backend-patterns`  | `backend-patterns-reference.md`  |
| 3   | `/scan-frontend-patterns` | `frontend-patterns-reference.md` |
| 4   | `/scan-integration-tests` | `integration-test-reference.md`  |
| 5   | `/scan-feature-docs`      | `feature-docs-reference.md`      |
| 6   | `/scan-code-review-rules` | `code-review-rules.md`           |
| 7   | `/scan-scss-styling`      | `scss-styling-guide.md`          |
| 8   | `/scan-design-system`     | `design-system/README.md`        |
| 9   | `/scan-e2e-tests`         | `e2e-test-reference.md`          |
| 10  | `/scan-domain-entities`   | `domain-entities-reference.md`   |
| 11  | `/scan-docs-index`        | `docs-index-reference.md`        |

## Post-Scan Cleanup

After all scans complete, clear the staleness flag:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

This re-evaluates all docs and removes the `.scan-stale` gate if all are now fresh.

## Post-Scan: Build Knowledge Graph (MANDATORY)

After all scans complete, **MUST ATTENTION create a follow-up task:**

**TaskCreate: "Run /graph-build to build/update code knowledge graph"**

The knowledge graph uses `project-config.json` (populated by scans) for API connector patterns and implicit connection rules. Building the graph after scans ensures:

- Frontend↔backend API_ENDPOINT edges use accurate service paths
- MESSAGE_BUS implicit edges use correct consumer patterns
- Graph trace shows full system flow (frontend → backend → cross-service consumers)

```bash
python .claude/scripts/code_graph build --json
```

## Post-Scan: Enhance Generated Docs (MANDATORY)

After graph build, **MUST ATTENTION create tasks to run `/prompt-enhance` on all scanned docs.** Reference docs are injected into AI context — attention anchoring (top/bottom summaries, inline READ summaries, token density) directly improves AI output quality.

**TaskCreate one task per doc, parallel OK:**

| #   | Target File                                             |
| --- | ------------------------------------------------------- |
| 1   | `docs/project-reference/project-structure-reference.md` |
| 2   | `docs/project-reference/backend-patterns-reference.md`  |
| 3   | `docs/project-reference/frontend-patterns-reference.md` |
| 4   | `docs/project-reference/integration-test-reference.md`  |
| 5   | `docs/project-reference/feature-docs-reference.md`      |
| 6   | `docs/project-reference/code-review-rules.md`           |
| 7   | `docs/project-reference/scss-styling-guide.md`          |
| 8   | `docs/project-reference/design-system/README.md`        |
| 9   | `docs/project-reference/e2e-test-reference.md`          |
| 10  | `docs/project-reference/domain-entities-reference.md`   |
| 11  | `docs/project-reference/docs-index-reference.md`        |

Run via: `/prompt-enhance docs/project-reference/{filename}`

## Summary Output

After all scans complete, report:

"Scan All Complete:

- {X}/11 scans succeeded
- Reference docs refreshed in docs/project-reference/
- Staleness gate cleared
- Prompt-enhanced {Y}/11 docs
- Knowledge graph rebuilt via /graph-build"

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  <!-- SYNC:output-quality-principles:reminder -->
- **IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.
  <!-- /SYNC:output-quality-principles:reminder -->
