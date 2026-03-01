<!-- Last scanned: 2026-03-05 -->

# Design System Documentation Index

Quick reference for AI agents to select the correct design system file based on target application.

## Design System Overview

| Aspect                | Value                                     |
| --------------------- | ----------------------------------------- |
| **Framework**         | Angular 19, Standalone Components         |
| **UI Library**        | Angular Material Design 3 (M3)            |
| **Styling**           | SCSS with token-based architecture        |
| **Theming**           | M3 azure/blue palettes, light + dark mode |
| **Naming**            | BEM: `.block__element.--modifier`         |
| **Selector Prefixes** | `app-`, `platform-example-`, `platform-`  |

---

## Summary - Quick File Selection

| File Path Contains                 | Read This Guide                                |
| ---------------------------------- | ---------------------------------------------- |
| `src/Frontend/apps/`               | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |
| `src/Frontend/libs/platform-core/` | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |
| `src/Frontend/libs/` (any lib)     | [WebV2DesignSystem.md](./WebV2DesignSystem.md) |

**Quick Detection:**

- SCSS variables `$color-primary-*`, `$space-*` --> Platform tokens
- Angular Material M3 theme --> default-theme.scss
- Standalone Angular components --> WebV2

> **Note:** `WebV1ModernStyleGuide.md` documents V2-aesthetic patterns for hypothetical legacy apps. This project currently has no legacy frontend apps (`legacyApps: []` in project-config.json). The file is retained as a reference for future migration scenarios.

---

## Table of Contents

1. [Design System Overview](#design-system-overview) - Architecture and tooling
2. [File Selection Matrix](#file-selection-matrix) - Which doc for which app
3. [Token Architecture](#token-architecture) - SCSS variable layers and import chain
4. [Design Tokens Reference](#design-tokens-reference) - Colors, spacing, typography, shadows
5. [Mixin Inventory](#mixin-inventory) - Platform and app-level mixins
6. [Component Inventory](#component-inventory) - Angular components by library
7. [Theme Configuration](#theme-configuration) - Material Design 3 setup
8. [App-to-File Mapping](#app-to-file-mapping) - Detailed directory mappings
9. [Quick Detection Rules](#quick-detection-rules) - Identify app by code patterns

---

## File Selection Matrix

| Working On             | Design System File                             | Path Pattern                                  |
| ---------------------- | ---------------------------------------------- | --------------------------------------------- |
| **TextSnippet app**    | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/Frontend/apps/playground-text-snippet/*` |
| **Platform core libs** | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/Frontend/libs/platform-core/*`           |
| **Any frontend lib**   | [WebV2DesignSystem.md](./WebV2DesignSystem.md) | `src/Frontend/libs/*`                         |

---

## Token Architecture

The design system uses a two-layer SCSS variable architecture:

```
Platform Tokens (framework core)
  src/Frontend/libs/platform-core/src/styles/_platform-variables.scss
  src/Frontend/libs/platform-core/src/styles/_platform-mixins.scss
  src/Frontend/libs/platform-core/src/styles/_platform-functions.scss
  src/Frontend/libs/platform-core/src/styles/_platform-placeholders.scss
      |
      v  (forwarded via @forward)
App Tokens (app-level overrides)
  src/Frontend/apps/playground-text-snippet/src/styles/_variables.scss
  src/Frontend/apps/playground-text-snippet/src/styles/_mixins.scss
      |
      v  (aggregated in)
  src/Frontend/apps/playground-text-snippet/src/styles/_index.scss
      |
      v  (consumed by)
  src/Frontend/apps/playground-text-snippet/src/styles.scss  (global entry)
```

**Import in components:** Components import from the app's `_index.scss` which re-exports both platform and app tokens.

---

## Design Tokens Reference

### Colors

**Primary** (blue scale):

| Token                | Value     | Usage                    |
| -------------------- | --------- | ------------------------ |
| `$color-primary-50`  | `#eff6ff` | Light primary background |
| `$color-primary-100` | `#dbeafe` | Hover states             |
| `$color-primary-200` | `#bfdbfe` | Selected states          |
| `$color-primary-600` | `#2563eb` | Primary actions, links   |
| `$color-primary-700` | `#1d4ed8` | Hover on primary         |

**Neutral** (gray scale):

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

**Semantic:**

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

### Shadows & Radii

| Token          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| `$shadow-xs`   | `0 1px 2px rgba(0,0,0,0.05)`                            |
| `$shadow-sm`   | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` |
| `$shadow-md`   | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` |
| `$radius-sm`   | `0.25rem` (4px)                                         |
| `$radius-md`   | `0.375rem` (6px)                                        |
| `$radius-lg`   | `0.5rem` (8px)                                          |
| `$radius-full` | `9999px`                                                |

### Transitions

| Token              | Value        |
| ------------------ | ------------ |
| `$transition-fast` | `150ms ease` |
| `$transition-base` | `200ms ease` |

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

### Platform Mixins (`_platform-mixins.scss`)

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

### App Mixins (`_mixins.scss` in playground-text-snippet)

| Mixin                | Signature                     | Purpose                                          |
| -------------------- | ----------------------------- | ------------------------------------------------ |
| `app-page-container` | `@include app-page-container` | Full page column layout with max-width           |
| `app-empty-state`    | `@include app-empty-state`    | Centered empty state with icon/title/description |
| `app-data-table`     | `@include app-data-table`     | Styled data table (headers, rows, hover)         |
| `app-form-section`   | `@include app-form-section`   | Card-elevated form panel                         |
| `app-form-row`       | `@include app-form-row`       | Responsive flex row for form fields              |
| `app-form-field`     | `@include app-form-field`     | Flexible form field with min-width               |

### Utility Function

| Function       | Signature             | Purpose                               |
| -------------- | --------------------- | ------------------------------------- |
| `calculateRem` | `calculateRem($size)` | Converts px to rem based on 16px root |

---

## Component Inventory

### Platform Core (`src/Frontend/libs/platform-core/`)

| Component                     | Selector                           | Category |
| ----------------------------- | ---------------------------------- | -------- |
| PlatformLoadingErrorIndicator | `platform-loading-error-indicator` | Feedback |
| PlatformComponent (abstract)  | -- (base class)                    | Base     |

### App Components (`src/Frontend/apps/playground-text-snippet/`)

| Component         | Selector                                   | Category   |
| ----------------- | ------------------------------------------ | ---------- |
| AppComponent      | `platform-example-web-root`                | Shell      |
| TextSnippetDetail | `platform-example-web-text-snippet-detail` | Feature    |
| TaskList          | `app-task-list`                            | Feature    |
| TaskDetail        | `app-task-detail`                          | Feature    |
| NavLoadingTest    | `app-nav-loading-test`                     | Navigation |

### Shared Libraries

| Library                         | Component Count | Notes                                             |
| ------------------------------- | --------------- | ------------------------------------------------- |
| `libs/platform-components/`     | 0               | Reserved for reusable platform UI components      |
| `libs/apps-shared-components/`  | 0               | Reserved for cross-app shared components          |
| `libs/apps-domains-components/` | 0               | Reserved for domain-specific shared components    |
| `libs/apps-domains/`            | 0               | Domain models and API services (no UI components) |

---

## Theme Configuration

Angular Material Design 3 theme in `src/Frontend/apps/playground-text-snippet/src/styles/themes/default-theme.scss`:

- **Primary palette:** `mat.$azure-palette`
- **Tertiary palette:** `mat.$blue-palette`
- **Theme type:** light (default), dark (via `prefers-color-scheme: dark`)
- **Typography:** Roboto
- **Density:** 0
- **Alternative theme:** `deeppurple-amber-theme.scss` available

### Global Styles (`styles.scss`)

- Box-sizing: `border-box` on all elements
- Root font size: `$app-root-font-size` (16px)
- Body background: `$color-neutral-50`
- Body text color: `$color-neutral-900`
- Link color: `$color-primary-600`, hover: `$color-primary-700`
- Utility classes: `.text-muted`, `.text-primary`, `.text-success`, `.text-warning`, `.text-error`, `.bg-surface`, `.bg-surface-variant`, `.rounded-md`, `.rounded-lg`, `.shadow-sm`, `.shadow-md`

---

## App-to-File Mapping

### WebV2DesignSystem.md

- `src/Frontend/apps/playground-text-snippet/`
- `src/Frontend/libs/platform-core/`
- `src/Frontend/libs/platform-components/`
- `src/Frontend/libs/apps-shared-components/`
- `src/Frontend/libs/apps-domains/`
- `src/Frontend/libs/apps-domains-components/`

**Key indicators:** Angular 19, standalone components, SCSS `$color-*` / `$space-*` tokens, `@include flex-center` / `stack()` / `cluster()` mixins, Material Design 3 theme

### WebV1ModernStyleGuide.md

- Currently unused -- no legacy apps in this project
- Retained for reference if legacy app migration is needed

---

## Quick Detection Rules

1. **Check SCSS token usage:**
    - `$color-primary-*`, `$space-*`, `$font-size-*` --> Platform tokens (WebV2)
    - `$app-*` variables --> App-specific overrides

2. **Check mixin usage:**
    - `@include flex-center` / `stack()` / `cluster()` --> Platform mixins
    - `@include app-page-container` / `app-data-table` --> App mixins

3. **Check file path:**
    - Contains `Frontend/apps` or `Frontend/libs` --> WebV2DesignSystem.md

4. **Check theme:**
    - `@angular/material` M3 theme --> default-theme.scss

---

## Known Discrepancies

The `WebV2DesignSystem.md` file contains references carried over from a prior project that do not match the current codebase:

| Documented                                                  | Actual                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `@use 'shared-mixin' as *;` import                          | No `shared-mixin` file exists; use `_index.scss` which re-exports platform tokens |
| CSS variables: `--bg-pri-cl`, `--text-pri-cl`               | SCSS variables: `$color-neutral-50`, `$color-neutral-900`, etc.                   |
| Mixins: `flex()`, `flex-col()`, `flex-row()`, `text-base()` | Mixins: `flex-center`, `stack()`, `cluster()`, `truncate-text`                    |

These discrepancies should be resolved by updating `WebV2DesignSystem.md` to reflect the actual token and mixin names. Until then, use this README as the source of truth for token/mixin names.
