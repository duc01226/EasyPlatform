<!-- Last scanned: 2026-06-12 -->
<!-- CRITICAL: SCSS variables in platform-core, Material Design 3 theming, BEM class convention on ALL template elements -->

# Design System

**Final Purpose:** Tell AI exactly which SCSS token, base component, and theming convention to reuse — so frontend code uses platform-core tokens + BEM + app base classes, never hardcoded values or platform-core internals.

**Stack:** Angular + Angular Material (MD3) + SCSS variables + BEM classes. No Storybook. No Figma token export.

**MUST** use platform-core SCSS variables for ALL spacing, color, typography, shadow, radius values.
**MUST** apply BEM classes (`block__element--modifier`) to every template element.
**MUST** extend app-level base components, NEVER platform-core abstracts directly.

## Design Token Sources

| Category      | File                                                      | Convention                                                                                  |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Spacing       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$space-{1,2,3,4,5,6,8,10,12}` (non-contiguous, 4px base; `_platform-variables.scss:12-20`) |
| Colors        | `libs/platform-core/src/styles/_platform-variables.scss`  | `$color-{primary\|neutral\|success\|warning\|error}-{shade}`                                |
| Typography    | `libs/platform-core/src/styles/_platform-variables.scss`  | `$font-size-{xs..3xl}`, `$font-weight-{normal..bold}`                                       |
| Shadows       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$shadow-{xs\|sm\|md}`                                                                      |
| Radii         | `libs/platform-core/src/styles/_platform-variables.scss`  | `$radius-{sm\|md\|lg\|full}`                                                                |
| Transitions   | `libs/platform-core/src/styles/_platform-variables.scss`  | `$transition-{fast\|base}`                                                                  |
| Breakpoints   | `libs/platform-core/src/styles/_platform-variables.scss`  | `$platform-media-breakpoint-{xs..gt-xl}`                                                    |
| Z-Index       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$platform-z-index-level-{1..4\|max}`                                                       |
| App overrides | `apps/playground-text-snippet/src/styles/_variables.scss` | `$app-{container-max-width\|sidebar-width\|page-padding}`                                   |

## Color Palette

| Token                | Hex       | Usage                    |
| -------------------- | --------- | ------------------------ |
| `$color-primary-600` | `#2563eb` | Primary actions, links   |
| `$color-primary-700` | `#1d4ed8` | Primary hover            |
| `$color-neutral-50`  | `#f9fafb` | Page background          |
| `$color-neutral-900` | `#111827` | Body text                |
| `$color-success`     | `#22c55e` | Success states           |
| `$color-warning`     | `#f59e0b` | Warning states           |
| `$color-error`       | `#ef4444` | Error states, validation |

## Material Design 3 Theming

Theme defined in `apps/playground-text-snippet/src/styles/themes/default-theme.scss`:

```scss
// default-theme.scss:8-20
html {
    @include mat.theme(
        (
            color: (
                primary: mat.$azure-palette,
                tertiary: mat.$blue-palette,
                theme-type: light
            ),
            typography: Roboto,
            density: 0
        )
    );
}
```

Dark mode via `prefers-color-scheme: dark` media query with same palette, `theme-type: dark`.

A second theme `apps/playground-text-snippet/src/styles/themes/deeppurple-amber-theme.scss` exists alongside `default-theme.scss` (only `default-theme.scss` is wired into the import chain).

## App-to-Documentation Map

| App                       | Design Tokens                                                                                | Theme                                       | Component Library                        |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `playground-text-snippet` | `libs/platform-core/src/styles/_platform-variables.scss` + `apps/.../styles/_variables.scss` | `apps/.../styles/themes/default-theme.scss` | `libs/platform-core/src/lib/components/` |

## Component Library

| Component                                                                     | Path                                                                         | Purpose                                    |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `PlatformLoadingErrorIndicatorComponent` (`platform-loading-error-indicator`) | `libs/platform-core/src/lib/components/platform-loading-error-indicator/`    | feedback — loading spinner + error display |
| `PlatformDirective`                                                           | `libs/platform-core/src/lib/directives/abstracts/platform.directive.ts`      | abstract base directive (reactive state)   |
| `SwipeToScrollDirective` (`[platformSwipeToScroll]`)                          | `libs/platform-core/src/lib/directives/swipe-to-scroll.directive.ts:291`     | interaction — touch/mouse swipe scrolling  |
| `DisabledControlDirective` (`[platformDisabledControl]`)                      | `libs/platform-core/src/lib/directives/disabled-control.directive.ts:210`    | forms — reactive form disable control      |
| `PlatformHighlightSearchTextPipe` (`platformHighlight`)                       | `libs/platform-core/src/lib/pipes/platform-highlight-search-text.pipe.ts:10` | data display — search text highlighting    |
| `LogTimesDisplayPipe` (`logTimesDisplay`)                                     | `libs/platform-core/src/lib/pipes/log-times-display.pipe.ts:10`              | data display — timestamp formatting        |

> platform-core is a **base-class library**, not a styled widget kit: 1 concrete component, 2 directives, 2 pipes + 6 abstract bases (`PlatformComponent`/`VmComponent`/`VmStoreComponent`/`FormComponent`/`Directive`/`Pipe`). No layout/navigation/general data-display widgets. Only `PlatformLoadingErrorIndicatorComponent` exposes configurable `@Input` variants (timing/behavior toggles, `progressBarPositionMode`); no size/color variant inputs anywhere.

## SCSS Import Chain

```
styles.scss → styles/_index.scss
  → _variables.scss (forwards platform-variables + app overrides)
  → _mixins.scss (forwards platform-mixins + app mixins)
  → _material-core.scss (@include mat.core)
  → themes/default-theme.scss
  → components/_index.scss → mat-spinner.scss
```

**MUST** use `@use 'variables' as *` and `@use 'mixins' as *` at top of component SCSS files.
**MUST** use platform-core tokens via SCSS variables, NEVER hardcode hex colors, px spacing, or font sizes.
**MUST** apply BEM classes to ALL template elements -- block name = component name in kebab-case.

> `libs/platform-core/src/styles/_platform-spacing.less` exists but is NOT part of the SCSS `@use` chain (LESS cannot be `@use`d by SCSS) — standalone/legacy, do not author new tokens there.

## Icon & Asset Library

No first-party icon registry. The framework defines NO `MatIconRegistry`/`addSvgIcon` and ships NO bundled SVG icon set (grep = 0 outside `node_modules`).

- Icons in the example app use Material font ligatures: `<mat-icon>name</mat-icon>` (Roboto/Material Icons font via Angular Material).
- `PlatformLoadingErrorIndicatorComponent` renders CSS-styled icon spans (no external icon dependency).
- `font-awesome` is present in `package.json` but has no source usage — treat as unused/optional.

**Convention for new icons:** prefer Material font `<mat-icon>` ligatures; register custom SVGs per-app via `MatIconRegistry` (none exist yet).

## Storybook

Absent. No `.storybook/` config, no authored `*.stories.*` in source (only match: Nx generator template under `node_modules`). Component contracts documented via JSDoc on component/directive classes. No Storybook adoption path configured — add one only if a future need arises.

## Usage Guidelines

- **Tokens:** consume via SCSS variables — `@use 'variables' as *;` then `padding: $space-4;`, `color: $color-primary-600;`. NEVER hardcode hex/px/font-size literals.
- **Breakpoints:** use `$platform-media-breakpoint-*` vars inside `@media` (values are `calculateRem()`-wrapped).
- **Components:** extend app-level base components (`AppBaseComponent`/`AppBaseVmStoreComponent`/`AppBaseFormComponent`), NEVER platform-core abstracts directly.
- **Theme:** Material color/typography/density come from `mat.theme(...)` in `default-theme.scss`; override palettes there, not in component styles.

## Gap Analysis

| Gap                                       | Evidence                                                                                                              | Impact                                                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Component library is minimal              | 1 concrete component only (`components/index.ts`)                                                                     | No shared layout/nav/data-display widgets — each app builds its own with Angular Material                |
| Pipes lack JSDoc                          | `log-times-display.pipe.ts`, `platform-highlight-search-text.pipe.ts` (no doc comments)                               | Lower discoverability vs. the documented component/directives                                            |
| No keyboard a11y on interaction directive | `SwipeToScrollDirective` is mouse/touch only (no `keydown`/`tabindex`; grep = 0)                                      | Swipe scroll not keyboard-accessible — WCAG concern if used for primary nav                              |
| `transition` tokens narrow (2)            | `$transition-fast`, `$transition-base` only (`_platform-variables.scss:91-92`)                                        | Limited motion scale; manual refinement if richer motion needed                                          |
| No CSS custom properties in source        | All tokens are SCSS vars; `--mat-*`/`--mdc-*` emitted only by `mat.theme` at build                                    | Runtime theming (JS-driven token swaps) not available without adding `:root` custom props                |
| `calculaterem(...)` casing mismatch       | App `_variables.scss:14-16` calls lowercase vs declared `calculateRem` (`_platform-variables.scss:5`)                 | SCSS is case-insensitive for function names so it compiles, but inconsistent with declaration — cosmetic |
| Duplicate doc stub artifact               | `docs/project-reference/design-system/docs/project-reference/design-system/README.md` (empty template, path-doubling) | Stray file; recommend manual cleanup (not a source change)                                               |
| `font-awesome` installed, unused          | `package.json` dependency, 0 source references                                                                        | Dead dependency — candidate for removal                                                                  |

---

## Closing Reminders

**IMPORTANT MUST ATTENTION Final Purpose:** frontend code uses platform-core SCSS tokens + BEM + app base classes — never hardcoded hex/px/font-size or platform-core abstracts directly.
**IMPORTANT MUST ATTENTION** all design tokens are SCSS variables in `_platform-variables.scss` — NO CSS custom properties in source; `--mat-*`/`--mdc-*` come only from `mat.theme(...)` at build.
**IMPORTANT MUST ATTENTION** apply BEM (`block__element--modifier`) to every template element — block = component name kebab-case.
**IMPORTANT MUST ATTENTION** extend `AppBaseComponent`/`AppBaseVmStoreComponent`/`AppBaseFormComponent`, NEVER platform-core abstracts directly.
**IMPORTANT MUST ATTENTION** icons via Material font `<mat-icon>` ligatures — no first-party icon registry exists; register custom SVGs per-app via `MatIconRegistry`.
