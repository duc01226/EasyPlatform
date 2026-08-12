# Lane Guide — Marketing / Creative (`design --lane=marketing`)

> Absorbed from the former `frontend-design` skill. This is the full lane body the `design` dispatcher points to for distinctive, production-grade marketing/creative interfaces (landing pages, campaigns, screenshot replication). Reference files in this directory carry the deep detail.

**Goal:** Create distinctive, production-grade frontend interfaces with high design quality, avoiding generic AI aesthetics.

**Workflow:**

1. **Detect Input Type** — Screenshot/image provided vs building from scratch
2. **Extract Design Guidelines** — For screenshots: analyze colors, typography, spacing, layout via visual analysis tooling
3. **Design Thinking** — Choose bold aesthetic direction (tone, differentiation, constraints)
4. **Implement Code** — Production-grade, visually striking, cohesive code
5. **Verify Quality** — Compare implementation to original design/vision

### Frontend/UI Context (if applicable)

> When this task involves frontend or UI changes:

- Component patterns: `docs/project-reference/frontend-patterns-reference.md`
- Styling/BEM guide: `docs/project-reference/scss-styling-guide.md`
- Design system tokens: `docs/project-reference/design-system/README.md`

> **SCSS/BEM rules (canonical):** BEM classes on ALL template elements (`block__element--modifier`). No magic numbers — use variables / design tokens. Max 3 nesting levels.

- For screenshot inputs, extract design guidelines FIRST before coding
- Choose distinctive, characterful fonts and a bold cohesive palette — never use generic fonts (Inter, Roboto, Arial) or cliched color schemes
- Match implementation complexity to aesthetic vision (maximalist = elaborate, minimalist = precise)

This lane guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Prerequisites

**⚠️ MUST ATTENTION READ** `design-extraction-overview.md` before executing screenshot-based workflows — contains design guideline extraction protocols, analysis prompts, and visual verification methods required by the screenshot/image input workflow below. For asset generation workflows, also **⚠️ MUST ATTENTION READ** `asset-generation.md`.

## Input Types & Workflows

### When User Provides Screenshot/Image/Design Reference

**MANDATORY workflow for screenshot/image/design inputs**:

1. **Extract Design Guidelines** using `design-extraction-overview.md`:
    - Analyze screenshot/image with visual analysis tooling
    - Extract: colors (hex codes), typography (fonts, sizes, weights), spacing scale, layout patterns, visual hierarchy
    - Document findings in project `docs/design-guidelines/extracted-design.md`
    - See `extraction-prompts.md` for comprehensive analysis prompts

2. **Implement Code** following extracted guidelines:
    - Use exact colors from extraction (hex codes)
    - Match typography specifications (fonts, sizes, weights, line-heights)
    - Replicate layout structure and spacing system
    - Maintain visual hierarchy and component patterns
    - Preserve aesthetic direction and mood

3. **Verify Quality** using `visual-analysis-overview.md`:
    - Compare implementation to original screenshot
    - Check color accuracy, spacing consistency, typography matching
    - Ensure all design elements preserved

**Important**: Do NOT skip to implementation. Extract design guidelines FIRST, then code.

### When Building from Scratch (No Screenshot Provided)

Follow "Design Thinking" process below to create original design.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available (use `anime.js` for animations: `animejs.md`). Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.
- **Visual Assets**: Use `visual analysis tooling` skills to generate the assets and media processing tooling to remove the background of generated assets if needed

## Working with Visual Assets

**Quick Start**: `visual-tooling-overview.md`

### Generating New Visual Assets

When GENERATE new hero images, backgrounds, textures, or decorative elements that match the design aesthetic, use the `visual analysis tooling` skill. This ensures generated assets align with the design thinking and aesthetics guidelines rather than producing generic imagery.

### Analyzing Provided Screenshots/Images/Designs

When user provides screenshots, photos, or design references to analyze or replicate, use `design-extraction-overview.md` to extract design guidelines BEFORE implementation. This is MANDATORY for screenshot inputs (see "Input Types & Workflows" above).

**Workflows**:

- `asset-generation.md` - Generate design-aligned visual assets
- `visual-analysis-overview.md` - Analyze and verify asset quality (modular)
- `design-extraction-overview.md` - Extract guidelines from inspiration (modular)
- `technical-overview.md` - Optimization and best practices (modular)

Each overview references detailed sub-modules for progressive disclosure.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Related lanes & skills

- Product-UI lane (dashboards, admin panels, SaaS apps): `design --lane=product` (`../lane-product/lane-guide.md`)
- `ui-ux-pro-max` — searchable design intelligence DB
- `shadcn-tailwind` — component library helpers
