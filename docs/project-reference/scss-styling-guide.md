<!-- Last scanned: 2026-03-15 -->

# SCSS Styling Guide

## Quick Summary

**Goal:** Define SCSS architecture, design tokens, BEM conventions, theming, and responsive patterns for EasyPlatform frontend.

**Architecture:** Two-layer system -- Platform tokens/mixins in `libs/platform-core/src/styles/`, app overrides in `apps/playground-text-snippet/src/styles/`.

**BEM Convention:** `.block__element--modifier` (kebab-case). State modifiers use `.-prefix` (e.g., `.-selected`). Max nesting depth: 3.

**Key Tokens:** `$space-{1..12}` for spacing, `$font-size-{xs..3xl}` for typography, `$color-primary-*`/`$color-neutral-*`/`$color-{success|warning|error}*` for colors, `$radius-{sm|md|lg|full}` for borders.

**Responsive:** Desktop-first via `flex-layout-media()` mixin. Switch row-to-column at `lt-md` breakpoint.

**Key Rules:**

- Use design tokens (`$space-*`, `$color-*`, `$radius-*`) -- never hardcode values
- Use `flex-layout-media()` mixin -- never raw `@media` queries
- Use `calculateRem()` for pixel-to-rem conversion
- All template elements MUST have BEM classes
- Host elements styled via component selector, not `:host`

---

## SCSS Architecture

Two-layer SCSS architecture within Angular + Nx workspace:

| Layer        | Directory                                               | Purpose                                       |
| ------------ | ------------------------------------------------------- | --------------------------------------------- |
| **Platform** | `src/Frontend/libs/platform-core/src/styles/`           | Shared design tokens, mixins, functions       |
| **App**      | `src/Frontend/apps/playground-text-snippet/src/styles/` | App-specific overrides, themes, global styles |

### File Organization

```
libs/platform-core/src/styles/
  _platform-variables.scss    # Design tokens (colors, spacing, typography, etc.)
  _platform-mixins.scss       # Layout, card, badge, media query mixins
  _platform-functions.scss    # Shared SCSS functions (calculateRem)
  _platform-placeholders.scss # Shared placeholder selectors

apps/playground-text-snippet/src/
  styles.scss                 # Global entry point (resets, typography, utilities)
  styles/
    _index.scss               # Barrel: forwards variables + mixins, uses themes + components
    _variables.scss            # App tokens (forwards + extends platform tokens)
    _mixins.scss               # App mixins (forwards + extends platform mixins)
    _functions.scss            # Imports platform-functions
    _placeholders.scss         # Imports platform-placeholders
    _material-core.scss        # Angular Material core (@include mat.core)
    themes/
      default-theme.scss       # MD3 default theme (azure/blue, light + dark)
      deeppurple-amber-theme.scss  # Alternate MD3 theme (blue/violet)
    components/
      _index.scss              # Component style barrel
      mat-spinner.scss         # Global Material spinner overrides
```

### Import Chain

Entry point `styles.scss` loads everything through `_index.scss`:

```scss
// styles.scss (line 1)
@use './styles/index' as *;
```

`_index.scss` forwards variables/mixins and uses themes and components:

```scss
// _index.scss (lines 1-10)
@forward 'variables';
@forward 'mixins';
@use 'variables' as *;
@use 'mixins' as *;
@use 'material-core' as *;
@use './themes/default-theme' as *;
@use './components' as *;
```

App-level `_variables.scss` forwards platform tokens then adds app overrides:

```scss
// _variables.scss (lines 1-3)
@forward 'platform-variables';
@use 'platform-variables' as *;
```

Component SCSS files import shared tokens via:

```scss
@use 'variables' as *;
@use 'mixins' as *;
```

## Mixins & Variables

### Platform Mixins

Defined in `src/Frontend/libs/platform-core/src/styles/_platform-mixins.scss`:

| Mixin                            | Purpose                                                           | Line |
| -------------------------------- | ----------------------------------------------------------------- | ---- |
| `flex-center`                    | `display:flex; align-items:center; justify-content:center`        | 7    |
| `flex-start`                     | `display:flex; align-items:center; justify-content:flex-start`    | 13   |
| `flex-between`                   | `display:flex; align-items:center; justify-content:space-between` | 19   |
| `stack($gap)`                    | Vertical flex column with gap (default `$space-4`)                | 26   |
| `cluster($gap)`                  | Horizontal wrapping flex with gap (default `$space-4`)            | 33   |
| `card-elevated`                  | White background, `$radius-lg`, `$shadow-sm`                      | 43   |
| `badge-base`                     | Inline-flex badge with padding, small font, rounded               | 53   |
| `error-banner`                   | Left-bordered red alert banner                                    | 63   |
| `warning-banner`                 | Left-bordered amber alert banner                                  | 74   |
| `flex-layout-media($media-type)` | Responsive media query wrapper (see Responsive Patterns)          | 89   |
| `truncate-text`                  | `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`     | 149  |

### App-Level Mixins

Defined in `src/Frontend/apps/playground-text-snippet/src/styles/_mixins.scss`:

| Mixin                | Purpose                                               | Line |
| -------------------- | ----------------------------------------------------- | ---- |
| `app-page-container` | Max-width centered page with padding and vertical gap | 12   |
| `app-empty-state`    | Centered empty state with icon, title, description    | 22   |
| `app-data-table`     | Full-width table with header styling and row hover    | 51   |
| `app-form-section`   | Card-elevated form container                          | 87   |
| `app-form-row`       | Horizontal flex row that stacks on mobile             | 92   |
| `app-form-field`     | Flexible form field with min-width                    | 102  |

### Design Tokens (Variables)

All platform tokens defined in `src/Frontend/libs/platform-core/src/styles/_platform-variables.scss`.

#### Spacing Scale

| Token       | Value     | Pixels |
| ----------- | --------- | ------ |
| `$space-1`  | `0.25rem` | 4px    |
| `$space-2`  | `0.5rem`  | 8px    |
| `$space-3`  | `0.75rem` | 12px   |
| `$space-4`  | `1rem`    | 16px   |
| `$space-5`  | `1.25rem` | 20px   |
| `$space-6`  | `1.5rem`  | 24px   |
| `$space-8`  | `2rem`    | 32px   |
| `$space-10` | `2.5rem`  | 40px   |
| `$space-12` | `3rem`    | 48px   |

#### Typography

| Token                   | Value                                    | Pixels |
| ----------------------- | ---------------------------------------- | ------ |
| `$font-family-base`     | `'Roboto', 'Helvetica Neue', sans-serif` | --     |
| `$font-size-xs`         | `0.75rem`                                | 12px   |
| `$font-size-sm`         | `0.875rem`                               | 14px   |
| `$font-size-base`       | `1rem`                                   | 16px   |
| `$font-size-md`         | `1.125rem`                               | 18px   |
| `$font-size-lg`         | `1.25rem`                                | 20px   |
| `$font-size-xl`         | `1.5rem`                                 | 24px   |
| `$font-size-2xl`        | `1.875rem`                               | 30px   |
| `$font-size-3xl`        | `2.25rem`                                | 36px   |
| `$font-weight-normal`   | `400`                                    | --     |
| `$font-weight-medium`   | `500`                                    | --     |
| `$font-weight-semibold` | `600`                                    | --     |
| `$font-weight-bold`     | `700`                                    | --     |

#### Shadows & Radii

| Token          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| `$shadow-xs`   | `0 1px 2px rgba(0,0,0,0.05)`                            |
| `$shadow-sm`   | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` |
| `$shadow-md`   | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` |
| `$radius-sm`   | `0.25rem` (4px)                                         |
| `$radius-md`   | `0.375rem` (6px)                                        |
| `$radius-lg`   | `0.5rem` (8px)                                          |
| `$radius-full` | `9999px`                                                |

#### Transitions

| Token              | Value        |
| ------------------ | ------------ |
| `$transition-fast` | `150ms ease` |
| `$transition-base` | `200ms ease` |

#### App-Specific Tokens

Defined in `src/Frontend/apps/playground-text-snippet/src/styles/_variables.scss`:

| Token                      | Value                  | Purpose                |
| -------------------------- | ---------------------- | ---------------------- |
| `$app-container-max-width` | `calculaterem(1400px)` | Max container width    |
| `$app-sidebar-width`       | `calculaterem(280px)`  | Sidebar width          |
| `$app-content-max-width`   | `calculaterem(1000px)` | Content area max width |
| `$app-page-padding`        | `1.5rem`               | Page padding           |
| `$app-section-gap`         | `2rem`                 | Section vertical gap   |
| `$app-card-padding`        | `1.25rem`              | Card internal padding  |

### SCSS Functions

Defined in `src/Frontend/libs/platform-core/src/styles/_platform-variables.scss` (lines 5-7):

```scss
@function calculateRem($size) {
    @return math.div($size, $app-root-font-size) * 1rem;
}
```

Base font size: `$app-root-font-size: 16px`. All pixel-based sizing should use `calculateRem()` for consistent rem conversion.

## BEM Methodology

### Naming Convention

| Part           | Separator                | Example                                           |
| -------------- | ------------------------ | ------------------------------------------------- |
| Block          | kebab-case               | `.task-list`, `.text-snippet-detail`              |
| Element        | `__` (double underscore) | `.task-list__error`, `.task-detail__form`         |
| BEM Modifier   | `--` (double dash)       | `.stat-card--active`, `.task-detail__field--full` |
| State Modifier | `.-` (dot-dash prefix)   | `.-selected`, `.-with-backdrop`, `.--hidden`      |

### Nesting Rules

Max nesting depth: 3 (enforced by Stylelint). Elements nested inside blocks using `&__`:

```scss
// src/Frontend/apps/playground-text-snippet/src/app/app.component.scss (lines 37-42)
.app {
    &__errors {
        @include error-banner;
        margin: $space-4;
    }
}
```

### Host Element Styling

Angular component host elements use the component selector directly (not `:host`):

```scss
// src/Frontend/apps/playground-text-snippet/src/app/shared/components/
//   app-text-snippet-detail/app-text-snippet-detail.component.scss (lines 8-13)
platform-example-web-text-snippet-detail {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
}
```

### Modifier Patterns

**BEM modifier** (structural variant):

```scss
// task-detail.component.scss (lines 51-57)
&__field {
    flex: 1;
    min-width: calculaterem(200px);

    &--full {
        width: 100%;
    }
}
```

**State modifier** (dynamic state, uses `.-` prefix):

```scss
// app.component.scss (lines 114-121)
&__text-snippet-items-grid-row {
    &.-selected {
        font-weight: $font-weight-medium;
        background-color: $color-primary-50;
    }
}
```

### Placeholder Selectors

Shared patterns use `%placeholder` selectors with `@extend`:

```scss
// app.component.scss (lines 20-31)
%app-container {
    padding: $space-6;
    @include flex-layout-media('lt-md') {
        padding: $space-4;
    }
}

%app-panel {
    @include card-elevated;
    overflow: hidden;
}
```

## Theming

### Approach

Angular Material Design 3 (MD3) theming using `mat.theme()`. Material core initialized in `_material-core.scss`:

```scss
// _material-core.scss
@use '@angular/material' as mat;
@include mat.core;
```

### Default Theme

Defined in `src/Frontend/apps/playground-text-snippet/src/styles/themes/default-theme.scss`:

- **Primary palette**: `mat.$azure-palette`
- **Tertiary palette**: `mat.$blue-palette`
- **Theme type**: `light`
- **Typography**: `Roboto`
- **Density**: `0` (default)
- **Dark mode**: Automatic via `@media (prefers-color-scheme: dark)` with same palettes but `theme-type: dark`

### Alternate Theme

Defined in `themes/deeppurple-amber-theme.scss`:

- **Primary**: `mat.$blue-palette`
- **Tertiary**: `mat.$violet-palette`
- **Theme type**: `light` only

### Accessibility Support

The `platform-loading-error-indicator` component (in `platform-core`) demonstrates the accessibility pattern:

- **Dark theme**: `@media (prefers-color-scheme: dark)` -- adjusts backgrounds and text colors
- **High contrast**: `@media (prefers-contrast: high)` -- thicker borders, solid colors
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` -- disables all animations

## Responsive Patterns

### Breakpoints

Defined in `src/Frontend/libs/platform-core/src/styles/_platform-variables.scss` (lines 97-106):

| Breakpoint | Max-Width Token                 | Min-Width Token                    | Pixels             |
| ---------- | ------------------------------- | ---------------------------------- | ------------------ |
| **xs**     | `$platform-media-breakpoint-xs` | --                                 | max 575.98px       |
| **sm**     | `$platform-media-breakpoint-sm` | `$platform-media-breakpoint-gt-xs` | 576px - 767.98px   |
| **md**     | `$platform-media-breakpoint-md` | `$platform-media-breakpoint-gt-sm` | 768px - 991.98px   |
| **lg**     | `$platform-media-breakpoint-lg` | `$platform-media-breakpoint-gt-md` | 992px - 1199.98px  |
| **xl**     | `$platform-media-breakpoint-xl` | `$platform-media-breakpoint-gt-lg` | 1200px - 1423.98px |
| **xxl**    | --                              | `$platform-media-breakpoint-gt-xl` | 1424px+            |

All breakpoint values use `calculateRem()` for rem-based media queries.

### Media Query Mixin

Use `flex-layout-media($media-type)` instead of raw `@media` queries. Supported types:

| Type               | Meaning            |
| ------------------ | ------------------ |
| `'xs'` / `'lt-sm'` | max-width xs       |
| `'gt-xs'`          | min-width sm       |
| `'sm'`             | between sm and md  |
| `'gt-sm'`          | min-width md       |
| `'lt-md'`          | max-width below md |
| `'md'`             | between md and lg  |
| `'gt-md'`          | min-width lg       |
| `'lt-lg'`          | max-width below lg |
| `'lg'`             | between lg and xl  |
| `'gt-lg'`          | min-width xl       |
| `'lt-xl'`          | max-width below xl |
| `'xl'`             | between xl and xxl |
| `'gt-xl'`          | min-width xxl      |

Usage example from `app.component.scss` (lines 214-263):

```scss
@include flex-layout-media('lt-md') {
    .app {
        &__main {
            flex-direction: column;
            gap: $space-4;
            padding: $space-4;
        }

        &__side-bar {
            width: 100%;
            max-width: 100%;
        }
    }
}
```

### Responsive Strategy

Desktop-first approach: layouts designed for wide screens, adapted to narrow screens using `lt-md`, `lt-lg` breakpoints. Common pattern: switch `flex-direction: row` to `column` at `lt-md`.

## Color Palette

All colors defined in `src/Frontend/libs/platform-core/src/styles/_platform-variables.scss` (lines 24-55):

### Primary

| Token                | Hex       |
| -------------------- | --------- |
| `$color-primary-50`  | `#eff6ff` |
| `$color-primary-100` | `#dbeafe` |
| `$color-primary-200` | `#bfdbfe` |
| `$color-primary-600` | `#2563eb` |
| `$color-primary-700` | `#1d4ed8` |

### Neutral

| Token                | Hex       |
| -------------------- | --------- |
| `$color-neutral-50`  | `#f9fafb` |
| `$color-neutral-100` | `#f3f4f6` |
| `$color-neutral-200` | `#e5e7eb` |
| `$color-neutral-300` | `#d1d5db` |
| `$color-neutral-400` | `#9ca3af` |
| `$color-neutral-500` | `#6b7280` |
| `$color-neutral-600` | `#4b5563` |
| `$color-neutral-700` | `#374151` |
| `$color-neutral-900` | `#111827` |

### Semantic

| Token                  | Hex       | Usage               |
| ---------------------- | --------- | ------------------- |
| `$color-success`       | `#22c55e` | Success states      |
| `$color-success-light` | `#dcfce7` | Success backgrounds |
| `$color-success-dark`  | `#166534` | Success text        |
| `$color-warning`       | `#f59e0b` | Warning states      |
| `$color-warning-light` | `#fef3c7` | Warning backgrounds |
| `$color-warning-dark`  | `#92400e` | Warning text        |
| `$color-error`         | `#ef4444` | Error states        |
| `$color-error-light`   | `#fee2e2` | Error backgrounds   |
| `$color-error-dark`    | `#991b1b` | Error text          |

## Z-Index Scale

Defined in `src/Frontend/libs/platform-core/src/styles/_platform-variables.scss` (lines 111-115):

| Token                         | Value   | Usage                                 |
| ----------------------------- | ------- | ------------------------------------- |
| `$platform-z-index-level-1`   | `100`   | Base elevated elements                |
| `$platform-z-index-level-2`   | `200`   | Dropdowns, tooltips                   |
| `$platform-z-index-level-3`   | `300`   | Overlays, spinner overlays            |
| `$platform-z-index-level-4`   | `400`   | Modals, dialogs                       |
| `$platform-z-index-level-max` | `99999` | Blocking overlays (backdrop spinners) |

## Stylelint Configuration

Root config: `src/Frontend/.stylelintrc.json`. App and lib configs extend it.

### Base Setup

- **Extends**: `stylelint-config-standard-scss`, `stylelint-config-recess-order`
- **Plugins**: `stylelint-order` (CSS property ordering)

### Key Rules

| Rule                                          | Value                           | Purpose                                                       |
| --------------------------------------------- | ------------------------------- | ------------------------------------------------------------- |
| `max-nesting-depth`                           | `3`                             | Prevents deep nesting (ignores `@include`, `@media`, `@if`)   |
| `scss/dollar-variable-pattern`                | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` | Enforces kebab-case variables                                 |
| `scss/at-mixin-pattern`                       | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` | Enforces kebab-case mixins                                    |
| `scss/no-duplicate-mixins`                    | `true`                          | Prevents mixin redefinition                                   |
| `scss/no-duplicate-dollar-variables`          | `true`                          | Prevents variable redefinition (except inside `@if`/`@mixin`) |
| `scss/selector-no-redundant-nesting-selector` | `true`                          | Prevents unnecessary `&` nesting                              |
| `color-function-notation`                     | `modern`                        | Requires `rgb()` not `rgba()` for new code                    |
| `selector-disallowed-list`                    | `/^::ng-deep/`                  | Bans root-level `::ng-deep` (must scope with `:host`)         |

### Angular-Specific Allowances

- **Pseudo-elements**: `ng-deep` allowed
- **Pseudo-classes**: `host`, `host-context`, `global` allowed
- **Type selectors**: Prefixes `app-`, `mat-`, `cdk-`, `ng-`, `router-`, `platform-`, `platform-example-web-` allowed

### Overrides

Theme files (`**/themes/**/*.scss`, `**/*-theme.scss`) are exempt from variable naming patterns and nesting depth limits.

---

## Closing Reminders

- **MUST** use design tokens (`$space-*`, `$color-*`, `$radius-*`, `$font-size-*`) for all values -- never hardcode pixels, colors, or magic numbers
- **MUST** use `flex-layout-media()` mixin for responsive breakpoints -- never write raw `@media` queries
- **MUST** follow BEM naming: `.block__element--modifier` (kebab-case), state modifiers with `.-` prefix, max 3 nesting levels
- **MUST** style Angular host elements via component selector (not `:host`) and use `calculateRem()` for all pixel-to-rem conversions
- **MUST** apply BEM classes to ALL template elements -- no classless elements in component templates
