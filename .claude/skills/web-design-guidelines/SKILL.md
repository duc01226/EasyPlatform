---
name: web-design-guidelines
version: 2.0.0
description: '[Code Quality] Use when reviewing UI code for accessibility, responsiveness, performance, and UX best practices.'
argument-hint: <file-or-pattern>
---

## Quick Summary

**Goal:** Review UI code for WCAG 2.2 accessibility, Core Web Vitals performance, and modern web design best practices.

**Workflow:**

1. **Identify Target** — Use provided file/pattern or ask user which components to review
2. **Scan Files** — Read and Grep target files for violation patterns
3. **Check Categories** — Accessibility, keyboard nav, forms, async states & feedback (loading/error/empty), animation, performance, touch/mobile, responsive layout (flex-wrap / row→column), content, dark mode/i18n
4. **Report Findings** — Group by file, use `file:line` format, terse findings, prioritized summary

**Key Rules:**

- Review-only skill: finds issues, does NOT fix them
- Check categories in priority order (accessibility first)
- Also reference `docs/project-reference/scss-styling-guide.md` if available

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

# Web Design Guidelines Review

Review UI code for compliance with WCAG 2.2, Core Web Vitals, and modern web design best practices. This is a **review-only** skill -- it finds issues, not fixes them.

## When to Use

- Reviewing UI code for accessibility compliance before release
- Auditing a component or page for WCAG 2.2 violations
- Checking Core Web Vitals performance patterns in code
- Validating responsive design and mobile-friendly patterns
- Pre-PR UI quality gate check

## When NOT to Use

- **Building** UI -- use `design --lane=marketing` (marketing/creative) or `design --lane=product` (product UIs)
- **Creating** design specs -- use `design-spec`
- **Workflow-wired UI review gate** -- use `/ui-review` (the project UI review gate that runs in the `changes-review` parallel batch on frontend changes: long-content overflow, responsive flex, flex-vs-fixed sizing, z-index discipline, SCSS/BEM). This skill is the generic, framework-agnostic a11y/UX checklist that `/ui-review` cross-references — not a duplicate.
- Project SCSS review -- also check `docs/project-reference/scss-styling-guide.md`

## Prerequisites

- Full guidelines reference: `references/guidelines.md`
- Project SCSS: `docs/project-reference/scss-styling-guide.md` (if available)

## Workflow

1. **Identify target files**
    - IF file/pattern argument provided → use it
    - IF not → ask user which files or components to review

2. **Scan files** using Read and Grep tools

3. **Check against categories** (in priority order):
    - **Accessibility** -- semantic HTML, ARIA, labels, alt text, color contrast, focus indicators
    - **Keyboard navigation** -- tab order, focus trap in modals, escape key handling
    - **Forms** -- labels, validation, error display, autocomplete, paste not blocked
    - **Async states & feedback** -- every fetch/submit/mutation renders a **loading** indicator (spinner/skeleton, never a frozen blank), a user-visible **error** with a retry/recovery path (never a silent failure or raw stack trace), an **empty** state for zero-item collections, and an in-flight **disabled** state on submit controls to prevent double-submit (canonical vocabulary: Default / Loading / Disabled / Error / Empty / Success)
    - **Animation** -- `prefers-reduced-motion` respected, no `transition: all`, GPU-safe properties only
    - **Performance** -- image dimensions set, lazy loading, no layout thrashing, virtualization for large lists
    - **Touch/Mobile** -- touch targets >= 44px, `touch-action: manipulation`, safe areas
    - **Responsive layout** -- usable on small devices (owns all reflow/breakpoint concerns). Minimum bar: **preferred** reflow (rows `flex-wrap` or `row → column`, grids collapse to one column, fluid min/max/`%`/`rem` over large fixed px); **acceptable fallback** when a layout genuinely can't reflow (tables, canvases, wide grids) — a fixed `min-width`/`min-height` + `overflow: auto` scroll (scrolling is OK, not a defect); **hard fail** only when content is broken on small screens — clipped, cut off, or a control unreachable with no scroll path. Big responsive refactor needed → flag it and confirm scope with the user, don't silently rewrite. Breakpoints tested at 320 / 768 / 1024px
    - **Content** -- long-text/overflow handling (`text-overflow`, wrapping, line clamp), readable line length _(empty-collection states → **Async states & feedback**; breakpoints/reflow → **Responsive layout**)_
    - **Dark mode / i18n** -- `color-scheme`, logical CSS properties, `Intl.*` formatters

4. **Report findings** in output format below

## Output Format

Group by file. Use `file:line` format. Terse findings. No preamble.

```text
## {ui-source-root}/components/Button

{ui-source-root}/components/Button:42 - icon button missing aria-label
{ui-source-root}/components/Button:55 - animation missing prefers-reduced-motion check
{ui-source-root}/components/Button:67 - transition: all -> list specific properties
{ui-source-root}/components/Button:89 - div with onClick -> use <button>

## {ui-source-root}/components/Modal

{ui-source-root}/components/Modal:12 - missing overscroll-behavior: contain
{ui-source-root}/components/Modal:78 - no focus trap for modal dialog

## {ui-source-root}/components/Card

[check] No issues found

## Summary

- 4 accessibility issues
- 2 performance issues
- 1 UX issue
- Priority: Fix accessibility issues first (WCAG compliance)
```

## Examples

### Example 1: Accessibility review

**Input:** "Review the user profile component for accessibility"

**Action:** Read component file, check for semantic HTML, ARIA attributes, label associations, color contrast patterns, keyboard navigation, focus indicators. Report each violation with file:line.

### Example 2: Visual polish review

**Input:** "Check the dashboard page for design best practices"

**Action:** Scan for animation performance (no `transition: all`), image optimization (dimensions, lazy loading), responsive patterns (breakpoints, safe areas), typography (line height, max-width), empty states handling. Report categorized findings.

## Related Skills

| Skill         | When to use instead                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `design`      | Building UI (not reviewing) — `--lane=marketing` (creative) or `--lane=product` (app UIs)                                 |
| `design-spec` | Creating design specifications                                                                                            |
| `/ui-review`  | Project UI review gate (overflow, responsive flex, z-index, SCSS/BEM); runs in `changes-review` batch on frontend changes |

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

**IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting

**MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Critical Thinking:** Traced `file:line` proof per claim; confidence >80% to act.

**IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
**IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.
