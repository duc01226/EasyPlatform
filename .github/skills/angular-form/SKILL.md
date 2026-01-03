---
name: angular-form
description: Use when creating reactive forms with validation, async validators, dependent validation, and FormArrays using platform patterns.
---

# Angular Form Development

## Required Reading

**For comprehensive TypeScript/Angular patterns, you MUST read:**

- **`docs/claude/frontend-typescript-complete-guide.md`** - Complete patterns for forms, validators, API services
- **`docs/claude/scss-styling-guide.md`** - SCSS patterns, mixins, BEM conventions

---

## 🎨 Design System Documentation (MANDATORY)

**Before creating any form, read the design system documentation for your target application:**

| Application                       | Design System Location                           |
| --------------------------------- | ------------------------------------------------ |
| **WebV2 Apps**                    | `docs/design-system/`                            |
| **TextSnippetClient**             | `src/PlatformExampleAppWeb/apps/playground-text-snippet/docs/design-system/` |

**Key docs to read:**

- `README.md` - Component overview, base classes, library summary
- `03-form-patterns.md` - Form validation, modes, error handling patterns
- `02-component-catalog.md` - Available form components and usage examples
- `01-design-tokens.md` - Colors, typography, spacing tokens

## Component Hierarchy

| Base Class              | Use Case                         |
| ----------------------- | -------------------------------- |
| `PlatformFormComponent` | Basic forms without auth context |
| `AppBaseFormComponent`  | Forms with auth, roles, company  |

## Form Component Pattern

```typescript
@Component({
    selector: 'app-employee-form',
    templateUrl: './employee-form.component.html'
})
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    protected initialFormConfig = (): PlatformFormConfig<EmployeeFormVm> => ({
        controls: {
            email: new FormControl(
                this.currentVm().email,
                [Validators.required, Validators.email],
                [ifAsyncValidator(() => !this.isViewMode, checkEmailUniqueAsyncValidator(this.employeeApi, this.currentVm().id))]
            ),
            firstName: new FormControl(this.currentVm().firstName, [Validators.required, noWhitespaceValidator]),
            startDate: new FormControl(this.currentVm().startDate, [
                Validators.required,
                startEndValidator(
                    'invalidRange',
                    ctrl => ctrl.parent?.get('hireDate')?.value,
                    ctrl => ctrl.value,
                    { allowEqual: true }
                )
            ])
        },
        dependentValidations: {
            startDate: ['hireDate'] // Re-validate startDate when hireDate changes
        }
    });

    onSubmit() {
        if (this.validateForm()) {
            this.employeeApi.save(this.currentVm()).pipe(this.untilDestroyed()).subscribe();
        }
    }
}
```

## FormArray Pattern

```typescript
protected initialFormConfig = (): PlatformFormConfig<ProductFormVm> => ({
  controls: {
    specifications: {
      modelItems: () => this.currentVm().specifications,
      itemControl: (spec, index) => new FormGroup({
        name: new FormControl(spec.name, [Validators.required]),
        value: new FormControl(spec.value, [Validators.required])
      })
    }
  }
});

// Template
@for (spec of formArray('specifications').controls; track $index) {
  <input [formControl]="spec.get('name')" />
  <input [formControl]="spec.get('value')" />
}
```

## Key APIs

| Method              | Purpose                        |
| ------------------- | ------------------------------ |
| `validateForm()`    | Validate and mark touched      |
| `formControls(key)` | Get FormControl by key         |
| `formArray(key)`    | Get FormArray by key           |
| `currentVm()`       | Get current view model         |
| `isViewMode`        | Check if form is read-only     |
| `isCreateMode`      | Check if creating new entity   |
| `mode`              | 'create' \| 'update' \| 'view' |

## Custom Validators

```typescript
// Sync validator
export const noWhitespaceValidator: ValidatorFn = ctrl => (ctrl.value?.trim() ? null : { whitespace: true });

// Async validator with condition
ifAsyncValidator(
    ctrl => ctrl.valid, // Only run if sync valid
    emailUniqueAsyncValidator
);

// Cross-field validator
startEndValidator('errorKey', startFn, endFn, { allowEqual: false });
```

## Component HTML Template Standard (BEM Classes)

**All UI elements in form templates MUST have BEM classes, even without styling needs.** This makes forms self-documenting.

```html
<!-- ✅ CORRECT: All form elements have BEM classes -->
<form class="employee-form" [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="employee-form__field">
        <label class="employee-form__label" for="email">Email *</label>
        <input class="employee-form__input" id="email" formControlName="email" />
        <span class="employee-form__error">{{ formControls('email').errors?.['required'] }}</span>
    </div>
    <div class="employee-form__actions">
        <button class="employee-form__btn --cancel" type="button">Cancel</button>
        <button class="employee-form__btn --submit" type="submit">Save</button>
    </div>
</form>

<!-- ❌ WRONG: Missing BEM classes -->
<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div>
        <label for="email">Email *</label>
        <input id="email" formControlName="email" />
        <span>{{ formControls('email').errors?.['required'] }}</span>
    </div>
    <div>
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
    </div>
</form>
```

## Anti-Patterns

- Using `FormBuilder` instead of `initialFormConfig`
- Manual subscription management (use `untilDestroyed()`)
- Putting validation logic in template
- Not using `dependentValidations` for cross-field validation
- Missing BEM classes on form elements
