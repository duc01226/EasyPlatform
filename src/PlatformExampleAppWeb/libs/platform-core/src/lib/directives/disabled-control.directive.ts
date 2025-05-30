import { Directive, Input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { PlatformDirective } from './abstracts/platform.directive';

/**
 * Directive for dynamically enabling/disabling Angular form controls.
 *
 * @directive
 * @selector [platformDisabledControl]
 * @standalone true
 *
 * @description
 * The DisabledControlDirective provides a declarative way to enable or disable
 * Angular form controls based on component state or business logic. It works with
 * any form control that implements NgControl (FormControl, FormGroup, FormArray)
 * and provides a more intuitive alternative to manually calling enable()/disable()
 * methods in component code.
 *
 * **Key Features:**
 * - **Declarative Syntax**: Use simple property binding to control form state
 * - **Reactive Updates**: Automatically updates when the bound value changes
 * - **Universal Compatibility**: Works with all Angular form control types
 * - **Performance Optimized**: Only calls enable/disable when value actually changes
 * - **Type Safety**: Full TypeScript support for boolean expressions
 * - **Business Logic Integration**: Easy integration with component conditions
 *
 * **Common Use Cases:**
 * - **Conditional Form Fields**: Disable fields based on user selections
 * - **Permission-Based Controls**: Disable controls based on user permissions
 * - **Form State Management**: Disable controls during form submission
 * - **Wizard Forms**: Enable/disable fields based on step completion
 * - **Dynamic Forms**: Control field availability based on data loading
 * - **Validation Dependencies**: Disable dependent fields until prerequisites are met
 *
 * @example
 * **Basic usage with reactive forms:**
 * ```html
 * <!-- Disable email field when user is not active -->
 * <input
 *   formControlName="email"
 *   [platformDisabledControl]="!user.isActive"
 *   placeholder="Email Address">
 *
 * <!-- Disable submit button during form processing -->
 * <button
 *   type="submit"
 *   [platformDisabledControl]="isProcessing || !userForm.valid">
 *   Save Changes
 * </button>
 *
 * <!-- Disable optional fields based on checkbox -->
 * <input
 *   formControlName="phoneNumber"
 *   [platformDisabledControl]="!includeContactInfo">
 * ```
 *
 * @example
 * **Permission-based form controls:**
 * ```html
 * <!-- Disable administrative fields for non-admin users -->
 * <input
 *   formControlName="adminNotes"
 *   [platformDisabledControl]="!userPermissions.isAdmin"
 *   placeholder="Admin Notes">
 *
 * <!-- Disable sensitive fields based on security level -->
 * <select
 *   formControlName="securityLevel"
 *   [platformDisabledControl]="!userPermissions.canModifySecurity">
 *   <option value="low">Low</option>
 *   <option value="high">High</option>
 * </select>
 * ```
 *
 * @example
 * **Wizard form with step-based enabling:**
 * ```html
 * <!-- Step 1: Basic Information -->
 * <div formGroupName="basicInfo">
 *   <input formControlName="firstName" placeholder="First Name">
 *   <input formControlName="lastName" placeholder="Last Name">
 * </div>
 *
 * <!-- Step 2: Contact Information (disabled until step 1 complete) -->
 * <div formGroupName="contactInfo">
 *   <input
 *     formControlName="email"
 *     [platformDisabledControl]="!isStep1Complete"
 *     placeholder="Email Address">
 *
 *   <input
 *     formControlName="phone"
 *     [platformDisabledControl]="!isStep1Complete"
 *     placeholder="Phone Number">
 * </div>
 *
 * <!-- Step 3: Preferences (disabled until step 2 complete) -->
 * <div formGroupName="preferences">
 *   <input
 *     formControlName="notifications"
 *     [platformDisabledControl]="!isStep2Complete"
 *     type="checkbox">
 * </div>
 * ```
 *
 * @example
 * **Dynamic form with conditional fields:**
 * ```html
 * <!-- Account type selection -->
 * <select formControlName="accountType">
 *   <option value="personal">Personal</option>
 *   <option value="business">Business</option>
 * </select>
 *
 * <!-- Business-specific fields (disabled for personal accounts) -->
 * <input
 *   formControlName="companyName"
 *   [platformDisabledControl]="accountType !== 'business'"
 *   placeholder="Company Name">
 *
 * <input
 *   formControlName="taxId"
 *   [platformDisabledControl]="accountType !== 'business'"
 *   placeholder="Tax ID">
 *
 * <!-- Personal-specific fields (disabled for business accounts) -->
 * <input
 *   formControlName="dateOfBirth"
 *   [platformDisabledControl]="accountType !== 'personal'"
 *   type="date">
 * ```
 *
 * @example
 * **Component integration with complex logic:**
 * ```typescript
 * export class UserProfileComponent extends PlatformComponent {
 *   userForm = this.fb.group({
 *     email: ['', Validators.required],
 *     phone: [''],
 *     preferences: this.fb.group({
 *       notifications: [true],
 *       marketing: [false]
 *     })
 *   });
 *
 *   // Complex computed properties for directive
 *   get isEditingRestricted(): boolean {
 *     return this.isSubmitting ||
 *            !this.userPermissions.canEdit ||
 *            this.user.isLocked;
 *   }
 *
 *   get canModifyPreferences(): boolean {
 *     return this.userForm.get('email')?.valid &&
 *            this.userForm.get('phone')?.valid &&
 *            !this.isEditingRestricted;
 *   }
 * }
 * ```
 *
 * @example
 * **Form validation dependency chains:**
 * ```html
 * <!-- Primary email field -->
 * <input
 *   formControlName="primaryEmail"
 *   placeholder="Primary Email">
 *
 * <!-- Secondary email (disabled until primary is valid) -->
 * <input
 *   formControlName="secondaryEmail"
 *   [platformDisabledControl]="!userForm.get('primaryEmail')?.valid"
 *   placeholder="Secondary Email">
 *
 * <!-- Email preferences (disabled until at least one email is valid) -->
 * <div formGroupName="emailPreferences">
 *   <input
 *     formControlName="marketing"
 *     [platformDisabledControl]="!hasValidEmail"
 *     type="checkbox"> Marketing Emails
 *
 *   <input
 *     formControlName="notifications"
 *     [platformDisabledControl]="!hasValidEmail"
 *     type="checkbox"> Notifications
 * </div>
 * ```
 *
 * **Performance Considerations:**
 * - The directive only calls enable()/disable() when the input value changes
 * - Boolean expressions are evaluated on each change detection cycle
 * - Consider using OnPush change detection for components with many disabled controls
 * - Cache complex computed properties to avoid repeated calculations
 *
 * **Best Practices:**
 * - Use descriptive variable names for disable conditions
 * - Group related disable logic into computed properties
 * - Consider accessibility implications when disabling form controls
 * - Provide visual feedback when controls are disabled
 * - Test disabled state scenarios thoroughly
 *
 * @see {@link NgControl} For the underlying Angular form control interface
 * @see {@link PlatformDirective} For the base directive functionality
 * @see {@link FormControl} For Angular reactive form controls
 */
@Directive({
    selector: '[platformDisabledControl]',
    standalone: true
})
export class DisabledControlDirective extends PlatformDirective {
    /**
     * Sets the disabled state of the form control.
     *
     * @param v - True to disable the control, false to enable it
     *
     * @description
     * When set to true, the form control will be disabled and user interaction
     * will be prevented. When set to false, the control will be enabled and
     * user interaction will be allowed. The directive automatically handles
     * calling the appropriate enable() or disable() methods on the NgControl.
     *
     * @example
     * ```html
     * <!-- Simple boolean -->
     * <input [platformDisabledControl]="isReadOnly">
     *
     * <!-- Complex expression -->
     * <input [platformDisabledControl]="!userPermissions.canEdit || isSubmitting">
     *
     * <!-- Component property -->
     * <input [platformDisabledControl]="shouldDisableInput">
     * ```
     */
    @Input('platformDisabledControl') public set isDisabled(v: boolean) {
        if (v) this.ngControl.control?.disable();
        else this.ngControl.control?.enable();
    }

    /**
     * Creates an instance of DisabledControlDirective.
     *
     * @param ngControl - The NgControl instance to manage
     *
     * @description
     * The directive requires an NgControl to be present on the same element.
     * This will be automatically injected by Angular's dependency injection
     * system and represents the form control that will be enabled/disabled.
     */
    constructor(public readonly ngControl: NgControl) {
        super();
    }
}
