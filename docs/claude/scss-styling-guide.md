# SCSS Styling Guide - EasyPlatform Frontend

> Comprehensive SCSS/CSS styling rules, BEM methodology, and best practices for Angular TypeScript components.
> **Target:** All frontend applications in `src/Frontend/`

## Executive Summary

| Aspect          | Standard                                                            |
| --------------- | ------------------------------------------------------------------- |
| **Methodology** | Modified BEM: `.block__element.--modifier1.--modifier2`             |
| **Units**       | `rem` for spacing/sizing, CSS variables for colors                  |
| **Import**      | `@use 'shared-mixin' as *;` (WebV2)                                 |
| **Philosophy**  | OOP Encapsulation - classes describe structure like class hierarchy |

**Critical Rules:**

1. ALL HTML elements MUST have BEM classes (even without styling)
2. Never use hardcoded hex colors - always CSS variables
3. Use flex mixins, never manual flexbox
4. Style both host element AND main wrapper class

---

## Table of Contents

1. [BEM Naming Convention](#1-bem-naming-convention)
2. [OOP Encapsulation Principle](#2-oop-encapsulation-principle)
3. [Required SCSS Structure](#3-required-scss-structure)
4. [Layout Mixins](#4-layout-mixins)
5. [Typography System](#5-typography-system)
6. [Design Tokens](#6-design-tokens)
7. [Component SCSS Patterns](#7-component-scss-patterns)
8. [Common UI Pattern Styles](#8-common-ui-pattern-styles)
9. [Material Component Overrides](#9-material-component-overrides)
10. [Anti-Patterns](#10-anti-patterns)
11. [Checklist](#11-checklist)

---

## 1. BEM Naming Convention

### 1.1 Modified BEM Formula

```
Block:    .component-name              (kebab-case, matches selector)
Element:  .component-name__element     (double underscore)
Modifier: .component-name__element.--modifier (SEPARATE class with --)
```

**Key Difference from Standard BEM:** Modifiers are separate classes prefixed with `--`, not chained with `--` to the element class.

### 1.2 Naming Examples

| Angular Selector    | Block Name         | Element                    | Modifier                              |
| ------------------- | ------------------ | -------------------------- | ------------------------------------- |
| `app-user-form`     | `.user-form`       | `.user-form__input`        | `.user-form__input.--name`            |
| `orient-kudos-list` | `.kudos-list`      | `.kudos-list__item`        | `.kudos-list__item.--active`          |
| `platform-select`   | `.platform-select` | `.platform-select__option` | `.platform-select__option.--selected` |

### 1.3 Common Element Names

| Category        | Elements                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Structure**   | `__header`, `__body`, `__footer`, `__content`, `__container`, `__wrapper`, `__main-container` |
| **Content**     | `__title`, `__text`, `__label`, `__description`, `__subtitle`, `__paragraph`                  |
| **Interactive** | `__button`, `__btn`, `__icon`, `__link`, `__action`, `__close-btn`                            |
| **Form**        | `__field`, `__input`, `__select`, `__form-row`, `__field-wrapper`, `__label`                  |
| **Table**       | `__table`, `__row`, `__cell`, `__pagination`, `__table-section`                               |
| **Card**        | `__card`, `__card-header`, `__card-body`, `__card-footer`                                     |

### 1.4 Common Modifier Names

| Category   | Modifiers                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| **State**  | `--active`, `--disabled`, `--selected`, `--loading`, `--open`, `--collapsed` |
| **Status** | `--valid`, `--invalid`, `--flagged`, `--warning`, `--error`, `--success`     |
| **Mode**   | `--view-mode`, `--edit-mode`, `--create-mode`                                |
| **Size**   | `--small`, `--large`, `--compact`                                            |
| **Type**   | `--primary`, `--secondary`, `--cancel`, `--submit`                           |

### 1.5 Multiple Modifiers

When an element has multiple modifiers, each is a separate class:

```html
<!-- Multiple modifiers as separate classes -->
<button class="user-form__btn --primary --large --disabled">Submit</button>
```

```scss
.user-form {
    &__btn {
        // Base button styles
        @include flex-row(center, center, 0.5rem);
        min-height: 2rem;
        padding: 0 1rem;
        border-radius: 0.25rem;
        cursor: pointer;

        &.--primary {
            background: var(--primary-cl);
            color: white;
        }

        &.--secondary {
            background: transparent;
            border: 1px solid var(--bd-pri-cl);
        }

        &.--large {
            min-height: 2.5rem;
            padding: 0 1.5rem;
            font-size: 1rem;
        }

        &.--disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
        }
    }
}
```

---

## 2. OOP Encapsulation Principle

### 2.1 Philosophy

**Every HTML element should have a BEM class, even if no styling is needed.** This makes HTML self-documenting, similar to how OOP classes describe object structure.

Classes serve as:

- **Documentation**: Describes what the element IS (semantic role)
- **Structure**: Shows parent-child relationships via BEM naming
- **Maintainability**: Easy to add styles later without touching HTML
- **Debugging**: Clearer DOM inspection in DevTools

### 2.2 Correct vs Incorrect

```html
<!-- WRONG: Elements without classes - structure unclear -->
<div class="user-form">
    <div>
        <h2>User Details</h2>
    </div>
    <div>
        <label>Name</label>
        <input formControlName="name" />
    </div>
    <div>
        <button>Cancel</button>
        <button>Save</button>
    </div>
</div>

<!-- CORRECT: All elements have BEM classes - OOP-like structure clarity -->
<div class="user-form">
    <div class="user-form__header">
        <h2 class="user-form__title">User Details</h2>
    </div>
    <div class="user-form__body">
        <div class="user-form__field">
            <label class="user-form__label">Name</label>
            <input class="user-form__input --name" formControlName="name" />
        </div>
    </div>
    <div class="user-form__footer">
        <button class="user-form__btn --cancel">Cancel</button>
        <button class="user-form__btn --submit">Save</button>
    </div>
</div>
```

### 2.3 Form Input Identification Pattern

For forms with multiple inputs of the same type, use modifiers to identify each:

```html
<div class="employee-form">
    <div class="employee-form__field">
        <label class="employee-form__label">First Name</label>
        <input class="employee-form__input --first-name" formControlName="firstName" />
    </div>
    <div class="employee-form__field">
        <label class="employee-form__label">Last Name</label>
        <input class="employee-form__input --last-name" formControlName="lastName" />
    </div>
    <div class="employee-form__field">
        <label class="employee-form__label">Email</label>
        <input class="employee-form__input --email" formControlName="email" />
    </div>
    <div class="employee-form__field">
        <label class="employee-form__label">Age</label>
        <input class="employee-form__input --age" formControlName="age" type="number" />
    </div>
</div>
```

### 2.4 Loop Item Pattern

For items in loops, use generic element names with modifiers for states:

```html
@for (user of vm.users; track user.id) {
<div class="user-list__item" [class.--active]="user.isActive" [class.--selected]="user.isSelected">
    <span class="user-list__item-name">{{ user.name }}</span>
    <span class="user-list__item-email">{{ user.email }}</span>
    <span class="user-list__item-status" [class.--online]="user.isOnline"> {{ user.status }} </span>
</div>
}
```

---

## 3. Required SCSS Structure

### 3.1 Shared Mixin Import (Required)

Every component SCSS file MUST start with:

```scss
@use 'shared-mixin' as *;
```

### 3.2 Host Element + Main Wrapper Pattern

Always style BOTH the Angular host element AND the main wrapper class:

```scss
@use 'shared-mixin' as *;

// 1. Host element styling - makes Angular element a proper layout container
app-employee-list {
    @include flex-layout;
    align-self: stretch;
}

// 2. Main wrapper class - contains full component styling
.employee-list {
    @include flex-layout;
    background-color: var(--color-neutral-bg-bg3);

    &__main-container {
        @include flex-col();
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 1.5rem;
        gap: 1.5rem;
    }

    &__header {
        @include flex-row(space-between, center);
        padding: 1rem;
    }

    // ... more elements
}
```

**Why both?**

- **Host element**: Angular's `<app-component>` is an unknown HTML element without default display. Setting `display: flex` makes it participate in layout.
- **Main class**: Contains the full styling and matches the wrapper div in HTML.

### 3.3 Nesting Depth

Keep nesting to **3 levels maximum** for readability:

```scss
// CORRECT: Flat structure with clear element names
.component {
    &__header {
    }
    &__header-title {
    }
    &__header-actions {
    }
    &__body {
    }
    &__footer {
    }
}

// AVOID: Deep nesting
.component {
    &__header {
        &__title {
            &__icon {
            } // Too deep - refactor to &__header-title-icon
        }
    }
}
```

---

## 4. Layout Mixins

### 4.1 Core Flex Mixins

```scss
// Full control flex - use for custom layouts
@mixin flex($direction: row, $justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    display: flex;
    flex-direction: $direction;
    justify-content: $justify;
    align-items: $align;
    gap: $gap;
    flex-wrap: $wrap;
}

// Column layout with overflow: auto
@mixin flex-col($justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    overflow: auto;
    @include flex(column, $justify, $align, $gap, $wrap);
}

// Column layout full size (100% width and height)
@mixin flex-col-full($justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    overflow: auto;
    height: 100%;
    width: 100%;
    @include flex(column, $justify, $align, $gap, $wrap);
}

// Row layout
@mixin flex-row($justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    @include flex(row, $justify, $align, $gap, $wrap);
}

// Full-height flex container (for page-level components)
@mixin flex-layout() {
    display: flex;
    flex-shrink: 1;
    flex-grow: 1;
    flex-direction: column;
    overflow: auto;
}
```

### 4.2 Usage Examples

```scss
// Page container - fills available space
&__container {
    @include flex-col(flex-start, stretch, 1rem);
}

// Header with items at ends
&__header {
    @include flex-row(space-between, center, 0.5rem);
}

// Centered content
&__empty-state {
    @include flex-col(center, center, 1rem);
}

// Wrapped grid layout
&__grid {
    @include flex(row, flex-start, stretch, 1.5rem, wrap);
}

// Actions aligned to end
&__footer {
    @include flex-row(flex-end, center, 0.75rem);
}
```

### 4.3 When to Use Which Mixin

| Use Case                    | Mixin                           |
| --------------------------- | ------------------------------- |
| Page-level component        | `@include flex-layout;` on host |
| Scrollable column container | `@include flex-col();`          |
| Full-size scrollable area   | `@include flex-col-full();`     |
| Horizontal row of items     | `@include flex-row();`          |
| Custom direction/wrap       | `@include flex();`              |

---

## 5. Typography System

### 5.1 Typography Mixin

```scss
@mixin text-base($size: 0.875rem, $weight: 400, $line-height: initial, $color: var(--text-pri-cl)) {
    color: $color;
    font-family: var(--font-base);
    font-size: $size;
    font-style: normal;
    font-weight: $weight;
    line-height: $line-height;
}

@mixin text-ellipsis() {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: -webkit-fill-available;
}

// Preset: Section title (20px semi-bold)
@mixin text-title() {
    @include text-base(1.25rem, 600, 1.875rem);
}

// Preset: Sub-section title (16px semi-bold)
@mixin text-sub-title() {
    @include text-base(1rem, 600, 1.5rem);
}
```

### 5.2 Typography Scale

| Name      | rem      | px   | Weight  | Usage                         |
| --------- | -------- | ---- | ------- | ----------------------------- |
| Caption   | 0.75rem  | 12px | 400     | Labels, hints, secondary info |
| Body      | 0.875rem | 14px | 400     | Default text, paragraphs      |
| Body Bold | 0.875rem | 14px | 500-600 | Emphasis, names               |
| Large     | 1rem     | 16px | 400-600 | Sub-titles, larger body       |
| Heading   | 1.25rem  | 20px | 600     | Section titles                |
| Title     | 1.5rem   | 24px | 600     | Page titles                   |

### 5.3 Typography Examples

```scss
&__title {
    @include text-title(); // 20px, semi-bold
    margin: 0;
}

&__subtitle {
    @include text-sub-title(); // 16px, semi-bold
}

&__label {
    @include text-base(0.875rem, 400, 1.5rem, var(--text-pri-cl));
}

&__hint {
    @include text-base(0.75rem, 400, 1rem, var(--text-sec-cl));
}

&__name {
    @include text-base(0.875rem, 500);
    @include text-ellipsis(); // Truncate with ellipsis
}
```

---

## 6. Design Tokens

### 6.1 Color Variables

**Background Colors:**

| Variable                 | Hex       | Usage                          |
| ------------------------ | --------- | ------------------------------ |
| `--bg-pri-cl`            | `#ffffff` | Cards, panels, dialogs         |
| `--bg-sec-cl`            | `#fcfcfc` | Secondary backgrounds, inputs  |
| `--color-neutral-bg-bg2` | `#f6f8fb` | Page background, table headers |
| `--color-neutral-bg-bg3` | `#edf2f7` | Section background             |
| `--bg-hover-cl`          | `#edf2f7` | Hover states                   |

**Text Colors:**

| Variable        | Hex       | Usage                |
| --------------- | --------- | -------------------- |
| `--text-pri-cl` | `#354047` | Primary text         |
| `--text-sec-cl` | `#8b8e93` | Secondary/muted text |
| `--primary-cl`  | `#43b9de` | Links, brand accent  |

**Border Colors:**

| Variable      | Hex       | Usage             |
| ------------- | --------- | ----------------- |
| `--bd-pri-cl` | `#ececec` | Primary borders   |
| `--bd-sec-cl` | `#c7d5e0` | Secondary borders |

**Status Colors:**

| Status  | Background           | Text                   |
| ------- | -------------------- | ---------------------- |
| Success | `--color-success-bg` | `--color-success-text` |
| Warning | `--color-warning-bg` | `--color-warning-text` |
| Error   | `--color-error-bg`   | `--color-error-text`   |
| Info    | `--color-info-bg`    | `--primary-cl`         |

### 6.2 Spacing Scale

Always use `rem` values:

| Size | rem     | px   | Usage                          |
| ---- | ------- | ---- | ------------------------------ |
| XS   | 0.25rem | 4px  | Tight spacing, icon gaps       |
| SM   | 0.5rem  | 8px  | Small gaps, padding            |
| MD   | 0.75rem | 12px | Medium gaps, field spacing     |
| LG   | 1rem    | 16px | Standard gaps, section padding |
| XL   | 1.5rem  | 24px | Section gaps, page padding     |
| XXL  | 2rem    | 32px | Large section spacing          |

### 6.3 Border Radius Scale

| Component              | Radius  |
| ---------------------- | ------- |
| Inputs, small elements | 0.25rem |
| Cards, sections        | 0.5rem  |
| Large panels           | 0.75rem |
| Pills, badges          | 1rem+   |

### 6.4 Shadows

```scss
// Light shadow - cards, subtle elevation
box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.08);

// Medium shadow - dropdowns, popovers
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

// Heavy shadow - modals, dialogs
box-shadow:
    0 32px 64px 0 rgba(0, 0, 0, 0.19),
    0 2px 21px 0 rgba(0, 0, 0, 0.15);
```

---

## 7. Component SCSS Patterns

### 7.1 Page Component

```scss
@use 'shared-mixin' as *;

// Host element
app-employee-list {
    @include flex-layout;
    align-self: stretch;
}

.employee-list {
    @include flex-layout;
    background-color: var(--color-neutral-bg-bg3);

    &__main-container {
        @include flex-col();
        width: 100%;
        max-width: 1400px;
        margin: 0 auto;
        padding: 1.5rem;
        gap: 1.5rem;
    }

    &__toolbar {
        background: var(--bg-pri-cl);
        border-radius: 0.5rem;
        border: 1px solid var(--bd-pri-cl);
        padding: 0.75rem 1rem;
    }

    &__content-section {
        background: var(--bg-pri-cl);
        border-radius: 0.5rem;
        border: 1px solid var(--bd-pri-cl);
        overflow: hidden;
    }
}
```

### 7.2 Section/Card

```scss
&__section {
    background: var(--bg-pri-cl);
    border-radius: 0.5rem;
    border: 1px solid var(--bd-pri-cl);
    overflow: hidden;
}

&__section-header {
    @include flex-row(space-between, center);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--bd-pri-cl);
    background: var(--color-neutral-bg-bg2);
}

&__section-body {
    @include flex-col(flex-start, stretch, 1rem);
    padding: 1.5rem;
}

&__section-footer {
    @include flex-row(flex-end, center, 0.5rem);
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--bd-pri-cl);
}
```

### 7.3 Table

```scss
&__table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
        padding: 0.75rem 1rem;
        text-align: left;
        border-bottom: 1px solid var(--bd-pri-cl);
    }

    th {
        @include text-base(0.75rem, 600, 1rem, var(--text-sec-cl));
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: var(--color-neutral-bg-bg2);
    }

    td {
        @include text-base(0.875rem, 400, 1.25rem, var(--text-pri-cl));
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover {
        background: var(--bg-hover-cl);
    }
}

&__row.--flagged {
    background-color: var(--color-warning-bg);

    &:hover {
        background-color: var(--color-warning-bg-hover, #fff0d0);
    }
}

&__pagination {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--bd-pri-cl);
    background: var(--color-neutral-bg-bg2);
}
```

### 7.4 Form Fields

```scss
&__form-section {
    @include flex-col(flex-start, stretch, 1rem);
    padding: 1.5rem;
}

&__form-row {
    @include flex-row(flex-start, center, 0.75rem);
    width: 100%;
}

&__label {
    @include text-base(0.875rem, 400, 1.5rem, var(--text-pri-cl));
    width: 10rem;
    flex-shrink: 0;
}

&__field-wrapper {
    flex: 1;
}

&__input {
    width: 100%;
    min-height: 2rem;
    padding: 0 0.75rem;
    border: 1px solid var(--bd-pri-cl);
    border-radius: 0.25rem;
    background-color: var(--bg-sec-cl);
    @include text-base(0.875rem, 400, 2rem, var(--text-pri-cl));

    &:focus {
        border-color: var(--primary-cl);
        outline: none;
    }

    &:disabled {
        background-color: var(--background-disabled-color);
        cursor: not-allowed;
    }

    &.--invalid {
        border-color: var(--color-error-text);
    }
}
```

### 7.5 Buttons

```scss
&__btn {
    @include flex-row(center, center, 0.5rem);
    min-height: 2rem;
    padding: 0 1rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background-color 0.2s ease;

    &.--primary {
        background: var(--primary-cl);
        color: white;

        &:hover {
            background: var(--btn-hover-color, #31b0d9);
        }
    }

    &.--secondary {
        background: transparent;
        color: var(--text-pri-cl);
        border: 1px solid var(--bd-pri-cl);

        &:hover {
            background: var(--bg-hover-cl);
        }
    }

    &.--danger {
        background: var(--color-error-bg);
        color: var(--color-error-text);

        &:hover {
            background: var(--color-error-bg-hover);
        }
    }

    &:disabled,
    &.--disabled {
        background: var(--btn-disabled-color, #cfdbe5);
        cursor: not-allowed;
        pointer-events: none;
    }
}
```

### 7.6 Dialog/Modal

```scss
.dialog-name {
    @include flex-col();
    width: 600px;
    max-height: 80vh;
    background: var(--bg-pri-cl);
    border-radius: 0.5rem;
    overflow: hidden;

    &__header {
        @include flex-row(space-between, center);
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--bd-pri-cl);
    }

    &__title {
        @include text-base(1.25rem, 600, 1.5rem, var(--text-pri-cl));
        margin: 0;
    }

    &__close-btn {
        @include flex-row(center, center);
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.25rem;

        &:hover {
            background: var(--bg-hover-cl);
            border-radius: 0.25rem;
        }
    }

    &__body {
        @include flex-col();
        padding: 1.5rem;
        overflow-y: auto;
    }

    &__footer {
        @include flex-row(flex-end, center, 0.5rem);
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--bd-pri-cl);
    }
}
```

---

## 8. Common UI Pattern Styles

### 8.1 Status Badge

```scss
&__status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;

    &.--active,
    &.--valid,
    &.--success {
        background-color: var(--color-success-bg);
        color: var(--color-success-text);
    }

    &.--pending,
    &.--warning,
    &.--flagged {
        background-color: var(--color-warning-bg);
        color: var(--color-warning-text);
    }

    &.--inactive,
    &.--error,
    &.--deleted {
        background-color: var(--color-error-bg);
        color: var(--color-error-text);
    }

    &.--info {
        background-color: var(--color-info-bg);
        color: var(--primary-cl);
    }
}
```

### 8.2 Empty State

```scss
&__empty-state {
    @include flex-col(center, center, 1rem);
    text-align: center;
    color: var(--text-sec-cl);
    padding: 3rem;
    font-size: 0.875rem;
}

&__empty-icon {
    font-size: 3rem;
    color: var(--text-sec-cl);
    opacity: 0.5;
}

&__empty-text {
    @include text-base(0.875rem, 400, 1.5rem, var(--text-sec-cl));
}
```

### 8.3 Back Link

```scss
&__back-link {
    @include flex-row(flex-start, center);
    gap: 0.25rem;
    color: var(--primary-cl);
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;

    &:hover {
        text-decoration: underline;
    }

    mat-icon {
        font-size: 1rem;
        width: 1rem;
        height: 1rem;
    }
}
```

### 8.4 Employee/User Cell

```scss
&__employee-cell {
    @include flex-col();
    gap: 0.125rem;
}

&__employee-name {
    @include text-base(0.875rem, 500, 1.25rem, var(--text-pri-cl));
    @include text-ellipsis();
}

&__employee-position {
    @include text-base(0.75rem, 400, 1rem, var(--text-sec-cl));
}
```

### 8.5 Avatar

```scss
&__avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;

    &.--small {
        width: 1.5rem;
        height: 1.5rem;
    }

    &.--large {
        width: 3rem;
        height: 3rem;
    }

    &.--xl {
        width: 4rem;
        height: 4rem;
    }
}
```

### 8.6 Collapsible Section

```scss
&__section {
    border: 1px solid var(--bd-pri-cl);
    border-radius: 0.5rem;
    overflow: hidden;

    &.--collapsed {
        .component__section-body {
            display: none;
        }

        .component__collapse-icon {
            transform: rotate(-90deg);
        }
    }
}

&__section-header {
    @include flex-row(space-between, center);
    padding: 1rem;
    cursor: pointer;
    background: var(--color-neutral-bg-bg2);

    &:hover {
        background: var(--bg-hover-cl);
    }
}

&__collapse-icon {
    transition: transform 0.2s ease;
}
```

---

## 9. Material Component Overrides

### 9.1 Mat-Tab-Group

```scss
&__mat-tab-group {
    --mat-tab-header-active-ripple-color: none;
    --mat-tab-header-inactive-ripple-color: none;

    @include flex-col-full(flex-start, flex-start);
    width: 100%;
    height: 100%;
    border: 1px solid var(--bd-sec-cl);
    border-radius: 0.75rem;
    background: var(--bg-pri-cl);
    overflow: hidden;

    .mat-mdc-tab-body-wrapper {
        height: 100%;
        @include flex-col(flex-start, flex-start);
        flex: 1;
    }

    .mat-mdc-tab-body-content {
        height: 100%;
        @include flex-col(flex-start, flex-start);
        flex: 1;
    }
}

&__mat-tab-body {
    @include flex-col(flex-start, flex-start);
    display: flex !important;
    flex: 1;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
}
```

### 9.2 Mat-Tree

```scss
.mat-tree {
    padding: 0 0.5rem;
}

.mat-tree-node {
    cursor: pointer;
    min-height: 2rem;
    padding: 0.375rem 0.5rem;
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--bd-pri-cl);

    &.--active {
        font-weight: 600;
    }

    &:hover {
        border-radius: var(--border-radius);
        background-color: var(--bg-hover-cl);
    }

    &:first-of-type {
        border-top: none;
    }
}

// Remove ripple from icon button
.mat-mdc-icon-button {
    --mat-mdc-button-persistent-ripple-color: none;
    --mat-mdc-button-ripple-color: none;
}
```

### 9.3 Mat-Progress-Bar

```scss
&__progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0.25rem;
}
```

---

## 10. Anti-Patterns

### 10.1 HTML Anti-Patterns

```html
<!-- WRONG: No classes on elements -->
<div class="user-list">
    <div>
        <span>Name</span>
        <span>Email</span>
    </div>
</div>

<!-- WRONG: Inline styles -->
<div class="user-list__item" style="background: red;">
    <!-- WRONG: ID selectors for styling -->
    <div id="main-content">
        <!-- CORRECT -->
        <div class="user-list">
            <div class="user-list__item">
                <span class="user-list__item-name">Name</span>
                <span class="user-list__item-email">Email</span>
            </div>
        </div>
    </div>
</div>
```

### 10.2 SCSS Anti-Patterns

```scss
// WRONG: Hardcoded colors
color: #354047;
background: white;
border: 1px solid #ececec;

// CORRECT: CSS variables
color: var(--text-pri-cl);
background: var(--bg-pri-cl);
border: 1px solid var(--bd-pri-cl);

// WRONG: Manual flexbox
display: flex;
flex-direction: column;
justify-content: center;
align-items: center;

// CORRECT: Use mixins
@include flex-col(center, center);

// WRONG: Pixel units for spacing
padding: 16px;
margin: 24px;
gap: 8px;

// CORRECT: Use rem
padding: 1rem;
margin: 1.5rem;
gap: 0.5rem;

// WRONG: Missing SCSS import
.component {
}

// CORRECT: Always include import
@use 'shared-mixin' as *;
.component {
}

// WRONG: Only styling host element
app-my-component {
    display: flex;
    // ... all styles here
}

// CORRECT: Style both host AND wrapper class
app-my-component {
    @include flex-layout;
}
.my-component {
    // Full styling here
}

// WRONG: Tag selectors
div {
}
span {
}
button {
}

// CORRECT: BEM class selectors
&__container {
}
&__text {
}
&__btn {
}

// WRONG: Deep nesting
.component {
    &__header {
        &__title {
            &__icon {
                &.--active {
                } // 5 levels deep!
            }
        }
    }
}

// CORRECT: Flat structure
.component {
    &__header {
    }
    &__header-title {
    }
    &__header-title-icon {
    }
    &__header-title-icon.--active {
    }
}
```

---

## 11. Checklist

### HTML Checklist

- [ ] ALL elements have BEM classes (even without styling needs)
- [ ] Block name matches component selector (kebab-case, without `app-`/`orient-` prefix)
- [ ] Elements use `__` double underscore separator
- [ ] Modifiers use `--` as SEPARATE class (not chained to element)
- [ ] Form inputs have identifying modifiers (`--name`, `--email`, `--age`)
- [ ] Loop items use generic element names with state modifiers
- [ ] Loading indicator present for async data: `<app-loading-and-error-indicator>`
- [ ] Empty state handled when no data
- [ ] `track` expression used in `@for` loops

### SCSS Checklist

- [ ] File starts with `@use 'shared-mixin' as *;`
- [ ] Host element has `@include flex-layout;` if page-level
- [ ] Main wrapper class contains full styling
- [ ] Layout uses flex mixins (`flex-col`, `flex-row`, `flex-layout`)
- [ ] Typography uses `text-base()` mixin
- [ ] All colors use CSS variables (`var(--*)`)
- [ ] All spacing uses rem values (0.25, 0.5, 0.75, 1, 1.5, 2rem)
- [ ] Borders use `var(--bd-pri-cl)` or `var(--bd-sec-cl)`
- [ ] Cards/sections have `border-radius: 0.5rem`
- [ ] Hover states use `var(--bg-hover-cl)`
- [ ] No hardcoded hex colors
- [ ] No inline styles in HTML
- [ ] No tag selectors (div, span, button)
- [ ] Nesting depth max 3 levels

### Structure Checklist

- [ ] Main container with `max-width` and `margin: 0 auto`
- [ ] Sections have `background`, `border`, `border-radius`
- [ ] Headers/footers use different background (`--color-neutral-bg-bg2`)
- [ ] Consistent padding scale (0.75rem, 1rem, 1.5rem)
- [ ] Consistent gap scale (0.5rem, 0.75rem, 1rem, 1.5rem)

---

## Source File Locations

```
SCSS Variables & Mixins:
├── src/Frontend/libs/share-styles/shared-mixin.scss    # Import this
├── src/Frontend/libs/share-styles/mixin/layout.scss    # flex, flex-col, flex-row
├── src/Frontend/libs/share-styles/mixin/text.scss      # text-base, text-ellipsis
├── src/Frontend/libs/share-styles/shared-variables.scss # CSS custom properties
└── src/Frontend/libs/platform-core/src/styles/mixins.scss # flex-layout, utilities
```
