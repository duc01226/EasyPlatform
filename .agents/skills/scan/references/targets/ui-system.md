# Scan Target: ui-system

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=ui-system` host (`../../SKILL.md`) loads this file for that run only.

This is an **orchestrator meta-target**, not a single-doc scanner: it checks selected UI child targets for applicability, runs only eligible ones, and summarizes (it writes no doc of its own).

- **kind:** orchestrator
- **doc:** _(none of its own)_ — selected children write their own configured target docs.
- **applies when:** an explicit request covers a project UI system and one or more child capabilities are evidenced and selected.
- **skip when:** no UI child target applies; report the evidence and launch no child scan.
- **description:** `[Documentation] Use to coordinate only selected, evidenced UI-reference scans; it does not imply a design system or Sass usage.`
- **children:** `design-system`, `scss-styling`, `frontend-patterns` (each is an optional standard target that self-checks applicability and owns its output doc).

### Orchestration Procedure (replaces the shared 4-phase engine)

**Phase 0 — Pre-Flight [BLOCKING]:**
1. Validate project config when present (absence uses repository evidence) and resolve `referenceDocs` through the runtime helper. When it is an explicit array, honor it exactly; when absent, use only resolver-selected capability docs. This invocation cannot add a child doc to an explicit selection.
2. Check each child independently using its `applies when` / `skip when` evidence and exact output filename. Frontend patterns require UI source; design-system requires an actual maintained token/component/documentation owner; Sass requires Sass source. A dependency or directory name alone is insufficient.
3. Run only children whose output is selected and whose evidence gate passes. If all children are absent, unselected, or fresh, report `SKIPPED` / `UNCHANGED` without asking a routine force-refresh question. Honor force only when the user explicitly requests a rebuild and the target supports it.
4. Pass optional `designSystem` config to that child only when the section is valid, and verify its paths against source.
5. If evidence conflicts materially, report the specific conflict and ask only for a missing owner decision that repository evidence cannot establish.

**Phase 1 — Plan:** Create work and verification items only for eligible children plus one summary item. Do not dispatch skipped targets.

**Phase 2 — Launch (parallel):** run eligible children simultaneously only when their output paths are distinct; each child remains self-contained:
- `$scan --target=design-system`
- `$scan --target=scss-styling`
- `$scan --target=frontend-patterns`

**Phase 3 — Verify outputs:** reconcile selected children against every return at the all-return barrier, then inspect each child result and its owned output, including final semantic retention and baseline checks. Accept `UPDATED` only when evidence checks pass; accept `UNCHANGED` when the child reports no write; preserve `SKIPPED` and `BLOCKED` with reasons. Never rerun a target only because a no-op stamp did not move.

**Phase 4 — Summarize** from verified results only: list each selected child, output path, status, evidence, and remaining gap. Do not report skipped or unselected children as scanned.

### Content Rules / exceptions
- Does NOT modify application code — only populates `<ref>/`.
- Summary fields come from verified child-doc content, never memory/estimate.

### Special slivers
- **Applicability is per child** — a UI project may use no Sass and no maintained design system; never infer those scans from frontend presence.
- **No selection bypass** — explicit invocation does not add output docs to an explicit `referenceDocs` array.
- **No forced breadth** — `--target=ui-system` never implies that every child applies or must be refreshed.
- **UI/UX clause coverage is child-owned** — each child writes its OWN **UI/UX Clause Coverage** section (`design-system` the token clauses `UI-2.5`/`UI-3.1`/`UI-3.2`/`UI-3.4`/`UI-4.1`/`UI-5.4`; `scss-styling` the spacing, breakpoint, type, and focus-ring clauses; `frontend-patterns` the interaction-state, state-feedback, form, and touch-target clauses). The orchestrator neither merges nor grades them: scans RECORD where the project deliberately deviates so the project's own doc becomes the recorded authority, while `ui-design --mode=review` is the pass that enforces the clauses.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Frontend exists, so every UI child applies" | Each child has a separate capability and output-selection gate |
| "All docs are probably still fresh" | Check last-scanned date via actual file read — never assume freshness |
| "Children ran, so output must be there" | Verify each child doc content — placeholder ≠ populated |
| "Summary from memory is fine" | Summary must come from verified child docs — never fabricate findings |
| "Explicit orchestrator invocation means force every child" | Invocation requests an assessment; it does not override config selection or evidence |
| "Roll the children's clause coverage into one compliance verdict" | Children RECORD project conventions; the orchestrator summarizes verified doc content only. A compliance verdict is `ui-design --mode=review`'s output, never a scan's |

### prompt-enhance
Each changed child follows its own enhancement rule. Do not enhance unchanged or skipped outputs.
