---
name: scan-all
version: 1.0.0
description: '[Documentation] Use when you need orchestrate all reference doc scans in parallel.'
---

## Quick Summary

**Goal:** Run all 12 scan-\* skills in parallel and clear the staleness gate.

**Workflow:**

1. **Check Prerequisites** — Verify project has content (not empty)
2. **Launch Parallel Scans** — All 12 skills simultaneously
3. **Collect Results** — Read scan output from reference docs
4. **Clear Staleness Flag** — Remove `.claude/.scan-stale` so the gate unblocks
5. **Build Knowledge Graph** — Run `/graph-build` to update structural graph
6. **Enhance Docs** — Run `/prompt-enhance` on all 12 scanned docs
7. **Summarize** — Report what was refreshed

**Key Rules:**

- All 12 scans run in PARALLEL for speed
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

Launch all 12 scan skills in parallel:

| #   | Invocation                         | Target Doc                       |
| --- | ---------------------------------- | -------------------------------- |
| 1   | `/scan --target=project-structure` | `project-structure-reference.md` |
| 2   | `/scan --target=backend-patterns`  | `backend-patterns-reference.md`  |
| 3   | `/scan --target=seed-test-data`    | `seed-test-data-reference.md`    |
| 4   | `/scan --target=frontend-patterns` | `frontend-patterns-reference.md` |
| 5   | `/scan --target=integration-tests` | `integration-test-reference.md`  |
| 6   | `/scan --target=feature-spec`      | `feature-spec-reference.md`      |
| 7   | `/scan --target=code-review-rules` | `code-review-rules.md`           |
| 8   | `/scan --target=scss-styling`      | `scss-styling-guide.md`          |
| 9   | `/scan --target=design-system`     | `design-system/README.md`        |
| 10  | `/scan --target=e2e-tests`         | `e2e-test-reference.md`          |
| 11  | `/scan --target=domain-entities`   | `domain-entities-reference.md`   |
| 12  | `/scan --target=docs-index`        | `docs-index-reference.md`        |

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

Each scan-\* sub-skill now self-enhances its own doc as its final step. After graph build, **MUST ATTENTION confirm `/prompt-enhance` ran on every scanned doc and backfill any that were skipped.** Reference docs are injected into AI context — attention anchoring (top/bottom summaries, inline READ summaries, token density) directly improves AI output quality.

**TaskCreate one task per doc, parallel OK:**

| #   | Target File                                             |
| --- | ------------------------------------------------------- |
| 1   | `docs/project-reference/project-structure-reference.md` |
| 2   | `docs/project-reference/backend-patterns-reference.md`  |
| 3   | `docs/project-reference/seed-test-data-reference.md`    |
| 4   | `docs/project-reference/frontend-patterns-reference.md` |
| 5   | `docs/project-reference/integration-test-reference.md`  |
| 6   | `docs/project-reference/feature-spec-reference.md`      |
| 7   | `docs/project-reference/code-review-rules.md`           |
| 8   | `docs/project-reference/scss-styling-guide.md`          |
| 9   | `docs/project-reference/design-system/README.md`        |
| 10  | `docs/project-reference/e2e-test-reference.md`          |
| 11  | `docs/project-reference/domain-entities-reference.md`   |
| 12  | `docs/project-reference/docs-index-reference.md`        |

Run via: `/prompt-enhance docs/project-reference/{filename}`

## Summary Output

After all scans complete, report:

"Scan All Complete:

- {X}/12 scans succeeded
- Reference docs refreshed in docs/project-reference/
- Staleness gate cleared
- Prompt-enhanced {Y}/12 docs
- Knowledge graph rebuilt via /graph-build"

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

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

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** follow output quality rules: no counts/trees/TOCs, rules > descriptions, 1 example per pattern, primacy-recency anchoring.

<!-- /SYNC:output-quality-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries) — MUST ATTENTION honor each canonical body:**

- **Critical Thinking:** MUST ATTENTION traced `file:line` proof per claim, confidence >80% to act.
- **Output Quality:** MUST ATTENTION no counts/trees/TOCs, rules over prose, primacy-recency anchoring.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
