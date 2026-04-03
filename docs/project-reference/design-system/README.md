<!-- Last scanned: 2026-04-03 -->
<!-- CRITICAL: SCSS variables in platform-core, Material Design 3 theming, BEM class convention on ALL template elements -->

# Design System

**Stack:** Angular + Angular Material (MD3) + SCSS variables + BEM classes. No Storybook. No Figma token export.

**MUST** use platform-core SCSS variables for ALL spacing, color, typography, shadow, and radius values.
**MUST** apply BEM classes (`block__element--modifier`) to every template element.
**MUST** extend app-level base components, NEVER platform-core directly.

## Design Token Sources

| Category      | File                                                      | Convention                                                   |
| ------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Spacing       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$space-{1..12}` (4px increments)                            |
| Colors        | `libs/platform-core/src/styles/_platform-variables.scss`  | `$color-{primary\|neutral\|success\|warning\|error}-{shade}` |
| Typography    | `libs/platform-core/src/styles/_platform-variables.scss`  | `$font-size-{xs..3xl}`, `$font-weight-{normal..bold}`        |
| Shadows       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$shadow-{xs\|sm\|md}`                                       |
| Radii         | `libs/platform-core/src/styles/_platform-variables.scss`  | `$radius-{sm\|md\|lg\|full}`                                 |
| Transitions   | `libs/platform-core/src/styles/_platform-variables.scss`  | `$transition-{fast\|base}`                                   |
| Breakpoints   | `libs/platform-core/src/styles/_platform-variables.scss`  | `$platform-media-breakpoint-{xs..gt-xl}`                     |
| Z-Index       | `libs/platform-core/src/styles/_platform-variables.scss`  | `$platform-z-index-level-{1..4\|max}`                        |
| App overrides | `apps/playground-text-snippet/src/styles/_variables.scss` | `$app-{container-max-width\|sidebar-width\|page-padding}`    |

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

## App-to-Documentation Map

| App                       | Design Tokens                                                                                | Theme                                       | Component Library                        |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `playground-text-snippet` | `libs/platform-core/src/styles/_platform-variables.scss` + `apps/.../styles/_variables.scss` | `apps/.../styles/themes/default-theme.scss` | `libs/platform-core/src/lib/components/` |

## Component Library

| Component                                | Path                                                                      | Purpose                            |
| ---------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------- |
| `PlatformLoadingErrorIndicatorComponent` | `libs/platform-core/src/lib/components/platform-loading-error-indicator/` | Loading spinner + error display    |
| `PlatformDirective`                      | `libs/platform-core/src/lib/directives/abstracts/platform.directive.ts`   | Base directive with reactive state |
| `PlatformSwipeToScrollDirective`         | `libs/platform-core/src/lib/directives/swipe-to-scroll.directive.ts`      | Touch swipe scrolling              |
| `PlatformDisabledControlDirective`       | `libs/platform-core/src/lib/directives/disabled-control.directive.ts`     | Reactive form disable control      |
| `PlatformHighlightSearchTextPipe`        | `libs/platform-core/src/lib/pipes/platform-highlight-search-text.pipe.ts` | Search text highlighting           |
| `LogTimesDisplayPipe`                    | `libs/platform-core/src/lib/pipes/log-times-display.pipe.ts`              | Timestamp formatting               |

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
