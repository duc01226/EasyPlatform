# EasyPlatform Design System - AI Reference Guide

> Single-file reference for AI agents generating HTML/SCSS components in EasyPlatform frontend apps.
> **Purpose:** Provide design context for consistent, production-ready component generation.

## Summary

| Aspect            | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| **Target Apps**   | `src/Frontend/apps/*`, `src/Frontend/libs/*`                           |
| **Framework**     | Angular 19, Standalone Components                                      |
| **SCSS Import**   | `@use 'shared-mixin' as *;`                                            |
| **BEM Pattern**   | `.block__element.--modifier` (modifier as separate class)              |
| **CSS Variables** | `--bg-pri-cl`, `--text-pri-cl`, `--bd-pri-cl`, `--primary-cl`          |
| **Key Mixins**    | `flex()`, `flex-col()`, `flex-row()`, `text-base()`, `text-ellipsis()` |

**Quick Rules:**

- ALL HTML elements MUST have BEM classes
- Use CSS variables for colors, never hardcoded hex
- Use rem units for spacing (0.5, 0.75, 1, 1.5rem scale)
- Use flex mixins, not manual flexbox

---

## Table of Contents

1. [Quick Reference Card](#1-quick-reference-card) - Essential mixins, variables, BEM formula
2. [SCSS Foundation](#2-scss-foundation) - Layout/typography mixins, required imports
3. [Design Tokens](#3-design-tokens) - CSS variables, spacing, colors
4. [BEM Naming Convention](#4-bem-naming-convention) - Block\_\_Element.--Modifier pattern
5. [Component HTML Templates](#5-component-html-templates) - Page, form, list, dialog templates
6. [Common UI Patterns](#6-common-ui-patterns) - Search, filter, data table, empty state
7. [SCSS Patterns by Component Type](#7-scss-patterns-by-component-type) - Page, section, card styling
8. [Anti-Patterns](#8-anti-patterns) - What NOT to do
9. [Component Checklist](#9-component-checklist) - Pre-finalization verification
10. [Source File Locations](#10-source-file-locations) - Where to find mixins/components
11. [Material Component Patterns](#11-material-component-patterns) - Mat-Tab-Group, Mat-Tree, Progress Bar
12. [Profile & Avatar Components](#12-profile--avatar-components) - Employee Profile Card
13. [Interactive Components](#13-interactive-components) - Stacked Chips, Side Panel

---

## 1. Quick Reference Card

```scss
// SCSS Import (REQUIRED at top of every component SCSS)
@use 'shared-mixin' as *;

// BEM Formula
.{block}__{element}          // Element: .user-card__header
.{block}__{element}.--{mod}  // Modifier: .user-card__btn.--primary

// Essential Layout Mixins
@include flex($direction, $justify, $align, $gap, $wrap);
@include flex-col($justify, $align, $gap);     // Column + overflow:auto
@include flex-row($justify, $align, $gap);     // Row layout
@include flex-layout();                         // Full-height flex column

// Essential Typography Mixins
@include text-base($size, $weight, $line-height, $color);
@include text-ellipsis();
@include text-title();      // 1.25rem, 600, 1.875rem
@include text-sub-title();  // 1rem, 600, 1.5rem

// Essential CSS Variables
--bg-pri-cl: white           --text-pri-cl: #354047
--bg-sec-cl: #fcfcfc         --text-sec-cl: #8b8e93
--bd-pri-cl: #ececec         --primary-cl: #43b9de
--bg-hover-cl: #edf2f7       --color-neutral-bg-bg2: #f6f8fb
```

---

## 2. SCSS Foundation

### 2.1 Required Import

Every component SCSS file MUST start with:

```scss
@use 'shared-mixin' as *;
```

### 2.2 Layout Mixins

```scss
// Full control flex
@mixin flex($direction: row, $justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    display: flex;
    flex-direction: $direction;
    justify-content: $justify;
    align-items: $align;
    gap: $gap;
    flex-wrap: $wrap;
}

// Column layout (with overflow: auto)
@mixin flex-col($justify: normal, $align: normal, $gap: 0, $wrap: nowrap) {
    overflow: auto;
    @include flex(column, $justify, $align, $gap, $wrap);
}

// Column layout full size
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

**Usage Examples:**

```scss
// Page container
&__container {
    @include flex-col(flex-start, stretch, 1rem);
}

// Header with space-between
&__header {
    @include flex-row(space-between, center, 0.5rem);
}

// Wrapped grid
&__grid {
    @include flex(row, flex-start, stretch, 1.5rem, wrap);
}
```

### 2.3 Typography Mixins

```scss
// Base typography (default: 14px body text)
@mixin text-base($size: 0.875rem, $weight: 400, $line-height: initial, $color: var(--text-pri-cl)) {
    color: $color;
    font-family: var(--font-base);
    font-size: $size;
    font-style: normal;
    font-weight: $weight;
    line-height: $line-height;
}

// Text truncation with ellipsis
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

**Typography Scale:**

| Size    | rem      | px   | Usage          |
| ------- | -------- | ---- | -------------- |
| Caption | 0.75rem  | 12px | Labels, hints  |
| Body    | 0.875rem | 14px | Default text   |
| Large   | 1rem     | 16px | Sub-titles     |
| Heading | 1.25rem  | 20px | Section titles |
| Title   | 1.5rem   | 24px | Page titles    |

### 2.4 Utility Mixins

```scss
// Border shorthand
@mixin border($width: 1px, $style: solid, $color: var(--bd-pri-cl), $radius: 0) {
    border: $width $style $color;
    border-radius: $radius;
}
```

---

## 3. Design Tokens

### 3.1 Colors

**Background Colors:**

| Variable                 | Value     | Usage                  |
| ------------------------ | --------- | ---------------------- |
| `--bg-pri-cl`            | `#ffffff` | Cards, panels, dialogs |
| `--bg-sec-cl`            | `#fcfcfc` | Secondary backgrounds  |
| `--color-neutral-bg-bg2` | `#f6f8fb` | Page background        |
| `--color-neutral-bg-bg3` | `#edf2f7` | Section background     |
| `--bg-hover-cl`          | `#edf2f7` | Hover states           |

**Text Colors:**

| Variable        | Value     | Usage                |
| --------------- | --------- | -------------------- |
| `--text-pri-cl` | `#354047` | Primary text         |
| `--text-sec-cl` | `#8b8e93` | Secondary/muted text |
| `--primary-cl`  | `#43b9de` | Links, brand accent  |

**Border Colors:**

| Variable      | Value     | Usage             |
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

### 3.2 Spacing Scale

Use rem values consistently:

| Size | rem     | px   | Usage          |
| ---- | ------- | ---- | -------------- |
| XS   | 0.25rem | 4px  | Tight spacing  |
| SM   | 0.5rem  | 8px  | Small gaps     |
| MD   | 0.75rem | 12px | Medium gaps    |
| LG   | 1rem    | 16px | Standard gaps  |
| XL   | 1.5rem  | 24px | Section gaps   |
| XXL  | 2rem    | 32px | Large sections |

### 3.3 Border Radius

| Component    | Radius  |
| ------------ | ------- |
| Inputs       | 0.25rem |
| Cards        | 0.5rem  |
| Pills/Badges | 1rem+   |
| Dialogs      | 0.5rem  |

### 3.4 Shadows

```scss
// Light shadow (cards)
box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.08);

// Heavy shadow (modals, dropdowns)
box-shadow:
    0 32px 64px 0 rgba(0, 0, 0, 0.19),
    0 2px 21px 0 rgba(0, 0, 0, 0.15);
```

---

## 4. BEM Naming Convention

### 4.1 Formula

```
Block:    .component-name              (kebab-case)
Element:  .component-name__element     (double underscore)
Modifier: .component-name__element.--modifier (separate class with --)
```

### 4.2 Block Naming

Block name = Component selector without prefix (kebab-case):

| Selector                | Block Name          |
| ----------------------- | ------------------- |
| `app-text-snippet-list` | `text-snippet-list` |
| `app-employee-list`     | `employee-list`     |
| `platform-user-card`    | `user-card`         |

### 4.3 Common Element Names

| Category    | Elements                                        |
| ----------- | ----------------------------------------------- |
| Structure   | `__header`, `__body`, `__footer`, `__content`   |
| Container   | `__container`, `__wrapper`, `__main-container`  |
| Content     | `__title`, `__text`, `__label`, `__description` |
| Interactive | `__button`, `__icon`, `__link`, `__action`      |
| Table       | `__table`, `__row`, `__cell`, `__pagination`    |
| Form        | `__field`, `__input`, `__select`, `__form-row`  |
| Cards       | `__card`, `__card-header`, `__card-body`        |

### 4.4 Common Modifier Names

| Category | Modifiers                                           |
| -------- | --------------------------------------------------- |
| State    | `--active`, `--disabled`, `--selected`, `--loading` |
| Status   | `--valid`, `--invalid`, `--flagged`, `--warning`    |
| Mode     | `--view-mode`, `--edit-mode`, `--create-mode`       |
| Size     | `--small`, `--large`, `--compact`                   |

### 4.5 Shared/Global Blocks

Some blocks are used across multiple components:

```scss
// Toolbar pattern (shared block)
.platform-toolbar__controls {
    @include flex-row(space-between, center);
}
.platform-toolbar__left-controls {
    @include flex-row(flex-start, center, 1rem);
}
.platform-toolbar__right-controls {
    @include flex-row(flex-end, center, 1rem);
}
```

---

## 5. Component HTML Templates

### 5.1 Page Layout Template

```
+------------------------------------------------------------------+
|                        PAGE CONTAINER                             |
|  +------------------------------------------------------------+  |
|  |                     TOOLBAR SECTION                         |  |
|  |  [Search] [Filters...]              [Actions/Back Link]     |  |
|  +------------------------------------------------------------+  |
|                                                                   |
|  +------------------------------------------------------------+  |
|  |                   CONTENT SECTION                           |  |
|  |  +------------------------------------------------------+  |  |
|  |  |                  TABLE / CARDS                       |  |  |
|  |  +------------------------------------------------------+  |  |
|  |  |                   PAGINATION                         |  |  |
|  |  +------------------------------------------------------+  |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

```html
<app-loading-and-error-indicator [target]="this" [skeletonLoadingType]="'table'"> </app-loading-and-error-indicator>

<div class="page-name">
    @if (vm(); as vm) {
    <div class="page-name__main-container">
        <!-- Toolbar Section -->
        <div class="page-name__toolbar">
            <div class="platform-toolbar__controls">
                <div class="platform-toolbar__left-controls">
                    <app-search-input [placeholder]="'Search...'" [inputText]="vm.searchText" (inputTextChange)="onSearchChange($event)"> </app-search-input>
                    <!-- Additional filters -->
                </div>
                <div class="platform-toolbar__right-controls">
                    <a class="page-name__back-link" [routerLink]="['../']">
                        <mat-icon>arrow_back</mat-icon>
                        Back to List
                    </a>
                </div>
            </div>
        </div>

        <!-- Content Section -->
        <div class="page-name__table-section">
            @if (vm.items.length) {
            <!-- Table/Cards content -->
            } @else {
            <div class="page-name__empty-state">No items found</div>
            }
        </div>
    </div>
    }
</div>
```

```scss
@use 'shared-mixin' as *;

// Host element
app-page-name {
    @include flex-layout;
    align-self: stretch;
}

.page-name {
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

    &__table-section {
        background: var(--bg-pri-cl);
        border-radius: 0.5rem;
        border: 1px solid var(--bd-pri-cl);
        overflow: hidden;
    }

    &__empty-state {
        text-align: center;
        color: var(--text-sec-cl);
        padding: 3rem;
        font-size: 0.875rem;
    }
}
```

### 5.2 Table Template

```html
<table class="component__table">
    <thead>
        <tr>
            <th>Column 1</th>
            <th>Column 2</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        @for (item of vm.items; track item.id) {
        <tr class="component__row" [class.--flagged]="item.isFlagged">
            <td>
                <div class="component__cell-content">
                    <span class="component__primary-text">{{ item.name }}</span>
                    @if (item.subtitle) {
                    <span class="component__secondary-text">{{ item.subtitle }}</span>
                    }
                </div>
            </td>
            <td>{{ item.value }}</td>
            <td>
                <div class="component__actions">
                    <button class="component__action-btn">Edit</button>
                </div>
            </td>
        </tr>
        }
    </tbody>
</table>

<div class="component__pagination">
    <mat-paginator
        [length]="vm.pageInfo.totalItems"
        [pageSize]="vm.pageInfo.pageSize"
        [pageIndex]="vm.pageInfo.pageIndex"
        [pageSizeOptions]="[10, 20, 50, 100]"
        (page)="onPageChange($event)"
    >
    </mat-paginator>
</div>
```

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

### 5.3 Card Template

```html
<div class="component__card">
    <div class="component__card-header">
        <h3 class="component__card-title">Card Title</h3>
        <div class="component__card-actions">
            <button class="component__icon-btn">
                <mat-icon>more_vert</mat-icon>
            </button>
        </div>
    </div>
    <div class="component__card-body">
        <p class="component__card-text">Card content...</p>
    </div>
    <div class="component__card-footer">
        <button class="component__btn --secondary">Cancel</button>
        <button class="component__btn --primary">Save</button>
    </div>
</div>
```

```scss
&__card {
    @include flex-col();
    background: var(--bg-pri-cl);
    border-radius: 0.5rem;
    border: 1px solid var(--bd-pri-cl);
    overflow: hidden;
}

&__card-header {
    @include flex-row(space-between, center, 0.5rem);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--bd-pri-cl);
    background: var(--color-neutral-bg-bg2);
}

&__card-body {
    @include flex-col(flex-start, stretch, 1rem);
    padding: 1.5rem;
}

&__card-footer {
    @include flex-row(flex-end, center, 0.5rem);
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--bd-pri-cl);
}
```

### 5.4 Form Row Template

```html
<div class="component__form-section">
    <h3 class="component__section-title">Section Title</h3>

    <div class="component__form-row">
        <label class="component__label">Field Label</label>
        <div class="component__field-wrapper">
            <input class="component__input" formControlName="fieldName" />
        </div>
    </div>

    <div class="component__form-row">
        <label class="component__label">Select Field</label>
        <div class="component__field-wrapper">
            <platform-select [items]="options" formControlName="selectField" placeholder="Select..."> </platform-select>
        </div>
    </div>
</div>
```

```scss
&__form-section {
    @include flex-col(flex-start, stretch, 1rem);
    padding: 1.5rem;
}

&__section-title {
    @include text-base(1rem, 600, 1.5rem, var(--text-pri-cl));
    margin: 0 0 0.5rem 0;
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

    &:focus {
        border-color: var(--primary-cl);
        outline: none;
    }
}
```

### 5.5 Dialog Template

```html
<div class="dialog-name">
    <div class="dialog-name__header">
        <h2 class="dialog-name__title">Dialog Title</h2>
        <button class="dialog-name__close-btn" (click)="onClose()">
            <mat-icon>close</mat-icon>
        </button>
    </div>

    <div class="dialog-name__body">
        <!-- Dialog content -->
    </div>

    <div class="dialog-name__footer">
        <button class="dialog-name__btn --secondary" (click)="onCancel()">Cancel</button>
        <button class="dialog-name__btn --primary" (click)="onSubmit()">Submit</button>
    </div>
</div>
```

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

## 6. Common UI Patterns

### 6.1 Loading Indicator

```html
<app-loading-and-error-indicator [target]="this" [skeletonLoadingType]="'table'"> </app-loading-and-error-indicator>
```

### 6.2 Empty State

```html
<div class="component__empty-state">No items found</div>
```

```scss
&__empty-state {
    text-align: center;
    color: var(--text-sec-cl);
    padding: 3rem;
    font-size: 0.875rem;
}
```

### 6.3 Search Input

Use the shared `app-search-input` component:

```html
<app-search-input [placeholder]="'Search by name or message'" [inputText]="vm.searchText" (inputTextChange)="onSearchChange($event)"> </app-search-input>
```

### 6.4 Status Badge

```html
<span class="component__status-badge --valid">Active</span>
<span class="component__status-badge --warning">Pending</span>
<span class="component__status-badge --deleted">Deleted</span>
```

```scss
&__status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: capitalize;

    &.--valid {
        background-color: var(--color-success-bg);
        color: var(--color-success-text);
    }

    &.--warning,
    &.--flagged {
        background-color: var(--color-warning-bg);
        color: var(--color-warning-text);
    }

    &.--deleted,
    &.--error {
        background-color: var(--color-error-bg);
        color: var(--color-error-text);
    }
}
```

### 6.5 Back Link

```html
<a class="component__back-link" [routerLink]="['../dashboard']">
    <mat-icon>arrow_back</mat-icon>
    Back to Dashboard
</a>
```

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

### 6.6 Employee/User Cell

```html
<div class="component__employee-cell">
    <span class="component__employee-name">{{ employee.name }}</span>
    @if (employee.position) {
    <span class="component__employee-position">{{ employee.position }}</span>
    }
</div>
```

```scss
&__employee-cell {
    @include flex-col();
    gap: 0.125rem;
}

&__employee-name {
    @include text-base(0.875rem, 500, 1.25rem, var(--text-pri-cl));
}

&__employee-position {
    @include text-base(0.75rem, 400, 1rem, var(--text-sec-cl));
}
```

### 6.7 Kudos/Value Badge

```html
<span class="component__value-badge">{{ value }}</span>
```

```scss
&__value-badge {
    display: inline-block;
    background: var(--color-info-bg);
    color: var(--primary-cl);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-weight: 500;
    font-size: 0.875rem;
}
```

### 6.8 Icon with Tooltip

```html
<mat-icon class="component__flag-icon" matTooltip="Potentially circular"> flag </mat-icon>
```

```scss
&__flag-icon {
    font-size: 1rem;
    height: 1rem;
    width: 1rem;
    color: var(--color-warning-text);
}
```

### 6.9 Checkbox Filter

```html
<mat-checkbox class="component__checkbox-filter" [checked]="vm.filterEnabled" (change)="onFilterChange($event.checked)"> Show only flagged </mat-checkbox>
```

```scss
&__checkbox-filter {
    white-space: nowrap;
}
```

### 6.10 File Upload

Use the shared `upload-file` component with drag-and-drop support:

```html
<upload-file *ngIf="!isViewMode" [files]="vm.attachments" [maxFileSizeMB]="5" [allowMultipleFileUpload]="true" (fileChanges)="onFileChange($event)">
</upload-file>
```

**SCSS for custom upload areas:**

```scss
&__upload-container {
    @include flex-col();
    gap: 1rem;
}

&__drag-area {
    @include flex-row(center, center);
    border: 2px dashed var(--bd-pri-cl);
    border-radius: 0.25rem;
    padding: 1rem;
    background-color: var(--bg-sec-cl);
    color: var(--text-sec-cl);
    cursor: pointer;

    &.--drop-active {
        border-color: var(--primary-cl);
        color: var(--primary-cl);
    }
}

&__upload-btn {
    @include flex-row(center, center);
    width: 2rem;
    height: 2rem;
    background-color: var(--primary-cl);
    border-radius: 0 0.25rem 0.25rem 0;
    cursor: pointer;
}

&__file-list {
    @include flex-col();
    gap: 0.5rem;
}

&__file-item {
    @include flex-row(flex-start, center, 0.5rem);
    padding: 0.5rem;
    border: 1px solid var(--bd-pri-cl);
    border-radius: 0.25rem;
}

&__file-name {
    flex: 1;
    @include text-ellipsis(1);
}

&__remove-btn {
    cursor: pointer;
    color: var(--text-sec-cl);

    &:hover {
        color: var(--color-error-text);
    }
}
```

### 6.11 Tooltip/Popover

**Basic tooltip (Material):**

```html
<mat-icon matTooltip="Tooltip text">info</mat-icon>
```

**Custom tooltip component:**

```html
<platform-tooltip [text]="'Helpful information'" [iconPath]="'assets/icons/info-4.svg'" [tooltipClass]="'component__tooltip'"> </platform-tooltip>
```

**Popover directive (for rich content):**

```html
<!-- Simple string tooltip -->
<span [appPopover]="'This is a tooltip'" appPopoverIsTooltip="true"> Hover me </span>

<!-- Template popover -->
<button [appPopover]="popoverTemplate" [appPopoverPlacement]="'bottom-start'" [appPopoverAutoClose]="'outside'" [popoverClass]="'component__popover'">
    Click for options
</button>

<ng-template #popoverTemplate>
    <div class="component__popover-content">
        <div class="component__popover-item" (click)="onAction1()">Action 1</div>
        <div class="component__popover-item" (click)="onAction2()">Action 2</div>
    </div>
</ng-template>
```

**Popover placement options:** `auto`, `top`, `bottom`, `start`, `end`, `top-start`, `top-end`, `bottom-start`, `bottom-end`

```scss
&__popover-content {
    @include flex-col();
    background: var(--bg-pri-cl);
    border: 1px solid var(--bd-pri-cl);
    border-radius: 0.25rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 10rem;
}

&__popover-item {
    padding: 0.5rem 1rem;
    cursor: pointer;

    &:hover {
        background: var(--bg-hover-cl);
    }
}
```

### 6.12 Collapsible/Expandable Section

```html
<div class="component__section" [class.--collapsed]="isCollapsed">
    <div class="component__section-header" (click)="toggleCollapse()">
        <span class="component__section-title">Section Title</span>
        <mat-icon class="component__collapse-icon"> {{ isCollapsed ? 'expand_more' : 'expand_less' }} </mat-icon>
    </div>
    <div class="component__section-body" *ngIf="!isCollapsed">
        <!-- Collapsible content -->
    </div>
</div>
```

```scss
&__section {
    border: 1px solid var(--bd-pri-cl);
    border-radius: 0.5rem;
    overflow: hidden;

    &.--collapsed {
        .component__section-body {
            display: none;
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

## 7. SCSS Patterns by Component Type

### 7.1 Page Component

```scss
@use 'shared-mixin' as *;

// Host element selector
app-page-name {
    @include flex-layout;
    align-self: stretch;
}

.page-name {
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
    padding: 1.5rem;
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

    tbody tr:hover {
        background: var(--bg-hover-cl);
    }
}
```

### 7.4 Form Fields

```scss
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

    &.--primary {
        background: var(--primary-cl);
        color: white;

        &:hover {
            background: var(--platform-btn-hover-color, #31b0d9);
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

    &:disabled {
        background: var(--platform-btn-disabled-color, #cfdbe5);
        cursor: not-allowed;
    }
}
```

---

## 8. Anti-Patterns

### HTML Anti-Patterns

```html
<!-- WRONG: Elements without BEM classes -->
<div>
    <span>Text</span>
    <div><p>Content</p></div>
</div>

<!-- CORRECT: All elements have BEM classes -->
<div class="component__container">
    <span class="component__text">Text</span>
    <div class="component__content">
        <p class="component__paragraph">Content</p>
    </div>
</div>
```

### SCSS Anti-Patterns

```scss
// WRONG: Hardcoded colors
color: #354047;
background: white;

// CORRECT: Use CSS variables
color: var(--text-pri-cl);
background: var(--bg-pri-cl);

// WRONG: Manual flexbox
display: flex;
flex-direction: column;
justify-content: center;

// CORRECT: Use mixins
@include flex-col(center);

// WRONG: Pixel units for spacing
padding: 16px;
margin: 24px;

// CORRECT: Use rem
padding: 1rem;
margin: 1.5rem;

// WRONG: Missing SCSS import
.component { ... }

// CORRECT: Include import
@use 'shared-mixin' as *;
.component { ... }
```

---

## 9. Component Checklist

Before finalizing any component, verify:

### HTML Checklist

- [ ] All elements have BEM classes (even without styling)
- [ ] Block name matches component selector (kebab-case)
- [ ] Elements use `__` double underscore
- [ ] Modifiers use `--` as separate class
- [ ] Loading indicator present for async data
- [ ] Empty state handled when no data
- [ ] `track` expression used in `@for` loops

### SCSS Checklist

- [ ] File starts with `@use 'shared-mixin' as *;`
- [ ] Host element uses `@include flex-layout;` if page-level
- [ ] Layout uses flex mixins, not manual flexbox
- [ ] Typography uses `text-base()` mixin
- [ ] Colors use CSS variables (`var(--*)`)
- [ ] Spacing uses rem values
- [ ] Borders use `var(--bd-pri-cl)` or `var(--bd-sec-cl)`
- [ ] Cards have `border-radius: 0.5rem`
- [ ] Hover states use `var(--bg-hover-cl)`
- [ ] No hardcoded hex colors

### Structure Checklist

- [ ] Main container with max-width and auto margins
- [ ] Sections have background, border, border-radius
- [ ] Headers/footers have different background (`--color-neutral-bg-bg2`)
- [ ] Consistent padding scale (0.75rem, 1rem, 1.5rem)
- [ ] Consistent gap scale (0.5rem, 0.75rem, 1rem, 1.5rem)

---

## 10. Source File Locations

```
SCSS Variables & Mixins:
├── src/Frontend/libs/share-styles/shared-mixin.scss          # Import this
├── src/Frontend/libs/share-styles/mixin/layout.scss          # flex, flex-col, flex-row
├── src/Frontend/libs/share-styles/mixin/text.scss            # text-base, text-ellipsis
├── src/Frontend/libs/share-styles/shared-variables.scss      # CSS custom properties
├── src/Frontend/libs/platform-core/src/styles/variables.scss # SCSS variables
└── src/Frontend/libs/platform-core/src/styles/mixins.scss    # flex-layout, utilities

Shared Components:
├── src/Frontend/libs/apps-domains/src/_shared/components/search-input/
├── src/Frontend/libs/platform-core/src/components/
└── src/Frontend/libs/apps-domains/src/_shared/components/_abstracts/

Example Components:
└── src/Frontend/apps/playground-text-snippet/src/app/routes/
```

---

## Summary

**Required in every component SCSS:**

```scss
@use 'shared-mixin' as *;
```

**Key mixins:** `flex()`, `flex-col()`, `flex-row()`, `flex-layout()`, `text-base()`, `text-ellipsis()`

**Key variables:** `--bg-pri-cl`, `--text-pri-cl`, `--bd-pri-cl`, `--primary-cl`, `--bg-hover-cl`

**BEM formula:** `.block__element.--modifier`

**ALL HTML elements MUST have BEM classes.**

---

## 11. Material Component Patterns

### Mat-Tab-Group (29+ usages)

Tab groups for sectioned content with consistent styling.

**HTML Pattern:**

```html
<mat-tab-group
    class="component__mat-tab-group"
    animationDuration="0ms"
    [disableRipple]="true"
    [selectedIndex]="currentTab"
    (selectedIndexChange)="onTabChange($event)"
>
    <mat-tab>
        <ng-template mat-tab-label>
            <span class="component__tab-label">Tab 1</span>
        </ng-template>
        <div class="component__mat-tab-body">
            <!-- Tab content -->
        </div>
    </mat-tab>
</mat-tab-group>
```

**SCSS Pattern:**

```scss
@use 'shared-mixin' as *;

.component {
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
    }

    &__mat-tab-body {
        @include flex-col(flex-start, flex-start);
        display: flex !important;
        flex: 1;
        width: 100%;
        overflow-x: hidden;
        overflow-y: auto;
    }

    // Override Material wrapper styles
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
```

### Mat-Tree / Hierarchy Select (66+ usages)

Tree components for hierarchical data display.

**HTML Pattern:**

```html
<div class="hierarchy-select__popover">
    <div class="hierarchy-select__search">
        <input class="hierarchy-select__search-input" [(ngModel)]="searchText" />
    </div>
    <div class="hierarchy-select__mat-tree-wrapper">
        <mat-tree #tree [dataSource]="dataSource" [treeControl]="treeControl">
            <mat-tree-node *matTreeNodeDef="let node" class="hierarchy-select__tree-node" [class.--active]="node.isSelected" (click)="onNodeSelect(node)">
                <span class="hierarchy-select__node-label">{{ node.name }}</span>
            </mat-tree-node>
            <mat-tree-node *matTreeNodeDef="let node; when: hasChild" class="hierarchy-select__tree-node --expandable">
                <button mat-icon-button matTreeNodeToggle>
                    <mat-icon>{{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}</mat-icon>
                </button>
                <span class="hierarchy-select__node-label">{{ node.name }}</span>
            </mat-tree-node>
        </mat-tree>
    </div>
</div>
```

**SCSS Pattern:**

```scss
.hierarchy-select {
    &__popover {
        max-width: 465px;
        padding: 0;
        background-color: var(--bs-popover-bg);
    }

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

    // Remove ripple
    .mat-mdc-icon-button {
        --mat-mdc-button-persistent-ripple-color: none;
        --mat-mdc-button-ripple-color: none;
    }
}
```

### Mat-Progress-Bar (32+ usages)

Progress indicators for loading and status.

**HTML Pattern:**

```html
<mat-progress-bar *ngIf="isLoading" class="component__progress-bar" mode="indeterminate"> </mat-progress-bar>
```

**SCSS Pattern:**

```scss
@use '../variables' as *;

platform-progress-bar {
    display: flex;
    flex-shrink: 0;
    width: 100%;
    font-size: 0.3125rem;
}

.platform-progress-bar.mat-progress-bar {
    display: block;
    flex-grow: 1;
    height: 1em;
}

// Positioned at top of container
.component__progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
}
```

---

## 12. Profile & Avatar Components

### Employee Profile Card (76+ usages)

Most commonly used pattern for displaying employee info with popover.

**HTML Pattern:**

```html
<div class="employee-profile-card {{ className }}">
    <img
        [appPopover]="isDeletedUser ? warningTemplate : employeeCardTemplate"
        [popoverTrigger]="'hover'"
        [popoverPosition]="popoverPosition"
        class="employee-profile-card__avatar"
        [src]="employeeImgUrl"
        [alt]="employeeName"
    />
    <div class="employee-profile-card__basic-info">
        <div class="employee-profile-card__info-group">
            <span class="employee-profile-card__name">{{ employeeName }}</span>
            @if (subtitle) {
            <span class="employee-profile-card__subtitle">{{ subtitle }}</span>
            }
        </div>
    </div>
</div>

<!-- Popover Template -->
<ng-template #employeeCardTemplate>
    <div class="employee-profile-card__popover">
        <div class="employee-profile-card__popover-header">
            <img class="employee-profile-card__popover-avatar" [src]="employeeImgUrl" />
            <div class="employee-profile-card__popover-info">
                <span class="employee-profile-card__popover-name">{{ employeeName }}</span>
                <span class="employee-profile-card__popover-position">{{ position }}</span>
            </div>
        </div>
    </div>
</ng-template>
```

**SCSS Pattern:**

```scss
@use 'shared-mixin' as *;

.employee-profile-card {
    @include flex-row(flex-start, center, var(--employee-card-gap-distance, 0.5rem));

    &__avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    &__basic-info {
        @include flex-col($justify: center, $gap: 0.25rem);
        overflow: hidden;
    }

    &__info-group {
        @include flex-col($gap: 0.125rem);
    }

    &__name {
        @include text-base();
        @include text-ellipsis();
        font-weight: 500;
    }

    &__subtitle {
        @include text-base();
        color: var(--text-sec-cl);
        font-size: 0.75rem;
    }

    &__popover {
        width: 26.25rem;
        border-radius: 0.75rem;
        padding: 1rem;
        background: var(--bg-pri-cl);
    }

    &__popover-header {
        @include flex-row(flex-start, center, 0.75rem);
    }

    &__popover-avatar {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
    }

    &__popover-info {
        @include flex-col($gap: 0.25rem);
    }

    &__popover-name {
        @include text-base();
        font-weight: 600;
    }

    &__popover-position {
        @include text-base();
        color: var(--text-sec-cl);
    }
}
```

---

## 13. Interactive Components

### Stacked Chips with Drag-Drop (32+ usages)

Reorderable chip list using Angular CDK.

**HTML Pattern:**

```html
<mat-chip-listbox cdkDropList cdkDropListOrientation="vertical" class="stacked-chips__mat-chip-list" (cdkDropListDropped)="onDrop($event)">
    @for (option of options; track option.id) {
    <div cdkDrag class="stacked-chips__item">
        <div class="stacked-chips__drag-handle" cdkDragHandle>
            <mat-icon>drag_indicator</mat-icon>
        </div>
        <mat-checkbox class="stacked-chips__checkbox" [checked]="option.isChecked" (change)="onCheckChange(option, $event)"> </mat-checkbox>
        <textarea cdkTextareaAutosize class="stacked-chips__option-input" [(ngModel)]="option.text"> </textarea>
        <button class="stacked-chips__delete-btn" (click)="onDelete(option)">
            <mat-icon>close</mat-icon>
        </button>
    </div>
    }
</mat-chip-listbox>
```

**SCSS Pattern:**

```scss
@use 'shared-mixin' as *;

.stacked-chips {
    &__mat-chip-list {
        @include flex-col($gap: 0.5rem);
        width: 100%;
    }

    &__item {
        @include flex-row(flex-start, center, 0.5rem);
        padding: 0.5rem;
        border: 1px solid var(--bd-pri-cl);
        border-radius: 0.25rem;
        background: var(--bg-pri-cl);

        &.cdk-drag-preview {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        &.cdk-drag-placeholder {
            opacity: 0.3;
        }
    }

    &__drag-handle {
        cursor: grab;
        color: var(--text-sec-cl);
    }

    &__checkbox {
        flex-shrink: 0;
    }

    &__option-input {
        flex: 1;
        border: none;
        resize: none;
        background: transparent;

        &:focus {
            outline: none;
        }
    }

    &__delete-btn {
        @include flex(center, center);
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-sec-cl);

        &:hover {
            color: var(--error-cl);
        }
    }
}
```

### Side Panel (16+ usages)

Slide-in panels for detail views or forms.

**HTML Pattern:**

```html
<div class="side-panel" [class.--open]="isOpen">
    <div class="side-panel__overlay" (click)="close()"></div>
    <div class="side-panel__content">
        <div class="side-panel__header">
            <h2 class="side-panel__title">{{ title }}</h2>
            <button class="side-panel__close-btn" (click)="close()">
                <mat-icon>close</mat-icon>
            </button>
        </div>
        <div class="side-panel__body">
            <ng-content></ng-content>
        </div>
        <div class="side-panel__footer">
            <ng-content select="[footer]"></ng-content>
        </div>
    </div>
</div>
```

**SCSS Pattern:**

```scss
@use 'shared-mixin' as *;

.side-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1000;
    pointer-events: none;

    &.--open {
        pointer-events: auto;

        .side-panel__overlay {
            opacity: 1;
        }

        .side-panel__content {
            transform: translateX(0);
        }
    }

    &__overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &__content {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 400px;
        max-width: 90vw;
        background: var(--bg-pri-cl);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        @include flex-col();
    }

    &__header {
        @include flex-row(space-between, center);
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--bd-pri-cl);
    }

    &__title {
        @include text-base();
        font-size: 1.125rem;
        font-weight: 600;
    }

    &__close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
    }

    &__body {
        flex: 1;
        padding: 1.5rem;
        overflow-y: auto;
    }

    &__footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--bd-pri-cl);
        @include flex-row(flex-end, center, 0.75rem);
    }
}
```
