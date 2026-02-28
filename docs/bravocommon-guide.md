# BravoCommon UI Library Guide

> @orient/bravo-common 5.0.28 - Shared UI components for Angular 12 applications

## Overview

**@orient/bravo-common** is BravoSUITE's comprehensive shared UI component library. Built with **Angular 12.2.17**, it provides reusable components, services, directives, and utilities for Legacy Web applications.

## Installation

```bash
npm install @orient/bravo-common@~5.0.28 --save

# Peer dependencies
npm install @angular/core@12.2.17 @angular/common@12.2.17 @angular/forms@12.2.17
npm install @angular/material@12.2.13 @angular/cdk@12.2.13
npm install @kendo/angular-buttons@5.5.0 @kendo/angular-dateinputs@5.5.0
npm install @kendo/angular-dropdowns@5.5.0 @kendo/angular-grid@5.5.0
npm install moment@^2.29.4 moment-timezone@^0.5.43
npm install rxjs@~6.5.5 zone.js@~0.11.4
```

## What's Included

| Category | Items | Description |
|----------|-------|-------------|
| **Foundation** | `BaseComponent`, `BaseDirective` | Lifecycle management, subscription cleanup |
| **UI Components** | Alert, Table, Icon, Select | Essential UI building blocks |
| **Form Controls** | Input, DatePicker, Checkbox | Enhanced form controls |
| **Data Display** | Card, Pagination, Tree | Data visualization |
| **Directives** | Popover, TextEllipsis, Button, Autofocus | Reusable DOM behaviors |
| **Pipes** | LocalizedDate, Pluralize, Safe, TranslateComma | Data transformation |
| **Services** | Translate, Theme, Script, Dialog | Business services |

---

## Quick Start

### 1. Import Modules

```typescript
// app.module.ts (root)
import { BravoCommonModule, BravoCommonRootModule } from '@orient/bravo-common';

@NgModule({
    imports: [
        BrowserModule,
        BravoCommonRootModule.forRoot(), // Root only - provides singletons
        BravoCommonModule
    ]
})
export class AppModule {}

// feature.module.ts
@NgModule({
    imports: [
        CommonModule,
        BravoCommonModule // Feature modules - NOT BravoCommonRootModule
    ]
})
export class FeatureModule {}
```

### 2. Use Foundation Classes

```typescript
import { BaseComponent } from '@orient/bravo-common';

@Component({
    selector: 'app-employee-list',
    templateUrl: './employee-list.component.html'
})
export class EmployeeListComponent extends BaseComponent implements OnInit {
    ngOnInit() {
        this.employeeService.getEmployees()
            .pipe(this.untilDestroy()) // Auto cleanup
            .subscribe(employees => {
                this.employees = employees;
                this.detectChanges();
            });
    }
}
```

### 3. UI Components

```html
<!-- Alert -->
<bravo-alert [type]="'success'" [message]="'Saved successfully'"></bravo-alert>

<!-- Table with Pagination -->
<bravo-table
    [data]="employees"
    [columns]="tableColumns"
    [options]="tableOptions"
    (rowClick)="onRowClick($event)">
</bravo-table>

<!-- Select with Async Data -->
<bravo-select
    formControlName="departmentId"
    [fetchDataFn]="loadDepartments"
    [labelField]="'name'"
    [valueField]="'id'"
    [searchable]="true">
</bravo-select>

<!-- Date Picker -->
<bravo-date-picker
    formControlName="startDate"
    [format]="'dd/MM/yyyy'">
</bravo-date-picker>
```

### 4. Directives

```html
<!-- Text Ellipsis with Tooltip -->
<div appTextEllipsis [maxTextEllipsisLines]="2">{{ employee.description }}</div>

<!-- Popover -->
<button appPopover [popoverContent]="'Info'" [popoverTrigger]="'hover'">Hover</button>

<!-- Autofocus -->
<input type="text" appAutofocus [autofocusDelay]="100" />
```

### 5. Pipes

```html
{{ employee.hireDate | localizedDate:'shortDate' }}
{{ count }} {{ 'employee' | pluralize:count }}
<div [innerHTML]="htmlContent | bravoSafe"></div>
{{ labels | translateComma }}
```

### 6. Services

```typescript
import { BravoTranslateService, ThemeService, DialogService } from '@orient/bravo-common';

export class MyComponent {
    constructor(
        private translateService: BravoTranslateService,
        private themeService: ThemeService,
        private dialogService: DialogService
    ) {}

    translate() {
        return this.translateService.instant('common.save');
    }

    switchTheme() {
        this.themeService.setTheme('dark-theme');
    }

    openDialog() {
        this.dialogService.open(MyDialogComponent, {
            width: '600px',
            data: { employee: this.selectedEmployee }
        });
    }
}
```

---

## SCSS Styles

```scss
// Import in global styles.scss
@import '~@orient/bravo-common/styles/_styles.scss';

// Available variables
$app-primary-color: #1976d2;
$app-accent-color: #ff4081;
$app-space-sm: 8px;
$app-space-md: 16px;
$app-space-lg: 24px;

// Available mixins
@include custom-webkit-scrollbar();
@include create-flex-container(row);
@include create-ripple($primary-color);
```

---

## Local Package Management

For Angular 12 compatibility, BravoCommon is managed as local `.tgz` packages in `src/Web/libs/`.

### Package Structure

```
src/Web/libs/
├── orient-bravo-common-4.0.0.tgz  # Angular 11
└── orient-bravo-common-5.0.0.tgz  # Angular 12
```

### Using Local Package

```json
{
    "dependencies": {
        "@orient/bravo-common": "file:../libs/orient-bravo-common-5.0.0.tgz"
    }
}
```

### Creating Local Package

```bash
cd src/Web/BravoComponents
npm install
npm run build bravo-common-lib
cd dist/bravo-common-lib
npm version 5.0.0 --no-git-tag-version
npm pack
move orient-bravo-common-5.0.0.tgz ../../libs/
```

### Docker Integration

```dockerfile
FROM node:18-alpine AS angular-built
WORKDIR /usr/src/app

# Copy libs FIRST
COPY libs /usr/src/libs
COPY ClientApp/package.json ./
RUN npm install --force
COPY ClientApp/ .
RUN npm run build
```

---

## Dependencies

**Angular 12:**
- `@angular/core@12.2.17`
- `@angular/material@12.2.13`
- `@angular/cdk@12.2.13`

**Kendo UI (v5.5.0):**
- `@kendo/angular-buttons`
- `@kendo/angular-dateinputs`
- `@kendo/angular-dropdowns`
- `@kendo/angular-grid`

**Utilities:**
- `moment@^2.29.4`
- `rxjs@~6.5.5`
- `lodash-es@^4.17.21`

---

## Best Practices

1. **Always extend BaseComponent** for lifecycle management
2. **Import BravoCommonModule** in every feature module
3. **Use BravoCommonRootModule.forRoot()** only in root module
4. **Follow Material Design** principles
5. **Use provided utilities** before custom implementations

---

## Source Code

```
src/Web/BravoComponents/projects/bravo-common-lib/
```

**Examples:** See any Legacy Web app for real-world usage

---

**Next:** [WebV2 Architecture](./webv2-architecture.md) | [Frontend Patterns](./claude/frontend-patterns.md)
