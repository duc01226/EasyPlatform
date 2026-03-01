---
name: web-design-guidelines
version: 2.0.0
description: '[Code Quality] Review UI code for web design best practices including WCAG 2.2 accessibility, responsive design, Core Web Vitals performance, and modern UX patterns. Review-only skill. Triggers on design guidelines review, accessibility audit, visual review, UI compliance check, WCAG check.'
argument-hint: <file-or-pattern>
allowed-tools: Read, Grep, Glob
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

## Quick Summary

**Goal:** Review UI code for WCAG 2.2 accessibility, Core Web Vitals performance, and modern web design best practices.

**Workflow:**

1. **Identify Target** — Use provided file/pattern or ask user which components to review
2. **Scan Files** — Read and Grep target files for violation patterns
3. **Check Categories** — Accessibility, keyboard nav, forms, animation, performance, touch/mobile, content, dark mode/i18n
4. **Report Findings** — Group by file, use `file:line` format, terse findings, prioritized summary

**Key Rules:**

- Review-only skill: finds issues, does NOT fix them
- Check categories in priority order (accessibility first)
- Also reference `docs/claude/scss-styling-guide.md` if available

# Web Design Guidelines Review

Review UI code for compliance with WCAG 2.2, Core Web Vitals, and modern web design best practices. This is a **review-only** skill -- it finds issues, not fixes them.

## When to Use

- Reviewing UI code for accessibility compliance before release
- Auditing a component or page for WCAG 2.2 violations
- Checking Core Web Vitals performance patterns in code
- Validating responsive design and mobile-friendly patterns
- Pre-PR UI quality gate check

## When NOT to Use

- **Building** UI -- use `frontend-design`
- **Creating** design specs -- use `design-spec`
- **Full UX design** process -- use `ux-designer`
- Project SCSS review -- also check `docs/claude/scss-styling-guide.md`

## Prerequisites

- Full guidelines reference: `references/guidelines.md`
- Project SCSS: `docs/claude/scss-styling-guide.md` (if available)

## Workflow

1. **Identify target files**
    - IF file/pattern argument provided → use it
    - IF not → ask user which files or components to review

2. **Scan files** using Read and Grep tools

3. **Check against categories** (in priority order):
    - **Accessibility** -- semantic HTML, ARIA, labels, alt text, color contrast, focus indicators
    - **Keyboard navigation** -- tab order, focus trap in modals, escape key handling
    - **Forms** -- labels, validation, error display, autocomplete, paste not blocked
    - **Animation** -- `prefers-reduced-motion` respected, no `transition: all`, GPU-safe properties only
    - **Performance** -- image dimensions set, lazy loading, no layout thrashing, virtualization for large lists
    - **Touch/Mobile** -- touch targets >= 44px, `touch-action: manipulation`, safe areas
    - **Content** -- text overflow handled, empty states, responsive breakpoints
    - **Dark mode / i18n** -- `color-scheme`, logical CSS properties, `Intl.*` formatters

4. **Report findings** in output format below

## Output Format

Group by file. Use `file:line` format. Terse findings. No preamble.

```text
## src/components/Button.tsx

src/components/Button.tsx:42 - icon button missing aria-label
src/components/Button.tsx:55 - animation missing prefers-reduced-motion check
src/components/Button.tsx:67 - transition: all -> list specific properties
src/components/Button.tsx:89 - div with onClick -> use <button>

## src/components/Modal.tsx

src/components/Modal.tsx:12 - missing overscroll-behavior: contain
src/components/Modal.tsx:78 - no focus trap for modal dialog

## src/components/Card.tsx

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

| Skill              | When to use instead                               |
| ------------------ | ------------------------------------------------- |
| `frontend-design`  | Building UI (not reviewing)                       |
| `design-spec`      | Creating design specifications                    |
| `ux-designer`      | Full UX design process                            |
---

**IMPORTANT Task Planning Notes (MUST FOLLOW)**

- Always plan and break work into many small todo tasks
- Always add a final review todo task to verify work quality and identify fixes/enhancements
