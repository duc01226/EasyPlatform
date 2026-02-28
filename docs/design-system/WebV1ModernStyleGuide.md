# Web V1 Modern Style Guide - V2 Aesthetics for Legacy Apps

> Build new UI in bravoTALENTSClient / CandidateAppClient using V1 components but styled like WebV2

## Summary

| Aspect | Value |
|--------|-------|
| **Use Case** | NEW UI in V1 apps that should look like WebV2 |
| **Target Apps** | `src/Web/bravoTALENTSClient/*`, `src/Web/CandidateAppClient/*` |
| **Approach** | V1 component structure + V2 visual aesthetics |
| **Page BG** | `#f6f8fb` |
| **Card BG** | `#ffffff` with `0.5rem` radius |
| **Text Colors** | Primary: `#354047`, Secondary: `#8b8e93` |
| **Spacing** | rem-based: 0.5, 0.75, 1, 1.5rem scale |

**When to Use:**
- Building NEW pages/features in V1 apps
- Redesigning existing V1 components to look modern
- Read BOTH: This guide (V2 aesthetics) + app-specific guide (V1 patterns)

---

## Table of Contents

1. [Quick Reference](#1-quick-reference) - V1 vs V2 comparison table
2. [Color Mapping](#2-color-mapping) - CSS variable overrides for V2 look
3. [Typography Modernization](#3-typography-modernization) - Font sizes, weights, line heights
4. [Spacing with rem Units](#4-spacing-with-rem-units) - Padding/margin conversion
5. [Component Templates](#5-component-templates) - Modern card, table, button templates
6. [Status Badges](#6-status-badges) - V2-style status indicators
7. [Modern Buttons](#7-modern-buttons) - Primary/secondary button styling
8. [Empty States](#8-empty-states) - V2-style empty state patterns
9. [Utility Classes](#9-utility-classes) - Modern spacing/text helpers
10. [Checklist: Modernizing V1 Components](#10-checklist-modernizing-v1-components) - Pre-delivery checks
11. [Migration Tips](#11-migration-tips) - Step-by-step modernization guide

---

## 1. Quick Reference

| Aspect | V1 Default | Modern V2 Style |
|--------|-----------|-----------------|
| Background | Various grays | `#f6f8fb` (page), `#ffffff` (cards) |
| Borders | Mixed | `#ececec` with `0.5rem` radius |
| Primary text | Black/dark | `#354047` |
| Secondary text | Gray | `#8b8e93` |
| Spacing | `px` based | `rem` based (0.5, 0.75, 1, 1.5rem) |
| Shadows | Heavy | Light: `0 4px 8px rgba(0,0,0,0.08)` |
| Font sizes | Various | 12/14/16/20/24px scale |

---

## 2. Color Mapping

### Override CSS Variables in Theme

```scss
// In your app's theme file or global styles
:root {
    // V2-style backgrounds
    --body-background-color: #f6f8fb;
    --filter-background-color: #ffffff;

    // V2-style text colors
    --base-text-color: #354047;
    --table-header-color: #8b8e93;

    // V2-style borders
    --input-border-color: #ececec;
    --table-header-bg-color: #f6f8fb;

    // V2-style primary (keep brand or use V2)
    --base-color: #43b9de;
    --base-link-color: #43b9de;

    // V2-style buttons
    --primary-button-background-color: #43b9de;
    --primary-button-hover-background-color: #3aa8cc;
}
```

### Color Reference Table

| V1 Variable | V2 Value | Usage |
|-------------|----------|-------|
| `--body-background-color` | `#f6f8fb` | Page background |
| `--filter-background-color` | `#ffffff` | Cards, panels |
| `--base-text-color` | `#354047` | Primary text |
| `--table-header-color` | `#8b8e93` | Secondary/muted text |
| `--input-border-color` | `#ececec` | All borders |
| `--base-color` | `#43b9de` | Brand accent |
| `--error-text-color` | `#dc3545` | Error states |
| `--alert-success-color` | `#28a745` | Success states |

---

## 3. Typography Modernization

### Font Size Scale (rem-based)

```scss
// Define modern rem scale alongside V1 px scale
$v2-font-caption: 0.75rem;   // 12px
$v2-font-body: 0.875rem;     // 14px (default)
$v2-font-large: 1rem;        // 16px
$v2-font-heading: 1.25rem;   // 20px
$v2-font-title: 1.5rem;      // 24px
```

### Typography Mixin (V1 Compatible)

```scss
// Add to component SCSS
@mixin v2-text($size: 0.875rem, $weight: 400, $color: #354047) {
    font-size: $size;
    font-weight: $weight;
    color: $color;
    line-height: 1.5;
}

@mixin v2-text-muted {
    font-size: 0.75rem;
    color: #8b8e93;
}

@mixin v2-text-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #354047;
}
```

### Usage in V1 Components

```scss
// bravoTALENTSClient
.candidate-list__header-title {
    @include v2-text(1.25rem, 600);
}

.candidate-list__item-name {
    @include v2-text(0.875rem, 400);
}

.candidate-list__item-status {
    @include v2-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

// CandidateAppClient
.ca-list__item-heading {
    @include v2-text(0.875rem, 500);
}

.ca-control__label {
    @include v2-text(0.75rem, 600, #8b8e93);
    text-transform: uppercase;
}
```

---

## 4. Spacing with rem Units

### Spacing Scale

| Name | rem | px | Usage |
|------|-----|-----|-------|
| XS | 0.25rem | 4px | Tight gaps |
| SM | 0.5rem | 8px | Small gaps |
| MD | 0.75rem | 12px | Medium gaps |
| LG | 1rem | 16px | Standard gaps |
| XL | 1.5rem | 24px | Section gaps |
| XXL | 2rem | 32px | Large sections |

### Consistent Padding Pattern

```scss
// Cards and panels
.modern-card {
    background: #ffffff;
    border: 1px solid #ececec;
    border-radius: 0.5rem;
    padding: 1rem;  // or 1.5rem for larger cards
}

// Toolbars
.modern-toolbar {
    padding: 0.75rem 1rem;
    background: #ffffff;
    border-bottom: 1px solid #ececec;
}

// Table cells
.modern-table th,
.modern-table td {
    padding: 0.75rem 1rem;
}

// Form fields
.modern-form-group {
    margin-bottom: 1rem;
}

.modern-input {
    padding: 0.5rem 0.75rem;
}
```

---

## 5. Component Templates

### 5.1 Page Container (bravoTALENTS)

```html
<div class="page-container">
    <section class="page-container__toolbar modern-toolbar">
        <div class="toolbar__left">
            <app-search-input></app-search-input>
        </div>
        <div class="toolbar__right">
            <button class="bravo-button bravo-button--primary">Add</button>
        </div>
    </section>

    <section class="page-container__content modern-card">
        <!-- Table or content -->
    </section>
</div>
```

```scss
.page-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background-color: #f6f8fb;
    min-height: 100%;

    &__toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffffff;
        border: 1px solid #ececec;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
    }

    &__content {
        background: #ffffff;
        border: 1px solid #ececec;
        border-radius: 0.5rem;
        overflow: hidden;
    }
}
```

### 5.2 Page Container (CandidateApp)

```html
<div class="ca-page" [ngClass]="currentAppContextItem.themeName">
    <div class="ca-page__header modern-toolbar">
        <div class="ca-page__title">{{ 'PAGE_TITLE' | translate }}</div>
        <div class="icon--close-grey" (click)="onCancel()"></div>
    </div>

    <div class="ca-page__body modern-card">
        <!-- Form content -->
    </div>
</div>
```

```scss
.ca-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background-color: #f6f8fb;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
    }

    &__title {
        @include v2-text(1.25rem, 600);
    }

    &__body {
        padding: 1.5rem;
    }
}
```

### 5.3 Modern Table (bravoTALENTS)

```html
<div class="modern-table-container">
    <table class="candidate-table modern-table">
        <thead>
            <tr class="modern-table__header-row">
                <th class="col-5">
                    <input type="checkbox" class="modern-checkbox" />
                </th>
                <th class="col-20">Name</th>
                <th class="col-15">Status</th>
            </tr>
        </thead>
        <tbody>
            <tr *ngFor="let item of items; let i = index"
                class="modern-table__body-row"
                [class.--selected]="item.isSelected">
                <td><input type="checkbox" class="modern-checkbox" /></td>
                <td>
                    <div class="modern-table__cell-stack">
                        <span class="modern-table__primary-text">{{ item.name }}</span>
                        <span class="modern-table__secondary-text">{{ item.email }}</span>
                    </div>
                </td>
                <td>
                    <span class="modern-badge --{{ item.status }}">{{ item.status }}</span>
                </td>
            </tr>
        </tbody>
    </table>
</div>
```

```scss
.modern-table {
    width: 100%;
    border-collapse: collapse;

    &__header-row th {
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 600;
        color: #8b8e93;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: #f6f8fb;
        border-bottom: 1px solid #ececec;
    }

    &__body-row {
        td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #ececec;
            font-size: 0.875rem;
            color: #354047;
        }

        &:hover {
            background: #edf2f7;
        }

        &.--selected {
            background: #e3f2fd;
        }
    }

    &__cell-stack {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
    }

    &__primary-text {
        font-weight: 500;
        color: #354047;
    }

    &__secondary-text {
        font-size: 0.75rem;
        color: #8b8e93;
    }
}
```

### 5.4 Modern Form (CandidateApp)

```html
<div class="ca-form modern-form">
    <div class="modern-form__section">
        <h3 class="modern-form__section-title">Personal Information</h3>

        <div class="row">
            <div class="col-xs-12 col-md-6">
                <div class="modern-form__field">
                    <label class="modern-form__label">
                        {{ 'FIELD_NAME' | translate }}
                        <span class="modern-form__required">*</span>
                    </label>
                    <input type="text"
                        class="ca-control__input modern-input"
                        [(ngModel)]="model.name" />
                    <span class="modern-form__error" *ngIf="errors.name">
                        {{ errors.name | translate }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</div>
```

```scss
.modern-form {
    &__section {
        margin-bottom: 1.5rem;

        &:last-child {
            margin-bottom: 0;
        }
    }

    &__section-title {
        font-size: 1rem;
        font-weight: 600;
        color: #354047;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #ececec;
    }

    &__field {
        margin-bottom: 1rem;
    }

    &__label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #8b8e93;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    &__required {
        color: #dc3545;
    }

    &__error {
        display: block;
        font-size: 0.75rem;
        color: #dc3545;
        margin-top: 0.25rem;
    }
}

.modern-input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    font-size: 0.875rem;
    color: #354047;
    border: 1px solid #ececec;
    border-radius: 0.25rem;
    background: #ffffff;
    transition: border-color 0.15s ease;

    &:focus {
        outline: none;
        border-color: #43b9de;
        box-shadow: 0 0 0 2px rgba(67, 185, 222, 0.1);
    }

    &:disabled {
        background: #f6f8fb;
        color: #8b8e93;
    }
}
```

### 5.5 Modern Card Panel

```html
<div class="modern-card">
    <div class="modern-card__header">
        <h3 class="modern-card__title">Card Title</h3>
        <div class="modern-card__actions">
            <button class="modern-icon-btn">
                <span class="sprite-icon sprite-edit xs"></span>
            </button>
        </div>
    </div>
    <div class="modern-card__body">
        <!-- Content -->
    </div>
    <div class="modern-card__footer">
        <button class="bravo-button">Cancel</button>
        <button class="bravo-button bravo-button--primary">Save</button>
    </div>
</div>
```

```scss
.modern-card {
    background: #ffffff;
    border: 1px solid #ececec;
    border-radius: 0.5rem;
    overflow: hidden;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #ececec;
    }

    &__title {
        font-size: 1rem;
        font-weight: 600;
        color: #354047;
        margin: 0;
    }

    &__body {
        padding: 1rem;
    }

    &__footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid #ececec;
        background: #f6f8fb;
    }
}
```

---

## 6. Status Badges

```html
<span class="modern-badge --success">Active</span>
<span class="modern-badge --warning">Pending</span>
<span class="modern-badge --error">Rejected</span>
<span class="modern-badge --info">New</span>
```

```scss
.modern-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    border-radius: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;

    &.--success {
        background: #d4edda;
        color: #155724;
    }

    &.--warning {
        background: #fff3cd;
        color: #856404;
    }

    &.--error {
        background: #f8d7da;
        color: #721c24;
    }

    &.--info {
        background: #d1ecf1;
        color: #0c5460;
    }
}
```

---

## 7. Modern Buttons

```html
<button class="modern-btn">Default</button>
<button class="modern-btn --primary">Primary</button>
<button class="modern-btn --secondary">Secondary</button>
<button class="modern-btn --danger">Danger</button>
<button class="modern-btn --sm">Small</button>
```

```scss
.modern-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid #ececec;
    border-radius: 0.25rem;
    background: #ffffff;
    color: #354047;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        background: #f6f8fb;
        border-color: #c7d5e0;
    }

    &.--primary {
        background: #43b9de;
        border-color: #43b9de;
        color: #ffffff;

        &:hover {
            background: #3aa8cc;
            border-color: #3aa8cc;
        }
    }

    &.--secondary {
        background: transparent;
        border-color: #43b9de;
        color: #43b9de;

        &:hover {
            background: rgba(67, 185, 222, 0.1);
        }
    }

    &.--danger {
        background: #dc3545;
        border-color: #dc3545;
        color: #ffffff;

        &:hover {
            background: #c82333;
        }
    }

    &.--sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}
```

---

## 8. Empty States

```html
<div class="modern-empty-state">
    <div class="modern-empty-state__icon">
        <span class="sprite-icon sprite-no-data lg"></span>
    </div>
    <div class="modern-empty-state__title">No items found</div>
    <div class="modern-empty-state__description">
        Try adjusting your search or filter criteria
    </div>
    <button class="modern-btn --primary">Add New Item</button>
</div>
```

```scss
.modern-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;

    &__icon {
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    &__title {
        font-size: 1rem;
        font-weight: 600;
        color: #354047;
        margin-bottom: 0.5rem;
    }

    &__description {
        font-size: 0.875rem;
        color: #8b8e93;
        margin-bottom: 1.5rem;
        max-width: 300px;
    }
}
```

---

## 9. Utility Classes

Add these utility classes for quick V2 styling:

```scss
// Background
.bg-page { background-color: #f6f8fb; }
.bg-card { background-color: #ffffff; }
.bg-hover { background-color: #edf2f7; }

// Text
.text-primary { color: #354047; }
.text-secondary { color: #8b8e93; }
.text-brand { color: #43b9de; }
.text-error { color: #dc3545; }
.text-success { color: #28a745; }

// Font sizes
.text-xs { font-size: 0.75rem; }
.text-sm { font-size: 0.875rem; }
.text-base { font-size: 1rem; }
.text-lg { font-size: 1.25rem; }
.text-xl { font-size: 1.5rem; }

// Font weights
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

// Borders
.border { border: 1px solid #ececec; }
.border-top { border-top: 1px solid #ececec; }
.border-bottom { border-bottom: 1px solid #ececec; }
.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.5rem; }

// Spacing (gap)
.gap-xs { gap: 0.25rem; }
.gap-sm { gap: 0.5rem; }
.gap-md { gap: 0.75rem; }
.gap-lg { gap: 1rem; }
.gap-xl { gap: 1.5rem; }

// Padding
.p-sm { padding: 0.5rem; }
.p-md { padding: 0.75rem; }
.p-lg { padding: 1rem; }
.p-xl { padding: 1.5rem; }

// Flexbox
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
```

---

## 10. Checklist: Modernizing V1 Components

When building new UI in V1 apps, verify:

- [ ] Page background uses `#f6f8fb` instead of white/gray
- [ ] Cards have `#ffffff` bg, `1px solid #ececec` border, `0.5rem` radius
- [ ] Text uses `#354047` (primary) and `#8b8e93` (secondary)
- [ ] Spacing uses rem units (0.5, 0.75, 1, 1.5rem)
- [ ] Table headers are uppercase, muted color, small font
- [ ] Hover states use `#edf2f7`
- [ ] Buttons follow modern-btn pattern
- [ ] Forms use modern-form structure with uppercase labels
- [ ] Status badges use modern-badge with color variants
- [ ] Empty states are centered with icon, title, description

---

## 11. Migration Tips

### Quick Wins (Add to Existing Components)

1. **Update background colors:**
```scss
// Before
.candidate-list { background: #fff; }

// After
.candidate-list { background: #f6f8fb; }
.candidate-list__card { background: #fff; border-radius: 0.5rem; }
```

2. **Add card styling to content sections:**
```scss
&__content {
    background: #ffffff;
    border: 1px solid #ececec;
    border-radius: 0.5rem;
    overflow: hidden;
}
```

3. **Update text colors:**
```scss
// Before
color: #333;
color: #666;

// After
color: #354047;  // primary
color: #8b8e93;  // secondary
```

4. **Convert px to rem:**
```scss
// Before
padding: 16px;
margin-bottom: 24px;

// After
padding: 1rem;
margin-bottom: 1.5rem;
```

### When to Use Modern Classes

| Scenario | Use |
|----------|-----|
| New page container | `.page-container` + modern-card classes |
| New table | `.modern-table` classes |
| New form | `.modern-form` classes |
| Quick styling | Utility classes (`.text-secondary`, `.p-lg`) |
| Buttons | `.modern-btn` with modifiers |
| Status display | `.modern-badge` with status modifiers |
