# Scan Target: scss-styling

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `/scan --target=scss-styling` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/scss-styling-guide.md`
- **applies when:** maintained `.scss`/`.sass` source or Sass-specific configuration and source files exist.
- **skip when:** styling is implemented only with plain CSS, utility classes, CSS-in-JS, or another non-Sass system; use an applicable UI target instead.
- **description:** `[Documentation] Use when recording evidenced Sass structure, variables, composition, theming, and responsive conventions.`
- **sub-agents:** up to 2 conditional branches — Sass architecture/declarations and naming/theming; dispatch only distinct branches supported by source evidence.

### Phase 0 detection — Sass applicability, optional naming patterns, and mode

- Confirm maintained Sass source (`.scss`/`.sass`) or a real Sass build path before scanning. A config or dependency without Sass source is not sufficient; if only other styling systems exist, report this target `SKIPPED` and route to the applicable UI target.
- In a hybrid styling system, scope this target to the verified Sass subsystem and preserve its boundaries from other style sources. Do not adapt this Sass scanner to Less, plain CSS, utility CSS, or CSS-in-JS.
- Detect BEM, modules, theming, tokens, and other naming/organization patterns only if present. BEM is one possible convention, not a requirement; record the actual alternative when useful.
- Read the selected doc/template and preserve local sections in Sync mode. Resolve configured style/token roots when declared; otherwise discover maintained Sass sources and exclude generated/dependency output.

**Source scope:** use configured/evidenced Sass, theme, and token roots. Exclude generated output and dependencies. Include component-local styles when they are maintained owners or the local config selects them.

**Evidence gate:** If Sass applicability cannot be verified, report the checked config and source paths and skip this target. If a secondary pattern is uncertain, document only verified Sass facts and mark that pattern `UNKNOWN`.

### Sub-agent Think scopes

**Agent 1: SCSS Architecture & Variables**
- **Think (Import chain dimension):** What's the entry point? Where do global styles load? Is there a predictable import order (reset → tokens → utilities → components)? What breaks if the order changes?
- **Think (Variable declaration dimension):** Which variables are authoritative declarations vs usages? Are CSS custom properties mirroring SCSS variables (dual-declaration pattern)? What's the naming convention (BEM-inspired, semantic, functional)?
- **Think (Breakpoint dimension):** Where are breakpoints defined? Is there a responsive mixin or just raw media queries scattered across files? Mobile-first or desktop-first?
- Scan targets: maintained `.scss` and `.sass` source within configured/evidenced roots; actual entry points and Sass import/use/forward chains; variable, mixin, function, theme, and breakpoint declarations in the syntax present; CSS custom-property declarations owned by those style sources. Separate declarations from usages and verify each cited value against source.
- If a declaration inventory appears unexpectedly small or broad, verify the configured/source scope and exclusions; do not use fixed item-count thresholds as a validity rule.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** from actual declarations (never inference), record the project's ACTUAL convention for the clause-governed dimensions this agent owns — the spacing base unit and which multiples of it actually appear, against the one-unit 4px-or-8px default (`UI-4.1`); whether spacing is carried by container `gap` or by child margins (`UI-4.2`); the breakpoint definitions and whether they are content-driven or device-named (`UI-4.4`); the type sizes in use versus a fixed named scale — body size against the 16px web / 17px mobile default and the never-below-14px floor (`UI-2.2`), and whether a fixed 6-step named scale exists or one-off sizes appear (`UI-2.5`); any line-length/measure constraint against the 45–75-character default (`UI-2.3`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

**Agent 2: BEM Patterns & Theming**
- **Think (BEM convention dimension):** What's the exact separator style (double-underscore `__`, double-dash `--`, or variants)? What's the maximum nesting depth before patterns break? Are modifiers on blocks, elements, or both?
- **Think (Theming dimension):** How many themes exist? Is theming via CSS custom property overrides, SCSS theme maps, or class-based switching? How does a developer add a new theme?
- **Think (Component scoping dimension):** Are styles co-located with components (scoped) or global? What naming convention prevents cross-component contamination?
- Scan targets: evidenced class/naming conventions such as BEM when present; theme ownership and switching; component-scoped vs global styles; z-index, motion, and color declarations when maintained as project conventions. Cite enough representative examples to establish each claimed rule; if no pattern exists, report that instead of inventing one.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** record the project's ACTUAL focus-ring treatment — the `:focus` / `:focus-visible` styling, any rule that removes the default outline, and the replacement indicator if one exists (`UI-5.5`). Record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-5.5`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**. An outline removed with no replacement is recorded as a deviation from `UI-5.5` for `ui-design --mode=review` to adjudicate — the scan states it, never grades it.

### Target Sections

Use the selected project's declared sections. If no template/profile defines them, document only evidenced Sass capabilities such as entry points/imports, declarations/tokens, themes, responsive rules, and component/global style boundaries. Include naming or UI/UX clause coverage only when those patterns apply. Do not require BEM, a token taxonomy, a breakpoint scheme, or a particular source layout.

### Content Rules / exceptions
- **Declarations only — NOT usages** when cataloguing variables and mixins (reinforced in Round 2, Phase 4 verify, closing reminder, anti-rationalization).
- Resolve maintained Sass/token roots from configuration or source evidence; exclude generated/dependency output and preserve component-local Sass when it is an actual style owner.
- Every variable value, mixin signature, breakpoint MUST come from actual declarations; focus on project conventions NOT generic CSS tutorials.
- Color palette grouped by semantic role, NOT raw hex list; colors grepped from declarations only.
- **UI/UX clause coverage is a RECORD, not a review.** The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`; canonical text in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:ui-ux-design-principles`) are the DEFAULT only where this project is silent. A recorded project convention OUTRANKS the clause, so the generated guide states the project's rule, names the clause it overrides (`UI-<clause>`), and says the deviation is the project's authority; a clause-governed dimension with no project convention is recorded as a **GAP** so the clause default applies. Clause values obey this target's declarations-only rule — declarations, NOT usages. Never flag a deviation as a defect — enforcement belongs to `ui-design --mode=review`; this scan only records.
- **Clause overlap with `design-system` is intentional, not duplication:** where the design-system doc records the TOKEN declaration for a shared clause (`UI-2.5` type scale, `UI-4.1` spacing unit), this guide records how stylesheets actually CONSUME it — which multiples appear, `gap` vs margin, sizes that sit off the scale. Neither entry replaces the other.

### Special slivers
- Confirm Sass applicability before scanning; BEM and other naming conventions are optional evidence branches.
- Resolve the source scope from valid config and repository evidence; if no maintained Sass source remains, report `SKIPPED`.
- Authoring should describe a verified alternative where BEM is absent; never prescribe a utility framework from a dependency alone.
- Round 2 fresh-eyes is declaration-focused: variable names exist as actual declarations (Grep — declarations not usages); mixin names match `@mixin` definitions; color values from declarations not fabricated hex; breakpoint values from actual config not assumed common values.
- 2 sub-agents (vs frontend-patterns' 3).
- **UI/UX clause coverage sliver** — Agent 1 captures the spacing, breakpoint, and type clauses (`UI-2.2`, `UI-2.3`, `UI-2.5`, `UI-4.1`, `UI-4.2`, `UI-4.4`); Agent 2 captures the focus-ring clause (`UI-5.5`); both write project rule + `file:line` + PROJECT AUTHORITY / GAP verdict into the **UI/UX Clause Coverage** section. Scans DOCUMENT the deviation; `ui-design --mode=review` is the pass that enforces the clauses.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "This project styles UI, so the Sass target applies" | Confirm maintained `.scss`/`.sass` sources; scan only Sass and route other styling systems to their applicable owner |
| "Variable names look standard (`$primary-color`)" | Grep-verify every variable name against actual declarations — AI hallucinates variable names |
| "Breakpoints are probably 768px/1024px" | Read breakpoint declarations — NEVER assume common values |
| "Color values look right" | ALL color values must come from grep of actual declarations |
| "Usages and declarations are the same thing" | NEVER mix them — document only declarations as authoritative |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 ends the scan. When issues exist, fresh-eyes mandatory after fixing — main agent rationalizes fabricated variable values. |
| "Spacing looks like an 8px system — record that" | Record the base unit and the multiples that actually appear, from declarations (`UI-4.1`) — an inferred spacing system is not a project convention |
| "Breakpoints match common devices, so no clause note is needed" | Record WHETHER breakpoints are content-driven or device-named (`UI-4.4`) — that classification IS the deviation record |
| "`outline: none` here is a bug — flag it" | The scan DOCUMENTS; record the treatment and its deviation from `UI-5.5` with `file:line`. Grading is `ui-design --mode=review`'s job |

### prompt-enhance
`/prompt-enhance <ref>/scss-styling-guide.md`
