# Lane Guide — Marketing / Creative (`ui-design --lane=marketing`)

> Absorbed from the former `frontend-design` skill. This is the full lane body the `ui-design` dispatcher points to for distinctive, production-grade marketing/creative interfaces (landing pages, campaigns, screenshot replication). Reference files in this directory carry the deep detail.
>
> **Canonical knowledge:** the laws, the generated-design tell catalog, the design-plan contract, and the critique protocol are single-sourced in `.claude/docs/design-knowledge.md` and bound as the `DD-1`–`DD-8` clauses of `SYNC:design-distinctiveness-gate` (carried in `ui-design/SKILL.md`). This guide is the LANE PROCEDURE — it says what to DO and in what order; it never re-derives a weaker copy of those clauses.

**Goal:** Create distinctive, production-grade frontend interfaces with high design quality, avoiding generic AI aesthetics.

**Summary:**

- **Six steps, in order, and Step 4 is a BLOCKING gate:** detect input type → establish the brief → Pass 1a design plan → **Pass 1b generic test (BLOCKING)** → Pass 2a build → Pass 2b restraint & critique. Then the writing pass, visual assets, and closing.
- **A screenshot IS the brief's stated direction.** When the user supplies a reference image, extract its guidelines FIRST — that direction outranks the `DD-4` tell catalog outright.
- **The tell catalog is calibration, not prohibition.** Every `DD-4` trait is legitimate for some brief; it is listed because it is a default rather than a choice. Spend a free axis deliberately, never by inheritance.
- **Boldness is spent once.** One memorable element, everything else quiet — and the last thing you do before presenting is remove one accessory.

**Approach this as the design lead at a design studio known for giving every client a distinct visual identity that is not mistaken for anyone else's.** Assume this client has already rejected proposals that felt cliché or templated and is paying for a distinctive point of view: make deliberate, opinionated choices about palette, typography, and layout that are specific to THIS brief, and take aesthetic risk where the brief justifies it.

**Workflow:**

1. **Detect input type** — screenshot/image reference provided vs building from scratch
2. **Establish the brief** — subject, audience, primary job (`DD-1`) and the visitor journey (`UX-1`) that orders the page's sections; for screenshots, extract design guidelines FIRST
3. **Pass 1a — design plan** — the 4-part token system (`DD-3`, below)
4. **Pass 1b — review the plan against the brief** — the BLOCKING generic test (`DD-3`); revise and say what changed
5. **Pass 2a — build** — production-grade code following the REVISED plan
6. **Pass 2b — critique** — composition, craft, content, structure, distinctiveness; restraint pass last

**Key rules:**

- The brief's own words ALWAYS win — including when it asks for one of the tells in `DD-4`
- Never skip Pass 1b; a plan written and then coded straight through reproduces the default
- Ground every choice in the subject matter (`DD-1`) — a choice that survives swapping the subject was not a choice
- Project design-system / SCSS / frontend-pattern docs OUTRANK this lane's defaults

### Frontend/UI context (if applicable)

> When this task touches an existing codebase's frontend or UI:

All three live under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path):

- Component patterns: `frontend-patterns-reference.md`
- Styling reference: `configured styling reference`
- Design system tokens: `design-system/README.md`

> **Styling rules:** Read the configured styling and design-system references first. Follow the project's selected naming method, tokens, variables, and nesting limits; use BEM or SCSS only when the project adopts them.

**Where the project already has a design system, ADOPT it and record the adoption** rather than re-deciding an axis it already settled. A house style IS an intentional identity; re-deciding it per page is exactly the incoherence this lane exists to prevent. Re-decide an axis only with a stated reason, and surface a genuine conflict to the user with both sides — never resolve it silently.

## Contents

- [Prerequisites](#prerequisites)
- [Step 1 — Input types & workflows](#step-1--input-types--workflows)
- [Step 2 — Establish the brief (`DD-1`)](#step-2--establish-the-brief-dd-1)
- [Step 3 — Pass 1a: brainstorm the design plan](#step-3--pass-1a-brainstorm-the-design-plan)
- [Step 4 — Pass 1b: review the plan against the brief (BLOCKING)](#step-4--pass-1b-review-the-plan-against-the-brief-blocking)
- [Step 5 — Pass 2a: build](#step-5--pass-2a-build)
- [Step 6 — Pass 2b: restraint & self-critique](#step-6--pass-2b-restraint--self-critique)
- [Writing — copy is design content](#writing--copy-is-design-content)
- [Working with visual assets](#working-with-visual-assets)
- [Closing](#closing)
- [Closing Reminders](#closing-reminders)
- [Related lanes & skills](#related-lanes--skills)

## Prerequisites

**⚠️ MUST ATTENTION READ** `design-extraction-overview.md` before executing screenshot-based workflows — contains design guideline extraction protocols, analysis prompts, and visual verification methods required by the screenshot/image input workflow below. For asset generation workflows, also **⚠️ MUST ATTENTION READ** `asset-generation.md`.

---

## Step 1 — Input types & workflows

### When the user provides a screenshot / image / design reference

**MANDATORY workflow for screenshot/image/design inputs.** Here the reference IS the brief's stated direction, so it outranks everything in `DD-4` — replicate it faithfully rather than "improving" it toward distinctiveness. Faithful replication still starts from the Journey Report (`UX-1`): infer and report the visitor journey the reference serves, and record — never silently copy — any step the walk (`UX-8`) shows it fails; confirm a correction that changes the visual match with the user.

1. **Extract design guidelines** using `design-extraction-overview.md`:
    - Analyze the screenshot/image with visual analysis tooling
    - Extract: colors (hex codes), typography (fonts, sizes, weights), spacing scale, layout patterns, visual hierarchy
    - Document findings in project `docs/design-guidelines/extracted-design.md`
    - See `extraction-prompts.md` for comprehensive analysis prompts

2. **Implement code** following the extracted guidelines:
    - Use exact colors from extraction (hex codes)
    - Match typography specifications (fonts, sizes, weights, line-heights)
    - Replicate layout structure and spacing system
    - Maintain visual hierarchy and component patterns
    - Preserve aesthetic direction and mood

3. **Verify quality** using `visual-analysis-overview.md`:
    - Compare implementation to the original screenshot
    - Check color accuracy, spacing consistency, typography matching
    - Ensure all design elements are preserved

**Important:** do NOT skip to implementation. Extract design guidelines FIRST, then code.

### When building from scratch (no reference provided)

Continue to Step 2. The two-pass process below is the whole of the lane.

---

## Step 2 — Establish the brief (`DD-1`)

**If the brief does not identify what the product or subject matter is, identify it yourself and CONFIRM with the client.** Propose one concrete subject, the design's audience, and its primary job. If anything in memory records the client's preferences or what they are building, use it as a hint.

**Map the visitor journey (`UX-1`) before any plan.** A marketing page has actors and a job too — the visitor's. From the Journey Report, write the visitor's path as an ordered list:

| Stage | What to record |
| --- | --- |
| Arrival | Context and source — ad, search, referral, email, direct — and what the visitor already believes or expects on landing |
| Questions, in order | The questions the visitor needs answered before they will act ("what is it?", "is it for me?", "does it work?", "what does it cost?", "what's the risk?"), ranked in the order they ask them |
| Proof | The evidence that answers the doubting questions — demo, numbers, testimonials, logos, guarantees — tied to the question it settles |
| Action | The ONE primary action the page exists for, and where the visitor is ready to take it |
| After-action | What happens next — confirmation, onboarding, email — so the promise the page makes is the one the next step keeps |

**The page's section order follows the visitor's question order** (`UX-3`/`UX-4`): each section answers the next question, the primary action appears where the visitor is ready for it, and content that answers no visitor question goes. Read the project's design authority (`UX-2`) before choosing a direction.

The subject's **industry, subject matter, materials, and vernacular are where distinctive visual choices come from** — a design for a toy for girls aged 8–11 will be aesthetically nothing like a dashboard for financial analysts. **Build with the brief's real content and subject matter throughout**; placeholder lorem and invented filler break the illusion faster than any visual flaw (see Writing, below).

### Design thinking

Before coding, understand the context and commit to a clear aesthetic direction:

- **Purpose:** what problem does this interface solve? Who uses it?
- **Tone:** pick an extreme — brutally minimal, maximalist, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, and many more. Use these as inspiration, not a menu; design one that is true to THIS subject.
- **Constraints:** technical requirements (framework, performance, accessibility).
- **Differentiation:** what makes this UNFORGETTABLE? What is the one thing someone will remember?

**CRITICAL:** choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — **the key is intentionality, not intensity.**

---

## Step 3 — Pass 1a: brainstorm the design plan

Produce a **compact token system** before any code. Four parts, none optional:

| Part | Contract |
| --- | --- |
| **Color** | The core base palette as **4–6 named hex values**. Names evoke the subject's world, not a numeric ramp — someone reading only your tokens should be able to guess what product this is |
| **Type** | The typefaces **and their roles** |
| **Layout** | A layout concept, using **one-sentence prose descriptions and ASCII wireframes to ideate and compare** alternatives. **Include alignment guidance** — should the content be left aligned, center aligned, or justified? |
| **Principles** | The high-level guidance for what makes THIS page unique |

Each part carries its WHY, traced to Step 2's subject matter.

---

## Step 4 — Pass 1b: review the plan against the brief (BLOCKING)

**Then review that plan against the brief BEFORE building.** For each part, work through a similar prompt in your head and see whether you arrive somewhere similar.

> **If any part reads like the generic default you would produce for any similar page — rather than a choice made for this specific brief — REVISE that part, and say what you changed and why.**

Cross-check every axis the brief left free against the `DD-4` tell catalog in `.claude/docs/design-knowledge.md` §4:

- a warm cream background (near `#F4F1EA`) with a high-contrast serif display and a terracotta or warm-clay accent (often near `#D97757` — Anthropic's own Claude-interaction accent, so on a user's brief it reads as a tell);
- a near-black background with a single bright acid-green or vermilion accent;
- a broadsheet-style layout with hairline rules, zero border-radius, and dense newspaper-like columns;
- **the SaaS-card kit:** content chopped into identical rounded cards, one border-radius on everything regardless of hierarchy, the same soft grey shadow (`rgba(0,0,0,.1)`) under each, and gradient washes as decoration;
- **template chrome that appears whatever the subject:** a tracked-out ALL-CAPS eyebrow label above every heading; meta strings joined with middle dots (`A · B · C`); labels built as `WORD — fragment` with a spaced em dash; tinted near-black (`#0B0B0B`, `#111`) standing in for black; a monospace face for small data labels; a `→` appended to link and button text.

**All traits are legitimate for some briefs, but they are defaults rather than choices, and they appear regardless of subject.** Where the brief pins down a visual direction, follow it exactly. Where it leaves an axis free, do not spend that freedom on one of these defaults. As with a hired human designer, there is often a careful balance between doing what you are good at and taking each project as a chance to experiment and learn.

**Only after you have confirmed the relative uniqueness of your design plan do you start to write code — and then you follow the REVISED plan.**

---

## Step 5 — Pass 2a: build

Implement working code (HTML/CSS/JS, React, Vue, etc.) that is production-grade and functional, visually striking and memorable, cohesive with a clear aesthetic point-of-view, and meticulously refined in every detail.

### Typography

**Typography carries the personality of the page.** You do not need a different typeface for display/headline text and body content: **use one family or two, and if two, make them clearly distinct.**

Choose your typefaces deliberately — not the default families you would reach for on any other project — and set a clear type scale following the default guidance of *The Elements of Typographic Style*, with intentional weights, widths, and spacing. **When type is used as a headline or visual element, the type treatment itself is an active part of the design, not a neutral delivery vehicle for the content.**

Default to **line lengths of less than 80 characters.** Serif typefaces can have slightly longer line lengths; give serif body text slightly more line-height than a sans-serif.

Choose fonts that are beautiful, unique, and interesting — unexpected, characterful choices that elevate the aesthetics. **Avoid generic families (Inter, Roboto, Arial, system fonts).**

**Avoid these default typographic treatments — the commonest tells of a generated page:**

- Accenting just a single word or phrase in a headline, like putting one word in italic/bold or a different color
- Using all caps for labels
- Adding unnecessary typographic labels above content

### The hero

For web designs, the hero is the first thing viewers will see. **Open with the most characteristic thing in the subject's world, in the form that is most appropriate:** a headline, an image, an animation, a live demo, an interactive moment, or another treatment. Be deliberate — a big number with a small label, supporting stats, and a gradient accent is the DEFAULT treatment, so only use it if that is truly the best option.

### Visual structure is information

Structural devices — outlines, borders, numbering, eyebrows, dividers, labels — **encode useful information about the content rather than decorate it.** Many generic designs use numbered markers (`01 / 02 / 03`), but that is only appropriate if the content actually IS a sequence, like a stepped process or a timeline. **Before adding numbered markers, check the content really is a sequence.**

### Color & theme

Commit to a cohesive aesthetic. **Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.** Avoid cliched schemes — particularly purple gradients on white backgrounds. Vary between light and dark themes across projects.

### Motion

**Use non-user-triggered motion sparingly and deliberately, only to draw attention.** A single orchestrated moment — one page-load sequence or one reveal — lands better than scattered effects; **fade-and-slide-up entrances on each section and hover transitions on every card are the generic default and read as AI-generated.** Motion that answers a person's action (opening, expanding, confirming) is welcome when it shows what changed.

Prioritize CSS-only solutions for HTML; use the Motion library for React when available, or `anime.js` (`animejs.md`). One well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions. Honour `prefers-reduced-motion`.

When the deliverable is an animation or video, plan it with `motion-storyboard.md`, make it recordable per `.claude/skills/html-export/references/animation-recording.md`, and export it with the `html-export` skill (`--to=mp4|gif`) or its script by path; never run install commands — a missing dependency is `NOT VERIFIABLE` plus a setup pointer.

### Spatial composition, backgrounds & assets

- **Spatial composition:** unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density — chosen, not defaulted.
- **Backgrounds & visual details:** create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic — gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays. Every one must earn its place against the restraint pass in Step 6.
- **Visual assets:** use visual analysis tooling to generate assets, and media processing tooling to remove backgrounds from generated assets where needed.

### Code hygiene

**Be careful of structuring your CSS selector specificities.** It is easy to generate CSS classes that cancel each other out — especially with a type-based selector like `.section` and an element-based selector like `.cta`. This happens often with **padding/margin between sections.**

**Match implementation complexity to the aesthetic vision.** Maximalist designs need elaborate code with extensive animations and effects; minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

**Build to a quality floor without announcing it:** responsive down to mobile, visible keyboard focus, reduced motion respected, visually accessible, harmonious color palettes.

---

## Step 6 — Pass 2b: restraint & self-critique

**Spend your boldness in one place.** Let one element be the memorable thing, keep everything around it quiet and disciplined, and **cut any decoration that does not serve the brief.**

**Critique your own work as you build, taking screenshots to review if your environment supports it — a picture is worth 1000 tokens.** Run the full critique protocol in `.claude/docs/design-knowledge.md` §11: composition (rhythm, proportion, focal point) · craft (density as a decision, surfaces that whisper hierarchy, live interactive states) · content (read every string for truth) · structure (find the CSS lies — negative margins undoing a parent's padding, `calc()` workarounds, absolute positioning to escape flow).

**Then consider Chanel's advice: before leaving the house, take a look in the mirror and remove one accessory.**

Human creatives have memory and always try to do something new — **if you have a space to quickly jot down notes about what you have tried, it can help you in future passes.** NEVER converge on common choices (Space Grotesk, for example) across generations.

---

## Writing — copy is design content

Words appear in a design for one reason: **to make it easier to understand and use.** They are design content, not decoration. Bring the same intentionality and minimalism to copywriting that you would bring to spacing and color. Before writing anything, ask what the design needs to say, and how it can best be said to help the person navigate the experience. **Copy can make a design feel as templated as the design itself.**

- **Write from the end user's perspective.** Name things by what users will understand in simple language, not by how the system is built — a user manages *notifications*, not *webhook config*. Describe what something is or does in plain terms rather than selling it. Being specific and legible to new users is always better than being clever.
- **Use active voice as default.** A CTA says exactly what happens when it is used: **"Save changes,"** not "Submit." An action keeps the same name through the whole flow, so the button that says **Publish** produces a toast that says **Published.** The vocabulary of an interface is the signposting for someone navigating the product; cohesion and consistency are how people learn their way around.
- **Treat failure and emptiness as moments for direction, not mood.** Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors don't apologize, and they are never vague about what happened.** An empty screen is an invitation to act.
- **Keep the tone conversational:** plain verbs, sentence case, no filler, tone matched to the brand and the audience. **Let each written element do exactly one job.**

Often a design brief may not contain real content, and it is up to you to come up with copy and placeholder content — write it for the ACTUAL subject, then read every visible string as a user would and check that the page tells one coherent story.

---

## Working with visual assets

**Quick start:** `visual-tooling-overview.md`

- **Generating new assets** — when generating hero images, backgrounds, textures, or decorative elements that match the design aesthetic, use the visual analysis tooling skill. This ensures generated assets align with the design plan rather than producing generic imagery.
- **Analyzing provided references** — when the user provides screenshots, photos, or design references to analyze or replicate, use `design-extraction-overview.md` to extract design guidelines BEFORE implementation. This is MANDATORY for screenshot inputs (see Step 1).

**Workflows:**

- `asset-generation.md` — generate design-aligned visual assets
- `visual-analysis-overview.md` — analyze and verify asset quality (modular)
- `design-extraction-overview.md` — extract guidelines from inspiration (modular)
- `technical-overview.md` — optimization and best practices (modular)

Each overview references detailed sub-modules for progressive disclosure.

---

## Closing

NEVER use generic AI-generated aesthetics: overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics.

Claude is capable of extraordinary creative work — don't hold back when the brief invites it; show what can truly be created when thinking outside the box and committing fully to a distinctive vision, and stay disciplined when the brief calls for restraint instead.

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** a distinctive, production-grade interface specific to THIS brief — never the page a generator would emit for any brief.

**IMPORTANT MUST ATTENTION** run all six steps in order: 1 detect input type → 2 establish the brief (`DD-1`) → 3 Pass 1a design plan (`DD-3`) → 4 **Pass 1b generic test — BLOCKING** → 5 Pass 2a build → 6 Pass 2b restraint & critique — then the writing pass and visual assets — why: steps buried mid-guide get skipped, and skipping Pass 1b is what reproduces the default.

**IMPORTANT MUST ATTENTION** NEVER skip Pass 1b, and state what you CHANGED and why — a plan coded straight through has not been reviewed.

**IMPORTANT MUST ATTENTION** the brief's own words ALWAYS win, including when they ask for a `DD-4` tell; a supplied screenshot is a stated direction. Project design-system / SCSS / frontend-pattern docs OUTRANK this lane's defaults — surface conflicts, NEVER resolve silently.

**IMPORTANT MUST ATTENTION** ground every choice in the subject matter (`DD-1`) — a choice that survives swapping the subject was never a choice.

**IMPORTANT MUST ATTENTION** meet the quality floor without announcing it: responsive to mobile, visible keyboard focus, reduced motion respected, accessible contrast, harmonious palette.

## Related lanes & skills

- Product-UI lane (dashboards, admin panels, SaaS apps): `ui-design --lane=product` (`../lane-product/lane-guide.md`)
- Canonical design knowledge: `.claude/docs/design-knowledge.md`
- `ui-design` local `scripts/search.py` — searchable design-intelligence index
- `shadcn-tailwind` — component library helpers
- `html-export` — export an HTML deliverable (`--to=png|pdf|mp4|gif`); invoke the skill or run `node .claude/skills/html-export/scripts/export.cjs` by path; never install its dependencies
