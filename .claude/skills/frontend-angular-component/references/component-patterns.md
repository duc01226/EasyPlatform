# Angular Component Patterns Reference

Detailed code examples and patterns for Angular component development with EasyPlatform.

---

## File Location

```
src/Frontend/apps/{app-name}/src/app/
└── features/
    └── {feature}/
        ├── {feature}.component.ts
        ├── {feature}.component.html
        ├── {feature}.component.scss
        └── {feature}.store.ts (if using store)
```

---

## Pattern 1: List Component with Store

### Store Definition

```typescript
// {feature}.store.ts
import { Injectable } from '@angular/core';
import { PlatformVmStore } from '@libs/platform-core';

export interface FeatureListState {
    items: FeatureDto[];
    selectedItem?: FeatureDto;
    filters: FeatureFilters;
}

@Injectable()
export class FeatureListStore extends PlatformVmStore<FeatureListState> {
    protected override vmConstructor = (data?: Partial<FeatureListState>) =>
        ({ items: [], filters: {}, ...data }) as FeatureListState;

    public readonly items$ = this.select(state => state.items);
    public readonly selectedItem$ = this.select(state => state.selectedItem);

    public loadItems = this.effectSimple(() =>
        this.featureApi.getList(this.currentVm().filters).pipe(
            this.observerLoadingErrorState('loadItems'),
            this.tapResponse(items => this.updateState({ items }))
        )
    );

    public saveItem = this.effectSimple((item: FeatureDto) =>
        this.featureApi.save(item).pipe(
            this.observerLoadingErrorState('saveItem'),
            this.tapResponse(saved => {
                this.updateState(state => ({
                    items: state.items.upsertBy(x => x.id, [saved])
                }));
            })
        )
    );

    public deleteItem = this.effectSimple((id: string) =>
        this.featureApi.delete(id).pipe(
            this.observerLoadingErrorState('deleteItem'),
            this.tapResponse(() => {
                this.updateState(state => ({
                    items: state.items.filter(x => x.id !== id)
                }));
            })
        )
    );

    constructor(private featureApi: FeatureApiService) {
        super();
    }
}
```

### List Component

```typescript
// {feature}-list.component.ts
import { Component, OnInit } from '@angular/core';
import { AppBaseVmStoreComponent } from '@libs/apps-domains';
import { FeatureListStore, FeatureListState } from './feature-list.store';

@Component({
    selector: 'app-feature-list',
    templateUrl: './feature-list.component.html',
    styleUrls: ['./feature-list.component.scss'],
    providers: [FeatureListStore]
})
export class FeatureListComponent extends AppBaseVmStoreComponent<FeatureListState, FeatureListStore> implements OnInit {
    trackByItem = this.ngForTrackByItemProp<FeatureDto>('id');

    constructor(store: FeatureListStore) {
        super(store);
    }

    ngOnInit(): void {
        this.store.loadItems();
    }

    onRefresh(): void {
        this.reload();
    }

    onDelete(item: FeatureDto): void {
        this.store.deleteItem(item.id);
    }

    get isDeleting$() {
        return this.store.isLoading$('deleteItem');
    }
}
```

### List Template

```html
<app-loading-and-error-indicator [target]="this">
    @if (vm(); as vm) {
    <div class="feature-list">
        <div class="feature-list__header">
            <h1 class="feature-list__title">Features</h1>
            <button class="feature-list__btn --refresh" (click)="onRefresh()" [disabled]="isStateLoading()()">
                Refresh
            </button>
        </div>

        <div class="feature-list__content">
            @for (item of vm.items; track trackByItem) {
            <div class="feature-list__item">
                <span class="feature-list__item-name">{{ item.name }}</span>
                <button class="feature-list__item-btn --delete" (click)="onDelete(item)" [disabled]="isDeleting$() === true">
                    Delete
                </button>
            </div>
            } @empty {
            <div class="feature-list__empty">No items found</div>
            }
        </div>
    </div>
    }
</app-loading-and-error-indicator>
```

---

## Pattern 2: Form Component

```typescript
// {feature}-form.component.ts
import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { AppBaseFormComponent } from '@libs/apps-domains';
import { ifAsyncValidator, noWhitespaceValidator } from '@libs/platform-core';

export interface FeatureFormVm {
    id?: string;
    name: string;
    code: string;
    status: FeatureStatus;
    effectiveDate?: Date;
}

@Component({
    selector: 'app-feature-form',
    templateUrl: './feature-form.component.html'
})
export class FeatureFormComponent extends AppBaseFormComponent<FeatureFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required, Validators.maxLength(200), noWhitespaceValidator]),
            code: new FormControl(
                this.currentVm().code,
                [Validators.required, Validators.pattern(/^[A-Z0-9-]+$/)],
                [ifAsyncValidator(() => !this.isViewMode(), this.checkCodeUniqueValidator())]
            ),
            status: new FormControl(this.currentVm().status, [Validators.required]),
            effectiveDate: new FormControl(this.currentVm().effectiveDate)
        },
        dependentValidations: { code: ['status'] }
    });

    protected initOrReloadVm = (isReload: boolean) => {
        if (this.mode === 'create') {
            return of<FeatureFormVm>({ name: '', code: '', status: FeatureStatus.Draft });
        }
        return this.featureApi.getById(this.featureId);
    };

    private checkCodeUniqueValidator() {
        return async (control: AbstractControl) => {
            const exists = await firstValueFrom(this.featureApi.checkCodeExists(control.value, this.currentVm().id));
            return exists ? { codeExists: true } : null;
        };
    }

    onSubmit(): void {
        if (!this.validateForm()) return;
        this.featureApi
            .save(this.currentVm())
            .pipe(
                this.observerLoadingErrorState('save'),
                this.tapResponse(saved => this.onSaveSuccess(saved), error => this.onSaveError(error)),
                this.untilDestroyed()
            )
            .subscribe();
    }

    constructor(private featureApi: FeatureApiService) {
        super();
    }
}
```

### Form Template

```html
<form class="feature-form" [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="feature-form__field">
        <label class="feature-form__label" for="name">Name *</label>
        <input class="feature-form__input" id="name" formControlName="name" />
        @if (formControls('name').errors?.['required']) {
        <span class="feature-form__error">Name is required</span>
        }
    </div>

    <div class="feature-form__field">
        <label class="feature-form__label" for="code">Code *</label>
        <input class="feature-form__input" id="code" formControlName="code" />
        @if (formControls('code').errors?.['codeExists']) {
        <span class="feature-form__error">Code already exists</span>
        } @if (formControls('code').pending) {
        <span class="feature-form__info">Checking...</span>
        }
    </div>

    <div class="feature-form__actions">
        <button class="feature-form__btn --cancel" type="button" (click)="onCancel()">Cancel</button>
        <button class="feature-form__btn --submit" type="submit" [disabled]="!form.valid || isLoading$('save')()">
            {{ isLoading$('save')() ? 'Saving...' : 'Save' }}
        </button>
    </div>
</form>
```

---

## Pattern 3: Simple Component

```typescript
// {feature}-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppBaseComponent } from '@libs/apps-domains';

@Component({
    selector: 'app-feature-card',
    template: `
        <div class="feature-card" [class.--selected]="isSelected">
            <h3 class="feature-card__title">{{ feature.name }}</h3>
            <p class="feature-card__description">{{ feature.description }}</p>
            @if (canEdit) {
                <button class="feature-card__btn --edit" (click)="onEdit.emit(feature)">Edit</button>
            }
        </div>
    `
})
export class FeatureCardComponent extends AppBaseComponent {
    @Input() feature!: FeatureDto;
    @Input() isSelected = false;
    @Output() onEdit = new EventEmitter<FeatureDto>();

    get canEdit(): boolean {
        return this.hasRole('Admin', 'Manager');
    }
}
```

---

## Key Platform APIs

### Lifecycle & Subscriptions

```typescript
this.data$.pipe(this.untilDestroyed()).subscribe();
this.storeSubscription('key', observable.subscribe());
this.cancelStoredSubscription('key');
```

### Loading/Error State

```typescript
observable.pipe(this.observerLoadingErrorState('requestKey'));
isLoading$('requestKey')();
getErrorMsg$('requestKey')();
isStateLoading()();
isStateError()();
```

### Response Handling

```typescript
observable.pipe(
    this.tapResponse(
        result => { /* success */ },
        error => { /* error */ }
    )
);
```

### Track-by Functions

```typescript
trackByItem = this.ngForTrackByItemProp<Item>('id');
trackByList = this.ngForTrackByImmutableList(this.items);
```

---

## Code Responsibility Hierarchy

| Layer            | Responsibility                                                            |
| ---------------- | ------------------------------------------------------------------------- |
| **Entity/Model** | Display helpers, static factory methods, default values, dropdown options |
| **Service**      | API calls, command factories, data transformation                         |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers              |

```typescript
// Wrong: Logic in component
readonly authTypes = [{ value: AuthType.OAuth2, label: 'OAuth2' }, ...];

// Correct: Logic in entity/model
readonly authTypes = AuthConfigurationDisplay.getApiAuthTypeOptions();
```

Common refactoring targets:
- Dropdown options -> static method in entity: `Entity.getOptions()`
- Display logic -> instance method: `entity.getStatusCssClass()`
- Default values -> static method: `Entity.getDefaultValue()`
- Command building -> factory in service: `CommandFactory.buildSaveCommand(formValues)`
