# Angular Form Patterns Reference

Detailed code examples for reactive forms with EasyPlatform: validation, async validators, dependent validation, FormArrays.

---

## File Location

```
src/Frontend/apps/{app-name}/src/app/
└── features/
    └── {feature}/
        ├── {feature}-form.component.ts
        ├── {feature}-form.component.html
        └── {feature}-form.component.scss
```

---

## Pattern 1: Basic Form

```typescript
import { Component, Input } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { AppBaseFormComponent } from '@libs/apps-domains';
import { noWhitespaceValidator } from '@libs/platform-core';

export interface FeatureFormVm {
    id?: string;
    name: string;
    code: string;
    description?: string;
    status: FeatureStatus;
    isActive: boolean;
}

@Component({
    selector: 'app-feature-form',
    templateUrl: './feature-form.component.html'
})
export class FeatureFormComponent extends AppBaseFormComponent<FeatureFormVm> {
    @Input() featureId?: string;

    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required, Validators.maxLength(200), noWhitespaceValidator]),
            code: new FormControl(this.currentVm().code, [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/), Validators.maxLength(50)]),
            description: new FormControl(this.currentVm().description, [Validators.maxLength(2000)]),
            status: new FormControl(this.currentVm().status, [Validators.required]),
            isActive: new FormControl(this.currentVm().isActive)
        }
    });

    protected initOrReloadVm = (isReload: boolean) => {
        if (!this.featureId) {
            return of<FeatureFormVm>({ name: '', code: '', status: FeatureStatus.Draft, isActive: true });
        }
        return this.featureApi.getById(this.featureId);
    };

    onSubmit(): void {
        if (!this.validateForm()) return;
        this.featureApi
            .save(this.currentVm())
            .pipe(
                this.observerLoadingErrorState('save'),
                this.tapResponse(saved => this.onSuccess(saved), error => this.onError(error)),
                this.untilDestroyed()
            )
            .subscribe();
    }

    constructor(private featureApi: FeatureApiService, private router: Router) {
        super();
    }
}
```

---

## Pattern 2: Async Validation

```typescript
export class FeatureFormComponent extends AppBaseFormComponent<FeatureFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            code: new FormControl(
                this.currentVm().code,
                [Validators.required, Validators.pattern(/^[A-Z0-9_-]+$/)],
                [ifAsyncValidator(ctrl => ctrl.valid, this.checkCodeUniqueValidator())]
            ),
            email: new FormControl(
                this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode(), this.checkEmailUniqueValidator())]
            )
        }
    });

    private checkCodeUniqueValidator(): AsyncValidatorFn {
        return async (control: AbstractControl): Promise<ValidationErrors | null> => {
            if (!control.value) return null;
            const exists = await firstValueFrom(
                this.featureApi.checkCodeExists(control.value, this.currentVm().id).pipe(debounceTime(300))
            );
            return exists ? { codeExists: 'Code already exists' } : null;
        };
    }

    private checkEmailUniqueValidator(): AsyncValidatorFn {
        return async (control: AbstractControl): Promise<ValidationErrors | null> => {
            if (!control.value) return null;
            const exists = await firstValueFrom(this.employeeApi.checkEmailExists(control.value, this.currentVm().id));
            return exists ? { emailExists: 'Email already in use' } : null;
        };
    }
}
```

---

## Pattern 3: Dependent Validation

```typescript
export class DateRangeFormComponent extends AppBaseFormComponent<DateRangeVm> {
    protected initialFormConfig = () => ({
        controls: {
            startDate: new FormControl(this.currentVm().startDate, [Validators.required]),
            endDate: new FormControl(this.currentVm().endDate, [
                Validators.required,
                startEndValidator(
                    'invalidRange',
                    ctrl => ctrl.parent?.get('startDate')?.value,
                    ctrl => ctrl.value,
                    { allowEqual: true }
                )
            ]),
            category: new FormControl(this.currentVm().category, [Validators.required]),
            subcategory: new FormControl(this.currentVm().subcategory, [Validators.required])
        },
        dependentValidations: {
            endDate: ['startDate'],
            subcategory: ['category']
        }
    });
}
```

---

## Pattern 4: FormArray

```typescript
export interface ProductFormVm {
    name: string;
    price: number;
    specifications: Specification[];
    tags: string[];
}

export class ProductFormComponent extends AppBaseFormComponent<ProductFormVm> {
    protected initialFormConfig = () => ({
        controls: {
            name: new FormControl(this.currentVm().name, [Validators.required]),
            price: new FormControl(this.currentVm().price, [Validators.required, Validators.min(0)]),
            specifications: {
                modelItems: () => this.currentVm().specifications,
                itemControl: (spec: Specification, index: number) =>
                    new FormGroup({
                        name: new FormControl(spec.name, [Validators.required]),
                        value: new FormControl(spec.value, [Validators.required])
                    })
            },
            tags: {
                modelItems: () => this.currentVm().tags,
                itemControl: (tag: string) => new FormControl(tag, [Validators.required])
            }
        }
    });

    get specificationsArray(): FormArray {
        return this.form.get('specifications') as FormArray;
    }

    addSpecification(): void {
        const newSpec: Specification = { name: '', value: '' };
        this.updateVm(vm => ({ specifications: [...vm.specifications, newSpec] }));
        this.specificationsArray.push(
            new FormGroup({
                name: new FormControl('', [Validators.required]),
                value: new FormControl('', [Validators.required])
            })
        );
    }

    removeSpecification(index: number): void {
        this.updateVm(vm => ({ specifications: vm.specifications.filter((_, i) => i !== index) }));
        this.specificationsArray.removeAt(index);
    }
}
```

### FormArray Template

```html
<div formArrayName="specifications">
    @for (spec of specificationsArray.controls; track $index; let i = $index) {
    <div [formGroupName]="i" class="specification-row">
        <input formControlName="name" placeholder="Name" />
        <input formControlName="value" placeholder="Value" />
        <button type="button" (click)="removeSpecification(i)">Remove</button>
    </div>
    }
    <button type="button" (click)="addSpecification()">Add Specification</button>
</div>
```

---

## Template Patterns

### Basic Form Template

```html
<form class="feature-form" [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="feature-form__field">
        <label class="feature-form__label" for="name">Name *</label>
        <input class="feature-form__input" id="name" formControlName="name" />
        @if (formControls('name').errors?.['required'] && formControls('name').touched) {
        <span class="feature-form__error">Name is required</span>
        } @if (formControls('name').errors?.['maxlength']) {
        <span class="feature-form__error">Name is too long</span>
        }
    </div>

    <div class="feature-form__field">
        <label class="feature-form__label" for="code">Code *</label>
        <input class="feature-form__input" id="code" formControlName="code" />
        @if (formControls('code').pending) {
        <span class="feature-form__info">Checking availability...</span>
        } @if (formControls('code').errors?.['codeExists']) {
        <span class="feature-form__error">{{ formControls('code').errors?.['codeExists'] }}</span>
        }
    </div>

    <div class="feature-form__field">
        <label class="feature-form__label" for="status">Status *</label>
        <select class="feature-form__select" id="status" formControlName="status">
            @for (option of statusOptions; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
            }
        </select>
    </div>

    <div class="feature-form__field">
        <label class="feature-form__label">
            <input class="feature-form__checkbox" type="checkbox" formControlName="isActive" />
            Active
        </label>
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

## Built-in Validators

| Validator               | Import                | Usage                    |
| ----------------------- | --------------------- | ------------------------ |
| `noWhitespaceValidator` | `@libs/platform-core` | No empty strings         |
| `startEndValidator`     | `@libs/platform-core` | Date/number range        |
| `ifAsyncValidator`      | `@libs/platform-core` | Conditional async        |
| `validator`             | `@libs/platform-core` | Custom validator factory |

## Key Form APIs

| Method              | Purpose                   | Example                             |
| ------------------- | ------------------------- | ----------------------------------- |
| `validateForm()`    | Validate and mark touched | `if (!this.validateForm()) return;` |
| `formControls(key)` | Get form control          | `this.formControls('name').errors`  |
| `currentVm()`       | Get current view model    | `const vm = this.currentVm()`       |
| `updateVm()`        | Update view model         | `this.updateVm({ name: 'new' })`    |
| `mode`              | Form mode                 | `this.mode === 'create'`            |
| `isViewMode()`      | Check view mode           | `if (this.isViewMode()) return;`    |
