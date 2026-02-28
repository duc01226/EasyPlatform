# bravoTALENTSClient Design System - AI Reference Guide

> Modern Angular HR Recruitment Application with BEM patterns, virtual scrolling, and CSS variable theming

## Summary

| Aspect | Value |
|--------|-------|
| **Target Apps** | `src/Web/bravoTALENTSClient/*`, `src/Web/bravoINSIGHTSClient/*`, `src/Web/bravoSURVEYSClient/*` |
| **Framework** | Angular (legacy modules) |
| **SCSS Import** | `@import '~assets/scss/variables';` + `@import '~assets/scss/mixins';` |
| **BEM Pattern** | `.block__element--modifier` (modifier with double dash) |
| **CSS Variables** | `--base-color`, `--base-text-color`, `--navigation-header-height` |
| **Key Mixins** | `flex-column-container`, `text-truncate`, `keyframes`, `animation` |
| **Icons** | Sprite: `sprite-icon sprite-{name}`, SVG: `svg-icon {name}-svg-icon` |

**Quick Rules:**
- Use `$variable` SCSS variables that wrap CSS custom properties
- Virtual scroll for lists >50 items
- Side panel transitions: 0.5s ease
- Print-safe: add `d-print-none` to non-printable elements

---

## Table of Contents

1. [Quick Reference Card](#1-quick-reference-card) - SCSS imports, BEM, mixins, icons
2. [SCSS Mixins](#2-scss-mixins) - flex-column-container, text-truncate, animations
3. [CSS Variables](#3-css-variables) - Color, button, layout variables
4. [BEM Naming Convention](#4-bem-naming-convention) - Block__Element--Modifier pattern
5. [Page Layout Templates](#5-page-layout-templates) - Header, filter, content structure
6. [Table/List Patterns](#6-tablelist-patterns) - Data tables, virtual scroll lists
7. [Card/Panel Patterns](#7-cardpanel-patterns) - Cards, side panels, collapsible sections
8. [Form Patterns](#8-form-patterns) - Input groups, validation, multi-step forms
9. [Dialog/Modal Patterns](#9-dialogmodal-patterns) - Confirmation, form dialogs
10. [Navigation Patterns](#10-navigation-patterns) - Tabs, breadcrumbs, stepper
11. [Button Patterns](#11-button-patterns) - Primary, secondary, icon buttons
12. [Icon Systems](#12-icon-systems) - Sprite icons, SVG icons
13. [Loading & Empty States](#13-loading--empty-states) - Spinners, skeleton, empty state
14. [Status/Badge Patterns](#14-statusbadge-patterns) - Status indicators, badges
15. [Alert/Message Patterns](#15-alertmessage-patterns) - Alerts, toasts, notifications
16. [Responsive Patterns](#16-responsive-patterns) - Mobile/tablet breakpoints
17. [Animation & Transitions](#17-animation--transitions) - Slide, fade, keyframes
18. [Authorization Patterns](#18-authorization-patterns) - Role-based visibility
19. [Utility Classes](#19-utility-classes) - Display, spacing, text helpers
20. [Z-Index Layers](#20-z-index-layers) - Stacking order reference
21. [File Structure](#21-file-structure) - SCSS organization
22. [Checklist for AI Code Generation](#22-checklist-for-ai-code-generation) - Pre-delivery checks
23. [Avatar & Profile Image Patterns](#23-avatar--profile-image-patterns) - User overview, candidate tooltip
24. [Bulk Upload Panel](#24-bulk-upload-panel) - Drag-drop file upload

---

## 1. Quick Reference Card

### SCSS Import
```scss
@import '~assets/scss/variables';
@import '~assets/scss/mixins';
```

### BEM Formula
```
.{component}__{element}--{modifier}
Block: .candidate-list, .filter-panel, .side-panel
Element: .candidate-list__header, .filter-panel__body
Modifier: .candidate-list__item--active, .side-panel--show
```

### Essential Mixins
| Mixin | Usage |
|-------|-------|
| `@include flex-column-container` | Flex column layout |
| `@include text-truncate` | Text ellipsis overflow |
| `@include keyframes($name)` | Cross-browser keyframes |
| `@include animation($str)` | Cross-browser animation |

### Key CSS Variables
| Variable | Usage |
|----------|-------|
| `--base-color` | Primary brand color |
| `--base-text-color` | Body text color |
| `--navigation-header-height` | Header height |
| `--primary-button-background-color` | Button background |

### Icon Systems
- **Sprite Icons**: `class="sprite-icon sprite-{name} {size}"`
- **SVG Icons**: `class="svg-icon {name}-svg-icon --md"`

---

## 2. SCSS Mixins

**Location:** `/src/assets/scss/mixins.scss`

```scss
// Flexbox container - Column layout
@mixin flex-column-container {
    display: flex;
    flex-direction: column;
}

// Text truncation with ellipsis
@mixin text-truncate {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

// Cross-browser keyframe animations
@mixin keyframes($animation-name) {
    @-webkit-keyframes #{$animation-name} { @content; }
    @-moz-keyframes #{$animation-name} { @content; }
    @-ms-keyframes #{$animation-name} { @content; }
    @-o-keyframes #{$animation-name} { @content; }
    @keyframes #{$animation-name} { @content; }
}

// Cross-browser animation support
@mixin animation($str) {
    -webkit-animation: #{$str};
    -moz-animation: #{$str};
    -ms-animation: #{$str};
    -o-animation: #{$str};
    animation: #{$str};
}
```

---

## 3. CSS Variables

**Location:** `/src/assets/scss/variables.scss`

```scss
// Base Colors
$base-color: var(--base-color);
$base-text-color: var(--base-text-color);
$base-link-color: var(--base-link-color);
$error-text-color: var(--error-text-color);

// Button Colors
$primary-button-color: var(--primary-button-color);
$primary-button-background-color: var(--primary-button-background-color);
$primary-button-hover-background-color: var(--primary-button-hover-background-color);
$primary-button-disabled-color: var(--primary-button-disabled-color);
$secondary-button-color: var(--secondary-button-color);
$secondary-button-border: var(--secondary-button-border);

// Component Colors
$body-background-color: var(--body-background-color);
$table-header-color: var(--table-header-color);
$table-header-bg-color: var(--table-header-bg-color);
$input-border-color: var(--input-border-color);
$filter-background-color: var(--filter-background-color);

// Typography
$base-font-family: var(--base-font-family);
$semi-bold-font-family: var(--semi-bold-font-family);
$bold-font-family: var(--bold-font-family);
$base-font-size: var(--base-font-size);

// Font Size Scale (fixed values)
$font-size-xxs: 12px;
$font-size-xs: 14px;
$font-size-sm: 17px;
$font-size-md: 19px;
$font-size-lg: 23px;
$font-size-xl: 27px;
$font-size-xxl: 29px;

// Layout
$navigation-header-height: var(--navigation-header-height);
```

---

## 4. BEM Naming Convention

### Pattern: `.{component}__{element}--{modifier}`

```scss
// Block (top-level component)
.candidate-list { }
.filter-panel { }
.side-panel { }

// Element (part of block)
.candidate-list__header { }
.candidate-list__body { }
.candidate-list__item { }

// Modifier (state/variant)
.candidate-list__item--active { }
.candidate-list__item--blur { }
.side-panel--show { }
.side-panel--hide { }
```

### Common Blocks
| Block | Purpose |
|-------|---------|
| `.candidate-list` | Candidate table/list |
| `.candidate-card` | Candidate card display |
| `.candidate-quick-view` | Quick view panel |
| `.filter-panel` | Filter sidebar |
| `.side-panel` | Generic slide-out panel |
| `.primary-list` | Info list with icons |
| `.bravo-button` | Button component |
| `.bravo-table` | Data table |

---

## 5. Page Layout Templates

### Main Application Layout
```html
<app-spinner *ngIf="spinnerService.showSpinner$ | async"></app-spinner>
<div class="main-app">
    <div class="layout-wrapper">
        <div class="header d-print-none" *ngIf="userLogin" [hidden]="!showNavigationBar">
            <navigation-bar></navigation-bar>
        </div>
        <div class="main-content" *ngIf="userLogin">
            <router-outlet></router-outlet>
        </div>
    </div>
</div>
```

### Section-Based Page Layout
```html
<section class="filter-panel" *ngIf="isAdvancedFilterApplied">
    <filter-panel></filter-panel>
</section>

<div class="main-container candidates-page">
    <section class="main-filter candidates-page__tabs">
        <main-filter></main-filter>
    </section>

    <section class="pipeline-filter-section">
        <pipeline-filter></pipeline-filter>
    </section>

    <section class="candidate-action-section">
        <candidate-action></candidate-action>
    </section>

    <section class="candidate-list-container">
        <candidate-list-paging></candidate-list-paging>
    </section>

    <div class="candidates-page__panel">
        <!-- Side panels: candidate card, add candidate, import, filter -->
    </div>
</div>
```

---

## 6. Table/List Patterns

### Virtual Scrolling Table (Performance Optimized)
```html
<div class="candidate-list-header">
    <table class="candidate-table">
        <thead>
            <tr class="candidate-header">
                <th class="candidate-header__checkbox-icon">
                    <input class="candidate-checkbox" type="checkbox" id="checkall"
                           [checked]="selectedAll" (change)="checkAll($event)" />
                    <label class="checkbox-label" for="checkall"></label>
                </th>
                <th class="candidate-header__status-icon"></th>
                <th class="col-15">{{ 'CANDIDATE.HEADER' | translate }}</th>
            </tr>
        </thead>
    </table>
</div>

<div class="candidate-list-body">
    <virtual-scroll #scroll [childHeight]="60" [items]="candidates" (change)="onListChange($event)">
        <table class="candidate-table">
            <tbody class="candidate-table__body">
                <tr *ngFor="let candidate of scroll.viewPortItems; let i = index"
                    class="candidate-content"
                    [ngClass]="{'candidate-content--active': candidate.id == selectedCandidateId}">
                    <td class="candidate-content__col candidate-header__checkbox-icon">
                        <input type="checkbox" class="candidate-checkbox"
                               [id]="'checkcandidate' + i"
                               [checked]="candidate.isChecked"
                               (click)="onCheckCandidate(candidate, $event)" />
                        <label class="checkbox-label" [for]="'checkcandidate' + i"></label>
                    </td>
                    <td class="candidate-content__col">{{ candidate.name }}</td>
                </tr>
            </tbody>
        </table>
    </virtual-scroll>
</div>
```

### Table SCSS
```scss
.candidate-table {
    width: 100%;

    .candidate-header {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #dee5ec;
        height: 40px;
        text-transform: uppercase;
        color: #879eba;
        font-size: 13px;
    }

    &__body {
        height: 400px;
        overflow-y: auto;
        display: contents;
    }
}

.candidate-content {
    &--active {
        background-color: $table-header-bg-color;
    }

    &--blur {
        filter: blur(3px);
    }
}
```

### Column Width Classes
```scss
.col-5 { width: 5%; }
.col-10 { width: 10%; }
.col-15 { width: 15%; }
.col-20 { width: 20%; }
.col-25 { width: 25%; }
```

### Status Icons in Lists
```html
<td class="candidate-header__status-icon">
    <i class="candidate-header__action-icon sprite-icon sprite-green-dot extra-small"
       *ngIf="!candidate.isRead" aria-hidden="true"></i>
    <i class="candidate-header__action-icon sprite-icon sprite-filled-star extra-small"
       *ngIf="candidate.isFollowed" aria-hidden="true"></i>
    <i class="candidate-header__action-icon sprite-icon sprite-circle-remove extra-small"
       *ngIf="candidate.isRejected" aria-hidden="true"></i>
</td>
```

### BravoTable Component
```html
<bravo-table
    class="attachments-tab__table"
    [tableData]="attachmentList"
    [displayedColumns]="displayColumns"
    [tableOptions]="tableOptions"
    [style]="'square'"
    [showPagination]="false">
</bravo-table>
```

---

## 7. Card/Panel Patterns

### Quick View Panel (Slide-out)
```html
<div class="candidate-quick-view"
     [ngClass]="isQuickViewMode
         ? 'candidate-quick-view--dynamic' + (isShowCard ? ' candidate-quick-view--show' : ' candidate-quick-view--hide')
         : 'candidate-quick-view--fixed candidate-quick-view--show'">
    <div class="candidate-quick-view__panel">
        <div class="candidate-quick-view__header">
            <div class="candidate-list-action">
                <div class="candidate-list-action__left-action-container">
                    <!-- Navigation buttons -->
                </div>
                <div class="candidate-list-action__right-action-container">
                    <!-- Status controls -->
                </div>
            </div>

            <div class="candidate-card">
                <div class="candidate-card__image"
                     [style.background-image]="'url(' + candidate.profileImagePath + ')'">
                </div>
                <div class="candidate-card__info">
                    <!-- Info content -->
                </div>
            </div>
        </div>

        <div class="candidate-info scroll-bar">
            <!-- Info sections -->
        </div>
    </div>
</div>
```

### Panel SCSS
```scss
.candidate-quick-view {
    font-family: $base-font-family;
    color: $base-text-color;
    transition: 0.5s;
    width: 450px;
    height: 100%;
    z-index: 1;
    display: flex;
    flex-direction: column;
    position: fixed;
    top: $navigation-header-height;
    right: -450px;

    &__panel {
        background-color: #f6f8fb;
        border-left: 1px solid #dee5ec;
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    &--show { right: -1px; }
    &--hide { right: -450px; }

    &--dynamic {
        z-index: 10;
    }
}
```

### Info List Pattern
```html
<ul class="primary-list candidate-info__basic">
    <li class="primary-list__item" *ngIf="candidate.email">
        <i class="svg-icon email-icon-svg-icon --md primary-list__icon" aria-hidden="true"></i>
        <span class="primary-list__text primary-list__text--full">
            {{ candidate.email }}
        </span>
    </li>
    <li class="primary-list__item col-md-6 float-left" *ngIf="candidate.phone">
        <i class="svg-icon mobile-svg-icon --md primary-list__icon" aria-hidden="true"></i>
        <span class="primary-list__text primary-list__text--half">
            {{ candidate.phone }}
        </span>
    </li>
</ul>
```

```scss
.primary-list {
    list-style-type: none;
    text-align: left;
    padding-left: 30px;
    font-size: 14px;
    line-height: 160%;
    margin-bottom: 0;

    &__item {
        display: flex;
        align-items: flex-start;
    }

    &__text {
        margin-top: 3px;
        margin-left: 3px;

        &--full {
            @include text-truncate;
            display: block;
            max-width: 80%;
        }

        &--half {
            width: 160px;
            @include text-truncate;
        }
    }
}
```

### Side Panel Structure
```scss
.side-panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;

    &__header {
        flex-shrink: 0;
        padding: 20px 35px 15px;
    }

    &__body {
        height: 100%;
        overflow-y: auto;
    }

    &__form-controls {
        padding: 0 35px;
    }

    &__actions {
        padding: 20px 35px;
    }
}
```

---

## 8. Form Patterns

### Form Controls
```html
<input [(ngModel)]="searchText"
       (ngModelChange)="onSearchChange($event)"
       class="form-control mt-3 mb-3"
       placeholder="Search..." />

<bravo-select
    class="select-multiple-checkbox"
    [items]="options"
    [selectedValue]="selectedIds"
    [multiple]="true"
    [searchable]="false"
    [clearable]="false"
    valueField="id"
    labelField="name"
    [placeholder]="'Choose option' | translate"
    (selectedValueChange)="onSelectionChange($event)">
    <ng-template bravoOptionTmp let-item="item" let-index="index">
        <div [title]="item?.description">
            <span class="icon-checkbox">&nbsp;</span>
            <span>{{ item.name }}</span>
        </div>
    </ng-template>
</bravo-select>
```

### Input SCSS
```scss
.default-input {
    border: 1px solid $input-border-color;
    border-radius: 3px;
    height: 40px;
    line-height: 24px;
    padding: 0 10px;
    width: 100%;

    &__error {
        border: 1px solid #ff0000;
    }

    &[readonly] {
        background-color: #f0f4f6;
        color: #868686;
    }
}
```

### Custom Checkbox
```html
<input class="candidate-checkbox" type="checkbox" [id]="'check' + index"
       [checked]="item.isChecked" (change)="onCheck(item, $event)" />
<label class="checkbox-label" [for]="'check' + index"></label>
```

```scss
.candidate-checkbox {
    display: none;
}

.candidate-checkbox + .checkbox-label:before {
    content: '';
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 1px solid #97a4b7;
    cursor: pointer;
    border-radius: 4px;
}

.candidate-checkbox:checked + .checkbox-label:before {
    content: '\2713';
    color: #ffffff;
    background-color: var(--bravo-btn-main-color);
    border-color: var(--bravo-btn-main-color);
}
```

### Form Error
```html
<p class="form-error-message" *ngIf="errors.fieldName">
    {{ errors.fieldName | translate }}
</p>
```

```scss
.form-error-message {
    padding-top: 2px;
    color: red;
    margin: 0;
    font-size: 14px;
}

.required-field:after {
    color: #ff0000;
    content: '*';
    display: inline;
    padding-left: 5px;
    font-weight: 600;
}
```

---

## 9. Dialog/Modal Patterns

### Modal Structure
```html
<div class="modal" tabindex="-1" role="dialog"
     [style.display]="showPopup ? 'block' : 'none'"
     [ngClass]="'--size-' + size">
    <div [ngClass]="'modal-dialog ' + type + '-page'" role="document">
        <div class="modal-content">
            <!-- Close button -->
            <div [ngClass]="type + '-page__close-button'">
                <button type="button" class="close" (click)="onClose()">
                    <i class="sprite-icon sprite-remove big sprite-hover" aria-hidden="true"></i>
                </button>
            </div>

            <!-- Title -->
            <div [ngClass]="type + '-page__title'">
                <ng-content select="[dialog-title]"></ng-content>
            </div>

            <!-- Body -->
            <div [ngClass]="type + '-page__body'">
                <ng-content select="[dialog-content]"></ng-content>
            </div>

            <!-- Footer -->
            <div [ngClass]="type + '-page__footer'">
                <bravo-button [type]="'light'" (click)="onClose()">
                    {{ 'Cancel' | translate }}
                </bravo-button>
                <bravo-button [type]="'primary'" (click)="onConfirm()">
                    {{ 'Confirm' | translate }}
                </bravo-button>
            </div>
        </div>
    </div>
</div>
```

### Custom Popup
```html
<div class="stage-change-popup" role="document">
    <div class="stage-change-popup__model-content">
        <div class="stage-change-popup__main-content-container">
            <span class="stage-change-popup__popup-title">{{ title | translate }}</span>

            <!-- Stage transition -->
            <div class="stage-change-popup__stage-change-container">
                <span>{{ oldStageName }}</span>
                <span>→</span>
                <span>{{ newStageName }}</span>
            </div>

            <!-- Warning -->
            <div class="stage-change-popup__warning-group" *ngIf="showWarning">
                <span class="sprite-icon sprite-info small"></span>
                <span>{{ 'Warning message' | translate }}</span>
            </div>

            <!-- Comment box -->
            <comment-box [comment]="comment" [placeHolder]="'Add comment' | translate">
            </comment-box>
        </div>

        <!-- Actions -->
        <div class="stage-change-popup__action-btn-container">
            <div class="stage-change-popup__btn stage-change-popup__cancel-btn"
                 (click)="cancel()">{{ 'Cancel' | translate }}</div>
            <div class="stage-change-popup__btn stage-change-popup__confirm-btn"
                 [ngClass]="{ 'stage-change-popup__btn--disabled': isDisabled }"
                 (click)="submit()">{{ 'Submit' | translate }}</div>
        </div>
    </div>
</div>
```

---

## 10. Navigation Patterns

### Header Navigation
```html
<bravo-header
    class="navigation-bar"
    [logoClass]="logoClass"
    [logoImage]="logoImage"
    [userData]="userData"
    [systemNavLinks]="systemNavLinks"
    [routeMenuItems]="routeMenuItems"
    [activatedRouteName]="currentRouteName"
    [companyText]="company?.name"
    [navMenuText]="currentRouteText | translate">

    <!-- Route-specific search -->
    <candidate-search-container *ngIf="currentRouteName === 'CANDIDATES'"
                                class="bravo-header__middle-content">
    </candidate-search-container>

    <!-- User menu items -->
    <div class="bravo-header__user-menu-popup-content-item-group">
        <bravo-link-button *ngIf="enabledAdminPage"
                          [routerLink]="adminPage?.url"
                          class="bravo-menu__popup-content-item">
            {{ adminPage?.text | translate }}
        </bravo-link-button>
    </div>
</bravo-header>
```

### Tab Navigation
```html
<tab-navigation [menuList]="menuList" [isNavigationMenu]="true"
                [isSpriteIcon]="false"></tab-navigation>
<div class="clearfix">
    <div class="tab-item tab-item--cv tab-pane active">
        <router-outlet></router-outlet>
    </div>
</div>
```

---

## 11. Button Patterns

### Bravo Button Component
```html
<bravo-button [type]="'primary'" (click)="onSubmit()">
    {{ 'Submit' | translate }}
</bravo-button>

<bravo-button [type]="'light'" (click)="onCancel()">
    {{ 'Cancel' | translate }}
</bravo-button>

<bravo-button [type]="'primary'" [enabled]="!isDisabled" (click)="onConfirm()">
    {{ 'Confirm' | translate }}
</bravo-button>
```

### Button SCSS
```scss
.bravo-button {
    .btn-primary {
        background-color: $custom-button-background-color;
        border-color: $custom-button-background-color;

        &:hover {
            background-color: $custom-button-background-hover-color;
        }

        &:focus,
        &:not(:disabled):not(.disabled):active {
            background-color: $custom-button-background-focus-color;
        }

        &:disabled {
            background-color: $custom-button-disabled-background-color;
        }
    }
}
```

### Button Container Pattern
```scss
.default-card-button-group {
    display: flex;
    justify-content: flex-end;
    padding: 10px 20px 20px;

    & > * + * {
        margin-left: 16px;
    }
}
```

---

## 12. Icon Systems

### Sprite Icons (Legacy)
```html
<!-- Basic sprite icon -->
<i class="sprite-icon sprite-remove" aria-hidden="true"></i>

<!-- With size modifier -->
<i class="sprite-icon sprite-green-dot extra-small"></i>
<i class="sprite-icon sprite-filled-star small"></i>
<i class="sprite-icon sprite-remove big"></i>

<!-- With hover effect -->
<i class="sprite-icon sprite-remove big sprite-hover"></i>
```

### SVG Icons (Modern)
```html
<!-- Basic SVG icon -->
<i class="svg-icon email-icon-svg-icon --md" aria-hidden="true"></i>

<!-- With size class -->
<i class="svg-icon person-square-icon size-24"></i>

<!-- As component -->
<app-icon icon iconName="CreateJobIcon"></app-icon>
```

### Icon Sizes
| Class | Size |
|-------|------|
| `extra-small` | 12px |
| `small` | 16px |
| `--md` | 20px |
| `big` | 24px |
| `size-24` | 24px |

---

## 13. Loading & Empty States

### Global Spinner
```html
<app-spinner *ngIf="spinnerService.showSpinner$ | async"></app-spinner>
```

### Local Loading Spinner
```html
<span class="spinner" *ngIf="isLoading" aria-hidden="true"></span>
```

### Empty State Template
```html
<ng-template #noDataTemplate>
    <div class="attachments-tab__empty-data-container" @fadeInAnimation>
        <i class="svg-icon mask-group-svg-icon attachments-tab__empty-data-icon"
           aria-hidden="true"></i>
        <div class="attachments-tab__empty-data"
             [innerHTML]="'No data available' | translate">
        </div>
    </div>
</ng-template>
```

---

## 14. Status/Badge Patterns

### Status Indicator
```html
<td class="job-header__status-process">
    <i class="status-icon" [ngStyle]="{ background: item.status?.color }"></i>
    <span class="job-content__status-text">{{ item.status?.name | translate }}</span>
</td>
```

### Rejection Status
```html
<div class="candidate-info d-print-none" *ngIf="application.isRejected">
    <ul class="primary-list primary-list--rejected">
        <li class="primary-list__item primary-list__item--cover">
            <i class="svg-icon delete-svg-icon --md" aria-hidden="true"></i>
            <span class="primary-list__text primary-list__text--rejected">
                {{ 'Rejected because' | translate }} {{ application.rejectReason | translate }}
            </span>
        </li>
    </ul>
</div>
```

### Badge/Summary
```html
<div class="job-content__summary">
    <div class="job-content__item">
        <span class="job-content__badge job-content__badge--applications"></span>
        <span class="job-content__label">{{ 'Applications' | translate }}</span>
        <span class="job-content__value --space-left">{{ job.totalApplied }}</span>
    </div>
    <div class="job-content__item">
        <span class="job-content__badge job-content__badge--hired"></span>
        <span class="job-content__label">{{ 'Hired' | translate }}</span>
        <span class="job-content__value --space-left">{{ job.totalHired }}</span>
    </div>
</div>
```

### Tags
```html
<div class="application-tag">
    <div class="application-tag__header-panel">
        {{ 'Tags' | translate }}
        <i *ngIf="!isEditTag" (click)="openInputAddTag($event)"
           class="svg-icon add-plus-svg-icon application-tag__add-icon d-print-none"
           aria-hidden="true"></i>
    </div>
    <ul class="application-tag__list" *ngIf="tags">
        <li class="application-tag__item" *ngFor="let tag of tags">
            <span class="application-tag__text">{{ tag }}</span>
            <i class="svg-icon close-tag-icon-svg-icon application-tag__icon d-print-none"
               aria-hidden="true" (click)="onRemoveTag(tag)"></i>
        </li>
    </ul>
</div>
```

### File Upload Patterns

**upload-file-v2 component:**
```html
<upload-file-v2
    class="stage-change-popup__upload-file"
    [layout]="'vertical'"
    (fileChanges)="onFileChange($event)">
</upload-file-v2>
```

**cv-uploader component:**
```html
<app-cv-uploader [files]="fileCV" (fileChange)="fileCVUpload($event)"></app-cv-uploader>
```

**cv-with-source-uploader (with source selection):**
```html
<app-cv-with-source-uploader
    [files]="fileCV"
    [selectedSource]="selectedSource"
    [sourceOptions]="sourceOptions"
    (fileChange)="fileCVUpload($event)"
    (sourceChange)="onSourceChange($event)">
</app-cv-with-source-uploader>
```

**SCSS:**
```scss
.cv-with-source-uploader-container {
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

    &__upload {
        padding-left: 11px;
        height: 40px;
    }

    &__select-button {
        display: flex;
        cursor: pointer;
    }

    &__upload-cv-icon {
        display: block;
    }

    &__flex-h-fill-remaining {
        flex: 1 1 auto;
        min-width: 0;
    }

    &__display-section {
        padding: 11px 0;
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

    &__remove {
        cursor: pointer;
    }

    &__error {
        color: red;
    }

    &__guide-text {
        color: #999999;
        font-size: 12px;
        margin-top: 8px;
    }

    &__title {
        font-weight: 600;
        margin-top: 16px;
        margin-bottom: 8px;
    }
}
```

### Collapsible/Expandable Sections

**Search Fields Collapse Pattern:**
```html
<div [ngClass]="!isCollapsed ? 'search-fields-container' : 'search-fields-container search-fields-container--collapse'">
    <div class="search-fields-action" *ngIf="!isCollapsed">
        <a class="search-fields-action__button" (click)="collapseSearchField()">
            <i class="sprite-icon sprite-arrow-right big sprite-hover" aria-hidden="true"></i>
        </a>
    </div>
    <!-- Search field content -->
    <div class="search-fields-action" *ngIf="isCollapsed" (click)="collapseSearchField()">
        <span class="search-fields-action__icon-container">
            <i class="sprite-icon sprite-arrow-left big sprite-hover search-fields-action__collapse" aria-hidden="true"></i>
        </span>
        <span class="search-fields-action__text search-fields-action__text--collapse">
            {{ 'Advanced Search' | translate }}
        </span>
    </div>
</div>
```

**SCSS:**
```scss
.search-fields-container {
    @include flex-column-container();
    background-color: $background-color;
    padding: 16px;
    transition: width 0.3s ease;

    &--collapse {
        width: 40px;
        padding: 8px;
    }
}

.search-fields-action {
    &__button {
        cursor: pointer;
        display: flex;
        align-items: center;
    }

    &__collapse {
        transform: rotate(180deg);
    }

    &__text {
        writing-mode: vertical-rl;
        text-orientation: mixed;

        &--collapse {
            font-weight: 500;
            color: $text-primary-color;
        }
    }
}

.filter-condition {
    &--collapse {
        display: none;
    }
}

.action-section {
    &--collapse {
        display: none;
    }
}
```

---

## 15. Alert/Message Patterns

### Alert Component
```html
<div *ngIf="alertMessage?.message"
     class="alert"
     [ngClass]="alertMessage.alertClass">
    <span *ngIf="!alertMessage.canHandle">{{ alertMessage.message | translate }}</span>
    <span *ngIf="alertMessage.canHandle">
        <span>{{ stringBefore }} </span>
        <a class="alert-link-color" (click)="clickHere()">{{ textToCut }}</a>
        <span>{{ stringAfter }}</span>
    </span>
    <i *ngIf="alertMessage.closable"
       class="alert-close-icon sprite-icon sprite-remove extra-small sprite-hover"
       aria-hidden="true" (click)="onClose()"></i>
</div>
```

### Warning Messages
```html
<div class="alert-message" *ngIf="hasWarning">
    <i class="svg-icon warning-svg-icon --md alert-message__icon" aria-hidden="true"></i>
    <div>{{ 'Warning message' | translate }}</div>
</div>
```

---

## 16. Responsive Patterns

### Media Queries
```scss
// Tablet to desktop
@media (min-width: 768px) and (max-width: 1366px) {
    .main-app {
        // Tablet styles
    }
}

// Landscape orientation
@media (max-width: 1366px) and (orientation: landscape) {
    .main-app {
        // Landscape styles
    }
}

// Print styles
@media print {
    body {
        background-color: white;
    }

    .candidate-quick-view {
        padding-top: 50px;
        height: auto;
        border: none !important;
        width: 100%;
    }
}
```

### Calc-based Heights
```scss
.candidate-list-body {
    &--default virtual-scroll {
        height: calc(100vh - (250px + #{$navigation-header-height}));
    }

    &--with-filter virtual-scroll {
        height: calc(100vh - (180px + #{$navigation-header-height}));
    }
}
```

---

## 17. Animation & Transitions

### Angular Animations
```html
<div @fadeInAnimation><!-- Content --></div>
<div @togglePanelAnimations><!-- Panel --></div>
<bulk-upload-cv-panel @toggle-bulk-upload-cv-panel *ngIf="showPanel">
</bulk-upload-cv-panel>
```

### CSS Transitions
```scss
.candidate-quick-view {
    transition: 0.5s;
}

.icon__rotation {
    transform: rotate(180deg);
    transition: transform 0.5s ease-in-out;
}
```

### Visibility Toggle Classes
```scss
.element {
    &--show { right: -1px; }
    &--hide { right: -450px; }
}

[ngClass]="showCard ? 'card--show' : 'card--hide'"
```

---

## 18. Authorization Patterns

### Role-Based Visibility
```html
<!-- Section-level permission -->
<section *ngIf="authService.canPerformGroupAction(JOB_GROUP_ACTION_KEYS.JOB_MANAGEMENT_GROUP)">
    <!-- Content -->
</section>

<!-- Action-level permission -->
<bravo-button *ngIf="authService.canPerformAction(JOB_ACTION_KEYS.JOB_CREATE_JOB)"
              [type]="'primary'" (click)="showCreateJobForm()">
    {{ 'Create Job' | translate }}
</bravo-button>

<!-- Feature toggle -->
<ng-container *ngIf="featureToggle.displaySkillMatch">
    <th class="candidate-header__skill-matching-icon">
        {{ 'Skill Match' | translate }}
    </th>
</ng-container>
```

---

## 19. Utility Classes

### Display Utilities
```scss
.hidden { display: none !important; }
.d-print-none { /* Hide in print */ }
.clearfix { /* Clear floats */ }
```

### Spacing Utilities
```scss
.mb-35px { margin-bottom: 35px !important; }
.mr-5px { margin-right: 5px !important; }
.mr-10px { margin-right: 10px !important; }
.ml-5px { margin-left: 5px !important; }
.ml-10px { margin-left: 10px !important; }
.ml-15px { margin-left: 15px !important; }
.mt-3 { margin-top: 1rem !important; }
.mb-3 { margin-bottom: 1rem !important; }
```

### Text Utilities
```scss
.text-truncate { @include text-truncate; }
.font-weight-semibold { font-weight: 600 !important; }
```

### Layout Utilities
```scss
.cursor-pointer { cursor: pointer; }
.scroll-bar { /* Custom scrollbar */ }
```

---

## 20. Z-Index Layers

```scss
// Layer order (low to high)
.candidate-quick-view { z-index: 1; }
.candidate-quick-view--dynamic { z-index: 10; }
.go-to-top { z-index: 99; }
.toolbar-container { z-index: 100; }
```

---

## 21. File Structure

```
src/Web/bravoTALENTSClient/src/
├── assets/scss/
│   ├── variables.scss          # CSS variable mappings
│   ├── mixins.scss             # Reusable mixins
│   ├── application.scss        # Utility classes
│   ├── base.scss               # Global base styles
│   ├── fonts.scss              # Font definitions
│   ├── index.scss              # Main entry point
│   ├── theme/
│   │   └── default/            # Theme-specific styles
│   ├── custom/                 # 3rd-party overrides
│   └── components/             # Reusable component styles
├── styles.scss                 # Global imports
└── app/
    └── [feature]/
        └── *.component.scss    # Component-scoped styles
```

### SCSS Import Order (index.scss)
```scss
@import './variables.scss';
@import './mixins.scss';
@import './application.scss';
@import './base.scss';
@import './fonts.scss';
@import './theme/default/button.scss';
@import './theme/default/input.scss';
@import './custom/bootstrap-custom.scss';
@import './custom/material-custom.scss';
@import './components/checkbox.scss';
@import './components/bravo-button.scss';
@import './components/bravo-table.scss';
// ... more components
```

---

## 22. Checklist for AI Code Generation

### HTML
- [ ] All elements have BEM classes (`{block}__{element}--{modifier}`)
- [ ] Translation pipe for all user-facing text (`| translate`)
- [ ] ARIA attributes on icons (`aria-hidden="true"`)
- [ ] Role-based visibility with `*ngIf="authService.canPerform..."`
- [ ] Virtual scroll for lists > 50 items
- [ ] Print-safe classes (`d-print-none`) on non-printable elements
- [ ] Empty state template when no data

### SCSS
- [ ] Uses CSS variables via `$variable`
- [ ] Uses mixins (`@include flex-column-container`)
- [ ] Uses `@include text-truncate` for overflow
- [ ] BEM naming convention
- [ ] Calc-based heights referencing `$navigation-header-height`
- [ ] Transition for slide panels (0.5s)
- [ ] Z-index within established layers

### Components
- [ ] `bravo-button` for buttons
- [ ] `bravo-select` for dropdowns
- [ ] `bravo-table` for data tables
- [ ] `virtual-scroll` for large lists
- [ ] `app-spinner` for loading
- [ ] `comment-box` for rich text input

---

## 23. Avatar & Profile Image Patterns

### User Overview Component

Profile card with avatar for user/candidate display.

**HTML Pattern:**
```html
<div class="user-overview">
    <div class="user-overview__sticky">
        <div class="user-overview__actions-container">
            <span class="user-overview__arrow-icon sprite-icon sprite-arrow medium" (click)="goBack()"></span>
            <span class="user-overview__close-icon sprite-icon sprite-close medium" (click)="close()"></span>
        </div>
        <div class="user-overview__header">
            <img class="user-overview__profile-image" [src]="profileImageUrl" [alt]="userName" />
            <div class="user-overview__name-container">
                <span class="user-overview__name">{{ userName }}</span>
                <div class="user-overview__detail-actions-container">
                    <span (click)="viewProfile()">{{ 'View Profile' | translate }}</span>
                    <span (click)="sendEmail()">{{ 'Send Email' | translate }}</span>
                </div>
            </div>
        </div>
    </div>
    <div class="user-overview__body">
        <div class="user-overview__basic-info-container">
            <span class="user-overview__info-item">
                <strong>{{ 'Email' | translate }}:</strong> {{ email }}
            </span>
            <span class="user-overview__info-item">
                <strong>{{ 'Phone' | translate }}:</strong> {{ phone }}
            </span>
        </div>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import '~assets/scss/variables';

.user-overview {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;
    font-size: 16px;
    line-height: 24px;

    &__sticky {
        padding: 20px 30px 0 30px;
    }

    &__body {
        padding: 0 30px 30px 30px;
        overflow-y: auto;
    }

    &__actions-container {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
    }

    &__arrow-icon {
        cursor: pointer;
        margin-right: 20px;
    }

    &__close-icon {
        cursor: pointer;
    }

    &__header {
        display: flex;
        margin-bottom: 25px;
    }

    &__name-container {
        display: flex;
        flex-direction: column;
    }

    &__name {
        font-size: $font-size-lg;
        line-height: 1.2;
        margin-bottom: 10px;
    }

    &__profile-image {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        margin-right: 20px;
        object-fit: cover;
    }

    &__detail-actions-container {
        display: flex;
        font-size: 14px;
        color: $base-link-color;

        > * {
            cursor: pointer;
        }

        > * + * {
            margin-left: 20px;
        }
    }

    &__basic-info-container {
        display: flex;
        flex-direction: column;
        margin-bottom: 25px;

        > * + * {
            margin-top: 5px;
        }
    }
}
```

### Candidate Tooltip with Avatar

Hover tooltip showing candidate summary.

**HTML Pattern:**
```html
<div class="candidate-tooltip">
    <div class="candidate-tooltip__header">
        <img class="candidate-tooltip__avatar" [src]="avatarUrl" [alt]="candidateName" />
        <div class="candidate-tooltip__info">
            <span class="candidate-tooltip__name">{{ candidateName }}</span>
            <span class="candidate-tooltip__position">{{ currentPosition }}</span>
        </div>
    </div>
    <div class="candidate-tooltip__body">
        <div class="candidate-tooltip__field">
            <span class="candidate-tooltip__label">{{ 'Experience' | translate }}:</span>
            <span class="candidate-tooltip__value">{{ yearsOfExperience }} {{ 'years' | translate }}</span>
        </div>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import '~assets/scss/variables';

.candidate-tooltip {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 280px;

    &__header {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
    }

    &__avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        margin-right: 12px;
        object-fit: cover;
    }

    &__info {
        display: flex;
        flex-direction: column;
    }

    &__name {
        font-size: $font-size-md;
        font-weight: 600;
        color: $base-text-color;
    }

    &__position {
        font-size: $font-size-sm;
        color: $secondary-text-color;
    }

    &__body {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__field {
        display: flex;
        gap: 8px;
    }

    &__label {
        font-weight: 500;
        color: $secondary-text-color;
    }

    &__value {
        color: $base-text-color;
    }
}
```

---

## 24. Bulk Upload Panel

File upload with drag-and-drop and progress tracking.

**HTML Pattern:**
```html
<div class="bulk-upload-panel" [class.bulk-upload-panel--dragging]="isDragging">
    <div class="bulk-upload-panel__header">
        <h3 class="bulk-upload-panel__title">{{ 'Upload Files' | translate }}</h3>
        <span class="bulk-upload-panel__close sprite-icon sprite-close" (click)="close()"></span>
    </div>
    <div
        class="bulk-upload-panel__drop-zone"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)">
        <span class="bulk-upload-panel__icon sprite-icon sprite-upload large"></span>
        <span class="bulk-upload-panel__instruction">
            {{ 'Drag and drop files here or' | translate }}
            <label class="bulk-upload-panel__browse-link">
                {{ 'browse' | translate }}
                <input type="file" multiple (change)="onFilesSelected($event)" />
            </label>
        </span>
        <span class="bulk-upload-panel__hint">{{ 'Supported formats: PDF, DOC, DOCX' | translate }}</span>
    </div>
    <div class="bulk-upload-panel__file-list" *ngIf="files.length">
        <div class="bulk-upload-panel__file" *ngFor="let file of files">
            <span class="bulk-upload-panel__file-name">{{ file.name }}</span>
            <span class="bulk-upload-panel__file-size">{{ file.size | fileSize }}</span>
            <div class="bulk-upload-panel__file-progress" *ngIf="file.uploading">
                <div class="bulk-upload-panel__file-progress-bar" [style.width.%]="file.progress"></div>
            </div>
            <span class="bulk-upload-panel__file-remove sprite-icon sprite-close" (click)="removeFile(file)"></span>
        </div>
    </div>
    <div class="bulk-upload-panel__footer">
        <bravo-button type="secondary" (click)="cancel()">{{ 'Cancel' | translate }}</bravo-button>
        <bravo-button type="primary" [disabled]="!files.length" (click)="upload()">{{ 'Upload' | translate }}</bravo-button>
    </div>
</div>
```

**SCSS Pattern:**
```scss
@import '~assets/scss/variables';

.bulk-upload-panel {
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 8px;
    width: 500px;
    max-width: 90vw;

    &--dragging {
        .bulk-upload-panel__drop-zone {
            border-color: $base-color;
            background-color: rgba($base-color, 0.05);
        }
    }

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
        margin: 0;
    }

    &__close {
        cursor: pointer;
    }

    &__drop-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        margin: 20px;
        border: 2px dashed $border-color;
        border-radius: 8px;
        transition: all 0.2s ease;
    }

    &__icon {
        margin-bottom: 16px;
    }

    &__instruction {
        font-size: $font-size-sm;
        color: $secondary-text-color;
        text-align: center;
    }

    &__browse-link {
        color: $base-link-color;
        cursor: pointer;
        text-decoration: underline;

        input {
            display: none;
        }
    }

    &__hint {
        font-size: 12px;
        color: $placeholder-color;
        margin-top: 8px;
    }

    &__file-list {
        max-height: 200px;
        overflow-y: auto;
        padding: 0 20px;
    }

    &__file {
        display: flex;
        align-items: center;
        padding: 10px;
        border: 1px solid $border-color;
        border-radius: 4px;
        margin-bottom: 8px;
    }

    &__file-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__file-size {
        font-size: 12px;
        color: $secondary-text-color;
        margin: 0 12px;
    }

    &__file-progress {
        width: 100px;
        height: 4px;
        background: $border-color;
        border-radius: 2px;
        overflow: hidden;
    }

    &__file-progress-bar {
        height: 100%;
        background: $base-color;
        transition: width 0.2s ease;
    }

    &__file-remove {
        cursor: pointer;
        margin-left: 12px;
    }

    &__footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding: 16px 20px;
        border-top: 1px solid $border-color;
    }
}
