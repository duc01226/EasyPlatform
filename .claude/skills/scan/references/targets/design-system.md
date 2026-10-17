# Scan Target: design-system

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `/scan --target=design-system` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/design-system/README.md`
- **applies when:** maintained design tokens, a shared component system, design-system documentation, or an equivalent visual-language source is evidenced.
- **skip when:** UI code exists but the project has no maintained design-system owner or token/component source.
- **description:** `[Documentation] Use when mapping an evidenced design system, tokens, shared components, and owner docs.`
- **sub-agents:** up to 3 conditional branches — system ownership/docs; shared UI component inventory; visual tokens/assets. Run only branches supported by project sources; keep token-source verification distinct from component usage inventory when both exist.

### Phase 0 detection — capability, owner, and mode

Step 1 — read the selected reference doc and its configured template/sections; preserve project-owned structure in Sync mode.

Step 2 — resolve any declared design-system owner, token sources, and component/doc roots from valid project config, then verify each path. If optional properties are absent, discover actual maintained sources from repository evidence. Examples include token files, design tools/export pipelines, component docs, and visual standards; they are not an allowlist or required architecture.

Step 3 — classify only evidenced branches: documentation/ownership, shared components, visual tokens/assets, or a combination. Unknown formats do not block evidence-backed documentation.

**Evidence gate:** If the owner or format is uncertain, record `UNKNOWN` and continue with verified facts. Do not invent a canonical design-system document, token source, tooling, or adoption process.

### Sub-agent Think scopes

**Agent 1: Design System Structure**
- **Think (VERBATIM):** "How is the design system organized? What's the canonical doc? What's the token chain? Which apps have design docs and which don't?"
- Scan targets: configured/evidenced design docs and owners; actual token-source and generation/import paths; reusable visual components and their exports/docs; product/app relationships only when present. Treat Storybook and CSS/SCSS/JSON token syntax as examples, not required formats. Verify declared canonical docs/token sources if configured, but never infer paths or fill missing product sources from the scanner.

**Agent 2: Component Inventory**
- **Think (VERBATIM):** "What dimensions define a complete component inventory? Consider: Discoverability (can I find it?), Categorization (what type?), Variant coverage (size/color/state?), Accessibility (ARIA/keyboard?), Documentation completeness (JSDoc/README/Storybook?), Icon/asset library coverage."
- Note: derive grep/glob patterns from what the repository actually uses — do NOT hardcode framework-specific patterns unless confirmed.
- Scan targets: reusable UI components (shared dirs, exported components); component categories (layout, forms, feedback, navigation, data display); variants (size, color, state); icon sets / asset libraries; accessibility patterns (ARIA roles, keyboard support); per-component documentation.

**Agent 3: Token & Component Source Discovery**
- **Think (VERBATIM):** "What design tokens actually exist in source code (not just what's documented)? Which are declarations (authoritative) vs usages (derived)?"
- **Source scope:** use valid configured token/design roots when present; otherwise identify actual maintained sources from code, build config, and owner docs. Exclude generated/dependency output unless it is the authoritative source.
- **Discovery:** identify definitions/authoritative inputs separately from generated outputs and usages. Derive search terms/parsers from the actual formats found; CSS custom properties, Sass variables, JSON, design-tool exports, and Storybook are examples only. Group by categories present in this design system; do not impose colors/spacing/type/breakpoints on a system that does not declare them.
- Review coverage against the configured or repository-evidenced source scope. If the inventory looks incomplete, verify scope/exclusions instead of applying fixed minimum/maximum counts.
- **UI/UX clause capture (DOCUMENT the project's rule — never enforce it):** from the SAME declarations (never inference), record the project's ACTUAL values for the token-governed clauses — type scale step names + sizes against a fixed 6-step named scale (`UI-2.5`); the spacing base unit against the 4px-or-8px default (`UI-4.1`); accent-token count and where each accent is used, against one-accent-one-job (`UI-3.2`); the measured contrast ratio of each documented foreground/background token pair against 4.5:1 for text and 3:1 for UI edges (`UI-3.1` — COMPUTE it from the declared values; when no ratio can be computed record "unmeasured", NEVER an eyeballed or guessed number); the dark-mode surface-elevation strategy — lifted surfaces vs inverted light mode, and any softening of pure-white text (`UI-3.4`); motion duration + easing tokens against the 150–250ms ease-out default, plus any reduced-motion handling (`UI-5.4`). Per dimension record: **project rule + `file:line`** → then **PROJECT AUTHORITY — overrides `UI-<clause>`** (the project's recorded convention is the authority) or **GAP — no project convention; the clause default applies**.

### Target Sections

Use the selected project's declared sections. If none are declared, document evidenced ownership, source-of-truth paths, token/component/asset branches that exist, consumption guidance, relationships, and verified gaps. Do not require Storybook, token inventories, app maps, or a particular design-system architecture.

### Content Rules / exceptions
- Scan only valid configured or evidence-backed source roots; distinguish authoritative definitions from generated derivatives and usages.
- Record gaps only against declared capabilities/requirements or an explicitly scoped inventory; do not create speculative missing-work lists.
- Use source-owner navigation instead of full directory trees unless a verified project consumer requires the structure.
- **UI/UX clause coverage is a RECORD, not a review.** The 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`; canonical text in `.claude/skills/shared/sync-inline-versions.md` → `SYNC:ui-ux-design-principles`) are the DEFAULT only where this project is silent. A recorded project convention OUTRANKS the clause, so the generated doc states the project's rule, names the clause it overrides (`UI-<clause>`), and says the deviation is the project's authority; a clause-governed dimension with no token or convention behind it is recorded as a **GAP** so the clause default applies. Clause values obey this target's declarations-only rule, and `UI-3.1` contrast is COMPUTED or recorded "unmeasured" — never estimated. Never flag a deviation as a defect — enforcement belongs to `ui-design --mode=review`; this scan only records.

### Special slivers
- This scan updates only its selected project-reference output. It never authors or edits product token files, component source, design-tool artifacts, or other canonical design-system sources. Missing sources are reported to their owner.
- Delegate only distinct, evidenced branches; token definition and component inventory remain separately evidenced where both apply.
- Verify every emitted path and token/component claim against the actual owner source. Do not report a token gap merely because another common category or scale is absent.
- UI/UX clause coverage is conditional on the observed surface and design source. Record applicable evidence and gaps; preserve stricter local, legal, security, and platform requirements.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The design-system format is unfamiliar, stop the scan" | Record the unknown format and continue with verified ownership and artifacts |
| "A component inventory or token list is always required" | Run only evidence-backed branches; follow the project's configured owner/template |
| "Token values look correct" | Grep-verify ALL token values against declarations — "looks correct" ≠ verified |
| "List expected components/tokens as gaps" | Report gaps only against declared requirements or an explicitly scoped inventory |
| "Skip Round 2 even when Round 1 found issues" | Clean Round 1 (zero issues) does end the scan. But when issues exist, fresh-eyes is mandatory after fixing — main agent rationalizes own mistakes. |
| "Verified 3 paths, that's enough" | Glob-verify ALL paths in inventory — spot-check is insufficient |
| "Contrast looks fine on screen" | `UI-3.1` is MEASURED, never eyeballed — compute the ratio for each documented token pair (4.5:1 text, 3:1 UI edges) or record "unmeasured"; NEVER estimate one |
| "Tokens already match the clause defaults, so skip the coverage section" | Every clause-governed dimension gets a row — a matching value is still recorded with `file:line`, and a missing one is recorded as a GAP |

### prompt-enhance
`/prompt-enhance <ref>/design-system/README.md`
