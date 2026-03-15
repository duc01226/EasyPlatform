<!-- Last scanned: 2026-03-15 -->

# Design System Reference

<!-- This file is referenced by Claude skills and agents for project-specific context. -->
<!-- Canonical source of truth: docs/design-system/README.md (detailed guide with Known Discrepancies). -->

## Design System Overview

| Aspect                | Value                                                    |
| --------------------- | -------------------------------------------------------- |
| **Framework**         | Angular 19, Standalone Components                        |
| **UI Library**        | Angular Material Design 3 (M3)                           |
| **Styling**           | SCSS with token-based architecture (no CSS custom props) |
| **Theming**           | M3 azure/blue palettes, light + dark mode                |
| **Naming**            | BEM: `.block__element.--modifier`                        |
| **Selector Prefixes** | `app-`, `platform-example-`, `platform-`                 |
| **Units**             | `rem`-based spacing and typography                       |

### Token Architecture (two-layer)

```
Platform Tokens (framework core)
  libs/platform-core/src/styles/_platform-variables.scss
  libs/platform-core/src/styles/_platform-mixins.scss
  libs/platform-core/src/styles/_platform-functions.scss
  libs/platform-core/src/styles/_platform-placeholders.scss
      |
      v  (@forward)
App Tokens (app-level overrides)
  apps/playground-text-snippet/src/styles/_variables.scss
  apps/playground-text-snippet/src/styles/_mixins.scss
      |
      v  (aggregated in)
  apps/playground-text-snippet/src/styles/_index.scss
      |
      v  (consumed by)
  apps/playground-text-snippet/src/styles.scss  (global entry)
```

Components import from the app `_index.scss` which re-exports both layers.

---

## App Documentation Map

| Working On         | Design System Doc                         | Path Pattern                                  |
| ------------------ | ----------------------------------------- | --------------------------------------------- |
| TextSnippet app    | `docs/design-system/WebV2DesignSystem.md` | `src/Frontend/apps/playground-text-snippet/*` |
| Platform core libs | `docs/design-system/WebV2DesignSystem.md` | `src/Frontend/libs/platform-core/*`           |
| Any frontend lib   | `docs/design-system/WebV2DesignSystem.md` | `src/Frontend/libs/*`                         |

**WebV1ModernStyleGuide.md** -- currently unused; no legacy frontend apps exist. Retained for future migration reference.

### Quick Detection

- SCSS variables `$color-primary-*`, `$space-*` --> Platform tokens (WebV2)
- Angular Material M3 theme --> `default-theme.scss`
- Standalone Angular components --> WebV2

---

## Design Tokens

### Colors

**Primary** (blue scale) -- source: `_platform-variables.scss`

| Token                | Value     | Usage                    |
| -------------------- | --------- | ------------------------ |
| `$color-primary-50`  | `#eff6ff` | Light primary background |
| `$color-primary-100` | `#dbeafe` | Hover states             |
| `$color-primary-200` | `#bfdbfe` | Selected states          |
| `$color-primary-600` | `#2563eb` | Primary actions, links   |
| `$color-primary-700` | `#1d4ed8` | Hover on primary         |

**Neutral** (gray scale)

| Token                | Value     | Usage                          |
| -------------------- | --------- | ------------------------------ |
| `$color-neutral-50`  | `#f9fafb` | Page background, table headers |
| `$color-neutral-100` | `#f3f4f6` | Row dividers                   |
| `$color-neutral-200` | `#e5e7eb` | Borders                        |
| `$color-neutral-300` | `#d1d5db` | Disabled icons                 |
| `$color-neutral-400` | `#9ca3af` | Placeholder text               |
| `$color-neutral-500` | `#6b7280` | Muted/secondary text           |
| `$color-neutral-600` | `#4b5563` | Table headers                  |
| `$color-neutral-700` | `#374151` | Headings                       |
| `$color-neutral-900` | `#111827` | Primary body text              |

**Semantic**

| Token            | Value     | Light Variant                    | Dark Variant                    |
| ---------------- | --------- | -------------------------------- | ------------------------------- |
| `$color-success` | `#22c55e` | `$color-success-light` `#dcfce7` | `$color-success-dark` `#166534` |
| `$color-warning` | `#f59e0b` | `$color-warning-light` `#fef3c7` | `$color-warning-dark` `#92400e` |
| `$color-error`   | `#ef4444` | `$color-error-light` `#fee2e2`   | `$color-error-dark` `#991b1b`   |

### Spacing Scale

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

### Typography

| Token               | Value                                    | Pixels |
| ------------------- | ---------------------------------------- | ------ |
| `$font-family-base` | `'Roboto', 'Helvetica Neue', sans-serif` | --     |
| `$font-size-xs`     | `0.75rem`                                | 12px   |
| `$font-size-sm`     | `0.875rem`                               | 14px   |
| `$font-size-base`   | `1rem`                                   | 16px   |
| `$font-size-md`     | `1.125rem`                               | 18px   |
| `$font-size-lg`     | `1.25rem`                                | 20px   |
| `$font-size-xl`     | `1.5rem`                                 | 24px   |
| `$font-size-2xl`    | `1.875rem`                               | 30px   |
| `$font-size-3xl`    | `2.25rem`                                | 36px   |

| Weight Token            | Value |
| ----------------------- | ----- |
| `$font-weight-normal`   | 400   |
| `$font-weight-medium`   | 500   |
| `$font-weight-semibold` | 600   |
| `$font-weight-bold`     | 700   |

### Shadows, Radii, Transitions

| Token              | Value                                                   |
| ------------------ | ------------------------------------------------------- |
| `$shadow-xs`       | `0 1px 2px rgba(0,0,0,0.05)`                            |
| `$shadow-sm`       | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` |
| `$shadow-md`       | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` |
| `$radius-sm`       | `0.25rem` (4px)                                         |
| `$radius-md`       | `0.375rem` (6px)                                        |
| `$radius-lg`       | `0.5rem` (8px)                                          |
| `$radius-full`     | `9999px`                                                |
| `$transition-fast` | `150ms ease`                                            |
| `$transition-base` | `200ms ease`                                            |

### Breakpoints (rem-based via `calculateRem()`)

| Token                              | Direction | Approx px |
| ---------------------------------- | --------- | --------- |
| `$platform-media-breakpoint-xs`    | max-width | 576px     |
| `$platform-media-breakpoint-gt-xs` | min-width | 576px     |
| `$platform-media-breakpoint-sm`    | max-width | 768px     |
| `$platform-media-breakpoint-gt-sm` | min-width | 768px     |
| `$platform-media-breakpoint-md`    | max-width | 992px     |
| `$platform-media-breakpoint-gt-md` | min-width | 992px     |
| `$platform-media-breakpoint-lg`    | max-width | 1200px    |
| `$platform-media-breakpoint-gt-lg` | min-width | 1200px    |
| `$platform-media-breakpoint-xl`    | max-width | 1424px    |
| `$platform-media-breakpoint-gt-xl` | min-width | 1424px    |

### Z-Index Scale

| Token                         | Value |
| ----------------------------- | ----- |
| `$platform-z-index-level-1`   | 100   |
| `$platform-z-index-level-2`   | 200   |
| `$platform-z-index-level-3`   | 300   |
| `$platform-z-index-level-4`   | 400   |
| `$platform-z-index-level-max` | 99999 |

---

## Mixin Inventory

### Platform Mixins (`libs/platform-core/src/styles/_platform-mixins.scss`)

| Mixin               | Signature                          | Purpose                                |
| ------------------- | ---------------------------------- | -------------------------------------- |
| `flex-center`       | `@include flex-center`             | Center content on both axes            |
| `flex-start`        | `@include flex-start`              | Left-aligned flex row                  |
| `flex-between`      | `@include flex-between`            | Space-between flex row                 |
| `stack`             | `@include stack($gap: $space-4)`   | Vertical column layout with gap        |
| `cluster`           | `@include cluster($gap: $space-4)` | Horizontal wrapping layout with gap    |
| `card-elevated`     | `@include card-elevated`           | White card with border-radius + shadow |
| `badge-base`        | `@include badge-base`              | Inline badge with padding/font         |
| `error-banner`      | `@include error-banner`            | Red left-border alert banner           |
| `warning-banner`    | `@include warning-banner`          | Yellow left-border alert banner        |
| `flex-layout-media` | `@include flex-layout-media('md')` | Responsive breakpoint media queries    |
| `truncate-text`     | `@include truncate-text`           | Ellipsis overflow on text              |

### App Mixins (`apps/playground-text-snippet/src/styles/_mixins.scss`)

| Mixin                | Signature                     | Purpose                                          |
| -------------------- | ----------------------------- | ------------------------------------------------ |
| `app-page-container` | `@include app-page-container` | Full page column layout with max-width           |
| `app-empty-state`    | `@include app-empty-state`    | Centered empty state with icon/title/description |
| `app-data-table`     | `@include app-data-table`     | Styled data table (headers, rows, hover)         |
| `app-form-section`   | `@include app-form-section`   | Card-elevated form panel                         |
| `app-form-row`       | `@include app-form-row`       | Responsive flex row for form fields              |
| `app-form-field`     | `@include app-form-field`     | Flexible form field with min-width               |

### Utility Function (`_platform-variables.scss`)

| Function       | Signature             | Purpose                               |
| -------------- | --------------------- | ------------------------------------- |
| `calculateRem` | `calculateRem($size)` | Converts px to rem based on 16px root |

---

## Theme Configuration

Angular Material Design 3 theme at `apps/playground-text-snippet/src/styles/themes/default-theme.scss`:

- **Primary palette:** `mat.$azure-palette`
- **Tertiary palette:** `mat.$blue-palette`
- **Theme type:** light (default), dark (via `prefers-color-scheme: dark`)
- **Typography:** Roboto
- **Density:** 0
- **Material core:** imported via `_material-core.scss` (`@include mat.core`)
- **Alternative theme:** `deeppurple-amber-theme.scss` available

### Global Styles (`styles.scss`)

- Box-sizing: `border-box` on all elements
- Root font size: `$app-root-font-size` (16px)
- Body background: `$color-neutral-50`, text: `$color-neutral-900`
- Link color: `$color-primary-600`, hover: `$color-primary-700`
- Utility classes: `.text-muted`, `.text-primary`, `.text-success`, `.text-warning`, `.text-error`, `.bg-surface`, `.bg-surface-variant`, `.rounded-md`, `.rounded-lg`, `.shadow-sm`, `.shadow-md`

### App-Specific Tokens (`_variables.scss`)

| Token                      | Value                  | Purpose                  |
| -------------------------- | ---------------------- | ------------------------ |
| `$app-container-max-width` | `calculateRem(1400px)` | Main container max-width |
| `$app-sidebar-width`       | `calculateRem(280px)`  | Sidebar width            |
| `$app-content-max-width`   | `calculateRem(1000px)` | Content area max-width   |
| `$app-page-padding`        | `1.5rem` (24px)        | Page padding             |
| `$app-section-gap`         | `2rem` (32px)          | Section gap              |
| `$app-card-padding`        | `1.25rem` (20px)       | Card padding             |

---

## Component Inventory

### Platform Core (`src/Frontend/libs/platform-core/`)

| Component / Directive         | Selector                           | Category  |
| ----------------------------- | ---------------------------------- | --------- |
| PlatformLoadingErrorIndicator | `platform-loading-error-indicator` | Feedback  |
| PlatformComponent (abstract)  | -- (base class)                    | Base      |
| SwipeToScrollDirective        | `[platformSwipeToScroll]`          | Directive |
| DisabledControlDirective      | `[platformDisabledControl]`        | Directive |

### App Components (`src/Frontend/apps/playground-text-snippet/`)

| Component         | Selector                                   | Category   |
| ----------------- | ------------------------------------------ | ---------- |
| AppComponent      | `platform-example-web-root`                | Shell      |
| TextSnippetDetail | `platform-example-web-text-snippet-detail` | Feature    |
| TaskList          | `app-task-list`                            | Feature    |
| TaskDetail        | `app-task-detail`                          | Feature    |
| NavLoadingTest    | `app-nav-loading-test`                     | Navigation |

### Shared Libraries

| Library                                  | Component Count | Notes                                          |
| ---------------------------------------- | --------------- | ---------------------------------------------- |
| `libs/platform-components/`              | 0               | Reserved for reusable platform UI components   |
| `libs/apps-shared-components/`           | 0               | Reserved for cross-app shared components       |
| `libs/apps-domains-components/`          | 0               | Reserved for domain-specific shared components |
| `libs/apps-domains/text-snippet-domain/` | 0 (services)    | Domain models, APIs, repositories (no UI)      |

### Global Component Overrides (`styles/components/`)

| File               | Purpose                                 |
| ------------------ | --------------------------------------- |
| `mat-spinner.scss` | Custom Angular Material spinner styling |

---

## Icon & Asset Library

No custom icon sets or asset libraries detected. The project uses Angular Material's built-in icon system via `mat-icon`.

---

## Known Discrepancies (from `docs/design-system/README.md`)

`WebV2DesignSystem.md` contains references from a prior project that do not match the current codebase:

| Documented in WebV2                                         | Actual in Code                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `@use 'shared-mixin' as *;` import                          | No `shared-mixin` file; use `_index.scss` which re-exports platform tokens |
| CSS variables: `--bg-pri-cl`, `--text-pri-cl`               | SCSS variables: `$color-neutral-50`, `$color-neutral-900`, etc.            |
| Mixins: `flex()`, `flex-col()`, `flex-row()`, `text-base()` | Mixins: `flex-center`, `stack()`, `cluster()`, `truncate-text`             |

Use this README and `docs/design-system/README.md` as source of truth for token/mixin names.
