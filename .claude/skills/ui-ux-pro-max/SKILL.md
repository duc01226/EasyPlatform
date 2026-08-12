---
name: ui-ux-pro-max
version: 1.0.0
description: '[Frontend] Use when designing beautiful or aesthetic interfaces with curated UI styles, palettes, fonts, charts, and stacks.'
---

## Quick Summary

**Goal:** Provide searchable UI/UX design intelligence -- 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks.

**Workflow:**

1. **Analyze** — Extract product type, style keywords, industry, and stack from user request
2. **Search** — Query `search.py` across domains: product, style, typography, color, landing, chart, UX
3. **Stack Guidelines** — Get stack-specific best practices (default: html-tailwind)
4. **Implement** — Synthesize search results into cohesive design and code

**Key Rules:**

- No emojis as UI icons (use SVG: Heroicons, Lucide, Simple Icons)
- All clickable elements need `cursor-pointer` and hover feedback
- Light mode text must have 4.5:1 minimum contrast ratio
- **Every async surface MUST handle all its states** — show a loading indicator while in-flight, a user-visible error (with retry) on failure, and a meaningful empty state when there's no data. Never a frozen blank, a silent failure, or a blank list.
- **Responsive by default** — layouts MUST stay usable on small devices. Preferred: reflow (rows `flex-wrap` or `row → column`, grids collapse to one column). Acceptable fallback when a layout genuinely can't reflow (tables, canvases, wide grids): fixed `min-width`/`min-height` + `overflow: auto` scroll — scrolling is OK. Hard minimum: nothing broken — no clipped, cut-off, or unreachable content. If small-screen support needs a refactor too big for the task, confirm scope with the user first.
- Test both light/dark modes, all UI states (loading/error/empty), and responsive breakpoints (320/768/1024/1440) before delivery

**Pre-read (project design system):** When the project has a design system, load `designSystem.canonicalDoc` + `tokenFiles` from `docs/project-config.json` and prefer project tokens/components over the generic style intelligence database.

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# UI/UX Pro Max - Design Intelligence

Searchable database of UI styles, color palettes, font pairings, chart types, product recommendations, UX guidelines, and stack-specific best practices.

## Prerequisites

Check if Python is installed:

```bash
python3 --version || python --version
```

If Python is not installed, install it based on user's OS:

**macOS:**

```bash
brew install python3
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install python3
```

**Windows:**

```powershell
winget install Python.Python.3.12
```

---

## How to Use This Skill

When user requests UI/UX work (design, build, create, implement, review, fix, improve), follow this workflow:

### Step 1: Analyze User Requirements

Extract key information from user request:

- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, etc.
- **Style keywords**: minimal, playful, professional, elegant, dark mode, etc.
- **Industry**: healthcare, fintech, gaming, education, etc.
- **Stack**: React, Vue, Next.js, or default to `html-tailwind`

### Step 2: Search Relevant Domains

Use `search.py` multiple times to gather comprehensive information. Search until you have enough context.

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**Recommended search order:**

1. **Product** - Get style recommendations for product type
2. **Style** - Get detailed style guide (colors, effects, frameworks)
3. **Typography** - Get font pairings with Google Fonts imports
4. **Color** - Get color palette (Primary, Secondary, CTA, Background, Text, Border)
5. **Landing** - Get page structure (if landing page)
6. **Chart** - Get chart recommendations (if dashboard/analytics)
7. **UX** - Get best practices and anti-patterns
8. **Stack** - Get stack-specific guidelines (default: html-tailwind)

### Step 3: Stack Guidelines (Default: html-tailwind)

If user doesn't specify a stack, **default to `html-tailwind`**.

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack html-tailwind
```

Available stacks: `html-tailwind`, `react`, `nextjs`, `vue`, `svelte`, `swiftui`, `react-native`, `flutter`

---

## Search Reference

### Available Domains

| Domain       | Use For                              | Example Keywords                                         |
| ------------ | ------------------------------------ | -------------------------------------------------------- |
| `product`    | Product type recommendations         | SaaS, e-commerce, portfolio, healthcare, beauty, service |
| `style`      | UI styles, colors, effects           | glassmorphism, minimalism, dark mode, brutalism          |
| `typography` | Font pairings, Google Fonts          | elegant, playful, professional, modern                   |
| `color`      | Color palettes by product type       | saas, ecommerce, healthcare, beauty, fintech, service    |
| `landing`    | Page structure, CTA strategies       | hero, hero-centric, testimonial, pricing, social-proof   |
| `chart`      | Chart types, library recommendations | trend, comparison, timeline, funnel, pie                 |
| `ux`         | Best practices, anti-patterns        | animation, accessibility, z-index, loading               |
| `prompt`     | AI prompts, CSS keywords             | (style name)                                             |

### Available Stacks

| Stack           | Focus                                          |
| --------------- | ---------------------------------------------- |
| `html-tailwind` | Tailwind utilities, responsive, a11y (DEFAULT) |
| `react`         | State, hooks, performance, patterns            |
| `nextjs`        | SSR, routing, images, API routes               |
| `vue`           | Composition API, Pinia, Vue Router             |
| `svelte`        | Runes, stores, SvelteKit                       |
| `swiftui`       | Views, State, Navigation, Animation            |
| `react-native`  | Components, Navigation, Lists                  |
| `flutter`       | Widgets, State, Layout, Theming                |

---

## Example Workflow

**User request:** "Làm landing page cho dịch vụ chăm sóc da chuyên nghiệp"

**AI should:**

```bash
# 1. Search product type
python .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --domain product

# 2. Search style (based on industry: beauty, elegant)
python .claude/skills/ui-ux-pro-max/scripts/search.py "elegant minimal soft" --domain style

# 3. Search typography
python .claude/skills/ui-ux-pro-max/scripts/search.py "elegant luxury" --domain typography

# 4. Search color palette
python .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --domain color

# 5. Search landing page structure
python .claude/skills/ui-ux-pro-max/scripts/search.py "hero-centric social-proof" --domain landing

# 6. Search UX guidelines
python .claude/skills/ui-ux-pro-max/scripts/search.py "animation" --domain ux
python .claude/skills/ui-ux-pro-max/scripts/search.py "accessibility" --domain ux

# 7. Search stack guidelines (default: html-tailwind)
python .claude/skills/ui-ux-pro-max/scripts/search.py "layout responsive" --stack html-tailwind
```

**Then:** Synthesize all search results and implement the design.

---

## Tips for Better Results

1. **Be specific with keywords** - "healthcare SaaS dashboard" > "app"
2. **Search multiple times** - Different keywords reveal different insights
3. **Combine domains** - Style + Typography + Color = Complete design system
4. **Always check UX** - Search "animation", "z-index", "accessibility" for common issues
5. **Use stack flag** - Get implementation-specific best practices
6. **Iterate** - If first search doesn't match, try different keywords

---

## Common Rules for Professional UI

These are frequently overlooked issues that make UI look unprofessional:

### Icons & Visual Elements

| Rule                       | Do                                              | Don't                                  |
| -------------------------- | ----------------------------------------------- | -------------------------------------- |
| **No emoji icons**         | Use SVG icons (Heroicons, Lucide, Simple Icons) | Use emojis like 🎨 🚀 ⚙️ as UI icons   |
| **Stable hover states**    | Use color/opacity transitions on hover          | Use scale transforms that shift layout |
| **Correct brand logos**    | Research official SVG from Simple Icons         | Guess or use incorrect logo paths      |
| **Consistent icon sizing** | Use fixed viewBox (24x24) with w-6 h-6          | Mix different icon sizes randomly      |

### Interaction & Cursor

| Rule                   | Do                                                    | Don't                                        |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------- |
| **Cursor pointer**     | Add `cursor-pointer` to all clickable/hoverable cards | Leave default cursor on interactive elements |
| **Hover feedback**     | Provide visual feedback (color, shadow, border)       | No indication element is interactive         |
| **Smooth transitions** | Use `transition-colors duration-200`                  | Instant state changes or too slow (>500ms)   |

### Light/Dark Mode Contrast

| Rule                      | Do                                  | Don't                                   |
| ------------------------- | ----------------------------------- | --------------------------------------- |
| **Glass card light mode** | Use `bg-white/80` or higher opacity | Use `bg-white/10` (too transparent)     |
| **Text contrast light**   | Use `#0F172A` (slate-900) for text  | Use `#94A3B8` (slate-400) for body text |
| **Muted text light**      | Use `#475569` (slate-600) minimum   | Use gray-400 or lighter                 |
| **Border visibility**     | Use `border-gray-200` in light mode | Use `border-white/10` (invisible)       |

### Layout & Spacing

| Rule                     | Do                                  | Don't                                  |
| ------------------------ | ----------------------------------- | -------------------------------------- |
| **Floating navbar**      | Add `top-4 left-4 right-4` spacing  | Stick navbar to `top-0 left-0 right-0` |
| **Content padding**      | Account for fixed navbar height     | Let content hide behind fixed elements |
| **Consistent max-width** | Use same `max-w-6xl` or `max-w-7xl` | Mix different container widths         |

### Async UI States & Feedback (the most-missed fundamentals)

> **Every screen or component that fetches, submits, or mutates data MUST render all of its states — not just the happy path.** A UI that looks perfect when populated but shows a frozen blank while loading, fails silently on error, or shows nothing when empty is broken UX. Canonical state vocabulary (shared with `design-spec`): **Default / Loading / Disabled / Error / Empty / Success**.

| State                    | Do                                                                        | Don't                                                              |
| ------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Loading**              | Show a spinner / skeleton / progress while any request is in-flight       | Leave a frozen or blank screen; block the whole page silently      |
| **Error**                | Show a human-readable message with a retry / recovery action              | Fail silently, swallow the error, or dump a raw stack trace / JSON |
| **Empty**                | Show a meaningful empty state (illustration/message + optional CTA)       | Render a blank area when a list/table has zero items               |
| **In-flight / disabled** | Disable the submit/action button (or show it busy) while its request runs | Allow double-submit by leaving the trigger active                  |
| **Success**              | Confirm completion (toast / inline / visibly updated data)                | Complete a mutation with no acknowledgment to the user             |

### Responsive & Multi-Device (usable on small screens)

| Rule                       | Do                                                                                                           | Don't                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Rows reflow**            | `flex-wrap: wrap` or switch `flex-direction: row → column` at small widths                                   | Fixed `flex-direction: row` that overflows on a phone                             |
| **Grids collapse**         | Multi-column grids collapse to one column on small screens                                                   | Fixed column counts / track widths that never collapse                            |
| **Scroll fallback OK**     | Can't reflow (table/canvas/wide grid)? Fixed `min-width`/`min-height` + `overflow: auto` — scrolling is fine | Content clipped, cut off, or a control unreachable off-screen with no scroll path |
| **Fluid over fixed**       | `min/max-width`, `flex-grow`, `%`/`rem` sizing                                                               | Large fixed px widths on containers/cards/dialogs                                 |
| **Big refactor → confirm** | Small-screen support needs a large layout rewrite → flag it, confirm scope with the user                     | Silently rewriting a big layout, or shipping it broken on small screens           |

---

## Pre-Delivery Checklist

Before delivering UI code, verify these items:

### Visual Quality

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] Brand logos are correct (verified from Simple Icons)
- [ ] Hover states don't cause layout shift

### Interaction

- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover states provide clear visual feedback
- [ ] Transitions are smooth (150-300ms)
- [ ] Focus states visible for keyboard navigation

### States & Feedback (async surfaces — verify every one)

- [ ] **Loading** — every data fetch / submit / mutation shows a spinner or skeleton while in-flight (never a frozen blank screen)
- [ ] **Error** — every operation that can fail shows a human-readable error with a retry / recovery path (no silent failure, no raw stack trace)
- [ ] **Empty** — every list / table / collection view has a meaningful empty state (message + optional CTA), not a blank area
- [ ] **In-flight disable** — submit/action buttons are disabled or busy while their request runs (no double-submit)
- [ ] **Success** — completed mutations give confirmation feedback (toast / inline / updated data)

### Light/Dark Mode

- [ ] Light mode text has sufficient contrast (4.5:1 minimum)
- [ ] Glass/transparent elements visible in light mode
- [ ] Borders visible in both modes
- [ ] Test both modes before delivery

### Layout & Responsiveness

- [ ] Floating elements have proper spacing from edges
- [ ] No content hidden behind fixed navbars
- [ ] Responsive at 320px, 768px, 1024px, 1440px
- [ ] Rows `flex-wrap` or switch `row → column` on small screens; multi-column grids collapse to one column
- [ ] Usable down to 320px — **nothing broken** (no clipped, cut-off, or unreachable content); where a layout genuinely can't reflow, a `min-width`/`min-height` + `overflow: auto` scroll is acceptable
- [ ] Any small-screen fix that needs a large layout refactor was flagged and confirmed with the user (not silently rewritten)

### Accessibility

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color is not the only indicator
- [ ] `prefers-reduced-motion` respected

## Related

- `design --lane=marketing` — Marketing/creative UI (landing pages, campaigns)
- `design --lane=product` — Product UIs (dashboards, admin panels, SaaS apps)
- `shadcn-tailwind`
- `design-spec`

---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

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

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Provide searchable UI/UX design intelligence — 50 styles, 21 palettes, 50 font pairings, 20 charts, 8 stacks — synthesized into accessible, professional, contrast-correct interfaces.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim, confidence >80% to act, never guess.

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
