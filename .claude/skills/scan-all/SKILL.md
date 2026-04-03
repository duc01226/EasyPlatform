---
name: scan-all
version: 1.0.0
description: '[Documentation] Orchestrate all reference doc scans in parallel. Refreshes all 11 docs/project-reference/ files and clears the staleness gate. Use for project onboarding, periodic refresh, or when the staleness gate blocks prompts.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

> **Output Quality** — Reference docs are injected into AI context. No inventories/counts, no TOCs, no directory trees, no checkboxes. Rules > descriptions. 1 example per pattern. Tables > prose. Primacy-recency anchoring (critical rules in first AND last 5 lines).
> MUST READ `.claude/skills/shared/output-quality-principles.md` for full 10-rule protocol.

## Quick Summary

**Goal:** Run all 11 scan-\* skills in parallel and clear the staleness gate.

**Workflow:**

1. **Check Prerequisites** — Verify project has content (not empty)
2. **Launch Parallel Scans** — All 10 skills simultaneously
3. **Collect Results** — Read scan output from reference docs
4. **Clear Staleness Flag** — Remove `.claude/.scan-stale` so the gate unblocks
5. **Summarize** — Report what was refreshed

**Key Rules:**

- All 10 scans run in PARALLEL for speed
- Does NOT modify code — only populates docs/project-reference/
- Clears `.claude/.scan-stale` flag after completion

## When to Use

- Staleness gate blocks prompts ("BLOCKED: Reference docs are stale")
- First time using easy-claude on an existing project (project onboarding)
- Periodic refresh when codebase has changed significantly
- User runs `/scan-all` manually

## When to Skip

- Empty/greenfield project (no code to scan)
- All reference docs are already fresh (no staleness warning)

## Execution

Launch all 10 scan skills in parallel:

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

After all scans complete, **MUST create a follow-up task:**

**TaskCreate: "Run /graph-build to build/update code knowledge graph"**

The knowledge graph uses `project-config.json` (populated by scans) for API connector patterns and implicit connection rules. Building the graph after scans ensures:

- Frontend↔backend API_ENDPOINT edges use accurate service paths
- MESSAGE_BUS implicit edges use correct consumer patterns
- Graph trace shows full system flow (frontend → backend → cross-service consumers)

```bash
python .claude/scripts/code_graph build --json
```

## Summary Output

After all scans complete, report:

"Scan All Complete:

- {X}/10 scans succeeded
- Reference docs refreshed in docs/project-reference/
- Staleness gate cleared
- Next: Run /graph-build to build code knowledge graph"

---

## Closing Reminders

- **MUST** break work into small todo tasks using `TaskCreate` BEFORE starting
- **MUST** search codebase for 3+ similar patterns before creating new code
- **MUST** cite `file:line` evidence for every claim (confidence >80% to act)
- **MUST** add a final review todo task to verify work quality
