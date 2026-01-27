---
applyTo: "src/Frontend/**/*.scss,src/Frontend/libs/**/*.scss"
description: "EasyPlatform SCSS/BEM styling rules, layout mixins, typography"
---

# SCSS Styling Rules

**Complete guide:** Read [`docs/claude/scss-styling-guide.md`](../../docs/claude/scss-styling-guide.md)

## Critical Rules (MUST follow)

1. **BEM naming:** `.block__element.--modifier1.--modifier2` — ALL HTML elements MUST have BEM classes
2. **OOP Encapsulation:** Classes describe structure like class hierarchy — even elements without special styling need BEM classes
3. **No hardcoded colors:** Always use CSS variables — never hex values like `#fff` or `#333`
4. **Use flex mixins:** `@include flex-row`, `@include flex-col`, `@include flex-center` — never manual `display: flex`
5. **Host styling:** Always style both `:host` and main wrapper class
6. **Import:** Use `@use 'shared-mixin' as *;` (WebV2 apps)
7. **Units:** `rem` for spacing/sizing, CSS variables for colors

## Required SCSS Structure

```scss
@use 'shared-mixin' as *;

:host {
  display: block; // or flex
}

.feature-name {
  // Main wrapper matches component selector
  &__header { @include flex-row; }
  &__title { font-size: 1.5rem; }
  &__content { @include flex-col; gap: 1rem; }
  &__item {
    &.--active { color: var(--color-primary); }
    &.--disabled { opacity: 0.5; }
  }
}
```

## Anti-Patterns

- No hardcoded hex colors — use CSS variables
- No manual `display: flex` — use flex mixins
- No elements without BEM classes in templates
- No styling without `:host` block
- No `px` for spacing — use `rem`
