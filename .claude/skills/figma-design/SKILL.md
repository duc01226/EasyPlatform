---
name: figma-design
version: 1.0.0
description: '[Frontend] Use when you need to extract design context from Figma URLs via MCP, REST API, or screenshot fallback.'
---

## Quick Summary

**Goal:** Extract structured design context from Figma designs for downstream use by `design-spec` and planning skills.

**Workflow:**

1. **Detect Input** — Parse Figma URL, extract file key + node ID
2. **Select Extraction Method** — 4-level fallback chain
3. **Extract Context** — Design tokens, components, layout, typography
4. **Output Artifact** — Structured markdown for design-spec consumption

**Key Rules:**

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes,

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

- Always try highest-fidelity method first, fallback gracefully
- Output must be consumable by `design-spec` and `ui-wireframe-protocol`
- Keep extraction under 5K tokens per design

## Extraction Fallback Chain

> **[BLOCKING] Before the extracted design feeds a new/updated screen** (per the `SYNC:existing-ui-research` protocol carried by this skill): inventory the existing related UI and map connected feature flows so the design built from this extract faithfully matches the current UI system. Skip only when the extract is not driving a new/updated screen (state it explicitly).

### Level 1: Official Figma MCP (Best Fidelity)

Check if MCP tools available: look for `get_design_context` in tool list.

If available:

1. `get_design_context` — structured layout, components, tokens, constraints
2. `get_screenshot` — visual reference image
3. `get_code_connect_map` — map Figma components to code components

### Level 2: GLips Figma-Context-MCP (Good Fidelity)

Check if GLips MCP tools available (look for figma-context tools).

If available:

1. Extract file metadata, frame structure, component list
2. Limited to read-only operations

### Level 3: Figma REST API (Manual)

If `FIGMA_ACCESS_TOKEN` environment variable exists:

1. Call `GET /v1/files/{file_key}/nodes?ids={node_id}` via bash script
2. Parse response for: component names, styles, layout properties
3. Limited — no screenshot, no Code Connect

### Level 4: Screenshot + visual analysis tooling (Always Available)

If no MCP and no API token:

1. Ask user via `AskUserQuestion`: "Please screenshot the Figma frame and paste here"
2. Analyze via `visual analysis tooling` skill with design extraction prompts
3. Extract: approximate colors, fonts, spacing, layout, components

## Figma URL Detection & MCP Extraction (canonical)

> Applies when reading PBI/design-spec files that reference Figma URLs. URL→MCP extraction runs inline in this skill.

When a PBI or design-spec references one or more Figma URLs, parse each URL and extract:

- **File Key** — the `[a-zA-Z0-9]+` segment after `figma.com/design/` or `figma.com/file/`.
- **Node ID** — the `node-id=NNN-NNN` query param (display form, e.g. `1-23`). API form replaces `-` with `:` → `1:23`.

Then extract the referenced nodes via the available Figma MCP tools:

```
# With a node id (preferred — narrow, cheap):
mcp__figma__get_file_nodes file_key="{fileKey}" node_ids="{apiNodeId}"

# Whole file (no node id):
mcp__figma__get_file file_key="{fileKey}"
```

**Token Budget:** extract specific nodes only — target <5K tokens per design. Never pull a whole file when a node id is available.

## Output Format

Save to `team-artifacts/design-specs/{YYMMDD}-figma-extract-{slug}.md`:

```markdown
# Figma Design Extract: {Name}

**Source:** {Figma URL}
**Method:** {MCP Level 1 | MCP Level 2 | REST API | Screenshot}
**Date:** {YYMMDD}

## Design Tokens

| Category   | Token     | Value                |
| ---------- | --------- | -------------------- |
| Color      | Primary   | {hex}                |
| Color      | Secondary | {hex}                |
| Typography | Heading   | {font, size, weight} |
| Spacing    | Base      | {px}                 |

## Component Inventory

- **{ComponentName}** — {description}, variants: {list}

## Layout

{ASCII wireframe per ui-wireframe-protocol}

## Responsive

{Breakpoint behavior if detectable}

{Small-screen minimum bar: the layout must stay usable on mobile — preferred reflow (flex-wrap / row → column, grids collapse to one column); acceptable fallback when a component genuinely can't reflow (tables, canvases, wide grids) is a min-width/min-height + overflow:auto scroll (scrolling is OK); hard requirement is nothing broken — no clipped, cut-off, or unreachable content. Note any component that would need a large redesign to work on mobile so the user can confirm scope.}

## Clause Conformance (UI/UX Design Principles)

| Clause                       | Observed in the Figma source | Verdict      | Note                                                                      |
| ---------------------------- | ---------------------------- | ------------ | ------------------------------------------------------------------------- |
| `UI-2.5` type scale          | {distinct text sizes found}  | PASS / DRIFT | {collapses to 6 named steps, or list the one-off sizes}                   |
| `UI-2.2` body size           | {px}                         | PASS / FAIL  | {16px web / 17px mobile; anything below 14px is a hard fail}              |
| `UI-3.1` contrast            | {measured ratios per pair}   | PASS / FAIL  | {4.5:1 text, 3:1 UI edges — computed from the extracted hexes}            |
| `UI-3.3` colour alone        | {status/meaning carriers}    | PASS / FAIL  | {icon or label paired with the colour?}                                   |
| `UI-4.1` spacing unit        | {values found}               | PASS / DRIFT | {one 4px or 8px base, every gap a multiple; list off-grid values + nodes} |
| `UI-5.2` interaction states  | {variants present}           | PASS / GAP   | {default, hover, focus, active, disabled — name the missing ones}         |
| `UI-1.5` empty/loading/error | {frames present}             | PASS / GAP   | {name which of the three are missing}                                     |
| `UI-8.1` touch targets       | {sizes on mobile frames}     | PASS / FAIL  | {≥44×44pt, 8px apart — mobile/touch frames only}                          |
```

## Clause Conformance Read (extraction gate)

Figma is a SOURCE, not an authority. Extract the design context AND read it against the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`, the `SYNC:ui-ux-design-principles` block below) — an extract that silently imports a violation propagates it into every downstream spec, mock-up, and implementation.

1. **Measure, never eyeball (`UI-3.1`).** Compute contrast from the extracted hex pairs — 4.5:1 text, 3:1 UI edges — and record the NUMBER. A Figma colour style that fails is REPORTED as a failure, never imported as a token without the flag.
2. **Check the type scale for drift (`UI-2.5`, `UI-2.2`, `UI-2.3`).** Collapse the extracted text styles to 6 named steps; more than 6, or one-off sizes, is scale drift — list the offending sizes. Flag body below 16px web / 17px mobile, and anything under 14px as a hard fail; note where the measure exceeds 45–75 characters.
3. **Check the spacing unit (`UI-4.1`).** Reduce the extracted spacing values to ONE 4px or 8px base; every value that is not a multiple is recorded as off-grid with its source node.
4. **Check state coverage (`UI-5.2`, `UI-1.5`, `UI-9.3`).** Figma files usually ship the populated state only. Name which of the empty / loading / error frames are MISSING, and which of the 5 interaction states (default, hover, focus, active, disabled) have no variant — those gaps become open questions for the design owner, never silent omissions downstream. Note anything that loads without reserved space.
5. **Check touch surfaces (`UI-8.1`, `UI-8.2`).** On mobile/touch frames, verify hit targets ≥44×44pt spaced 8px apart and primary actions in the bottom third; report undersized targets with their node names.

Record every result in the `## Clause Conformance` table of the output above. Project design-system docs OUTRANK the clauses, and the clauses outrank the Figma file — when the three disagree, surface all sides to the user; NEVER resolve it silently.

## When to Use

- Figma URL detected in PBI, design-spec, or user prompt
- Called by `design-spec` when Figma URL is present
- Called by `plan` skill during Design Context Extraction step

## When NOT to Use

- No Figma URL present — skip, proceed to `design-spec` directly
- Hand-drawn wireframe — use `design-spec --mode=wireframe` instead
- Screenshot of existing app — use `design --mode=screenshot` instead

## See Also

- `references/figma-mcp-setup.md` — MCP server setup guide (created in Phase 09)
- `.claude/skills/plan/references/engine-figma.md` — integration protocol
- URL detection is handled inline in this skill

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting.

<!-- SYNC:existing-ui-research -->

> **[BLOCKING] Understand the existing UI before you design or spec a new/updated screen.** Before producing any wireframe, mockup, screen design, or UI spec:
>
> 1. **Inventory existing related UI** — search the project for screens, pages, and components already serving this feature or its domain (consult design-system docs + the real component inventory).
> 2. **Map connected flows** — identify every feature that links to, embeds, includes, or navigates to/from the new screen; trace its entry and exit flows so the new screen fits them.
> 3. **Reuse before invent** — prefer existing components, patterns, and layout conventions; justify any new component against what already exists.
> 4. **Record findings** — note the matched existing screens/components + connected flows in the artifact so downstream design faithfully matches the current UI system.
>
> **Skip ONLY** when the feature is backend-only (no UI) — state that explicitly.

<!-- /SYNC:existing-ui-research -->

<!-- SYNC:ui-system-context -->

> **UI System Context** — For ANY task touching `.ts`, `.html`, `.scss`, or `.css` files:
>
> **MUST ATTENTION READ before implementing:**
>
> 1. `docs/project-reference/frontend-patterns-reference.md` — component base classes, stores, forms
> 2. `docs/project-reference/scss-styling-guide.md` — BEM methodology, SCSS variables, mixins, responsive
> 3. `docs/project-reference/design-system/README.md` — design tokens, component inventory, icons
>
> Reference `docs/project-config.json` for project-specific paths.

<!-- /SYNC:ui-system-context -->

<!-- SYNC:ui-ux-design-principles -->

> **UI/UX Design Principles (Rev 1.0 — 40 clauses, web + mobile)** — the working rule set for ANY task that designs, plans, implements, or reviews a user interface. Applies to BOTH platforms unless a clause names one (§8 is mobile/touch). Cite clauses by ID: `UI-3.1`, `UI-8.2`.
>
> **Precedence:** project design-system / SCSS / frontend-pattern docs OUTRANK these clauses; these clauses outrank generic taste. A genuine conflict is SURFACED to the user with both sides — NEVER resolved silently. — why: the project's own recorded decision is the authority; these clauses are the default when it is silent.
>
> **1.0 Visual Hierarchy & Layout**
>
> - `UI-1.1` One focal point per screen. Two elements competing for first read → demote one.
> - `UI-1.2` Signal order: size → weight → colour → position. Use the cheapest signal that works before adding another.
> - `UI-1.3` Group by proximity, NEVER by border. Whitespace separates cleanly; boxes inside boxes do not.
> - `UI-1.4` Align to a shared edge. Every unexplained indent reads as an accident.
> - `UI-1.5` Design the empty, loading and error state FIRST. The full state is the easy one.
>
> **2.0 Typography**
>
> - `UI-2.1` Max 2 families, 3 weights each. More variety reads as inconsistency, not range.
> - `UI-2.2` Body text 16px web, 17px mobile. NEVER below 14px for anything a user must read.
> - `UI-2.3` Line length 45–75 characters. Constrain the measure, not the container.
> - `UI-2.4` Leading scales inversely with size: 1.5 body, 1.1–1.2 display.
> - `UI-2.5` Fixed type scale — 6 named steps shared with engineering. NEVER one-off sizes.
>
> **3.0 Colour & Contrast**
>
> - `UI-3.1` Contrast 4.5:1 text, 3:1 UI edges. Measure it — NEVER judge by eye on a bright screen.
> - `UI-3.2` One accent, one job. An accent that is everywhere points at nothing.
> - `UI-3.3` Colour NEVER carries meaning alone — pair it with an icon, label or position.
> - `UI-3.4` Dark mode is NOT inverted light mode. Lift surfaces to signal elevation; soften pure-white text.
>
> **4.0 Spacing & Grid**
>
> - `UI-4.1` One spacing unit, multiplied — 4px or 8px base; every gap a multiple of it.
> - `UI-4.2` Space belongs to the container, not the child. Use `gap`; reserve margins for exceptions.
> - `UI-4.3` Tighter inside, looser between — inner padding always smaller than the gap to the next group.
> - `UI-4.4` Breakpoints follow content, not devices. Break where the layout stops working.
>
> **5.0 Interaction & Feedback**
>
> - `UI-5.1` Every action gets a response under 100ms, even when the result takes longer.
> - `UI-5.2` Specify all 5 states — default, hover, focus, active, disabled — plus loading where it applies.
> - `UI-5.3` Prefer undo over confirmation. Confirm ONLY what cannot be reversed.
> - `UI-5.4` Motion clarifies cause and effect: 150–250ms, ease-out, honours reduced-motion.
> - `UI-5.5` Keep the visible focus ring. Restyle it if it clashes; NEVER remove it.
>
> **6.0 Navigation & IA**
>
> - `UI-6.1` Every screen answers: where am I, what's here, where next.
> - `UI-6.2` Max 5 top-level destinations. Depth beats a crowded first level.
> - `UI-6.3` Label by the user's word, not the internal one. Team vocabulary is not a taxonomy.
> - `UI-6.4` Every state deserves a URL or a back path. Deep links and hardware back must land somewhere sensible.
>
> **7.0 Forms & Input**
>
> - `UI-7.1` Ask for less. Every field needs a reason it exists today.
> - `UI-7.2` Labels stay visible. Placeholders are hints, NEVER labels.
> - `UI-7.3` Validate on blur, not on keystroke. Errors sit next to the field and say how to fix it.
> - `UI-7.4` Match keyboard to data type — correct input type, autocomplete and autocapitalise on every field.
> - `UI-7.5` NEVER lose entered data. Preserve input across errors, navigation and refresh.
>
> **8.0 Mobile & Touch** _(mobile/touch surfaces)_
>
> - `UI-8.1` Hit target ≥44×44pt, 8px apart. The target may exceed the visible icon.
> - `UI-8.2` Primary actions in the bottom third — that is where the thumb lives.
> - `UI-8.3` Gestures are shortcuts, NEVER the only route. Anything swipeable is also tappable.
> - `UI-8.4` Respect safe areas and the keyboard. Notch, home indicator and on-screen keyboard all steal space.
>
> **9.0 Speed & Perceived Speed**
>
> - `UI-9.1` Show structure before data — skeletons for known layouts, spinners only for unknown waits.
> - `UI-9.2` Assume success optimistically. Update UI first, reconcile after, roll back visibly on failure.
> - `UI-9.3` Reserve space for anything that loads. Images, ads and fonts must NEVER shift the layout.
> - `UI-9.4` Design for the slow connection. Offline, timeout and retry are states, NOT edge cases.
>
> **Apply by role** — the clauses are one set; what you DO with them depends on the task:
>
> | Role                                | Obligation                                                                                                                                                              |
> | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | DESIGN / PLAN a surface             | Clauses shape the artifact: empty/loading/error specified first (`UI-1.5`), all 5 states enumerated (`UI-5.2`), type scale + spacing unit declared (`UI-2.5`, `UI-4.1`) |
> | IMPLEMENT a component               | Pre-completion gate: states · tokens · contrast · focus ring · touch target · reserved space (`UI-5.2`, `UI-2.5`/`UI-4.1`, `UI-3.1`, `UI-5.5`, `UI-8.1`, `UI-9.3`)      |
> | REVIEW UI code or a design artifact | Each clause is a fail-condition; every finding cites `UI-<clause>` + `file:line` + severity. NEVER a tick-box sweep — one focused pass per section                      |
> | SCAN / document a UI system         | Record where the PROJECT deliberately deviates, so the overriding doc becomes the recorded authority                                                                    |
>
> **Skip ONLY** when the change has no user-facing surface (backend-only, tooling, docs) — state that explicitly so the skip is auditable, not an omission.

<!-- /SYNC:ui-ux-design-principles -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:ui-system-context:reminder -->

**IMPORTANT MUST ATTENTION** read frontend-patterns-reference, scss-styling-guide, design-system/README before any UI change.

<!-- /SYNC:ui-system-context:reminder -->

<!-- SYNC:ui-ux-design-principles:reminder -->

- **MUST ATTENTION** apply the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) to any user-facing surface: one focal point, proximity grouping, empty/loading/error designed FIRST (§1) · ≤2 families, 16px web / 17px mobile body, never <14px, 45–75ch, fixed 6-step scale (§2) · 4.5:1 text / 3:1 edges measured, one accent, colour never alone, dark mode ≠ inversion (§3) · one 4/8px unit, `gap` over margins, tighter-inside-looser-between, content-driven breakpoints (§4) · <100ms response, all 5 states, undo over confirm, 150–250ms ease-out honouring reduced-motion, visible focus ring (§5) · where-am-I/what's-here/where-next, ≤5 top-level destinations, user's words, URL or back path (§6) · fewer fields, visible labels, validate on blur, matched keyboard, NEVER lose input (§7) · ≥44×44pt targets 8px apart, bottom-third primaries, gestures never the only route, safe areas (§8) · structure before data, optimistic update with visible rollback, reserved space, slow-connection states (§9). Project design-system docs OUTRANK these clauses — a genuine conflict goes to the user, NEVER resolved silently. Cite every finding as `UI-<clause>` + `file:line`. Skip ONLY for changes with no user-facing surface, stated explicitly.

<!-- /SYNC:ui-ux-design-principles:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **UI System Context:** read frontend-patterns, scss-styling, design-system before any UI change.
- **Critical Thinking:** traced proof per claim, confidence >80% to act.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
**IMPORTANT MUST ATTENTION** read the extract against the 40 UI/UX Design Principles (`UI-1.1`–`UI-9.4`) and REPORT violations in the `## Clause Conformance` table instead of importing them silently — contrast measured from the extracted hexes (4.5:1 text / 3:1 edges, `UI-3.1`), type-scale drift against 6 named steps (`UI-2.5`) and body 16px web / 17px mobile never below 14px (`UI-2.2`), off-grid values against ONE 4/8px unit (`UI-4.1`), MISSING empty/loading/error frames (`UI-1.5`) and missing variants of the 5 interaction states (`UI-5.2`), undersized touch targets (`UI-8.1`) and primaries outside the bottom third (`UI-8.2`) — project design-system docs outrank the clauses and the clauses outrank the Figma file; disagreements go to the user
**MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
