---
applyTo: "**/*.scss,**/*.css"
---

# SCSS Styling Patterns

> Auto-loads when editing SCSS/CSS files. See `docs/claude/scss-styling-guide.md` for full reference.

## BEM Naming Convention (Modified)

```
Block:    .component-name              (kebab-case, matches selector)
Element:  .component-name__element     (double underscore)
Modifier: .component-name__element.--modifier (SEPARATE class with --)
```

**Key Difference:** Modifiers are SEPARATE classes prefixed with `--`, not chained with `--` to element.

```html
<button class="user-form__btn --primary --large --disabled">Submit</button>
```

```scss
.user-form {
    &__btn {
        @include flex-row(center, center, 0.5rem);
        min-height: 2rem;

        &.--primary { background: var(--primary-cl); color: white; }
        &.--large { min-height: 2.5rem; padding: 0 1.5rem; }
        &.--disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    }
}
```

## Common BEM Names

| Category | Elements |
|----------|----------|
| **Structure** | `__header`, `__body`, `__footer`, `__content`, `__container`, `__wrapper` |
| **Content** | `__title`, `__text`, `__label`, `__description`, `__subtitle` |
| **Interactive** | `__button`, `__btn`, `__icon`, `__link`, `__action`, `__close-btn` |
| **Form** | `__field`, `__input`, `__select`, `__form-row`, `__field-wrapper` |
| **Modifiers** | `--active`, `--disabled`, `--selected`, `--loading`, `--view-mode`, `--edit-mode` |

## Required SCSS Structure

```scss
// WebV2 - Required import
@use 'shared-mixin' as *;

// Host element styling (required for Angular)
:host {
    display: block; // or flex
}

// Component block
.my-component {
    // Structure elements
    &__header { @include flex-row(space-between, center); }
    &__body { @include flex-col($gap: 1rem); }
    &__footer { @include flex-row(flex-end, center, 0.5rem); }

    // Interactive elements with states
    &__item {
        &.--active { background: var(--bg-active-cl); }
        &.--selected { border-color: var(--primary-cl); }
    }
}
```

## Layout Mixins (ALWAYS Use These)

```scss
// Flex mixins - NEVER write manual flexbox
@include flex-row($justify, $align, $gap);    // display:flex; flex-direction:row
@include flex-col($justify, $align, $gap);    // display:flex; flex-direction:column
@include flex-wrap($gap);                      // flex-wrap:wrap with gap
@include flex-center;                          // center both axes
@include flex-1;                               // flex:1 shorthand

// Grid mixins
@include grid-columns($columns, $gap);
@include grid-auto-fit($min-width, $gap);

// Spacing
@include gap($size);
@include padding($vertical, $horizontal);
```

## Design Tokens (CSS Variables)

```scss
// Colors - NEVER hardcode hex values
var(--primary-cl)       // Primary brand color
var(--bg-pri-cl)        // Primary background
var(--bg-sec-cl)        // Secondary background
var(--text-pri-cl)      // Primary text
var(--text-sec-cl)      // Secondary text
var(--bd-pri-cl)        // Primary border
var(--bd-sec-cl)        // Secondary border
var(--bg-active-cl)     // Active/hover background
var(--error-cl)         // Error/danger
var(--success-cl)       // Success
var(--warning-cl)       // Warning

// Units - use rem, never px for spacing
padding: 1rem;          // Not 16px
gap: 0.5rem;            // Not 8px
font-size: 0.875rem;    // Not 14px
border-radius: 0.25rem; // Not 4px
```

## Form Input Identification Pattern

```html
<div class="employee-form">
    <div class="employee-form__field">
        <label class="employee-form__label">First Name</label>
        <input class="employee-form__input --first-name" formControlName="firstName" />
    </div>
    <div class="employee-form__field">
        <label class="employee-form__label">Email</label>
        <input class="employee-form__input --email" formControlName="email" />
    </div>
</div>
```

## Loop Item Pattern

```html
@for (user of vm.users; track user.id) {
    <div class="user-list__item" [class.--active]="user.isActive" [class.--selected]="user.isSelected">
        <span class="user-list__item-name">{{ user.name }}</span>
        <span class="user-list__item-status" [class.--online]="user.isOnline">{{ user.status }}</span>
    </div>
}
```

## Critical Rules

1. **ALL HTML elements MUST have BEM classes** (even without styling)
2. **Never use hardcoded hex colors** - always CSS variables
3. **Use flex mixins** - never manual flexbox properties
4. **Style both `:host` AND main wrapper class**
5. **Use `rem` units** for spacing/sizing, never `px`
6. **Import shared-mixin** in all WebV2 SCSS files
7. **Modifiers are SEPARATE classes** with `--` prefix

## Anti-Patterns

```scss
// WRONG: Hardcoded color
.my-btn { background: #3b82f6; }
// CORRECT:
.my-btn { background: var(--primary-cl); }

// WRONG: Manual flexbox
.my-row { display: flex; flex-direction: row; justify-content: space-between; }
// CORRECT:
.my-row { @include flex-row(space-between); }

// WRONG: px units for spacing
.my-card { padding: 16px; gap: 8px; }
// CORRECT:
.my-card { padding: 1rem; gap: 0.5rem; }

// WRONG: Standard BEM modifier
.my-btn--primary { }
// CORRECT: Separate class modifier
.my-btn { &.--primary { } }
```
