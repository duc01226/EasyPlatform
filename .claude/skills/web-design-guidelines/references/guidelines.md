# Web Interface Design Guidelines Reference

Comprehensive rules for reviewing web UI code against WCAG 2.2, Core Web Vitals, and modern UX best practices.

---

## 1. Accessibility (WCAG 2.2 Compliance)

### 1.1 Semantic HTML (First Rule)

> "If you can use a native HTML element with built-in semantics, use it instead of ARIA."

- Use `<button>` for actions, `<a>`/`<Link>` for navigation (NEVER `<div onClick>` or `<span onClick>`)
- Use semantic containers: `<header>`, `<main>`, `<nav>`, `<footer>`, `<aside>`, `<section>`, `<article>`
- Use heading hierarchy `<h1>`-`<h6>` in logical order (no skipping levels)
- Use `<label>` with `for`/`htmlFor` for form controls
- Use `<table>` for tabular data (not CSS grids for data tables)
- Use `<ul>`/`<ol>` for lists
- Include skip link to main content: `<a href="#main">Skip to content</a>`

### 1.2 ARIA Usage

> "No ARIA is better than bad ARIA" -- Sites with ARIA average 41% more errors than those without.

- Only use ARIA when no native HTML equivalent exists (custom widgets like tabs, trees, comboboxes)
- Icon-only buttons MUST have `aria-label`: `<button aria-label="Close">`
- Decorative icons MUST have `aria-hidden="true"`
- Async updates (toasts, validation) MUST use `aria-live="polite"` (reserve `assertive` for critical errors)
- Collapsed sections need `aria-expanded="false"`, expanded need `aria-expanded="true"`
- Hidden elements need `aria-hidden="true"` to exclude from screen readers
- Invalid form fields need `aria-invalid="true"`
- Required fields need `aria-required="true"` or HTML `required`

### 1.3 Images & Media

- All `<img>` MUST have `alt` attribute
- Decorative images: `alt=""` (empty, not missing)
- Informative images: descriptive `alt` text explaining content/purpose
- Complex images (charts, diagrams): provide long description or `aria-describedby`
- Background images with meaning: provide text alternative nearby
- Video: provide captions and transcripts
- Audio: provide transcripts

### 1.4 Color & Contrast

- **Normal text**: minimum 4.5:1 contrast ratio
- **Large text** (18px+ or 14px+ bold): minimum 3:1 contrast ratio
- **UI components** (buttons, inputs, icons): minimum 3:1 contrast ratio
- NEVER rely solely on color to convey meaning (add icons, text, or patterns)
- Test with colorblind simulation tools
- Error states: don't just use red -- add icons or text

---

## 2. Focus & Keyboard Navigation

### 2.1 Focus Visibility

- Interactive elements MUST have visible focus indicator
- NEVER use `outline: none` or `outline-none` without replacement
- Use `:focus-visible` over `:focus` (avoids focus ring on click)
- Focus indicator minimum: 2px thick, 3:1 contrast against adjacent colors
- Use `focus-visible:ring-*` (Tailwind) or custom focus styles
- Group related controls with `:focus-within`

### 2.2 Keyboard Accessibility

- ALL interactive elements must be reachable via Tab/Shift+Tab
- Logical tab order matching visual layout
- Custom widgets need keyboard handlers: `onKeyDown`/`onKeyUp`
- Modals/dialogs: trap focus inside, return focus on close
- Collapsible elements: Enter/Space to toggle
- Escape key should close modals, dropdowns, tooltips
- Never use `tabindex` > 0 (disrupts natural order)
- `tabindex="-1"` for programmatically focusable but not tabbable elements
- `tabindex="0"` to make non-interactive elements focusable (when ARIA role requires it)

---

## 3. Forms

### 3.1 Labels & Association

- Every input MUST have a visible `<label>` with `for`/`htmlFor` matching input `id`
- OR wrap input inside `<label>` element
- Placeholder is NOT a substitute for label
- Group related inputs with `<fieldset>` and `<legend>`
- Checkboxes/radios: label + control share single hit target

### 3.2 Input Attributes

- Use correct `type`: `email`, `tel`, `url`, `number`, `password`, `search`, `date`
- Use `inputmode` for mobile keyboards: `numeric`, `tel`, `email`, `url`, `decimal`
- Use meaningful `name` attributes
- Use `autocomplete` for common fields: `name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`
- Use `autocomplete="off"` on non-auth fields to avoid password manager triggers
- Disable `spellCheck` on emails, codes, usernames: `spellCheck={false}`

### 3.3 Validation & Error Handling

- NEVER block paste: no `onPaste` + `preventDefault()`
- Show inline errors next to the field, not just at form top
- Focus first error on submit
- Use `aria-invalid="true"` and `aria-describedby` for error messages
- Submit button stays enabled until request starts; show spinner during request
- Warn before navigation with unsaved changes

### 3.4 Placeholders

- Placeholders should show example format, not instructions
- End with ellipsis: `"Search..."`, `"e.g., john@example.com"`
- Placeholder contrast: minimum 4.5:1

---

## 4. Animation & Motion

### 4.1 Reduced Motion (REQUIRED)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- Honor `prefers-reduced-motion` media query
- Provide reduced alternative (fade instead of slide) or disable animation

### 4.2 Performance-Safe Animations

- ONLY animate `transform` and `opacity` (GPU-accelerated, no reflows)
- NEVER animate: `width`, `height`, `top`, `left`, `margin`, `padding`, `font-size`
- NEVER use `transition: all` -- list properties explicitly
- Set correct `transform-origin`

### 4.3 Timing Guidelines

- Micro-interactions (buttons, hovers): 100-200ms
- Small UI changes (tooltips, dropdowns): 200-300ms
- Medium transitions (modals, panels): 300-500ms
- Large movements (page transitions): 500-800ms
- Animations should be interruptible

---

## 5. Typography

### 5.1 Font Sizes

- Body text: minimum 16px (1rem)
- Use relative units: `rem`, `em`, `%` (not `px` on root)
- Allow text to scale to 200% without loss of content

### 5.2 Line Height & Length

- Body text: `line-height: 1.5` minimum (WCAG AA)
- Headings: `line-height: 1.2-1.35`
- Optimal line length: 50-75 characters (66 is sweet spot)
- Use `max-width: 65ch` for text containers

### 5.3 Typography Characters

- Use proper ellipsis: `...` not `...`
- Use curly quotes where appropriate
- Non-breaking spaces where needed: `10&nbsp;MB`
- Loading states end with ellipsis

### 5.4 Number Formatting

- Use `font-variant-numeric: tabular-nums` for number columns
- Use `text-wrap: balance` on headings

### 5.5 Font Loading

- Limit to 2-3 font families, 3 weights per family
- Use `font-display: swap` for custom fonts
- Provide fallback font stack
- Preload critical fonts

---

## 6. Content Handling

### 6.1 Text Overflow

- Text containers must handle long content: `truncate`, `line-clamp`, `break-words`
- Flex children need `min-w-0` / `min-width: 0` for text truncation
- Test with very long strings (50+ chars without spaces)

### 6.2 Empty States

- Handle empty strings, null, undefined gracefully
- Handle empty arrays -- show meaningful empty state
- Anticipate: short, average, and very long user inputs

---

## 7. Images & Media

- `<img>` MUST have explicit `width` and `height` attributes (prevents CLS)
- Below-fold images: `loading="lazy"`
- Above-fold critical images: `fetchpriority="high"`
- Use modern formats: WebP, AVIF
- Provide responsive images with `srcset` and `sizes`

---

## 8. Performance (Core Web Vitals)

| Metric | Target | Key Actions |
|--------|--------|-------------|
| LCP | < 2.5s | Preload critical resources, optimize largest element |
| CLS | < 0.1 | Specify image dimensions, reserve space for dynamic content |
| INP | < 200ms | Avoid layout reads in render, debounce expensive handlers |

- Large lists (>50 items): virtualize
- Paginate or infinite scroll for large datasets

---

## 9. Navigation & State

- Filters, tabs, pagination, sort order -> URL query params
- Links (`<a>`) for navigation, buttons for actions
- Destructive actions need confirmation or undo

---

## 10. Touch & Mobile

- Minimum touch target: 44x44px (Apple HIG) or 48x48dp (Material)
- Use `touch-action: manipulation` (prevents double-tap zoom delay)
- Use `overscroll-behavior: contain` in modals/drawers
- Avoid `autoFocus` on mobile (may cause viewport jump)

---

## 11. Layout & Safe Areas

- Full-bleed layouts need `env(safe-area-inset-*)` for notches
- Mobile-first approach: start with mobile styles
- Use fluid typography: `clamp()` for font sizes
- Use container queries for component-level responsiveness
- Test at: 320px, 375px, 768px, 1024px, 1440px

---

## 12. Dark Mode & Theming

- Use `color-scheme: dark` on `<html>` for dark themes
- Match `<meta name="theme-color">` to page background
- Honor `prefers-color-scheme` media query
- Provide manual toggle that persists preference

---

## 13. Internationalization (i18n)

- Dates/times: use `Intl.DateTimeFormat`
- Numbers/currency: use `Intl.NumberFormat`
- Use logical CSS properties: `margin-inline-start` not `margin-left`
- Set `dir="rtl"` on `<html>` for RTL languages

---

## 14. Hydration Safety (SSR/SSG)

- Inputs with `value` prop MUST have `onChange` handler
- Guard against hydration mismatch (server vs client timezone)
- Dynamic content based on `window`/`localStorage`: render client-side only

---

## 15. Interactive States

- Buttons and links MUST have hover state
- Disabled: `disabled` attribute + reduced opacity + `cursor: not-allowed`
- Consider `aria-disabled="true"` if element should remain focusable

---

## Anti-Patterns Quick Reference

| Pattern | Issue |
|---------|-------|
| `user-scalable=no` or `maximum-scale=1` | Disables zoom -- accessibility violation |
| `onPaste` + `preventDefault()` | Blocks paste -- UX hostile |
| `transition: all` | Performance -- list properties explicitly |
| `outline: none` without replacement | Removes focus indicator |
| `<div onClick>` or `<span onClick>` | Should be `<button>` or `<a>` |
| `<img>` without `width`/`height` | Causes layout shift (CLS) |
| `<img>` without `alt` | Missing alt text |
| Form inputs without `<label>` | Missing label |
| Icon buttons without `aria-label` | Screen reader cannot identify action |
| `tabindex` > 0 | Disrupts natural tab order |
| Color-only indicators | Fails colorblind users |
| Placeholder as label | Label disappears on input |

---

## External References

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Core Web Vitals](https://web.dev/vitals/)
- [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
