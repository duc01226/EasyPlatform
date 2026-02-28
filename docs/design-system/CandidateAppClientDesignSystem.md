# CandidateAppClient Design System - AI Reference Guide

> Legacy Angular (AngularJS/Angular 2+) candidate portal with Bootstrap 3 patterns and CSS variable theming

## Summary

| Aspect | Value |
|--------|-------|
| **Target Apps** | `src/Web/CandidateAppClient/*`, `src/Web/JobPortalClient/*` |
| **Framework** | Angular (legacy), Bootstrap 3 |
| **SCSS Import** | `@import '~assets/styles/variables';` |
| **BEM Pattern** | `.ca-{component}__{element}--{modifier}` (ca- prefix) |
| **CSS Variables** | `--main-color`, `--main-text-color`, `--base-font-size` |
| **Grid System** | Bootstrap 3: `col-xs-*`, `col-sm-*`, `col-md-*`, `col-lg-*` |
| **Icons** | Font Awesome: `fa fa-{name}` |

**Quick Rules:**
- ALL classes prefixed with `ca-`
- Use `$variable` SCSS variables that wrap CSS custom properties
- Use Bootstrap grid for responsive layouts
- Theme via `[ngClass]="currentAppContextItem.themeName"`

---

## Table of Contents

1. [Quick Reference Card](#1-quick-reference-card) - SCSS import, BEM, CSS variables, grid
2. [CSS Variables Strategy](#2-css-variables-strategy) - Color, typography, layout variables
3. [BEM Naming Convention](#3-bem-naming-convention) - ca-Block__Element--Modifier pattern
4. [Page Layout Templates](#4-page-layout-templates) - Header, content, sidebar structure
5. [Component HTML Templates](#5-component-html-templates) - Forms, lists, cards
6. [Button Patterns](#6-button-patterns) - Primary, secondary, link buttons
7. [Navigation Patterns](#7-navigation-patterns) - Tabs, pagination, breadcrumbs
8. [Loading & Error States](#8-loading--error-states) - Spinners, error messages
9. [Status/Badge Patterns](#9-statusbadge-patterns) - Status indicators, labels
10. [Tag/Chip Pattern](#10-tagchip-pattern) - Tags, removable chips
11. [Responsive Classes](#11-responsive-classes) - Visibility, display helpers
12. [Utility Classes](#12-utility-classes) - Spacing, text, alignment
13. [SCSS Pattern Examples](#13-scss-pattern-examples) - Component styling patterns
14. [Icon System](#14-icon-system) - Font Awesome usage
15. [Theme Support](#15-theme-support) - Multi-theme configuration
16. [Anti-Patterns to Avoid](#16-anti-patterns-to-avoid) - Common mistakes
17. [File Structure](#17-file-structure) - SCSS organization
18. [Checklist for AI Code Generation](#18-checklist-for-ai-code-generation) - Pre-delivery checks
19. [Confirmation Dialog Pattern](#19-confirmation-dialog-pattern) - Modal confirmation
20. [Image Cropper Pattern](#20-image-cropper-pattern) - Image upload/crop
21. [Category Filter Pattern](#21-category-filter-pattern) - Hierarchical filters
22. [Sharing & Invitation Pattern](#22-sharing--invitation-pattern) - Share dialog

---

## 1. Quick Reference Card

### SCSS Import
```scss
@import '~assets/styles/variables';
```

### BEM Formula
```
.ca-{component}__{element}--{modifier}
Block: .ca-list, .ca-control, .ca-navigation
Element: .ca-list__item, .ca-control__label
Modifier: .ca-list__item--view-mode, .ca-control__button-primary
```

### Key CSS Variables
| Variable | Usage |
|----------|-------|
| `--main-color` | Primary brand color |
| `--main-text-color` | Body text color |
| `--base-font-size` | Default font size |
| `--font-size-xs` | 14px |
| `--font-size-sm` | 17px |
| `--font-size-md` | 19px |
| `--font-size-lg` | 23px |

### Grid System
Bootstrap 3 grid: `col-xs-*`, `col-sm-*`, `col-md-*`, `col-lg-*`

---

## 2. CSS Variables Strategy

All SCSS variables wrap CSS custom properties for theming:

```scss
// Color Variables
$main-color: var(--main-color);
$main-text-color: var(--main-text-color);
$submit-button-color: var(--submit-button-color);
$primary-button-hover-color: var(--primary-button-hover-color);

// Typography Variables
$base-font-family: var(--base-font-family);
$semi-bold-font-family: var(--semi-bold-font-family);
$bold-font-family: var(--bold-font-family);
$base-font-size: var(--base-font-size);
$font-size-xxs: var(--font-size-xxs); // 12px
$font-size-xs: var(--font-size-xs);   // 14px
$font-size-sm: var(--font-size-sm);   // 17px
$font-size-md: var(--font-size-md);   // 19px
$font-size-lg: var(--font-size-lg);   // 23px

// Layout Variables
$base-size: var(--base-size);         // 5px
$base-radius: var(--base-radius);     // 1px
$ca-control-height: var(--ca-control-height); // 50px
```

### Theme Variables (CSS)
```css
:root {
    --logo: url('/assets/images/company-logo/logo_default.png');
    --main-color: #027383;
    --main-text-color: #333333;
    --alert-success-color: #3c763d;
    --alert-error-color: #a94442;
}
```

---

## 3. BEM Naming Convention

### Pattern: `ca-{component}__{element}--{modifier}`

```scss
// Block
.ca-navigation { }
.ca-list { }
.ca-control { }

// Element
.ca-list__item { }
.ca-list__item-heading { }
.ca-control__label { }
.ca-control__input { }

// Modifier
.ca-list__item--view-mode { }
.ca-list__item--edit { }
.ca-control__button-primary { }
.ca-control__button-secondary { }
```

### Common Blocks
| Block | Purpose |
|-------|---------|
| `.ca-list` | List containers |
| `.ca-control` | Form controls |
| `.ca-detail` | Detail views |
| `.ca-navigation` | Navigation components |
| `.ca-body` | Content wrapper |

---

## 4. Page Layout Templates

### Main Page Container
```html
<div class="page-content-margin-default">
    <div class="page-padding-default row col-md-8">
        <!-- Content -->
    </div>
</div>
```

### Detail Page with Header
```html
<div class="col-xs-12 header-page-section" [ngClass]="currentAppContextItem.themeName">
    <div class="col-xs-10 col-sm-10 col-md-10 text-left header-page-title">
        {{ 'PAGE_TITLE' | translate }}
    </div>
    <div class="icon--close-grey" (click)="onCancel()"></div>
</div>

<div class="ca-body page-padding-default page-padding-bottom-default col-sm-12 col-md-8"
    [ngClass]="currentAppContextItem.themeName">
    <!-- Form/Content body -->
</div>
```

### Theme-Applied Container
```html
<div [ngClass]="currentAppContextItem.themeName">
    <!-- Content respects current theme -->
</div>
```

---

## 5. Component HTML Templates

### List with Empty State
```html
<div class="ca-list" id="list-container">
    <ul class="list-unstyled" *ngIf="itemList.length !== 0">
        <li *ngFor="let item of itemList"
            class="row ca-list__item"
            [ngClass]="{'ca-list__item--view-mode': isViewMode}"
            (click)="onSelect(item)">

            <div class="col-xs-7 ca-list__item-heading long-word-wrap">
                {{ item.title }}
            </div>
            <div class="col-xs-5 ca-list__item-button">
                <label class="ca-list__item-label-status" [ngClass]="statusClass">
                    <span>{{ item.status | translate }}</span>
                </label>
            </div>
            <i *ngIf="isEditMode" class="ca-list__item--edit fa fa-pencil"></i>
        </li>
    </ul>

    <!-- Empty State -->
    <div *ngIf="itemList.length === 0" class="empty-state">
        <div class="empty-state__image">
            <img src="assets/images/image_empty_state.png" />
        </div>
        <div class="empty-state__content">
            {{ 'NO_DATA_MESSAGE' | translate }}
        </div>
        <div class="empty-state__button">
            <button class="ca-control__button-primary" (click)="onAdd()">
                {{ 'BUTTON.ADD_ITEM' | translate }}
            </button>
        </div>
    </div>
</div>
```

### Form Section
```html
<div class="ca-control ca-control__name-section col-xs-12 col-md-6 no-padding">
    <label class="ca-control__label col-xs-12">
        {{ 'FIELD_LABEL' | translate }}
        <i class="require-field-signal">(*)</i>
    </label>
    <div class="col-xs-12">
        <input type="text"
            name="fieldName"
            [(ngModel)]="model.field"
            class="ca-control__input"
            [disabled]="isDisabled" />
        <label class="warning-message" *ngIf="validationErrors.field">
            {{ validationErrors.field | translate }}
        </label>
    </div>
</div>
```

### Select/Dropdown
```html
<div class="col-xs-12 custom-drop-down-bg">
    <select name="selectField"
        [(ngModel)]="model.field"
        class="ca-control__select">
        <option *ngFor="let item of options" [value]="item.value">
            {{ item.label | translate }}
        </option>
    </select>
    <span class="custom-drop-down">
        <span class="icon--dropdown"></span>
    </span>
</div>
```

### Date Picker (Month/Year)
```html
<div class="ca-control col-xs-12 col-md-12 no-padding datetime-section">
    <div class="d-flex">
        <div class="custom-drop-down-bg datetime-dropdown__month-dropdown col-xs-5">
            <select name="fromMonth" [(ngModel)]="model.fromMonth" class="ca-control__select">
                <option value="null">- {{ 'MONTH' | translate }} -</option>
                <option *ngFor="let month of months" [value]="month">{{ month }}</option>
            </select>
            <span class="custom-drop-down"><span class="icon--dropdown"></span></span>
        </div>
        <div class="col-xs-1 slash-container">/</div>
        <div class="custom-drop-down-bg datetime-dropdown__year-dropdown col-xs-5">
            <select name="fromYear" [(ngModel)]="model.fromYear" class="ca-control__select">
                <option value="null">- {{ 'YEAR' | translate }} -</option>
                <option *ngFor="let year of years" [value]="year">{{ year }}</option>
            </select>
            <span class="custom-drop-down"><span class="icon--dropdown"></span></span>
        </div>
    </div>
</div>
```

### Checkbox
```html
<div class="ca-detail__checkbox">
    <span class="glyphicon cursor-pointer"
        [class.icon--checked]="isChecked"
        [class.icon--unchecked]="!isChecked"
        (click)="isChecked = !isChecked"></span>
    <span class="ca-detail__checkbox-title" (click)="isChecked = !isChecked">
        {{ 'LABEL_TEXT' | translate }}
    </span>
</div>
```

### Modal/Dialog
```html
<bs-modal class="container custom-modal" #viewModal [animation]="false">
    <bs-modal-header [showDismiss]="true"></bs-modal-header>
    <bs-modal-body class="custom-modal__body">
        <!-- Modal content -->
    </bs-modal-body>
    <bs-modal-footer>
        <div class="col-md-8 col-xs-12">
            <button class="col-xs-12 ca-control__button-primary" (click)="onAction()">
                {{ 'BUTTON.ACTION' | translate }}
            </button>
        </div>
    </bs-modal-footer>
</bs-modal>
```

### Custom Popup
```html
<div class="cv-upload-popup" [ngClass]="currentAppContextItem.themeName">
    <div class="col-xs-12 cv-upload-popup__header">
        <div class="icon--close-grey" (click)="onCancel()"></div>
        <div class="cv-upload-popup__title">{{ 'DIALOG_TITLE' | translate }}</div>
    </div>
    <div class="ca-body page-padding-default col-sm-12 col-md-8">
        <!-- Dialog content -->
    </div>
    <div class="ca-control row cv-upload-popup__button-container">
        <div class="app-secondary-button" (click)="onCancel()">
            {{ 'BUTTON.CANCEL' | translate }}
        </div>
        <button class="app-primary-button" (click)="onSave()">
            {{ 'BUTTON.SAVE' | translate }}
        </button>
    </div>
</div>
```

### File Uploader (ca-uploader)
```html
<ca-uploader
    [uploadedFiles]="uploadedFiles"
    [configuration]="uploaderDefaultConfig"
    (filesChanged)="onFilesChanged($event)"
></ca-uploader>
```

**CV Uploader Component:**
```html
<div class="cv-uploader-container">
    <div class="cv-uploader-container__upload-section">
        <input class="cv-uploader-container__input" type="file" [accept]="config?.allowedFileType"
            (change)="addFile($event)" #cvUploader>
        <div class="cv-uploader-container__flex-row cv-uploader-container__upload">
            <div class="cv-uploader-container__flex-h-fill-remaining">
                {{ fileUpload?.length }} {{ 'file(s) chosen' | translate }}
            </div>
            <div class="cv-uploader-container__select-button" (click)="cvUploader.click()">
                <i class="default-sprite-icon sprite-upload big"></i>
            </div>
        </div>
    </div>
    <ng-container *ngIf="fileUpload?.length">
        <div *ngFor="let item of fileUpload; let index = index"
            class="cv-uploader-container__flex-row cv-uploader-container__display-section">
            <i class="default-sprite-icon sprite-file big"></i>
            <div class="cv-uploader-container__flex-h-fill-remaining cv-uploader-container__file-name">
                <div class="cv-uploader-container__truncate">
                    <span [title]="item.name">{{ item.name }}</span>
                </div>
            </div>
            <i class="default-sprite-icon sprite-trash big cv-uploader-container__remove"
                (click)="removeItem(index)"></i>
        </div>
    </ng-container>
    <div *ngIf="hasError" class="cv-uploader-container__error">
        {{ 'The file uploaded has to be either in this format' | translate: { extensions: config?.allowedFileType } }}
    </div>
</div>
```

**SCSS:**
```scss
.cv-uploader-container {
    width: 100%;

    &__upload-section {
        border: 1px solid #c7d5e0;
        border-radius: 3px;
    }

    &__input {
        display: none;
    }

    &__flex-row {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    &__display-section {
        padding: 11px 0;
        height: 40px;
    }

    &__upload {
        padding-left: 11px;
        height: 40px;
    }

    &__remove,
    &__select-button {
        cursor: pointer;
    }

    &__flex-h-fill-remaining {
        flex: 1 1 auto;
        min-width: 0;
    }

    &__file-name {
        margin-left: 10px;
        color: #999999;
    }

    &__truncate {
        min-width: 0;
        position: relative;
        max-width: 100%;

        & * {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            display: block;
        }
    }

    &__error {
        color: red;
    }
}
```

### Autocomplete Input
```html
<div class="autocomplete" (blur)="onBlur()">
    <input
        class="autocomplete__input"
        [(ngModel)]="searchString"
        autocomplete="off"
        (keyup)="keyupHandler($event)"
        placeholder="{{ 'Search...' | translate }}"
        (keydown)="keydownHandler($event)"
        autocorrect="off"
        autocapitalize="off"
        (focus)="onFocus()"
        name="searchValue"
    />
    <div class="autocomplete__dropdown-holder" *ngIf="searchString && results?.length">
        <div class="autocomplete__dropdown">
            <div class="autocomplete__row-wrapper" *ngFor="let item of results; let i = index">
                <span class="autocomplete__category" *ngIf="canShowCategory(results, item, i)">
                    {{ item.category }}
                </span>
                <div class="autocomplete__row" (click)="selectItem(item.title, i)"
                    [class.--active]="i === hoveredIndex">
                    <div class="autocomplete__item-text" [innerHTML]="item.title"></div>
                </div>
            </div>
        </div>
    </div>
</div>
```

**SCSS:**
```scss
.autocomplete {
    position: relative;

    &__input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid $input-border-color;
        border-radius: 3px;
    }

    &__dropdown-holder {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1000;
    }

    &__dropdown {
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 3px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        max-height: 300px;
        overflow-y: auto;
    }

    &__category {
        display: block;
        padding: 8px 12px;
        font-weight: 600;
        color: $text-secondary-color;
        background: #f5f5f5;
    }

    &__row {
        padding: 8px 12px;
        cursor: pointer;

        &:hover,
        &.--active {
            background: #f0f0f0;
        }
    }

    &__item-text {
        font-size: $base-font-size;
    }
}
```

---

## 6. Button Patterns

### Primary Button
```html
<button class="ca-control__button-primary" (click)="onAction()">
    {{ 'BUTTON.LABEL' | translate }}
</button>
```

### Secondary/Cancel Button
```html
<button class="ca-control__button-secondary" (click)="onCancel()">
    {{ 'BUTTON.CANCEL' | translate }}
</button>
```

### Back Button
```html
<button class="col-xs-12 ca-control__button-back" (click)="onBack()">
    <span class="glyphicon glyphicon-arrow-left">
        <span class="back-button-text">{{ 'BUTTON.BACK' | translate }}</span>
    </span>
</button>
```

### Delete Button
```html
<div class="ca-detail__button-control" *ngIf="isEdit">
    <div id="delete-item" class="pull-right cursor-pointer" (click)="onDelete()">
        <span class="ca-detail__button-delete pull-right">
            {{ 'BUTTON.DELETE' | translate }}
        </span>
        <span class="glyphicon icon--delete pull-right"></span>
    </div>
</div>
```

### Button SCSS
```scss
.ca-control__button-primary {
    font-size: $base-font-size;
    line-height: 40px;
    height: 40px;
    padding: 0 20px;
    border-radius: 5px;
    display: inline-block;
    width: auto;
}

.ca-control__button-secondary {
    height: 40px;
    padding: 0 20px;
    border-radius: 5px;
    font-weight: 600;
}
```

---

## 7. Navigation Patterns

### Navigation Bar
```html
<nav class="default-navigation navbar navbar-inverse ca-navigation"
    [ngClass]="{'with-border-bottom': isPageScrolled}">
    <div class="default-logo">
        <a class="main-logo" [routerLink]="homeUrl"></a>
        <span *ngIf="logo" class="branding-logo">
            <img [src]="logo" alt="logo" />
        </span>
    </div>

    <div class="navbar-wrap">
        <button type="button" class="navbar-toggle" (click)="toggleCollapse()">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
        </button>

        <ul class="nav navbar-nav">
            <li class="navbar-nav__item" *ngFor="let route of routes">
                <a class="navbar-nav__link" [routerLink]="route.path">
                    {{ route.name | translate }}
                </a>
            </li>
        </ul>
    </div>

    <ul *ngIf="hasSubNavigation" class="sub-navigation">
        <li *ngFor="let item of navigationItems" class="sub-navigation__item">
            <a [routerLink]="item.path" [routerLinkActive]="['is-active']">
                {{ item.name | translate | uppercase }}
            </a>
        </li>
    </ul>
</nav>
```

---

## 8. Loading & Error States

### Loading Spinner
```html
<div class="spinner" [class.hidden]="!isLoading">
    <i class="page-spinner fa fa-spin fa-spinner"></i>
    <div class="overlay" id="app-component-overlay"></div>
</div>
```

### Error Alert
```html
<div class="alert response-message--error row" *ngFor="let error of generalErrors">
    {{ error | translate }}
</div>
```

### Field Validation Error
```html
<p *ngIf="validationErrors.fieldName" class="warning-message" id="field-error">
    {{ validationErrors.fieldName | translate }}
</p>
```

---

## 9. Status/Badge Patterns

### Status Label
```html
<label class="ca-list__item-label-status"
    [ngClass]="'status--' + getStatusCssClass(item)">
    <span>{{ item.status | translate }}</span>
</label>
```

```scss
.ca-list__item-label-status {
    font-size: $font-size-sm;
    color: #ffffff;
    line-height: 50px;
    min-height: 50px;
    padding: 0 10px;
    border-radius: 5px;
    text-align: center;
    cursor: pointer;
}
```

---

## 10. Tag/Chip Pattern

```html
<div class="tag-format">
    <div *ngFor="let item of items"
        [ngClass]="isViewMode ? 'tag--view-mode' : 'tag'"
        (click)="onSelect(item)">
        <span class="long-word-wrap">{{ item.name }}</span>
        <i *ngIf="isEditMode" class="tag--edit fa fa-pencil"></i>
    </div>
</div>
```

```scss
.skill-tag {
    border-radius: 7px;
    padding: 0 20px;
    margin-right: 10px;
    display: inline-block;
    font-size: 14px;
    background-color: #d5d5d5;
    line-height: 40px;
    margin: 15px 10px 0 0;
}
```

---

## 11. Responsive Classes

### Bootstrap Grid
```html
class="col-xs-12 col-sm-6 col-md-8"
```

### Visibility Classes
```html
class="hidden-xs"       <!-- Hide on mobile -->
class="hidden-sm"       <!-- Hide on tablet -->
class="hidden-md"       <!-- Hide on desktop -->
class="hidden-lg"       <!-- Hide on large desktop -->
class="for-mobile"      <!-- Show only on mobile -->
```

### Breakpoints (Media Queries)
```scss
// Mobile: < 768px
@media (max-width: 767px) { }

// Tablet: 768px - 1023px
@media (min-width: 768px) and (max-width: 1023px) { }

// Desktop: >= 1024px
@media (min-width: 1024px) { }
```

---

## 12. Utility Classes

### Text Utilities
```html
class="long-word-wrap"        <!-- Word break handling -->
class="text-left"             <!-- Left-aligned text -->
class="text-center"           <!-- Center-aligned -->
class="text-uppercase"        <!-- Uppercase text -->
```

### Layout Utilities
```html
class="pull-right"            <!-- Float right -->
class="no-padding"            <!-- Remove padding -->
class="row"                   <!-- Bootstrap row -->
class="d-flex"                <!-- Flex layout -->
class="clearfix"              <!-- Clear floats -->
```

---

## 13. SCSS Pattern Examples

### Component SCSS Structure
```scss
@import '~assets/styles/variables';

.component-name {
    // Container styles

    &__header {
        // Header element
    }

    &__content {
        // Content element
    }

    &__item {
        // Item styles

        &--active {
            // Active modifier
        }

        &--disabled {
            // Disabled modifier
        }
    }
}

// Responsive overrides
@media (max-width: 767px) {
    .component-name {
        // Mobile styles
    }
}
```

### Modal SCSS
```scss
.custom-modal.in {
    display: block !important;
}

.custom-modal .modal-dialog {
    width: 100%;
}

.custom-modal .modal-content {
    border: none;
    border-radius: 0;
    box-shadow: none;
    min-height: 100vh;
}

.custom-modal .modal-body {
    height: calc(100vh - 110px);
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch;
}
```

---

## 14. Icon System

### Font Awesome Icons
```html
<i class="fa fa-pencil"></i>
<i class="fa fa-spin fa-spinner"></i>
```

### Glyphicons (Bootstrap)
```html
<span class="glyphicon glyphicon-arrow-left"></span>
<span class="glyphicon glyphicon-refresh"></span>
```

### Custom Icon Classes
```html
<div class="icon--close-grey"></div>
<span class="icon--dropdown"></span>
<span class="icon--checked"></span>
<span class="icon--unchecked"></span>
<span class="icon--delete"></span>
```

---

## 15. Theme Support

### Theme Classes
```scss
.bravotalents-theme { }
.flowatme-theme { }
.ys-theme { }
.bravoGROWTH-theme { }
```

### Theme Application
```html
<div class="app-content" [ngClass]="currentAppContextItem.themeName">
    <!-- Themed content -->
</div>
```

### Feature Flags
```html
<div *ngIf="currentAppContextItem.features.showField">
    <!-- Conditionally rendered based on app features -->
</div>
```

---

## 16. Anti-Patterns to Avoid

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| Elements without BEM classes | Add `.ca-*` or semantic classes |
| Hardcoded colors | Use `$variable` or `var(--custom-prop)` |
| Inline styles | Use CSS classes |
| px units for fonts | Use `$font-size-*` variables |
| Manual responsive | Use Bootstrap grid classes |
| Direct DOM manipulation | Use Angular binding |

---

## 17. File Structure

```
src/Web/CandidateAppClient/src/
├── assets/
│   ├── styles/
│   │   ├── variables.scss          # CSS variable mappings
│   │   ├── fonts.scss              # Font definitions
│   │   ├── modal.scss              # Modal styles
│   │   ├── toast.scss              # Toast styles
│   │   └── themes/
│   │       └── variables/
│   │           └── default-variables.css
│   └── images/
├── styles.scss                     # Main entry point
└── app/
    └── [feature]/
        └── *.component.scss        # Component styles
```

---

## 18. Checklist for AI Code Generation

- [ ] All elements have BEM classes (`ca-*__*--*`)
- [ ] Uses `$variable` for colors and typography
- [ ] Uses Bootstrap grid (`col-xs-*`, `col-md-*`)
- [ ] Translation pipe for all user-facing text (`| translate`)
- [ ] Theme class applied via `[ngClass]="currentAppContextItem.themeName"`
- [ ] Responsive breakpoints for mobile/tablet/desktop
- [ ] Empty state template when no data
- [ ] Loading spinner for async operations
- [ ] Validation error display for form fields
- [ ] Accessibility: proper labels, ARIA attributes

---

## 19. Confirmation Dialog Pattern

Modal dialog for user confirmation actions.

**HTML Pattern:**
```html
<div class="confirmation-popup">
    <span class="confirmation-popup__close-icon fa fa-times" (click)="close()"></span>
    <div class="confirmation-popup__header">
        {{ title | translate }}
    </div>
    <div class="confirmation-popup__body">
        <p class="confirmation-popup__message">{{ message | translate }}</p>
    </div>
    <div class="confirmation-popup__footer">
        <button
            class="confirmation-popup__btn -no-btn"
            (click)="onCancel()">
            {{ 'Cancel' | translate }}
        </button>
        <button
            class="confirmation-popup__btn -yes-btn"
            (click)="onConfirm()">
            {{ confirmButtonText | translate }}
        </button>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import "~assets/styles/variables";

.confirmation-popup {
    position: relative;
    display: flex;
    flex-direction: column;
    padding: 2rem;
    gap: 1.5rem;
    background: white;
    border-radius: 8px;
    min-width: 300px;
    max-width: 450px;

    &__close-icon {
        position: absolute;
        top: 1rem;
        right: 1rem;
        cursor: pointer;
        font-size: 1.25rem;
        color: $secondary-text-color;

        &:hover {
            color: $main-text-color;
        }
    }

    &__header {
        font-size: 1.5rem;
        font-weight: 600;
        text-align: center;
        color: $main-text-color;
    }

    &__body {
        text-align: center;
    }

    &__message {
        font-size: $font-size-sm;
        color: $secondary-text-color;
        margin: 0;
        line-height: 1.5;
    }

    &__footer {
        display: flex;
        justify-content: center;
        gap: 1rem;
    }

    &__btn {
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        font-size: $font-size-xs;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &.-yes-btn {
            background-color: var(--confirm-pri-btn-color, $submit-button-color);
            color: white;
            border: none;

            &:hover {
                opacity: 0.9;
            }
        }

        &.-no-btn {
            background-color: transparent;
            color: $main-text-color;
            border: var(--confirm-sec-btn-border, 1px solid $border-color);

            &:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }
        }
    }
}

// Responsive
@media (max-width: 480px) {
    .confirmation-popup {
        padding: 1.5rem;
        min-width: unset;
        width: 90vw;

        &__footer {
            flex-direction: column;
        }

        &__btn {
            width: 100%;
        }
    }
}
```

---

## 20. Image Cropper Pattern

Image upload with cropping functionality.

**HTML Pattern:**
```html
<div class="image-cropper">
    <div class="image-cropper__header">
        <span class="image-cropper__title">{{ 'Crop Image' | translate }}</span>
        <span class="image-cropper__close fa fa-times" (click)="close()"></span>
    </div>
    <div class="image-cropper__container">
        <image-cropper
            [imageFile]="imageFile"
            [maintainAspectRatio]="true"
            [aspectRatio]="aspectRatio"
            format="png"
            (imageCropped)="onImageCropped($event)">
        </image-cropper>
    </div>
    <div class="image-cropper__icon-group">
        <span class="image-cropper__rotate" (click)="rotateLeft()">
            <i class="image-cropper__rotate-icon fa fa-undo"></i>
        </span>
        <span class="image-cropper__rotate --right" (click)="rotateRight()">
            <i class="image-cropper__rotate-icon fa fa-undo"></i>
        </span>
    </div>
    <div class="image-cropper__error-msg" *ngIf="errorMessage">
        {{ errorMessage | translate }}
    </div>
    <div class="image-cropper__footer">
        <button class="ca-control__button-secondary" (click)="cancel()">
            {{ 'Cancel' | translate }}
        </button>
        <button class="ca-control__button-primary" (click)="save()">
            {{ 'Save' | translate }}
        </button>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import "~assets/styles/variables";

:host {
    display: flex;
    flex-direction: column;
}

.image-cropper {
    padding-top: 10px;
    padding-left: 10px;
    text-align: center;

    &__container {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 40vh;
        margin: 10px 0;
    }

    &__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 15px;
    }

    &__title {
        color: $main-text-color;
        font-size: 26px;
        font-weight: 600;
    }

    &__close {
        cursor: pointer;
        font-size: 1.25rem;
        color: $secondary-text-color;
    }

    &__error-msg {
        text-align: center;
        padding: 20px;
        color: $error-text-color;
    }

    &__icon-group {
        margin-top: 10px;
        text-align: center;
    }

    &__rotate {
        display: inline-block;
        margin: 0 5px;
        width: 35px;
        height: 35px;
        line-height: 35px;
        cursor: pointer;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.05);

        &:hover {
            background: rgba(0, 0, 0, 0.1);
        }

        &.--right {
            .image-cropper__rotate-icon {
                transform: rotateY(180deg);
            }
        }
    }

    &__footer {
        display: flex;
        justify-content: center;
        gap: 1rem;
        padding: 1rem;
    }
}

@media (max-width: 767px) {
    .image-cropper__title {
        font-size: $font-size-md;
    }
}
```

---

## 21. Category Filter Pattern

Hierarchical filter with expandable categories.

**HTML Pattern:**
```html
<div class="category-filter">
    <div class="category-filter__header">
        <span class="category-filter__title">{{ 'Filter by Category' | translate }}</span>
        <span class="category-filter__clear" (click)="clearAll()">{{ 'Clear All' | translate }}</span>
    </div>
    <div class="category-filter__search">
        <input
            class="category-filter__search-input"
            type="text"
            [(ngModel)]="searchText"
            [placeholder]="'Search...' | translate" />
        <i class="category-filter__search-icon fa fa-search"></i>
    </div>
    <div class="category-filter__list">
        <div
            class="category-filter__category"
            *ngFor="let category of filteredCategories"
            [class.--expanded]="category.isExpanded">
            <div class="category-filter__category-header" (click)="toggleCategory(category)">
                <i class="category-filter__expand-icon fa"
                   [class.fa-chevron-down]="category.isExpanded"
                   [class.fa-chevron-right]="!category.isExpanded"></i>
                <span class="category-filter__category-name">{{ category.name }}</span>
                <span class="category-filter__category-count">({{ category.count }})</span>
            </div>
            <div class="category-filter__items" *ngIf="category.isExpanded">
                <label
                    class="category-filter__item"
                    *ngFor="let item of category.items">
                    <input
                        type="checkbox"
                        class="category-filter__checkbox"
                        [(ngModel)]="item.isSelected"
                        (change)="onItemChange(item)" />
                    <span class="category-filter__item-name">{{ item.name }}</span>
                    <span class="category-filter__item-count">({{ item.count }})</span>
                </label>
            </div>
        </div>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import "~assets/styles/variables";

.category-filter {
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid $border-color;
    border-radius: 4px;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid $border-color;
    }

    &__title {
        font-size: $font-size-sm;
        font-weight: 600;
        color: $main-text-color;
    }

    &__clear {
        font-size: $font-size-xs;
        color: $main-color;
        cursor: pointer;

        &:hover {
            text-decoration: underline;
        }
    }

    &__search {
        position: relative;
        padding: 12px 16px;
        border-bottom: 1px solid $border-color;
    }

    &__search-input {
        width: 100%;
        padding: 8px 32px 8px 12px;
        border: 1px solid $border-color;
        border-radius: 4px;
        font-size: $font-size-xs;

        &:focus {
            outline: none;
            border-color: $main-color;
        }
    }

    &__search-icon {
        position: absolute;
        right: 28px;
        top: 50%;
        transform: translateY(-50%);
        color: $secondary-text-color;
    }

    &__list {
        max-height: 400px;
        overflow-y: auto;
    }

    &__category {
        border-bottom: 1px solid $border-color;

        &:last-child {
            border-bottom: none;
        }
    }

    &__category-header {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        cursor: pointer;

        &:hover {
            background: rgba(0, 0, 0, 0.02);
        }
    }

    &__expand-icon {
        width: 16px;
        margin-right: 8px;
        color: $secondary-text-color;
    }

    &__category-name {
        flex: 1;
        font-size: $font-size-xs;
        font-weight: 500;
    }

    &__category-count {
        font-size: $font-size-xxs;
        color: $secondary-text-color;
    }

    &__items {
        padding: 0 16px 12px 40px;
    }

    &__item {
        display: flex;
        align-items: center;
        padding: 6px 0;
        cursor: pointer;

        &:hover {
            .category-filter__item-name {
                color: $main-color;
            }
        }
    }

    &__checkbox {
        margin-right: 8px;
        accent-color: $main-color;
    }

    &__item-name {
        flex: 1;
        font-size: $font-size-xs;
        color: $main-text-color;
    }

    &__item-count {
        font-size: $font-size-xxs;
        color: $secondary-text-color;
    }
}
```

---

## 22. Sharing & Invitation Pattern

Share dialog with email/link options.

**HTML Pattern:**
```html
<div class="share-dialog">
    <div class="share-dialog__header">
        <span class="share-dialog__title">{{ 'Share' | translate }}</span>
        <span class="share-dialog__close fa fa-times" (click)="close()"></span>
    </div>
    <div class="share-dialog__body">
        <div class="share-dialog__section">
            <label class="share-dialog__label">{{ 'Share via Email' | translate }}</label>
            <div class="share-dialog__email-input">
                <input
                    type="email"
                    class="share-dialog__input"
                    [(ngModel)]="email"
                    [placeholder]="'Enter email address' | translate" />
                <button
                    class="share-dialog__send-btn"
                    [disabled]="!isValidEmail"
                    (click)="sendEmail()">
                    {{ 'Send' | translate }}
                </button>
            </div>
        </div>
        <div class="share-dialog__divider">
            <span class="share-dialog__divider-text">{{ 'or' | translate }}</span>
        </div>
        <div class="share-dialog__section">
            <label class="share-dialog__label">{{ 'Copy Link' | translate }}</label>
            <div class="share-dialog__link-input">
                <input
                    type="text"
                    class="share-dialog__input --readonly"
                    [value]="shareLink"
                    readonly />
                <button
                    class="share-dialog__copy-btn"
                    (click)="copyLink()">
                    <i class="fa" [class.fa-copy]="!copied" [class.fa-check]="copied"></i>
                </button>
            </div>
        </div>
        <div class="share-dialog__social" *ngIf="showSocialShare">
            <span class="share-dialog__social-label">{{ 'Share on' | translate }}:</span>
            <div class="share-dialog__social-icons">
                <a class="share-dialog__social-icon --linkedin" (click)="shareLinkedIn()">
                    <i class="fa fa-linkedin"></i>
                </a>
                <a class="share-dialog__social-icon --facebook" (click)="shareFacebook()">
                    <i class="fa fa-facebook"></i>
                </a>
                <a class="share-dialog__social-icon --twitter" (click)="shareTwitter()">
                    <i class="fa fa-twitter"></i>
                </a>
            </div>
        </div>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import "~assets/styles/variables";

.share-dialog {
    background: white;
    border-radius: 8px;
    width: 400px;
    max-width: 90vw;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid $border-color;
    }

    &__title {
        font-size: $font-size-md;
        font-weight: 600;
    }

    &__close {
        cursor: pointer;
        color: $secondary-text-color;
    }

    &__body {
        padding: 20px;
    }

    &__section {
        margin-bottom: 16px;
    }

    &__label {
        display: block;
        font-size: $font-size-xs;
        font-weight: 500;
        color: $main-text-color;
        margin-bottom: 8px;
    }

    &__email-input,
    &__link-input {
        display: flex;
        gap: 8px;
    }

    &__input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid $border-color;
        border-radius: 4px;
        font-size: $font-size-xs;

        &:focus {
            outline: none;
            border-color: $main-color;
        }

        &.--readonly {
            background: #f5f5f5;
            color: $secondary-text-color;
        }
    }

    &__send-btn {
        padding: 10px 20px;
        background: $main-color;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    }

    &__copy-btn {
        padding: 10px 14px;
        background: #f5f5f5;
        border: 1px solid $border-color;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
            background: #eee;
        }
    }

    &__divider {
        display: flex;
        align-items: center;
        margin: 20px 0;

        &::before,
        &::after {
            content: '';
            flex: 1;
            height: 1px;
            background: $border-color;
        }
    }

    &__divider-text {
        padding: 0 12px;
        font-size: $font-size-xs;
        color: $secondary-text-color;
    }

    &__social {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 20px;
    }

    &__social-label {
        font-size: $font-size-xs;
        color: $secondary-text-color;
    }

    &__social-icons {
        display: flex;
        gap: 8px;
    }

    &__social-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        color: white;
        cursor: pointer;
        transition: opacity 0.2s;

        &:hover {
            opacity: 0.8;
        }

        &.--linkedin { background: #0077b5; }
        &.--facebook { background: #1877f2; }
        &.--twitter { background: #1da1f2; }
    }
}
