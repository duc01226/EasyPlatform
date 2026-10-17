# Scan Target: frontend-patterns

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=frontend-patterns` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/frontend-patterns-reference.md`
- **applies when:** user-interface code exists in application routes, views, components, templates, or equivalent project sources.
- **skip when:** the repository has no UI source; do not treat a UI dependency, design mockup, or empty app folder as implementation evidence.
- **description:** `[Documentation] Use when recording evidenced UI composition, state, forms, API use, routing, and styling.`
- **sub-agents:** 3 — Agent 1: Component & Form Patterns · Agent 2: State Management & API Services · Agent 3: Routing, Directives & Directory Structure

### Phase 0 detection — capability, platform, and mode

- Identify UI languages, frameworks, rendering/runtime platform, app paths, and test/config conventions from the valid project config and actual source/manifests. Config is a search hint; verify paths and versions. Framework examples in this file are not an allowlist, and an unfamiliar stack is not a reason to stop.
- Detect actual UI surfaces and classify applicable branches: composition/components/templates; state and data flow; forms/input; routing/navigation; styling; accessibility/platform behavior. Do not scan branches without evidence.

Detect scan mode:

| Mode | Condition | Action |
| --- | --- | --- |
| Init | Target doc doesn't exist or placeholder only | Full owner scan, create only supported guidance |
| Sync | Target doc has real content | Diff scan — check new base classes, changed patterns |

Read the selected output and configured template/sections. Init mode populates only the selected local contract; Sync mode preserves its existing section roles and rechecks each relevant pattern for staleness. Resolve optional application/module paths from valid config when declared, then verify them; otherwise discover scope from source and repo structure. A declared invalid section blocks under the shared config contract.

**Evidence gate:** If framework identity is incomplete, record `UNKNOWN` and continue with source-evidenced, framework-neutral structure guidance. Prescribe framework-specific patterns only after verifying their use. Ask only when material evidence conflicts or an unresolved owner choice changes the output and repository evidence cannot settle it.

### Sub-agent Think scopes

**Agent 1: UI Composition & Input Patterns** (only when present)
- **Think:** How are views, components, and templates composed? How are inputs and forms validated, errors shown, lifecycle/resources owned, and user actions exposed?
- Scan targets: actual component/view/template abstractions; forms and validation; lifecycle and cleanup only where stateful resources exist; component communication and reuse boundaries. Treat base classes, JSX, directives, signals, and specific framework APIs as optional examples; discover the idioms this project uses.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL convention for the clause-governed dimensions this agent owns — how the five interaction states (default, hover, focus, active, disabled) are expressed, plus loading where it applies (`UI-5.2`); label vs placeholder convention (`UI-7.2`); validation timing (on blur / on keystroke / on submit) and where the error message renders relative to its field (`UI-7.3`); whether entered input survives an error, navigation, or refresh, and the mechanism that preserves it (`UI-7.5`); the touch-target sizing convention against the ≥44×44pt / 8px-apart default (`UI-8.1`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 2: UI State & Data Flow** (only when present)
- **Think:** How does UI state change, how is data loaded or updated, and how are pending/error states and resource lifetimes handled?
- Scan targets: actual state/store mechanisms; API or server-action boundaries; data fetching, caching, race handling, and user-visible state feedback; subscriptions/listeners and cleanup when applicable; shared service/client registration. Do not assume hooks, a store library, client-side fetching, or an API-service layer.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL convention for the state-feedback dimensions this agent owns — the loading, empty, and error state conventions and which layer owns each (`UI-1.5`); whether waits render structure-first skeletons for known layouts or spinners for unknown waits (`UI-9.1`); the optimistic-update pattern if one exists — update-first, reconcile-after, and how a failure rolls back visibly (`UI-9.2`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 3: Navigation & UI Organization** (only when present)
- **Think:** How are navigation, access boundaries, reusable UI behavior, and UI modules organized in this project?
- Scan targets: actual route/navigation declarations and guards; reusable UI extensions where the framework supports them; app/module/package boundaries; UI file organization and build/runtime configuration. Do not assume client-side routing, directives/pipes, lazy loading, a particular workspace tool, or a fixed directory layout.

### Target Sections

Use headings and required sections from the selected project-reference profile/template. If none are declared, describe only evidenced UI capabilities, such as composition, state/data flow, forms, navigation, styling, accessibility behavior, and build/runtime boundaries. Omit absent capabilities. Capture the shared UI/UX clause guidance only where it applies to the project's surface; record project conventions and gaps with evidence rather than treating this scanner as a review gate.

### Content Rules / exceptions
Use shared `output-quality-principles`. Write findings incrementally, cite `file:line` for code conventions, and separate verified behavior from inference. Describe accessibility or platform standards from the project's documented owner or the applicable shared baseline; do not infer a standard from framework names.

- **UI/UX clause coverage is a RECORD, not a review.** Apply the shared `SYNC:ui-ux-design-principles` only to relevant surfaces. Record the project rule and `file:line`, or a **GAP** when no project convention is evidenced. A recorded convention may specialize the shared default; surface any conflict with a stricter legal, security, or platform requirement instead of silently treating either rule as waived. Review enforcement belongs to the applicable review skill.

### Special slivers
- Applicability and mode detection precede framework-specific searches; unknown framework details do not block generic observations.
- Fresh-eyes verification checks that every cited path and named API exists, and that the evidence supports the documented convention. Verify base-class/store/lifecycle examples only when those constructs exist; do not require a fixed minimum number.
- Delegate the three analysis scopes only when each has distinct, applicable work.
- **UI/UX clause coverage** — record only clauses applicable to the observed platform and surface; preserve local and stricter requirements with evidence. Scans document conventions and gaps; the applicable review skill evaluates quality.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The framework is unfamiliar, stop Phase 0" | Record what is unknown and continue with verified framework-neutral UI structure |
| "A component/store/lifecycle convention is obvious" | Cite the actual definitions and uses; omit constructs the project does not have |
| "One visible example proves the convention" | Check representative callers and variants; state the evidence scope and gaps |
| "Skip fresh-eyes after issues were found" | Resolve findings and verify the final paths/claims independently before writing |
| "Every UI surface uses the same interaction standard" | Select standards by platform and local requirements; mark inapplicable checks with evidence |
| "This local form behavior is automatically a defect" | Document the local behavior; evaluate it in the appropriate UI review against applicable requirements |

### prompt-enhance
`$prompt-enhance <ref>/frontend-patterns-reference.md`
