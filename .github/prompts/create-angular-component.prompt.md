---
mode: 'agent'
tools: ['editFiles', 'codebase', 'terminal']
description: 'Scaffold Angular component following EasyPlatform frontend patterns'
---

# Create Angular Component

Create a new Angular component following platform patterns:

**Component Name:** ${input:componentName}
**App Name:** ${input:appName:playground-text-snippet}
**Feature Name:** ${input:featureName}
**Component Type:** ${input:componentType:List with Store,Form,Simple Display}

## Component Hierarchy

```
PlatformComponent                    # Base: lifecycle, subscriptions, signals
├── PlatformVmComponent             # + ViewModel injection
├── PlatformFormComponent           # + Reactive forms integration
└── PlatformVmStoreComponent        # + ComponentStore state management

AppBaseComponent                     # + Auth, roles, company context
├── AppBaseVmComponent              # + ViewModel + auth context
├── AppBaseFormComponent            # + Forms + auth + validation
└── AppBaseVmStoreComponent         # + Store + auth + loading/error
```

## File Location

```
src/PlatformExampleAppWeb/apps/{app-name}/src/app/features/{feature}/
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
    ({ items: [], filters: {}, ...data } as FeatureListState);

  // Selectors
  public readonly items$ = this.select(state => state.items);
  public readonly selectedItem$ = this.select(state => state.selectedItem);

  // Effects
  public loadItems = this.effectSimple(() =>
    this.featureApi.getList(this.currentVm().filters).pipe(
      this.observerLoadingErrorState('loadItems'),
      this.tapResponse(items => this.updateState({ items }))
    ));

  public saveItem = this.effectSimple((item: FeatureDto) =>
    this.featureApi.save(item).pipe(
      this.observerLoadingErrorState('saveItem'),
      this.tapResponse(saved => {
        this.updateState(state => ({
          items: state.items.upsertBy(x => x.id, [saved])
        }));
      })
    ));

  constructor(private featureApi: FeatureApiService) {
    super();
  }
}
```

### List Component
```typescript
// {feature}-list.component.ts
import { Component, OnInit } from '@angular/core';
import { AppBaseVmStoreComponent } from '@libs/apps-domains/text-snippet-domain';
import { FeatureListStore, FeatureListState } from './feature-list.store';

@Component({
  selector: 'app-feature-list',
  templateUrl: './feature-list.component.html',
  styleUrls: ['./feature-list.component.scss'],
  providers: [FeatureListStore]  // Provide store at component level
})
export class FeatureListComponent
  extends AppBaseVmStoreComponent<FeatureListState, FeatureListStore>
  implements OnInit {

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
      <div class="header">
        <h1>Features</h1>
        <button (click)="onRefresh()" [disabled]="isStateLoading()()">Refresh</button>
      </div>

      @for (item of vm.items; track trackByItem) {
        <div class="item">{{ item.name }}</div>
      } @empty {
        <div class="empty">No items found</div>
      }
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
import { AppBaseFormComponent } from '@libs/apps-domains/text-snippet-domain';
import { ifAsyncValidator, noWhitespaceValidator } from '@libs/platform-core';

export interface FeatureFormVm {
  id?: string;
  name: string;
  code: string;
  status: FeatureStatus;
}

@Component({
  selector: 'app-feature-form',
  templateUrl: './feature-form.component.html'
})
export class FeatureFormComponent extends AppBaseFormComponent<FeatureFormVm> {

  protected initialFormConfig = () => ({
    controls: {
      name: new FormControl(this.currentVm().name, [
        Validators.required,
        Validators.maxLength(200),
        noWhitespaceValidator
      ]),
      code: new FormControl(this.currentVm().code, [
        Validators.required,
        Validators.pattern(/^[A-Z0-9-]+$/)
      ], [
        ifAsyncValidator(() => !this.isViewMode(), this.checkCodeUniqueValidator())
      ]),
      status: new FormControl(this.currentVm().status, [Validators.required])
    },
    dependentValidations: { code: ['status'] }
  });

  protected initOrReloadVm = (isReload: boolean) => {
    if (this.mode === 'create') {
      return of<FeatureFormVm>({ name: '', code: '', status: FeatureStatus.Draft });
    }
    return this.featureApi.getById(this.featureId);
  };

  onSubmit(): void {
    if (!this.validateForm()) return;

    this.featureApi.save(this.currentVm()).pipe(
      this.observerLoadingErrorState('save'),
      this.tapResponse(saved => this.onSaveSuccess(saved)),
      this.untilDestroyed()
    ).subscribe();
  }

  constructor(private featureApi: FeatureApiService) {
    super();
  }
}
```

---

## Pattern 3: Simple Component

```typescript
// {feature}-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { AppBaseComponent } from '@libs/apps-domains/text-snippet-domain';

@Component({
  selector: 'app-feature-card',
  template: `
    <div class="card" [class.selected]="isSelected">
      <h3>{{ feature.name }}</h3>
      @if (canEdit) {
        <button (click)="onEdit.emit(feature)">Edit</button>
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

```typescript
// Lifecycle & Subscriptions
this.data$.pipe(this.untilDestroyed()).subscribe();

// Loading/Error State
observable.pipe(this.observerLoadingErrorState('requestKey'));
isLoading$('requestKey')();
getErrorMsg$('requestKey')();

// Response Handling
observable.pipe(this.tapResponse(result => {}, error => {}));

// Track-by Functions
trackByItem = this.ngForTrackByItemProp<Item>('id');
```

## Anti-Patterns to AVOID

- Using wrong base class (AppBaseComponent for auth context)
- Manual subscription management (use `untilDestroyed()`)
- Direct HttpClient (use PlatformApiService)
- Missing loading states (use `app-loading-and-error-indicator`)
