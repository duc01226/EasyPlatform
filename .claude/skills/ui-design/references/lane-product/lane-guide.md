# Lane Guide — Product UI (`ui-design --lane=product`)

> Absorbed from the former `interface-design` skill. This is the full lane body the `ui-design` dispatcher points to for distinctive, craft-driven product interfaces (dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces). Reference files in this directory carry code examples, validation, and critique protocols.
>
> **Canonical knowledge:** the laws, the generated-design tell catalog, the design-plan contract, and the critique protocol are single-sourced in `.claude/docs/design-knowledge.md` and bound as the `DD-1`–`DD-8` clauses of `SYNC:design-distinctiveness-gate` (carried in `ui-design/SKILL.md`). This guide is the LANE PROCEDURE and owns the domain-exploration and mandate-check protocols; it never re-derives a weaker copy of those clauses.

**Goal:** Build distinctive, craft-driven product interfaces that emerge from domain exploration rather than AI defaults.

**Summary:**

- **Five steps, and the gates sit at both ends:** intent → domain exploration (4 required outputs) → propose direction (**the proposal IS the design plan — run the generic test on it BEFORE building**) → build → 5 mandate checks before showing anything.
- **Adoption outranks invention.** Where the project already has a design system or `interface-system.md`, ADOPT it and record the adoption; re-decide an axis only with a stated reason.
- **This lane's characteristic failure is the SaaS-card kit (`DD-4` T4) and template chrome (T5)** — identical rounded cards, one radius for every hierarchy level, the same soft grey shadow under each, ALL-CAPS eyebrows, middle-dot meta strings. The tell audit is the 5th mandate check for exactly this reason.
- **Every choice carries a WHY.** "It's common" is not a reason; a choice that survives swapping the domain was never a choice.

**Workflow:**

1. **Intent** — Identify who, what task, what feeling from the Journey Report (`UX-1`), after the design-authority read (`UX-2`); ask user if unclear
2. **Domain Exploration** — Produce 4 required outputs: domain concepts, color world, signature element, named defaults
3. **Propose Direction** — Present exploration + direction, get user buy-in
4. **Build** — Apply craft foundations (layering, tokens, typography, spacing)
5. **Evaluate** — Run mandate checks (swap, squint, signature, token, tell-audit tests) before showing

**Key Rules:**

- Every design choice must have a WHY — "it's common" is not a reason
- Produce 4 domain outputs before proposing any direction
- **The proposal IS the design plan (`DD-3`)** — color (4–6 named hex values), type (families + roles + scale), layout (prose + ASCII wireframe + alignment), principles. **Run the generic test on it BEFORE building:** work through a similar prompt and see whether you arrive somewhere similar; revise anything that reads like the default for any comparable product and say what you changed
- Run 5 mandate checks before showing output to user
- **Where the project already has a design system or `interface-system.md`, ADOPT it and record the adoption** — re-decide an axis only with a stated reason; surface genuine conflicts to the user, never resolve silently
- Save reusable patterns to `docs/design-system/interface-system.md` when 2+ uses
Both live under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`

**Scope:**

- **Use for:** Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces
- **Not for:** Landing pages, marketing sites, campaigns — use `ui-design --lane=marketing` instead

---

## Contents

- [The Problem](#the-problem)
- [Where Defaults Hide](#where-defaults-hide)
- [Intent First](#intent-first)
- [Every Choice Must Be A Choice](#every-choice-must-be-a-choice)
- [Intent Must Be Systemic](#intent-must-be-systemic)
- [Product Domain Exploration](#product-domain-exploration)
- [Required Outputs](#required-outputs)
- [Proposal Requirements](#proposal-requirements)
- [The Mandate](#the-mandate)
- [The Checks](#the-checks)
- [Craft Foundations](#craft-foundations)
- [Subtle Layering](#subtle-layering)
- [Infinite Expression](#infinite-expression)
- [Color Lives Somewhere](#color-lives-somewhere)
- [Before Writing Each Component](#before-writing-each-component)
- [Design Principles](#design-principles)
- [Token Architecture](#token-architecture)
- [Spacing](#spacing)
- [Padding](#padding)
- [Depth](#depth)
- [Border Radius](#border-radius)
- [Typography](#typography)
- [Card Layouts](#card-layouts)
- [Controls](#controls)
- [Iconography](#iconography)
- [Animation](#animation)
- [States](#states)
- [Navigation Context](#navigation-context)
- [Dark Mode](#dark-mode)
- [Avoid](#avoid)
- [Workflow](#workflow)
- [Order (BLOCKING)](#order-blocking)
- [Communication](#communication)
- [Suggest + Ask](#suggest--ask)
- [If Project Has system.md](#if-project-has-systemmd)
- [If No system.md](#if-no-systemmd)
- [After Completing a Task](#after-completing-a-task)
- [Deep Dives](#deep-dives)
- [Closing Reminders](#closing-reminders)
- [Related lanes & skills](#related-lanes--skills)

# The Problem

Domain exploration and stated intent can still produce a template when implementation defaults override them. Check the built interface against the product's subject and journeys.

# Where Defaults Hide

Treat structural choices as design decisions:

- **Typography:** weight, labels and paragraph texture establish identity. A bakery tool and trading terminal need different expression even when both require readable type.
- **Navigation:** communicate location, available actions and priorities; a screen without product context reads as a component demo.
- **Data:** choose a display for what the number means and what the person will do with it. A progress ring and label both show “3 of 10” but communicate differently.
- **Token names:** `--ink`/`--parchment` evoke a world; `--gray-700`/`--surface-2` are generic. Apply the token test below.

Ask why each creative and structural choice fits the product.

---

# Intent First

Before touching code, answer these. Not in your head — out loud, to yourself or the user.

**Intent comes FROM the Journey Report (`UX-1`), never from the brief's layout words.** Answer the three questions below from its actors (context, expertise, frequency), job statements, main journeys and decision points — the step tables say what the person decides, what they need to know to decide it, and which rule constrains it. A question the report cannot answer is an open question for the user, not a guess.

**Who is this human?**
Not "users." The actual person. Where are they when they open this? What's on their mind? What did they do 5 minutes ago, what will they do 5 minutes after? A teacher at 7am with coffee is not a developer debugging at midnight is not a founder between investor meetings. Their world shapes the interface.

**What must they accomplish?**
Not "use the dashboard." The verb. Grade these submissions. Find the broken deployment. Approve the payment. The answer determines what leads, what follows, what hides.

**What should this feel like?**
Say it in words that mean something. "Clean and modern" means nothing — every AI says that. Warm like a notebook? Cold like a terminal? Dense like a trading floor? Calm like a reading app? The answer shapes color, type, spacing, density — everything.

If you cannot answer these with specifics, stop. Ask the user. Do not guess. Do not default.

## Every Choice Must Be A Choice

Explain why the layout, color temperature, typeface, spacing scale and information hierarchy fit this domain. “Common,” “clean” and “works” alone do not establish fit.

**The test:** swap them for common alternatives. If the interface feels unchanged, revisit the free axes. Similarity to a generic response is a signal to check product-specific intent, not a reason to invent arbitrary differences.

## Intent Must Be Systemic

Saying "warm" and using cold colors is not following through. Intent is not a label — it's a constraint that shapes every decision.

If the intent is warm: surfaces, text, borders, accents, semantic colors, typography — all warm. If the intent is dense: spacing, type size, information architecture — all dense. If the intent is calm: motion, contrast, color saturation — all calm.

Check your output against your stated intent. Does every token reinforce it? Or did you state an intent and then default anyway?

---

# Product Domain Exploration

This is where defaults get caught — or don't.

Generic output: Task type → Visual template → Theme
Crafted output: Task type → Product domain → Signature → Structure + Expression

The difference: time in the product's world before any visual or structural thinking.

**Starts only after `UX-1` and `UX-2`.** Explore the domain once the Journey Report exists and the design authority (principles, design system, existing UI) has been read and recorded — the journeys supply the vocabulary and the decision points, and the design authority fixes the axes already decided, so exploration spends effort only on the free ones. The view structure comes from the journey steps (`UX-3`) and per-decision-point priority (`UX-4`), not from the signature.

## Required Outputs

**Produce all four outputs below before proposing any direction:**

**Domain:** Concepts, metaphors, vocabulary from this product's world. Not features — territory. Minimum 5.

**Color world:** What colors exist naturally in this product's domain? Not "warm" or "cool" — go to the actual world. If this product were a physical space, what would you see? What colors belong there that don't belong elsewhere? List 5+.

**Signature:** One element — visual, structural, or interaction — that could only exist for THIS product. If you can't name one, keep exploring.

**Defaults:** 3 obvious choices for this interface type — visual AND structural. You can't avoid patterns you haven't named.

## Proposal Requirements

Your direction must explicitly reference:

- Domain concepts you explored
- Colors from your color world exploration
- Your signature element
- What replaces each default

**The test:** Read your proposal. Remove the product name. Could someone identify what this is for? If not, it's generic. Explore deeper.

---

# The Mandate

**Before showing the user, look at what you made.**

Ask yourself: "If they said this lacks craft, what would they mean?"

That thing you just thought of — fix it first.

Your first output is probably generic. That's normal. The work is catching it before the user has to.

## The Checks

Run these against your output before presenting:

- **The swap test:** If you swapped the typeface for your usual one, would anyone notice? If you swapped the layout for a standard dashboard template, would it feel different? The places where swapping wouldn't matter are the places you defaulted.

- **The squint test:** Blur your eyes. Can you still perceive hierarchy? Is anything jumping out harshly? Craft whispers.

- **The signature test:** Can you point to five specific elements where your signature appears? Not "the overall feel" — actual components. A signature you can't locate doesn't exist.

- **The token test:** Read your CSS variables out loud. Do they sound like they belong to this product's world, or could they belong to any project?

- **The tell audit (`DD-4`):** Walk the free axes — the ones the brief did NOT pin — against the generated-design tell catalog in `.claude/docs/design-knowledge.md` §4. In this lane the two that bite hardest are **T4, the SaaS-card kit** (content chopped into identical rounded cards, ONE border-radius on everything regardless of hierarchy, the same `rgba(0,0,0,.1)` shadow under each, gradient washes as decoration) and **T5, template chrome** (tracked-out ALL-CAPS eyebrow above every heading, meta strings joined with middle dots, `#0B0B0B` standing in for black, monospace for small data labels, a trailing `→` on link text). Also check the structural tells: numbered markers `01 / 02 / 03` on content that is not actually a sequence, and per-section fade-and-slide-up entrances plus a hover transition on every card.

  **A match is not a defect** — every one of these is right for some brief. It is a flag that you spent a FREE axis on a default. For each match, either name the reason this brief calls for it, or revise it and say what the domain suggested instead.

If any check fails, iterate before showing.

---

# Craft Foundations

## Subtle Layering

Use subtle layering to make structure legible without drawing attention to its borders.

### Surface Elevation

Surfaces stack. A dropdown sits above a card which sits above the page. Build a numbered system — base, then increasing elevation levels. In dark mode, higher elevation = slightly lighter. In light mode, higher elevation = slightly lighter or uses shadow.

Use small lightness changes between levels: subtle individually, legible when surfaces stack.

**Key decisions:**

- **Sidebars:** Same background as canvas, not different. Different colors fragment the visual space into "sidebar world" and "content world." A subtle border is enough separation.
- **Dropdowns:** One level above their parent surface. If both share the same level, the dropdown blends into the card and layering is lost.
- **Inputs:** Slightly darker than their surroundings, not lighter. Inputs are "inset" — they receive content. A darker background signals "type here" without heavy borders.

### Borders

Borders should disappear when you're not looking for them, but be findable when you need structure. Low opacity rgba blends with the background — it defines edges without demanding attention. Solid hex borders look harsh in comparison.

Build a progression — not all borders are equal. Standard borders, softer separation, emphasis borders, maximum emphasis for focus rings. Match intensity to the importance of the boundary.

**The squint test:** Blur your eyes at the interface. still perceive hierarchy — what's above what, where sections divide. But nothing should jump out. No harsh lines. No jarring color shifts. Just quiet structure.

## Infinite Expression

Choose expression from the task and data. A metric can be a hero number, inline stat, sparkline, gauge, progress bar, delta or trend badge; a dashboard can emphasize density, whitespace, hierarchy or flow.

**Before building, ask:**

- What is the one action users perform most?
- Which comparable products solve it well, and why?
- What makes this layout fit its purpose?

Avoid repeating the same sidebar width, card grid and icon/number/label treatment across unrelated briefs. Keep established project conventions where they already fit.

## Color Lives Somewhere

Every product exists in a world. That world has colors.

Before you reach for a palette, spend time in the product's world. What would you see if you walked into the physical version of this space? What materials? What light? What objects?

Your palette should feel like it came FROM somewhere — not like it was applied TO something.

**Beyond Warm and Cold:** Temperature is one axis. Is this quiet or loud? Dense or spacious? Serious or playful? Geometric or organic? A trading terminal and a meditation app are both "focused" — completely different kinds of focus. Find the specific quality, not the generic label.

**Color Carries Meaning:** Gray builds structure. Color communicates — status, action, emphasis, identity. Unmotivated color is noise. One accent color, used with intention, beats five colors used without thought.

---

# Before Writing Each Component

**Every time** you write UI code — even small additions — state:

```
Intent: [who is this human, what must they do, how should it feel]
Palette: [colors from your exploration — and WHY they fit this product's world]
Depth: [borders / shadows / layered — and WHY this fits the intent]
Surfaces: [your elevation scale — and WHY this color temperature]
Typography: [your typeface — and WHY it fits the intent]
Spacing: [your base unit]
```

This checkpoint is mandatory. It forces you to connect every technical choice back to intent.

If you can't explain WHY for each choice, you're defaulting. Stop and think.

---

# Design Principles

## Token Architecture

Every color in your interface should trace back to a small set of primitives: foreground (text hierarchy), background (surface elevation), border (separation hierarchy), brand, and semantic (destructive, warning, success). No random hex values — everything maps to primitives.

### Text Hierarchy

Don't just have "text" and "gray text." Build four levels — primary, secondary, tertiary, muted. Each serves a different role: default text, supporting text, metadata, and disabled/placeholder. Use all four consistently. If you're only using two, your hierarchy is too flat.

### Border Progression

Borders aren't binary. Build a scale that matches intensity to importance — standard separation, softer separation, emphasis, maximum emphasis. Not every boundary deserves the same weight.

### Control Tokens

Form controls have specific needs. Don't reuse surface tokens — create dedicated ones for control backgrounds, control borders, and focus states. This lets you tune interactive elements independently from layout surfaces.

## Spacing

Pick a base unit and stick to multiples. Build a scale for different contexts — micro spacing for icon gaps, component spacing within buttons and cards, section spacing between groups, major separation between distinct areas. Random values signal no system.

## Padding

Keep it symmetrical. If one side has a value, others should match unless content naturally requires asymmetry.

## Depth

Choose ONE approach and commit:

- **Borders-only** — Clean, technical. For dense tools.
- **Subtle shadows** — Soft lift. For approachable products.
- **Layered shadows** — Premium, dimensional. For cards that need presence.
- **Surface color shifts** — Background tints establish hierarchy without shadows.

Don't mix approaches.

## Border Radius

Sharper feels technical. Rounder feels friendly. Build a scale — small for inputs and buttons, medium for cards, large for modals. Don't mix sharp and soft randomly.

## Typography

Build distinct levels distinguishable at a glance. Headlines need weight and tight tracking for presence. Body needs comfortable weight for readability. Labels need medium weight that works at smaller sizes. Data needs monospace with tabular number spacing for alignment. Don't rely on size alone — combine size, weight, and letter-spacing.

## Card Layouts

A metric card doesn't have to look like a plan card doesn't have to look like a settings card. Design each card's internal structure for its specific content — but keep the surface treatment consistent: same border weight, shadow depth, corner radius, padding scale.

## Controls

Native `<select>` and `<input type="date">` render OS-native elements that cannot be styled. Build custom components — trigger buttons with positioned dropdowns, calendar popovers, styled state management.

## Iconography

Icons clarify, not decorate — if removing an icon loses no meaning, remove it. Choose one icon set and stick with it. Give standalone icons presence with subtle background containers.

## Animation

Fast micro-interactions, smooth easing. Larger transitions can be slightly longer. Use deceleration easing. Avoid spring/bounce in professional interfaces.

## States

Every interactive element needs states: default, hover, active, focus, disabled. Data needs states too: loading, empty, error. Missing states feel broken.

## Navigation Context

Screens need grounding. A data table floating in space feels like a component demo, not a product. Include navigation showing where you are in the app, location indicators, and user context. When building sidebars, consider same background as main content with border separation rather than different colors.

## Dark Mode

Dark interfaces have different needs. Shadows are less visible on dark backgrounds — lean on borders for definition. Semantic colors (success, warning, error) often need slight desaturation. The hierarchy system still applies, just with inverted values.

---

# Avoid

- **Harsh borders** — if borders are the first thing you see, they're too strong
- **Dramatic surface jumps** — elevation changes should be whisper-quiet
- **Inconsistent spacing** — the clearest sign of no system
- **Mixed depth strategies** — pick one approach and commit
- **Missing interaction states** — hover, focus, disabled, loading, error
- **Dramatic drop shadows** — shadows should be subtle, not attention-grabbing
- **Large radius on small elements**
- **Pure white cards on colored backgrounds**
- **Thick decorative borders**
- **Gradients and color for decoration** — color should mean something
- **Multiple accent colors** — dilutes focus
- **Different hues for different surfaces** — keep the same hue, shift only lightness

---

# Workflow

## Order (BLOCKING)

1. **Journey Report (`UX-1`)** — actors, job statements, 3–5 main journeys with decision points; confirm an inferred primary actor/job/outcome (no question tool → record it `INFERRED — unconfirmed (no question tool)` and continue).
2. **Design authority read (`UX-2`)** — project design principles, design system / `interface-system.md`, existing UI; record the paths or `N/A`.
3. **Intent** — answered from the Journey Report.
4. **Domain exploration** — all four required outputs.
5. **Low-fi structure (`UX-7`)** — views from journey steps, priority per decision point; walk the main journeys on it.
6. **Propose → build → mandate checks** — as below.
7. **Walk the main journeys (`UX-8`)** on the built design with the traceability matrix before showing the user.

## Communication

Be invisible. Don't announce modes or narrate process.

**Never say:** "I'm in ESTABLISH MODE", "Let me check system.md..."

**Instead:** Jump into work. State suggestions with reasoning.

The Journey Report (`UX-1`) and the `Design authority read:` record (`UX-2`) are deliverables, not narration — ALWAYS present them.

## Suggest + Ask

Lead with your exploration and recommendation, then confirm:

```
"Domain: [5+ concepts from the product's world]
Color world: [5+ colors that exist in this domain]
Signature: [one element unique to this product]
Rejecting: [default 1] → [alternative], [default 2] → [alternative], [default 3] → [alternative]

Direction: [approach that connects to the above]"

[Ask: "Does that direction feel right?"]
```

## If Project Has system.md

Read `docs/design-system/interface-system.md` and apply. Decisions are made.

## If No system.md

1. Explore domain — Produce all four required outputs
2. Propose — Direction must reference all four
3. Confirm — Get user buy-in
4. Build — Apply principles
5. **Evaluate** — Run the mandate checks before showing
6. Offer to save

---

# After Completing a Task

When you finish building something, **always offer to save**:

```
"Want me to save these patterns for future sessions?"
```

If yes, write to `docs/design-system/interface-system.md`:

- Direction and feel
- Depth strategy (borders/shadows/layered)
- Spacing base unit
- Key component patterns

### What to Save

Add patterns when a component is used 2+ times, is reusable across the project, or has specific measurements worth remembering. Don't save one-off components, temporary experiments, or variations better handled with props.

### Consistency Checks

If system.md defines values, check against them: spacing on the defined grid, depth using the declared strategy throughout, colors from the defined palette, documented patterns reused instead of reinvented.

This compounds — each save makes future work faster and more consistent.

---

# Deep Dives

For more detail on specific topics:

- `principles.md` — Code examples, specific values, dark mode
- `validation.md` — Memory management, when to update system.md
- `critique.md` — Post-build craft critique protocol
- `example.md` — Worked example

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a product interface that emerges from ITS domain — not the dashboard any generator emits for any product.

**IMPORTANT MUST ATTENTION** present the Journey Report (`UX-1`) and read the design authority (`UX-2`) FIRST — intent is answered from the journeys; then run all five steps in order: 1 intent → 2 domain exploration (all 4 outputs: domain concepts, color world, signature element, named defaults) → 3 propose direction and get buy-in → 4 build on the craft foundations → 5 the 5 mandate checks (swap, squint, signature, token, **tell audit**) — why: the exploration outputs and the mandate checks are the only things standing between this lane and the default dashboard.

**IMPORTANT MUST ATTENTION** the proposal IS the design plan (`DD-3`) — colour, type, layout, principles, each with a WHY. Run the generic test on it BEFORE building and state what you changed.

**IMPORTANT MUST ATTENTION** ADOPT an existing project design system or `interface-system.md` and record the adoption; re-decide an axis only with a stated reason and surface genuine conflicts to the user — NEVER resolve them silently.

**IMPORTANT MUST ATTENTION** run the tell audit against `DD-4`, weighting T4 (SaaS-card kit) and T5 (template chrome) — this lane's two most likely defaults. Each match is a question about a free axis, NEVER a verdict.

**IMPORTANT MUST ATTENTION** every design choice carries a WHY; "it's common" is not a reason. Save a reusable pattern to `docs/design-system/interface-system.md` at 2+ uses.

---

## Related lanes & skills

- Marketing/creative lane (landing pages, campaigns, screenshot replication): `ui-design --lane=marketing` (`../lane-marketing/lane-guide.md`)
- `ui-design` local `scripts/search.py` — searchable design-intelligence index (styles, palettes, typography, products, UX, charts, landing, prompts, and stack guidance)
- `design-spec` — Create design specifications from requirements (incl. UX research notes, accessibility audit)
- `web-design-guidelines` — WCAG 2.2, accessibility review
