---
applyTo: '**/*.scss,**/*.css,**/*.sass,**/*.less'
description: 'SCSS styling patterns for EasyPlatform frontend applications'
---

# SCSS Styling Patterns

## Required Reading

**Before implementing SCSS/CSS changes, you MUST read:**

**`docs/claude/scss-styling-guide.md`**

This guide contains comprehensive SCSS patterns, mixins, and best practices.

## Quick Reference

### Import Patterns

```scss
// WebV2 (Angular 19) - Use @use
@use 'shared-mixin' as *;

// Legacy Apps - Use @import
@import '~assets/scss/variables';
```

### BEM Naming Convention

```scss
// Block
.user-card {
    // Element
    &__header {
        display: flex;
    }

    &__title {
        font-size: 1.25rem;
    }

    // Modifier - separate class
    &__btn {
        &.--primary {
            background: var(--bg-pri-cl);
        }
        &.--large {
            padding: 1rem 2rem;
        }
    }
}
```

### CSS Variables (WebV2)

```scss
// Colors
color: var(--text-primary-cl);
background: var(--bg-pri-cl);
border-color: var(--border-cl);

// Spacing uses CSS custom properties
padding: var(--spacing-md);
gap: var(--spacing-sm);
```

### SCSS Variables (Legacy)

```scss
// Colors
color: $color-primary;
background: $color-gray-100;
border-color: $border-color;

// Spacing
padding: $spacing-md;
gap: $spacing-sm;
```

### Flex Mixins

```scss
// Column container
@include flex-column-container();

// Row with gap
@include flex-row-gap(8px);

// Center content
@include flex-center();
```

### Component Host Styling

Always style both the host element and main wrapper:

```scss
// Host element - makes Angular element a proper block
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__content {
        flex: 1;
        overflow-y: auto;
    }
}
```

## Critical Rules

1. **BEM Classes:** Use `block__element` with separate `--modifier` class
2. **No Magic Numbers:** Use variables for colors, spacing, breakpoints
3. **Max Nesting:** 3 levels deep maximum
4. **Component Scope:** Styles scoped to component block class
5. **Host + Wrapper:** Style both Angular host element and main wrapper div

## App-Specific Patterns

### WebV2 Apps (Angular 19)

- Use `@use 'shared-mixin'` for imports
- Use CSS custom properties for theming
- Angular 19 standalone components

### Legacy Apps

- Use `@import '~assets/scss/variables'`
- Use SCSS variables for colors
- Legacy Angular with NgModules

## Anti-Patterns

- **Never** use inline styles
- **Never** use `!important` (except for utility overrides)
- **Never** nest more than 3 levels
- **Never** use tag selectors (use BEM classes)
- **Never** hardcode colors or spacing values
