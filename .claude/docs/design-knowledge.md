# Design Knowledge Catalog — Laws, Tells, Typographic Craft & the Distinctiveness Process

> **Role:** the **authoritative knowledge body** design- and frontend-bearing skills reason FROM for _visual identity and craft_. Owns the DESIGN LAWS, the SUBJECT-GROUNDING rule, the GENERATED-DESIGN TELL CATALOG (§4), the TYPOGRAPHY / COLOR / STRUCTURE / MOTION laws, the WORDS-AS-DESIGN-CONTENT rules, the TWO-PASS PROCESS, the DESIGN PLAN contract, and the CRITIQUE protocol. Owns NO procedure — procedure lives in the consuming skills.
>
> **Consumed by:** `ui-design` (both lanes) · `design-spec` · `work-item --mode=mockup` · `feature-presentation` · `presentation-builder` · `plan` · `feature-implement` · `scaffold` · `fix` · `web-design-guidelines` · `work-item --mode=review` · `test-ui`, plus the `ui-ux-designer`, `frontend-developer` and `fullstack-developer` agents. This list is the drift-guard's scope — a skill belongs here ONLY if it carries an inline `SYNC:design-distinctiveness-gate` block or an explicit `design-knowledge.md` pointer, so the list stays greppable and the sweep stays truthful. NEVER add an aspirational consumer.
>
> **Drift-guard:** this file is AUTHORITATIVE for the tell catalog, the design-plan contract, and the distinctiveness laws. The **40 usability clauses `UI-1.1`–`UI-9.4` stay single-sourced** in `SYNC:ui-ux-design-principles` (`.claude/skills/shared/sync-inline-versions.md`); the **tech-agnostic spec layer** in `SYNC:ui-intent-layer`; **project token/component inventory** in `design-system/` under the project-reference docs root — default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path. On any change here, grep `design-knowledge.md` and `SYNC:design-distinctiveness-gate` and update every consuming carrier.
>
> **Relationship to `UI-1.1`–`UI-9.4` — two different questions, no overlap.** The 40 clauses ask **"is this usable, accessible, and consistent?"** — a floor with measurable pass/fail (contrast ratios, hit targets, focus rings, the five states). This catalog asks **"is this _this product's_ interface, or is it the interface any generator would emit for any brief?"** — a question of identity, and its failure mode is not a broken screen but a forgettable one. A design can pass all 40 clauses and still be a template. **Both bind. Neither substitutes for the other**, and where they touch (type scale, color, motion timing) the clause sets the floor and this catalog picks the value. **Both run AFTER the journey-first gate `UX-1`–`UX-11`** (`SYNC:ux-journey-gate`; catalog `.claude/docs/ux-journey-process.md`): the Journey Report and the design-authority read come first, and this catalog styles a structure whose purpose they already define.
>
> **MUST ATTENTION** every entry here is a CONDITIONAL judgment, never a rule. A trait in the tell catalog is legitimate for _some_ briefs — it is listed because it is a **default rather than a choice**, and it appears regardless of subject. NEVER report "uses a warm cream background" as a defect; report "spent a free axis on a default" and name the axis the brief left free.
>
> **MUST ATTENTION** the brief's own words ALWAYS WIN. Where the brief pins a visual direction, follow it exactly — including when it asks for one of the tells in §4. This catalog governs only the axes the brief leaves free. — why: overriding a stated client direction in the name of distinctiveness is the same failure as templating, run in the opposite direction.
>
> **MUST ATTENTION** the project's OWN design-system, SCSS, and frontend-pattern docs plus accepted ADRs **OUTRANK this catalog** on any conflict — this file supplies universal reasoning, the project supplies binding convention. A house style IS an intentional identity; re-deciding it per feature is the incoherence this catalog exists to prevent. NEVER flag a deviation from this catalog as a violation of the project; surface a genuine conflict to the user with both sides, NEVER resolve it silently.
>
> **Provenance.** Typographic measures in §5 derive from Bringhurst, _The Elements of Typographic Style_ `[textbook: Bringhurst, Elements of Typographic Style]`. The tell catalog in §4 is `[model-knowledge]` — an observed clustering of generated output, not a measured study; it is calibration, not authority, and it decays as generators shift. Everything else is `[model-knowledge]` design-practice consensus. NEVER quote §4 as proof that a design is machine-made; it flags a _default worth re-deciding_, nothing more.

---

## Quick Summary

**Goal:** Give every design- and frontend-bearing skill the reasoning it needs to produce a surface that reads as _this product's_ interface — grounded in its subject, distinctive on every axis the brief leaves free, and crafted to a quality floor — never the interchangeable page a generator emits for any brief.

**Summary:**

- **Two rule sets bind, and they ask different questions.** `UI-1.1`–`UI-9.4` (single-sourced in `SYNC:ui-ux-design-principles`) ask _"is this usable?"_; this catalog asks _"is this THIS product's interface?"_ A surface can pass all 40 clauses and still be a template.
- **Journey-first gate runs BEFORE both.** `UX-1`–`UX-11` (`SYNC:ux-journey-gate`; read `.claude/docs/ux-journey-process.md` when generating or reviewing any user-facing surface): report the main user journeys, read the project's design authority, only then apply this catalog.
- **Precedence, in order:** the brief's stated visual direction WINS OUTRIGHT → the project's design-system / SCSS / frontend-pattern docs + accepted ADRs → this catalog. Surface genuine conflicts to the user; NEVER resolve silently.
- **Every §4 tell is a CONDITIONAL judgment, never a defect.** Report "spent a free axis on a default" and name the axis — NEVER "uses a warm cream background".
- **The sections, in order:** §1 design laws → §2 ground it in the subject → §3 where defaults hide → §4 the tell catalog (T1–T5 clusters, typographic tells, structural/motion tells) → §5 typography → §6 color / structure / hero / composition → §7 motion → §8 words as design content → §9 the two-pass process (plan → **BLOCKING generic test** → build → critique) → §10 the design-plan contract → §11 critique → §12 implementation hygiene → §13 the 13-item judgment checklist → §14 single-sourcing map.
- **NEVER skip Pass 1b.** The plan is reviewed against the brief and the generic test is run BEFORE any code exists — a plan that would survive a similar prompt unchanged is a default, not a decision.

---

## 1. What Design Work Is — the reasoning frame

Approach every brief as the design lead at a studio known for giving each client a visual identity **not mistaken for anyone else's**. Assume this client has already rejected proposals that felt cliché or templated, and is paying for a point of view.

| Law                                          | Statement                                                                   | Consequence                                                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identity first**                           | A design's job is to be _this product's_, not to be nice                    | "Clean and modern" is not a direction — every generator says that. If the description would fit a competitor, it is not a direction                                    |
| **Distinctiveness is derived, not invented** | Character comes FROM the subject matter, never from taste applied on top    | A toy for girls aged 8–11 and a dashboard for financial analysts share no palette, type, or density. If your choice survives swapping the subject, it was not a choice |
| **Every choice carries a WHY**               | "It's common", "it's clean", "it's what users expect" are not reasons       | A decision with no articulable reason is a default that arrived while you were not looking                                                                             |
| **Defaults hide in infrastructure**          | The parts that feel like they _just need to work_ are where templates win   | Typography, navigation, data display, and token NAMES all feel structural. None are. There are no structural decisions                                                 |
| **Spend boldness once**                      | One memorable element, everything else quiet and disciplined                | Two competing bold moves cancel; four make noise. Boldness distributed evenly reads as decoration                                                                      |
| **Restraint is the last pass**               | Chanel: before leaving the house, remove one accessory                      | Cut the decoration that does not serve the brief — the cut is the design step most often skipped                                                                       |
| **Risk is justified by the brief**           | Take aesthetic risk when the brief supports it; never as self-expression    | An experiment that ignores the audience is not boldness, it is a different failure                                                                                     |
| **Quality floor is unannounced**             | Responsive, keyboard-focusable, reduced-motion-respecting, contrast-passing | Build it in silently. Never present the floor as a feature                                                                                                             |

**MUST ATTENTION** you will generate generic output by default. Training has seen thousands of dashboards and landing pages, and those patterns are strong. You can follow this entire process — explore the subject, name a signature, state your intent — and still ship a template, because **intent lives in prose while code generation pulls from patterns**. The gap between them is where defaults win. Process helps; process alone does not guarantee craft. You have to catch yourself, which is what §9's review pass and §11's critique exist for.

---

## 2. Ground the Design in Its Subject Matter

**Before designing, know what this actually is.** When a Journey Report (`UX-1`) exists, take the audience and primary job from its actors, job statements and ranked main journeys — do not re-derive them here; this section adds the subject's world and feel. If the brief does not identify the product or subject matter, identify it yourself and **confirm with the user** — propose one concrete subject, the audience, and the design's primary job. Use anything in memory about the client's preferences or context as a hint.

Answer these out loud — to yourself or the user — not in your head:

1. **What is this, concretely?** Not "a web app". The industry, the materials, the vernacular, the physical or professional world it belongs to. This is where distinctive choices come from.
2. **Who is this human?** Not "users". The actual person: where are they when they open this, what is on their mind, what did they do five minutes ago and what will they do five minutes after. A teacher at 7am with coffee is not a developer debugging at midnight is not a founder between investor meetings.
3. **What must they accomplish?** The verb. _Grade these submissions. Find the broken deployment. Approve the payment._ The answer decides what leads, what follows, and what hides.
4. **What should it feel like?** In words that mean something. Warm like a notebook? Cold like a terminal? Dense like a trading floor? Calm like a reading app? This shapes color, type, spacing, and density together.

**Build with the brief's real content and subject matter throughout.** Placeholder lorem, generic stat labels, and invented company names break the illusion faster than any visual flaw — see §8.

**The token-name test.** Someone reading only your CSS variable names should be able to guess what product this is. `--ink` and `--parchment` evoke a world; `--gray-700` and `--surface-2` evoke a template. Token names are design decisions, not implementation detail.

---

## 3. Where Defaults Hide

Defaults do not announce themselves. They disguise themselves as infrastructure.

- **Typography feels like a container.** Pick something readable, move on. But type is not holding the design — it IS the design. Weight, personality, texture shape how a product feels before a word is read. A bakery tool and a trading terminal both need "clean readable type"; the type that is warm and handmade is not the type that is cold and precise. **If you are reaching for your usual font, you are not designing.**
- **Navigation feels like scaffolding.** But navigation is not around the product — it IS the product: where you are, where you can go, what matters. A page floating in space is a component demo, not software.
- **Data feels like presentation.** You have numbers, so show numbers. But a number on screen is not design. What does it mean to the person looking, and what will they do with it? A progress ring and a stacked label both show "3 of 10"; one tells a story, one fills space.
- **Token names feel like implementation detail.** See §2's token-name test.

The trap is believing some decisions are creative and others structural. **The moment you stop asking "why this?" is the moment defaults take over.**

---

## 4. The Generated-Design Tell Catalog — calibration, not prohibition

`[model-knowledge]` — an observed clustering of current generated output. **Every trait here is legitimate for some brief.** They are listed because they are _defaults rather than choices_ and appear regardless of subject. **Where the brief pins a direction, follow it — including into these.** Where it leaves an axis free, **do not spend that freedom on one of these.**

### 4.1 The five clusters

| #      | Cluster                  | Signature                                                                                                                                                                                                                                                                                                                                         |
| ------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **T1** | **Warm-cream editorial** | Near-`#F4F1EA` cream ground + high-contrast serif display + terracotta/warm-clay accent near `#D97757`. **`#D97757` is Anthropic's own Claude-interaction accent** — on a user's brief it reads specifically as a tell, not merely as a default                                                                                                   |
| **T2** | **Acid-on-black**        | Near-black ground with a single bright acid-green or vermilion accent                                                                                                                                                                                                                                                                             |
| **T3** | **Broadsheet**           | Newspaper pastiche: hairline rules, zero border-radius, dense justified columns                                                                                                                                                                                                                                                                   |
| **T4** | **SaaS-card kit**        | Content chopped into identical rounded cards · ONE border-radius on everything regardless of hierarchy · the same soft grey shadow (`rgba(0,0,0,.1)`) under each · gradient washes used as decoration                                                                                                                                             |
| **T5** | **Template chrome**      | Appears whatever the subject: tracked-out ALL-CAPS eyebrow label above every heading · meta strings joined with middle dots (`A · B · C`) · labels built as `WORD — fragment` with a spaced em dash · tinted near-black (`#0B0B0B`, `#111`) standing in for black · a monospace face for small data labels · `→` appended to link and button text |

### 4.2 Typographic tells — the commonest signals of a generated page

Avoid these default treatments:

- **Accenting a single word or phrase in a headline** — one word in italic, bold, or a different color.
- **ALL CAPS for labels.**
- **Unnecessary typographic labels above content** — an eyebrow that names the section the heading already names.

### 4.3 Structural and motion tells

- **Numbered markers (`01 / 02 / 03`) on content that is not a sequence.** See §6.
- **Fade-and-slide-up entrances on every section**, and **hover transitions on every card**. Scattered effects read as generated; see §7.
- **The default hero:** a big number with a small label, supporting stats, and a gradient accent. Use it only when it is genuinely the best treatment for this subject — see §6.

**MUST ATTENTION** a tell match is a HYPOTHESIS about a _missed decision_, never a finding of wrongdoing. Promote it only by naming (a) the axis, (b) that the brief left it free, and (c) what the subject matter suggested instead. — why: shape-matching without that reasoning produces review noise and pushes designers toward a _different_ uniform.

---

## 5. Typography

Typography carries the personality of the page.

| Rule                               | Statement                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One or two families**            | You do NOT need a separate display and body face. Use one, or two — and if two, make them **clearly distinct**. Two similar sans faces read as a mistake, not a pairing                             |
| **Choose deliberately**            | Not the default families you would reach for on any other project. The choice must be traceable to §2's subject matter                                                                              |
| **Set a real scale**               | A clear type scale following the default guidance of _The Elements of Typographic Style_ `[textbook: Bringhurst]`, with intentional weights, widths, and spacing — not sizes invented per component |
| **Type as an active element**      | When type is a headline or visual element, the **treatment itself is part of the design**, not a neutral delivery vehicle for the words                                                             |
| **Measure**                        | Default to **line lengths under 80 characters**. Serif faces tolerate slightly longer measures                                                                                                      |
| **Leading**                        | Give **serif body text slightly more line-height than sans-serif** at the same size                                                                                                                 |
| **Hierarchy needs more than size** | If size is the only thing separating headline from body from label, the hierarchy is too weak. Weight, tracking, and opacity create layers size alone cannot                                        |
| **Legible squinted**               | Squint at the page: the hierarchy must survive                                                                                                                                                      |

Avoid the §4.2 typographic tells.

---

## 6. Color, Structure & Layout

### 6.1 Color

- Commit to a cohesive palette expressed as **4–6 named hex values** (§10). Use CSS custom properties so the palette is a system, not a scatter of literals.
- **Dominant colors with sharp accents outperform timid, evenly-distributed palettes.** One accent, one job (`UI-3.2`).
- Name tokens for the world, not the ramp (§2's token-name test).
- Harmonious and **visually accessible** — contrast measured, never eyeballed (`UI-3.1`).

### 6.2 Visual structure is information

Structural devices — outlines, borders, numbering, eyebrows, dividers, labels — **encode information about the content; they do not decorate it.**

**Before adding a numbered marker, check the content really is a sequence** (a stepped process, a timeline, a ranking). Three unordered feature blurbs numbered `01 / 02 / 03` assert an order that does not exist.

Apply the same test to every device: _what does this border tell the reader that whitespace would not?_ If the answer is nothing, it is decoration — cut it (§1, restraint).

### 6.3 The hero

For web designs, the hero is the first thing viewers see. **Open with the most characteristic thing in the subject's world**, in whatever form suits it: a headline, an image, an animation, a live demo, an interactive moment, or another treatment entirely. Be deliberate — the big-number-plus-gradient treatment is the default (§4.3), so use it only if it is genuinely the best option here.

### 6.4 Composition

- **Rhythm over monotone.** Great interfaces breathe unevenly — dense areas give way to open ones, heavy elements balance light ones. Same card size, same gap, same density everywhere is the sound of no one deciding.
- **Proportions speak.** A 280px sidebar beside full-width content says "navigation serves content"; 360px says "these are peers". If you cannot articulate what your proportions say, they are not saying anything.
- **One focal point.** Every screen has one thing the user came to do; it should dominate through size, position, contrast, or the space around it (`UI-1.1`).
- **Declare alignment intent** — left, centered, or justified — as a decision, in the design plan (§10).

---

## 7. Motion

- **Non-user-triggered motion is used sparingly and deliberately, only to draw attention.** A single orchestrated moment — one page-load sequence, or one reveal — lands better than scattered effects.
- **Fade-and-slide-up entrances on each section and hover transitions on every card are the generic default** and read as generated (§4.3).
- **Motion that answers a person's action** (opening, expanding, confirming) **is welcome** when it shows what changed.
- Honour `prefers-reduced-motion`; timing and easing follow `UI-5.4`.

---

## 8. Words Are Design Content

Words appear in a design for one reason: **to make it easier to understand and use.** They are design content, not decoration — bring the same intentionality and minimalism to copy that you bring to spacing and color. Before writing anything, ask what the design needs to say and how it can best be said to help the person navigate.

| Rule                                               | Statement                                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Write from the end user's perspective**          | Name things by what users understand, not by how the system is built. A user manages **notifications**, not **webhook config**                                                                            |
| **Describe, don't sell**                           | Say what something is or does in plain terms. Specific and legible to a new user beats clever, always                                                                                                     |
| **Active voice by default**                        | A CTA says exactly what happens: **"Save changes"**, not "Submit"                                                                                                                                         |
| **One name per action, whole flow**                | The button that says **Publish** produces a toast that says **Published**. Interface vocabulary is the signposting people learn the product by — cohesion is how they find their way                      |
| **Failure and emptiness give direction, not mood** | Explain what went wrong and how to fix it, in the interface's voice rather than a person's. **Errors do not apologize, and are never vague about what happened.** An empty screen is an invitation to act |
| **Conversational tone**                            | Plain verbs, sentence case, no filler, tone matched to brand and audience                                                                                                                                 |
| **One job per element**                            | Let each written element do exactly one thing                                                                                                                                                             |
| **Real content, not lorem**                        | Copy can make a design feel as templated as the design itself. When the brief has no real content, write plausible copy for the actual subject (§2)                                                       |

**Content coherence check:** read every visible string as a user would — not for typos, for truth. Could a real person at a real company be looking at exactly this data right now? Or does the page title belong to one product, the body to another, and the sidebar metrics to a third? A beautifully designed interface with nonsensical content is a movie set with no script.

---

## 9. The Two-Pass Process — plan, review, build, critique

**MUST ATTENTION** the review pass (Pass 1b) is the step that makes this process work and the step most often skipped. Writing a design plan and going straight to code reproduces the default, because the plan itself came from the same patterns the code will.

### Pass 1a — Brainstorm the design plan

From the brief, produce a **compact token system** (full contract in §10): Color, Type, Layout, Principles. Use one-sentence prose and **ASCII wireframes to ideate and compare** layout concepts before committing.

### Pass 1b — Review the plan against the brief (BLOCKING)

Before writing any code, interrogate the plan:

> **The generic test:** work through a _similar_ prompt in your head and see whether you arrive somewhere similar. **Any part of the plan that reads like the generic default you would produce for any comparable page — rather than a choice made for THIS brief — gets revised.**

Cross-check every axis against the §4 tell catalog. For each revision, **say what you changed and why**. Only after confirming the plan's relative uniqueness do you start writing code, and then you follow the **revised** plan.

### Pass 2a — Build

Implement the revised plan. Watch CSS selector specificity (§12). Build the quality floor in silently (§1).

### Pass 2b — Critique (§11)

Critique your own work as you build. **Take screenshots to review if the environment supports it — a picture is worth 1000 tokens.**

### Memory

Human creatives have memory and always try something new. If there is a place to jot down what has already been tried — a project design-system note, a scratch file — use it, so later passes do not re-converge. **NEVER converge on the same choice across generations** (Space Grotesk, for example); vary light and dark, families, and aesthetic direction between briefs.

---

## 10. The Design Plan Contract

The artifact Pass 1a produces and Pass 1b reviews. Four parts, none optional:

| Part           | Contract                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Color**      | The core base palette as **4–6 named hex values**. Names evoke the subject's world (§2), not a numeric ramp                                                             |
| **Type**       | The typefaces **and their roles**. One family, or two clearly distinct ones (§5). Name the scale                                                                        |
| **Layout**     | A layout concept in **one-sentence prose plus ASCII wireframes** used to ideate and compare alternatives. **Include alignment guidance** — left, centered, or justified |
| **Principles** | The high-level guidance for what makes THIS page unique — the one thing someone will remember, and what stays quiet around it (§1)                                      |

Every part carries its **WHY, traced to the subject matter**. A plan whose parts would survive swapping the subject has not been written yet.

**Where the plan lives.** A design plan belongs in the artifact that owns visual fidelity — the `design-spec`, the mockup, or the plan phase's `## UI Layout` section — **never in the tech-free Feature Spec**, whose interaction layer stays technology- and fidelity-free (`SYNC:ui-intent-layer`).

**Reuse beats re-deciding.** Where the project already has a design system, tokens, or an `interface-system.md`, the plan **adopts** it and records that adoption; it re-decides an axis only with a stated reason. A pattern used 2+ times with specific measurements worth remembering gets written back to the project's design-system doc.

---

## 11. Critique — the pass that separates correct from crafted

There is a distance between **correct** and **crafted**. Correct means the layout holds, the grid aligns, colors do not clash. Crafted means someone cared about every decision down to the last pixel — the difference between a hand-thrown mug and an injection-moulded one. Both hold coffee; one has presence. **Your first output lives in correct.** Review it the way a design lead reviews a junior's work: not "does this work?" but "would I put my name on this?"

**Composition** — Does the layout have rhythm, or is it monotone? Are proportions doing work? Is there a clear focal point, or does everything compete equally (§6.4)?

**Craft** — Follow the project's declared spacing system consistently, every value from its scale (`UI-4.1`) — but correctness alone is not craft. A tool panel at 16px padding feels workbench-tight; the same card at 24px feels like a brochure. **Density is a design decision, not a constant.** Surfaces should whisper hierarchy: mentally remove every border from the CSS — can you still perceive the structure through surface color alone? Interactive elements need life; missing hover and press states make an interface feel like a photograph of software.

**Content** — Run §8's coherence check.

**Structure** — Open the CSS and find the lies: negative margins undoing a parent's padding, `calc()` values that exist only as workarounds, absolute positioning to escape layout flow. Each is a shortcut where a clean solution exists — cards with full-width dividers use flex column with section-level padding; centered content uses `max-width` with auto margins. **The correct answer is always simpler than the hack.**

**Distinctiveness** — Re-run the §9 generic test on the _built_ page, not just the plan. Then apply restraint: **remove one accessory.**

**Then ask once more:** "If they said this lacks craft, what would they point to?" That thing you just thought of — fix it. Then ask again. **The first build was the draft; the critique is the design.**

---

## 12. Implementation Hygiene

- **CSS specificity.** It is easy to generate classes that cancel each other out — especially a type-based selector like `.section` against an element-based one like `.cta`. This bites most often on **padding and margin between sections**. Structure specificity deliberately; do not resolve collisions by escalating with `!important`.
- **Tokens over literals.** Every color, size, and spacing value resolves to the declared token system (§10) or the project's design system. Raw hex and magic numbers in component code are the mechanism by which a design plan quietly stops being followed.
- **Follow the project's class-naming convention** on every element (BEM or whatever the project documents) — ad-hoc names break the styling methodology and the design system together.
- **Quality floor, built in silently:** responsive down to the project's minimum width, visible keyboard focus, `prefers-reduced-motion` respected, contrast measured. The `UI-*` clauses own the thresholds.

---

## 13. Judgment Checklist

Run before presenting any design, mockup, or implemented UI surface.

1. **Subject named?** Product, audience, and primary job identified (and confirmed with the user when the brief was silent) — §2.
2. **Would it survive a subject swap?** If the palette, type, and layout would fit a different product unchanged, the design has no identity yet — §1.
3. **Design plan written AND reviewed?** All four parts with WHYs, and the Pass 1b generic test actually run with revisions stated — §9, §10.
4. **Free axes audited against the tell catalog?** For each §4 match: is it the brief's stated direction (fine), or a free axis spent on a default (revise) — §4.
5. **Typography deliberate?** One or two clearly distinct families, a real scale, measure under ~80ch, no §4.2 tells — §5.
6. **Every structural device earning its place?** Numbering only on real sequences; borders that whitespace could not replace — §6.2.
7. **Hero characteristic of the subject?** Not the default big-number-plus-gradient — §6.3.
8. **Motion deliberate?** One orchestrated moment, not per-section entrances and universal card hovers; reduced-motion honoured — §7.
9. **Copy doing work?** End-user vocabulary, active voice, one name per action across the flow, errors that explain rather than apologize, empty states that invite — §8.
10. **Boldness spent once?** One memorable element; everything else quiet — and one accessory removed — §1, §11.
11. **Critique run on the built page?** Composition, craft, content, structure, distinctiveness — with screenshots where the environment allows — §11.
12. **Quality floor met without being announced?** Responsive, focus-visible, reduced-motion, measured contrast, tokens not literals — §12.
13. **Precedence respected?** Project design-system docs outrank this catalog; the brief's stated direction outranks §4; genuine conflicts surfaced to the user, never resolved silently — header.

---

## 14. Consumers & Single-Sourcing Map

| Concern                                                   | Single source                                                                              | NEVER duplicate into                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Journey-first UX gate `UX-1`–`UX-11` (runs first)           | `SYNC:ux-journey-gate` + `.claude/docs/ux-journey-process.md`                              | this file (referenced only)                                  |
| Distinctiveness laws, tell catalog, design plan, critique | **this file** + `SYNC:design-distinctiveness-gate`                                         | any skill body (carry the SYNC block instead)                |
| Words-as-design-content                                   | §8 + `SYNC:ui-copywriting`                                                                 | —                                                            |
| 40 usability clauses `UI-1.1`–`UI-9.4`                    | `SYNC:ui-ux-design-principles`                                                             | this file (referenced only)                                  |
| Tech-agnostic spec interaction layer                      | `SYNC:ui-intent-layer`                                                                     | design artifacts (they own fidelity, the spec owns behavior) |
| Existing-UI inventory before designing                    | `SYNC:existing-ui-research`                                                                | —                                                            |
| Project tokens, components, icons, BEM                    | `design-system/` + `configured styling reference`, both in the project-reference docs root | this file (this file NEVER names project-specific values)    |

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** produce a surface that reads as _this product's_ interface — subject-grounded, distinctive on every free axis, crafted to the quality floor — never the interchangeable page a generator emits for any brief.

**IMPORTANT MUST ATTENTION** work the sections in order: §1 laws → §2 subject grounding → §3 where defaults hide → §4 tell catalog → §5 typography → §6 color/structure/hero/composition → §7 motion → §8 copy → §9 two-pass process → §10 plan contract → §11 critique → §12 hygiene → §13 checklist → §14 sourcing map — why: a section skipped in the long middle is a design decision left to its default.

**IMPORTANT MUST ATTENTION** the brief's stated direction outranks §4, and the project's design-system / SCSS / frontend-pattern docs + accepted ADRs outrank this whole catalog. NEVER flag a house-style deviation as a violation; surface a genuine conflict to the user with both sides, NEVER resolve it silently.

**IMPORTANT MUST ATTENTION** run Pass 1b (the BLOCKING generic test) BEFORE writing any code, and run the §11 critique on the BUILT page — why: the gap between intent and output is exactly where defaults reappear.

**IMPORTANT MUST ATTENTION** report every §4 match as a question — "was this axis free, and did the brief ask for it?" — NEVER as a verdict. A tell is a default worth re-deciding, never proof a design is machine-made.

**IMPORTANT MUST ATTENTION** spend boldness once, then remove one accessory — and meet the quality floor (responsive, focus-visible, reduced-motion, measured contrast, tokens not literals) without announcing it.

**IMPORTANT MUST ATTENTION** run the §13 judgment checklist before presenting any design, mockup, or implemented UI surface.

**Anti-Rationalization:**

| Evasion                                              | Rebuttal                                                                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| "The brief didn't state a visual direction"          | Then every axis is free — §2 names the subject, audience, and job FIRST. Silence is not permission to default. |
| "It's an internal tool, identity doesn't matter"     | The quality floor and the §8 copy rules still bind; identity is far cheaper to set now than to retrofit.       |
| "I ran the generic test in my head"                  | State the plan's four parts, the similar prompt, and what you CHANGED — an unrecorded test did not happen.     |
| "Cream + serif + terracotta is genuinely right here" | Then name the brief line that asked for it. An unsourced §4 match is a free axis spent on a default.           |
| "The page looks good, critique is optional"          | §11 runs on the BUILT page — correct and crafted are both still compatible with generic.                       |
