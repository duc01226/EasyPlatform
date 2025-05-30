/**
 * @fileoverview Form mode type definitions for platform form components.
 *
 * This module defines form operation modes used throughout the platform
 * to control form behavior, validation, and UI states.
 *
 * @module PlatformFormViewModels
 * @since 1.0.0
 */

/**
 * Represents the different operational modes for platform forms.
 *
 * This type union defines the standard form modes used across the platform
 * to control form behavior, field accessibility, and validation rules.
 * Forms can be in one of three states: viewing existing data, creating new
 * records, or updating existing records.
 *
 * @typedef {('view' | 'create' | 'update')} PlatformFormMode
 *
 * @example
 * ```typescript
 * // Basic form mode usage
 * const formMode: PlatformFormMode = 'create';
 *
 * // Form component with mode switching
 * @Component({
 *   template: `
 *     <form [formGroup]="formGroup">
 *       <input
 *         [readonly]="mode === 'view'"
 *         formControlName="name"
 *       />
 *       <button
 *         *ngIf="mode !== 'view'"
 *         (click)="save()"
 *       >
 *         {{ mode === 'create' ? 'Create' : 'Update' }}
 *       </button>
 *     </form>
 *   `
 * })
 * export class MyFormComponent {
 *   @Input() mode: PlatformFormMode = 'view';
 *
 *   get isReadonly(): boolean {
 *     return this.mode === 'view';
 *   }
 *
 *   get submitButtonText(): string {
 *     switch (this.mode) {
 *       case 'create': return 'Create';
 *       case 'update': return 'Save Changes';
 *       default: return '';
 *     }
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Real-world usage in form template management
 * export class UpsertFormTemplateComponent {
 *   @Input() mode: PlatformFormMode = 'create';
 *   @Input() formTemplate?: FormTemplate;
 *
 *   protected override initialFormConfig = (): PlatformFormConfig<UpsertFormTemplateFormVm> => {
 *     return {
 *       controls: {
 *         name: {
 *           validators: [Validators.required],
 *           disabled: this.mode === 'view'
 *         },
 *         description: {
 *           validators: this.mode === 'create' ? [Validators.required] : []
 *         }
 *       }
 *     };
 *   };
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Organization unit form with conditional validation
 * export class CreateOrUpdateOrganizationUnitFormViewModel extends PlatformVm {
 *   public mode: PlatformFormMode = 'create';
 *
 *   constructor(data?: Partial<CreateOrUpdateOrganizationUnitFormViewModel>) {
 *     super(data);
 *     if (data?.mode) this.mode = data.mode;
 *   }
 *
 *   get isCreateMode(): boolean {
 *     return this.mode === 'create';
 *   }
 *
 *   get isUpdateMode(): boolean {
 *     return this.mode === 'update';
 *   }
 *
 *   get isViewMode(): boolean {
 *     return this.mode === 'view';
 *   }
 * }
 * ```
 *
 * @since 1.0.0
 * @see {@link PlatformVm} For base view model class
 * @see {@link PlatformFormConfig} For form configuration with modes
 */
export type PlatformFormMode = 'view' | 'create' | 'update';
