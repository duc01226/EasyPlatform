<!-- Last scanned: 2026-04-03 -->
<!-- CRITICAL: BEM on ALL elements, platform-core variables for ALL values, @use not @import, component-scoped SCSS -->

# SCSS Styling Guide

**MUST** use BEM naming on every template element. **MUST** use SCSS variables from `_platform-variables.scss` for all values.
**NEVER** hardcode hex colors, pixel values, or font sizes. **MUST** use `@use` not `@import`.

## BEM Methodology

Convention: `block__element--modifier`. Block name = component name in kebab-case. Modifiers use `--` prefix on standalone classes.

```html
<!-- task-list.component.html — real BEM usage -->
<div class="task-list">
    <div class="task-list__error">...</div>
    <div class="task-list__statistics">...</div>
    <span class="nav-loading-test__count --passed">...</span>
    <span class="nav-loading-test__badge" [class.--success]="test.passed" [class.--error]="!test.passed"></span>
</div>
```

```scss
// task-list.component.scss:8 — BEM nesting pattern
.task-list {
    @include stack($space-5);
    padding: $space-5;

    &__error {
        @include error-banner;
    }

    &__statistics {
        @include cluster($space-4);
    }
}
```

**BAD:** `<div class="container">` or `<div>` with no class
**GOOD:** `<div class="task-list__container">` -- BEM class on every element

## SCSS Architecture

| Layer              | Path                                                     | Purpose                                                               |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Platform variables | `libs/platform-core/src/styles/_platform-variables.scss` | Design tokens (spacing, color, typography, breakpoints, z-index)      |
| Platform mixins    | `libs/platform-core/src/styles/_platform-mixins.scss`    | Layout, card, badge, banner, media query, text mixins                 |
| App variables      | `apps/.../styles/_variables.scss`                        | App-specific overrides (container widths, padding)                    |
| App mixins         | `apps/.../styles/_mixins.scss`                           | App-specific patterns (page container, empty state, data table, form) |
| Global styles      | `apps/.../styles.scss`                                   | Reset, typography defaults, utility classes                           |
| Component SCSS     | `*.component.scss`                                       | Component-scoped BEM styles                                           |

**Import pattern for component SCSS:**

```scss
@use 'variables' as *;
@use 'mixins' as *;
```

## Mixins Reference

### Platform Mixins (`_platform-mixins.scss`)

| Mixin                      | Purpose                                                    | Example                                       |
| -------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| `flex-center`              | `display:flex; align-items:center; justify-content:center` | Centering content                             |
| `flex-start`               | Flex with `justify-content:flex-start`                     | Left-aligned flex                             |
| `flex-between`             | Flex with `justify-content:space-between`                  | Spaced layout                                 |
| `stack($gap)`              | Vertical flex column with gap (default `$space-4`)         | Stacking sections                             |
| `cluster($gap)`            | Horizontal flex-wrap with gap (default `$space-4`)         | Chip/tag groups                               |
| `card-elevated`            | White background + border-radius + shadow                  | Card containers                               |
| `badge-base`               | Inline-flex badge with padding + font sizing               | Status badges                                 |
| `error-banner`             | Red left-border banner with error colors                   | Error messages                                |
| `warning-banner`           | Yellow left-border banner with warning colors              | Warning messages                              |
| `flex-layout-media($type)` | Responsive media query wrapper                             | `@include flex-layout-media('lt-md') { ... }` |
| `truncate-text`            | Single-line text overflow ellipsis                         | Long text truncation                          |

### App Mixins (`_mixins.scss`)

| Mixin                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `app-page-container` | Page layout with max-width + auto margin |
| `app-empty-state`    | Centered empty state with icon + text    |
| `app-data-table`     | Styled table with headers + hover rows   |
| `app-form-section`   | Card-elevated form wrapper               |
| `app-form-row`       | Flex row that stacks on mobile (`lt-md`) |
| `app-form-field`     | Flex field with min-width                |

## Responsive Patterns

Mobile-first approach using `flex-layout-media($type)` mixin. Breakpoints defined in `_platform-variables.scss`:

| Breakpoint | Variable                           | Value    |
| ---------- | ---------------------------------- | -------- |
| xs (max)   | `$platform-media-breakpoint-xs`    | 575.98px |
| sm (min)   | `$platform-media-breakpoint-gt-xs` | 576px    |
| md (min)   | `$platform-media-breakpoint-gt-sm` | 768px    |
| lg (min)   | `$platform-media-breakpoint-gt-md` | 992px    |
| xl (min)   | `$platform-media-breakpoint-gt-lg` | 1200px   |
| xxl (min)  | `$platform-media-breakpoint-gt-xl` | 1424px   |

```scss
// Usage: stack on mobile, row on desktop
@include flex-layout-media('lt-md') {
    flex-direction: column;
}
```

**MUST** use `flex-layout-media()` mixin for all responsive rules, NEVER write raw `@media` queries.

## Theming

Angular Material 3 with `prefers-color-scheme` dark mode support. Theme file: `apps/.../styles/themes/default-theme.scss`.
Palette: `mat.$azure-palette` (primary), `mat.$blue-palette` (tertiary). Material component overrides use MDC CSS custom properties.

```scss
// Overriding Material component tokens — task-list.component.scss:360
--mdc-chip-elevated-container-color: #{$color-warning-light};
--mdc-chip-label-text-color: #{$color-warning-dark};
```

## Z-Index Scale

| Variable                      | Value | Use               |
| ----------------------------- | ----- | ----------------- |
| `$platform-z-index-level-1`   | 100   | Sticky headers    |
| `$platform-z-index-level-2`   | 200   | Dropdowns         |
| `$platform-z-index-level-3`   | 300   | Modals            |
| `$platform-z-index-level-4`   | 400   | Overlays          |
| `$platform-z-index-level-max` | 99999 | Loading backdrops |

## Utility Classes (Global)

Defined in `styles.scss`: `.text-muted`, `.text-primary`, `.text-success`, `.text-warning`, `.text-error`, `.bg-surface`, `.bg-surface-variant`, `.rounded-md`, `.rounded-lg`, `.shadow-sm`, `.shadow-md`.

**MUST** use BEM on ALL elements. **MUST** use SCSS variables for ALL values. **MUST** use `@use` not `@import`.
**MUST** use `flex-layout-media()` for responsive. **NEVER** hardcode colors, spacing, or font sizes.
