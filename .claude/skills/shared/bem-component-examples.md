# BEM Component Examples

Correct BEM (Block-Element-Modifier) examples for Angular component templates and SCSS.

**Rule:** Every UI element MUST have a BEM class, even without special styling. This makes HTML self-documenting.

---

## Naming Convention

- **Block**: Component name, kebab-case (e.g., `feature-list`)
- **Element**: `block__element` with double underscore (e.g., `feature-list__header`)
- **Modifier**: Separate class with `--` prefix, space-separated (e.g., `class="feature-list__btn --primary --small"`)

---

## List Component Example

```html
<app-loading-and-error-indicator [target]="this">
    @if (vm(); as vm) {
    <div class="feature-list">
        <div class="feature-list__header">
            <h1 class="feature-list__title">Features</h1>
            <button class="feature-list__btn --add" (click)="onRefresh()" [disabled]="isStateLoading()()">
                Refresh
            </button>
        </div>

        <div class="feature-list__content">
            @for (item of vm.items; track trackByItem) {
            <div class="feature-list__item" [class.--selected]="vm.selectedItem?.id === item.id">
                <span class="feature-list__item-name">{{ item.name }}</span>
                <div class="feature-list__item-actions">
                    <button class="feature-list__item-btn --delete" (click)="onDelete(item)" [disabled]="isDeleting$() === true">
                        Delete
                    </button>
                </div>
            </div>
            } @empty {
            <div class="feature-list__empty">No items found</div>
            }
        </div>
    </div>
    }
</app-loading-and-error-indicator>
```

## Form Component Example

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
        <label class="feature-form__label" for="status">Status *</label>
        <select class="feature-form__select" id="status" formControlName="status">
            @for (status of statusOptions; track status.value) {
            <option [value]="status.value">{{ status.label }}</option>
            }
        </select>
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

## SCSS Structure

```scss
@import '~assets/scss/variables';

// Host element
app-feature-list {
    display: flex;
    flex-direction: column;
}

// BEM block
.feature-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: $spacing-md;
    }

    &__title {
        font-size: $font-size-lg;
        font-weight: 600;
    }

    &__content {
        flex: 1;
        overflow-y: auto;
    }

    &__item {
        display: flex;
        align-items: center;
        padding: $spacing-sm $spacing-md;
        border-bottom: 1px solid $border-color;

        &.--selected {
            background-color: $selected-bg;
        }
    }

    &__item-name {
        flex: 1;
    }

    &__item-actions {
        display: flex;
        gap: $spacing-xs;
    }

    &__item-btn {
        &.--delete {
            color: $danger-color;
        }
    }

    &__btn {
        &.--add {
            background: $primary-color;
            color: white;
        }
    }

    &__empty {
        padding: $spacing-lg;
        text-align: center;
        color: $text-muted;
    }
}
```

---

## Common Mistakes

| Wrong | Correct |
| ----- | ------- |
| `class="header"` | `class="feature-list__header"` |
| `class="item"` | `class="feature-list__item"` |
| `class="item selected"` | `class="feature-list__item --selected"` |
| `class="btn btn-primary"` | `class="feature-list__btn --primary"` |
| `<div>` (no class) | `<div class="feature-list__wrapper">` |
| `class="feature-list__item--selected"` | `class="feature-list__item --selected"` (space-separated) |
