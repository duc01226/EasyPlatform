---
name: scan-all
version: 1.0.0
description: '[Documentation] Use when a workflow step or the user asks for a refresh of every selected, evidence-applicable reference-doc scan target, or a --targets= subset, at once. One doc: scan; first-time setup: docs-manager --mode=init.'
---

## Quick Summary

**Goal:** Refresh selected, evidence-applicable built-in and explicitly generic custom reference docs while preserving truthful freshness and project ownership.

**Summary:** Resolve config and exact selection → classify ownership and capability → run disjoint scans → reconcile results and freshness → report. Keep always-on inputs separate; unsupported capabilities and manual docs receive explicit dispositions. Graph refresh remains conditional.

**Workflow:**

1. **Validate** — Support absent config; validate present config and use the runtime evidence-based resolver.
2. **Resolve** — Read always-on inputs separately and resolve the effective task-specific `referenceDocs` selection.
3. **Filter** — Resolve exact built-in targets, selected generic custom docs, and manually owned docs; verify capability evidence for each scan.
4. **Scan** — Run eligible targets in parallel only when their output write sets are disjoint.
5. **Summarize** — Report refreshed, unchanged, skipped, blocked, and manual docs with evidence.

**Key Rules:**

- Treat the target registry as options, never a required scan list; explicit `referenceDocs` arrays, including `[]`, are exact.
- Optional `--targets=<key,key>` limits the run to those registered targets with the same per-target checks; an unknown key is refused with the list of registered keys.
- Keep project-init-owned lessons/index inputs separate and custom docs manual unless explicitly `scanTarget: "generic"`.
- Write reference docs only; broader setup and graph work have separate owners. Scan only evidenced capabilities and exact outputs; clear staleness only after verification.

## Contents

- [Quick Summary](#quick-summary)
- [When to Use or Skip](#when-to-use-or-skip)
- [Execution](#execution)
- [Optional Graph Refresh](#optional-graph-refresh)
- [Summary Output](#summary-output)
- [Closing Reminders](#closing-reminders)

## When to Use or Skip

Use for a reference-doc staleness gate, initial reference population in a content-bearing project, periodic refresh after significant changes, a refresh of a named target subset (`--targets=`, for example after a scaffold builds a new foundation), or an explicit `/scan-all` request. First-time project setup belongs to `/docs-manager --mode=init`.

Skip capability scans for empty/greenfield projects without evidence; project-init handles always-on inputs. Skip the run when no selected applicable docs are stale and always-on inputs are current.

## Execution

### 1. Validate and resolve config

Resolve config through `.claude/hooks/lib/project-config-loader.cjs` (default `docs/project-config.json`). Absent config uses portable defaults and repository evidence. Present config needs a valid schema and non-empty `project.name`; omitted optional capabilities are allowed, but declared incomplete/unsupported sections block until repaired.

Resolve effective `referenceDocs` through `.claude/hooks/lib/session-init-helpers.cjs`, never by copying the registry:

- Absent selection: evidence-supported baseline/capabilities only; a minimal project may resolve to no task-specific docs.
- Explicit array, including `[]`: exact task-specific selection.
- Project-init-owned `lessons.md` and docs-index inputs: confirm through their owner, separately from task-specific work.

### 2. Map selected docs to targets

**Target subset (`--targets=<key,key>`, optional):** limits the run to the named built-in targets; without it the run covers the whole effective selection. Parse it before any scan. Every key must be a registered key in `.claude/skills/scan/references/targets.md`: refuse an unknown key — stop before scanning, list the registered keys and never guess the intended target. Each named target gets the same treatment as in a full run: the selection and ownership check, its applicability head, disjoint parallel writes and the one all-return barrier. A named target whose output is not selected or whose capability is absent is reported `SKIPPED`, never forced. Naming `ui-system` runs its orchestration over the applicable children; a child key also named is folded into it, not launched alongside. A subset run reconciles and reports its subset only, and clears `.claude/.scan-stale` only under the full-run rule in step 3.

**Target registry** owns filename mapping, custom-doc safety and capability gates. Read `.claude/skills/scan/references/targets.md` when mapping selected docs; resolve every filename exactly. Built-in filenames use only their framework-owned manifest target; never infer a built-in target from a custom basename; a custom filename with `scanTarget: "generic"` uses `/scan --target=generic-reference-doc --filename="<filename>"`; a custom filename with no target or `scanTarget: "manual"` remains under curated project ownership. Resolve the containing root from `docsRoots.projectReference.path` in `docs/project-config.json` (default `docs/project-reference/`).

- Custom `referenceDocs` entries require `filename` and `purpose`, with optional `sections`, `templatePath`, and `scanTarget`. Config validation rejects unknown targets and unsafe paths; runtime path resolution also rejects physical symlink escapes.
- [BLOCKING] Before launching a built-in target, read the head of `.claude/skills/scan/references/targets/<key>.md` (its `applies when` and `skip when` lines) and apply its gate; the index is insufficient. Config guides selection/search, but source examples and patterns still require verification.
- If a selected built-in target's capability is absent, report `SKIPPED` with the config/source paths checked. Do not create a placeholder or claim the doc is refreshed. Generic scans use their configured `purpose` and optional `sections`, write only that exact filename, and retain conservative non-disposable repository-wide impact routing. Manual docs are not scanned, freshness-tracked or impact-routed.
- Do not launch `ui-system` alongside its child targets. `scan-all` selects individual docs from the effective list; an explicitly routed UI orchestration can fan out only to applicable children.
- Record one coverage-ledger disposition per exact selected output: eligible, manual, skipped or blocked. Reconcile the union of assignments against that set, including nested/boundary paths; `[]` creates no task-specific scans. Deduplicate identical targets. Run disjoint output owners in parallel and shared owners once.

### 3. Run and verify

For each eligible built-in or generic target, invoke its exact scan command and accept only its evidence-backed result. Generic targets include their configured filename. A scan can finish as `UPDATED`, `UNCHANGED`, `SKIPPED`, or `BLOCKED`; preserve the target report and surface every non-complete status.

Reconcile every selected output against returned reports at the all-return barrier before dependent writes. Check final content-value/semantic-retention reviews after enhancement, baseline reconciliation and truthful operation stamps. Check the exact selected outputs and the always-on owner inputs. Clear `.claude/.scan-stale` only after the selected automatically scannable docs are current and project-init-owned inputs are confirmed; skipped or stale docs keep the result open. Manual docs do not enter the automated freshness gate. Use the owner helper only after this check:

```bash
node -e "require('./.claude/hooks/lib/session-init-helpers.cjs').refreshScanStaleFlag()"
```

Each changed output follows its target's enhancement rule; verify it in the returned result. Do not run a second enhancement list or rewrite unchanged/skipped docs.

## Optional Graph Refresh

A graph is not a universal scan prerequisite. If the project config and repository show a supported code graph is part of this project, run its owning graph workflow when the graph is stale or the setup explicitly requests refresh. Otherwise report graph work as not applicable; never block documentation scans on an absent graph.

## Summary Output

Report each selected target with its status, output path, and evidence-backed reason. List always-on inputs checked, manual docs left to their owner, and any blocked stale gate. Do not claim all docs are refreshed when optional targets were skipped or unselected.

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->


## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Refresh selected, evidence-applicable built-in and explicitly generic custom reference docs while preserving truthful freshness and project ownership.

**IMPORTANT MUST ATTENTION Main steps:** resolve config/selection → classify ownership/capability → run disjoint scans → reconcile results/freshness → report; refresh a graph only through its conditional owner.

- Keep exact selection and always-on inputs separate; custom docs default to manual ownership.
- `--targets=<key,key>` narrows the run, never the checks: refuse unknown keys with the registered list, report unselected or inapplicable named targets `SKIPPED`, and clear the stale flag only under the full-run rule.
- Read each target's applicability header; use evidence rather than catalog membership.
- Reconcile every output and target quality gate before refreshing the stale flag; retain skips/blockers.
- Track tasks before work, cite `file:line` evidence (>80% confidence to act), and finish with a consistency review. Search 3+ fitting patterns before creating code.

| Evasion | Required action |
| --- | --- |
| "Selected means applicable" | Verify the target's capability gate against config and source. |
| "All agents returned, so clear staleness" | Reconcile each output, enhancement/retention review, operation stamp and always-on input first. |
