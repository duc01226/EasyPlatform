<!-- Last scanned: 2026-06-12 -->
<!-- CRITICAL: BEM on ALL elements; platform-core $variables for ALL values; @use not @import; flex-layout-media() for responsive; component-scoped SCSS -->

# SCSS Styling Guide

**MUST** use BEM naming on every template element. **MUST** use SCSS tokens from `_platform-variables.scss` for all values.
**NEVER** hardcode hex colors, pixel values, font sizes, or z-index numbers. **MUST** use `@use`/`@forward` not `@import`. **MUST** use `flex-layout-media()` for responsive — never raw `@media`.

**Final Purpose:** every new/modified `*.scss` reuses platform-core tokens + mixins through BEM-scoped, `@use`-loaded, responsive-by-mixin styles — so styling stays consistent, themeable, and token-driven instead of hardcoded — why: hardcoded values and ad-hoc CSS silently break theming and drift from the design system.

Tokens are **two-tier**: platform-core globals (`libs/platform-core/src/styles/_platform-*.scss`, prefix `$platform-*` for breakpoints/z-index) are `@forward`ed into the app, which adds `$app-*` overrides in `apps/.../styles/_variables.scss`.

## BEM Methodology

Convention: `block__element--modifier`. Block = component name in kebab-case (`app`, `task-list`, `platform-loading-error-indicator`). Element = `__`. Modifier = `--`. Max nesting depth observed ~3.

**Signature project variant — standalone `--modifier` classes:** modifiers are toggled as independent `--name` classes via Angular `[class.--modifier]` binding, decoupled from the block, and matched in SCSS with `&.--modifier` (element-attached) or `.--modifier &` (ancestor-state).

```html
<!-- platform-loading-error-indicator.component.html:4-13,92 — standalone modifier bindings -->
<div class="platform-loading-error-indicator" [class.--loading]="isLoading" [class.--error]="hasError" [class.--hidden]="isHidden">
    <div class="platform-loading-error-indicator__progress-bar"></div>
    <button class="platform-loading-error-indicator__action-btn --reload">Reload</button>
</div>
<!-- nav-loading-test.component.html:61,71 -->
<span class="nav-loading-test__count --failed" [class.--success]="test.passed"></span>
```

```scss
// task-list.component.scss:46,61 — BEM nesting (&__element then &--modifier)
.stat-card {
    &__value {                       // &__element
        &--active { color: $color-primary-600; }   // task-list.component.scss:66
        &--completed { ... }
        &--overdue { ... }
    }
}

// nav-loading-test.component.scss:104,127 — standalone-modifier matching
&.--success { ... }   // element itself carries the --success class
.--success & { ... }  // ancestor --success state drives this child
```

**BAD:** `<div class="container">` or bare `<div>` with no class.
**GOOD:** `<div class="task-list__statistics">` — BEM class on every element.

## SCSS Architecture

Component styles are co-located (`*.component.scss`, Angular emulated ViewEncapsulation). Cross-component contamination is prevented by encapsulation + unique block prefixes per component. Global styles, tokens, mixins, theme, and Material host overrides live under the `styles/` dirs.

| Layer              | Path                                                     | Purpose                                                                                            |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Platform variables | `libs/platform-core/src/styles/_platform-variables.scss` | Design tokens (color, spacing, typography, radius, shadow, breakpoint, z-index) + `calculateRem()` |
| Platform mixins    | `libs/platform-core/src/styles/_platform-mixins.scss`    | Layout, card, badge, banner, `flex-layout-media`, text mixins                                      |
| App variables      | `apps/.../styles/_variables.scss`                        | `@forward`s platform-variables, adds `$app-*` layout overrides                                     |
| App mixins         | `apps/.../styles/_mixins.scss`                           | `@forward`s platform-mixins, adds `app-*` page/table/form mixins                                   |
| Barrel             | `apps/.../styles/_index.scss`                            | Central import orchestrator (order below)                                                          |
| Material core      | `apps/.../styles/_material-core.scss`                    | `@include mat.core;` emitted once                                                                  |
| Theme              | `apps/.../styles/themes/default-theme.scss`              | Material Design 3 `mat.theme()` (light + dark)                                                     |
| Global styles      | `apps/.../styles.scss`                                   | Reset, typography defaults, utility classes                                                        |
| Component SCSS     | `*.component.scss`                                       | Component-scoped BEM styles                                                                        |

**Import chain** — app entry `styles.scss:1` → `@use './styles/index'`. Barrel order (`_index.scss:1-10`):

```scss
@forward 'variables'; // re-export tokens to importers
@forward 'mixins';
@use 'variables' as *;
@use 'mixins' as *;
@use 'material-core' as *; // mat.core
@use './themes/default-theme' as *;
@use './components' as *; // component partial barrel (mat-spinner)
```

App→platform forwarding: `_variables.scss:2-3` `@forward 'platform-variables'` + `@use ... as *`; `_mixins.scss:2-4` `@forward 'platform-mixins'`. Order: reset → tokens → mixins → material-core → theme → components → global utilities.

**Import pattern for component SCSS:**

```scss
@use 'variables' as *;
@use 'mixins' as *;
```

> **Note (legacy `@import` residue):** `_functions.scss:1` and `_placeholders.scss:1` still use legacy `@import` to wire the empty platform stubs (see Functions / Anti-Patterns). All token/mixin loading uses modern `@use`/`@forward`.

## Mixins Reference

### Platform Mixins (`_platform-mixins.scss`)

| Mixin                      | Decl line | Purpose                                             |
| -------------------------- | --------- | --------------------------------------------------- |
| `flex-center`              | :7        | `display:flex` + center both axes                   |
| `flex-start`               | :13       | Flex, align center, `justify-content:flex-start`    |
| `flex-between`             | :19       | Flex, `justify-content:space-between`               |
| `stack($gap: $space-4)`    | :26       | Vertical flex column with gap                       |
| `cluster($gap: $space-4)`  | :33       | Wrapping horizontal flex with gap                   |
| `card-elevated`            | :43       | White bg + `$radius-lg` + `$shadow-sm`              |
| `badge-base`               | :53       | Inline-flex pill badge                              |
| `error-banner`             | :63       | Error-colored banner with left border               |
| `warning-banner`           | :74       | Warning-colored banner                              |
| `flex-layout-media($type)` | :89       | Responsive media-query wrapper (13 breakpoint keys) |
| `truncate-text`            | :149      | Single-line `nowrap` + ellipsis                     |

### App Mixins (`_mixins.scss`)

| Mixin                | Decl line | Purpose                                  |
| -------------------- | --------- | ---------------------------------------- |
| `app-page-container` | :12       | Page layout with max-width + auto margin |
| `app-empty-state`    | :22       | Centered empty state with icon + text    |
| `app-data-table`     | :51       | Styled table with headers + hover rows   |
| `app-form-section`   | :87       | Card-elevated form wrapper               |
| `app-form-row`       | :92       | Flex row that stacks on mobile (`lt-md`) |
| `app-form-field`     | :102      | Flex field with min-width                |

## Functions

| Function              | Signature / behavior                                     | `file:line`                  |
| --------------------- | -------------------------------------------------------- | ---------------------------- |
| `calculateRem($size)` | `math.div($size, $app-root-font-size) * 1rem` (px → rem) | `_platform-variables.scss:5` |

Only ONE function exists, and it lives in `_platform-variables.scss` (NOT `_platform-functions.scss`, which is an empty stub). `$app-root-font-size = 16px` (`_platform-variables.scss:3`).

> **Casing inconsistency:** declared `calculateRem` but called lowercase `calculaterem(...)` at `_variables.scss:14-16`. SCSS function names are case-insensitive so it resolves — prefer matching the declaration casing in new code.

## Variables & Tokens

All in `_platform-variables.scss`. Naming: kebab-case, category-prefixed.

| Category   | Tokens                                                                                                   | Lines  |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Spacing    | `$space-1`=0.25rem … `$space-12`=3rem (4px scale: 1,2,3,4,5,6,8,10,12)                                   | :12-20 |
| Typography | `$font-family-base`='Roboto'…; `$font-size-xs`..`$font-size-3xl` (0.75→2.25rem); weights 400/500/600/700 | :60-74 |
| Radius     | `$radius-sm`=0.25rem, `-md`=0.375rem, `-lg`=0.5rem, `-full`=9999px                                       | :83-86 |
| Shadow     | `$shadow-xs`, `$shadow-sm`, `$shadow-md`                                                                 | :79-81 |
| Transition | `$transition-fast`=150ms ease, `$transition-base`=200ms ease                                             | :91-92 |

App overrides (`_variables.scss`): `$app-container-max-width`=calculateRem(1400px) :14, `$app-sidebar-width`=calculateRem(280px) :15, `$app-content-max-width`=calculateRem(1000px) :16, `$app-page-padding`=1.5rem :19, `$app-section-gap`=2rem :20, `$app-card-padding`=1.25rem :21.

> **No manually-authored CSS custom properties** exist in source. `--*` vars are generated at runtime by Material's `mat.theme()`. Component-scoped `--mdc-*` overrides are the only authored CSS custom props (see Theming).

## Color Palette

Tailwind-style scale, all declared in `_platform-variables.scss`. Grouped by semantic role (NOT raw hex list). Material palettes (azure/blue/violet) are separate — driven by `mat.theme` runtime, not these hex tokens.

| Role    | Tokens                              | Values                                          | Lines  |
| ------- | ----------------------------------- | ----------------------------------------------- | ------ |
| Primary | `$color-primary-50/100/200/600/700` | #eff6ff / #dbeafe / #bfdbfe / #2563eb / #1d4ed8 | :27-31 |
| Neutral | `$color-neutral-50…900`             | #f9fafb → #111827 (9 steps)                     | :34-42 |
| Success | `$color-success / -light / -dark`   | #22c55e / #dcfce7 / #166534                     | :45-47 |
| Warning | `$color-warning / -light / -dark`   | #f59e0b / #fef3c7 / #92400e                     | :49-51 |
| Error   | `$color-error / -light / -dark`     | #ef4444 / #fee2e2 / #991b1b                     | :53-55 |

## Responsive Patterns

Hybrid mobile-first/desktop-first via `flex-layout-media($type)`. Breakpoints (`_platform-variables.scss:97-106`, values via `calculateRem()`):

| Breakpoint variable                | Value     | Edge    |
| ---------------------------------- | --------- | ------- |
| `$platform-media-breakpoint-xs`    | 575.98px  | max xs  |
| `$platform-media-breakpoint-gt-xs` | 576px     | min sm  |
| `$platform-media-breakpoint-sm`    | 767.98px  | max sm  |
| `$platform-media-breakpoint-gt-sm` | 768px     | min md  |
| `$platform-media-breakpoint-md`    | 991.98px  | max md  |
| `$platform-media-breakpoint-gt-md` | 992px     | min lg  |
| `$platform-media-breakpoint-lg`    | 1199.98px | max lg  |
| `$platform-media-breakpoint-gt-lg` | 1200px    | min xl  |
| `$platform-media-breakpoint-xl`    | 1423.98px | max xl  |
| `$platform-media-breakpoint-gt-xl` | 1424px    | min xxl |

`flex-layout-media` (`_platform-mixins.scss:89-143`) accepts 13 keys: `xs`/`lt-sm`, `gt-xs`, `sm`, `gt-sm`, `lt-md`, `md`, `gt-md`, `lt-lg`, `lg`, `gt-lg`, `lt-xl`, `xl`, `gt-xl`.

```scss
// Usage — stack on mobile, row on desktop
@include flex-layout-media('lt-md') {
    flex-direction: column;
}
```

**MUST** use `flex-layout-media()` for all responsive rules, NEVER raw `@media` (sole exception: `prefers-color-scheme` in theme).

## Theming

Angular **Material Design 3** via `mat.theme()` (NOT legacy `define-theme`). `mat.core` emitted once at `_material-core.scss:1-2`.

- **Default theme** (`themes/default-theme.scss:9-19`): `primary: mat.$azure-palette`, `tertiary: mat.$blue-palette`, `theme-type: light`, typography Roboto, density 0.
- **Dark mode = `prefers-color-scheme` media query** (`default-theme.scss:23-37`), NOT class switching — re-invokes `mat.theme()` with `theme-type: dark`, same palettes.
- **Add a theme:** create `themes/*.scss` with a `mat.theme(...)` block and `@use` it in `_index.scss` (only `default-theme` is wired).

```scss
// Component-scoped MDC overrides — task-list.component.scss:360-365 (only --mdc-* overrides in repo)
.mat-mdc-chip.priority-high {
    --mdc-chip-elevated-container-color: #{$color-warning-light};
    --mdc-chip-label-text-color: #{$color-warning-dark};
}
```

> **Orphan:** `themes/deeppurple-amber-theme.scss` is misnamed (actually defines blue/violet) and is NOT `@use`d in `_index.scss` — example only, do not assume active.

## Z-Index Scale

Use the scale; never raw numbers.

| Variable                      | Value | Use (observed)                          | Decl line |
| ----------------------------- | ----- | --------------------------------------- | --------- |
| `$platform-z-index-level-1`   | 100   | base layer                              | :111      |
| `$platform-z-index-level-2`   | 200   | —                                       | :112      |
| `$platform-z-index-level-3`   | 300   | spinner overlay (`task-list.scss:173`)  | :113      |
| `$platform-z-index-level-4`   | 400   | —                                       | :114      |
| `$platform-z-index-level-max` | 99999 | full-screen backdrop (`mat-spinner:40`) | :115      |

## Animations & Transitions

Transition tokens: `$transition-fast`=150ms ease, `$transition-base`=200ms ease (`_platform-variables.scss:91-92`). Keyframes (all in `platform-loading-error-indicator.component.scss`): `slideIn` (:356-365, error entry fade+translateY), `skeleton-loading` (:367-374, shimmer), `progress-indeterminate` (:376-389).

## Utility Classes (Global)

Declared in `styles.scss:82-124`: `.text-muted`, `.text-primary`, `.text-success`, `.text-warning`, `.text-error`, `.bg-surface`, `.bg-surface-variant`, `.rounded-md`, `.rounded-lg`, `.shadow-sm`, `.shadow-md`.

## Anti-Patterns

| Anti-pattern                                   | Evidence                                                                                      | Fix                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Raw z-index numbers instead of scale tokens    | `platform-loading-error-indicator.component.scss:52` (`z-index: 1000`), `:220` (`z-index: 1`) | Use `$platform-z-index-level-*`                            |
| Hardcoded hex / px / font-size in components   | (rule — use tokens)                                                                           | Use `$color-*`, `$space-*`, `$font-size-*`                 |
| Raw `@media` queries                           | (rule)                                                                                        | Use `flex-layout-media($type)`                             |
| `@import` for token/mixin loading              | `_functions.scss:1`, `_placeholders.scss:1` (legacy `@import` of empty stubs)                 | Use `@use`/`@forward`                                      |
| Documenting empty stub files as having content | `_platform-functions.scss` & `_platform-placeholders.scss` are **0 bytes**                    | No functions/placeholders defined there — do not reference |
| Bare element with no BEM class                 | (rule)                                                                                        | Every element gets `block__element` / `--modifier`         |

---

**MUST** use BEM on ALL elements (incl. standalone `[class.--modifier]` bindings). **MUST** use `$platform-*`/`$app-*` tokens for ALL values. **MUST** use `@use`/`@forward` not `@import`.
**MUST** use `flex-layout-media()` for responsive. **MUST** use `$platform-z-index-level-*`. **NEVER** hardcode colors, spacing, font sizes, or z-index numbers.
