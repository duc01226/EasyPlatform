/**
 * @fileoverview Basic Platform Form Validator Utilities
 *
 * This module provides core utilities for creating custom form validators with
 * enhanced lifecycle management and integration with Angular reactive forms.
 * It includes safeguards to prevent validation execution on detached controls.
 *
 * ## Key Features
 *
 * - **Lifecycle-Aware**: Prevents validation on detached form controls
 * - **Performance Optimized**: Avoids unnecessary validation executions
 * - **Angular Integration**: Full compatibility with Angular reactive forms
 * - **Type Safety**: Properly typed validator functions
 *
 * ## Architecture Benefits
 *
 * The validator wrapper addresses common issues with custom validators:
 * - Prevents validation on controls not yet attached to forms
 * - Reduces unnecessary computation during form initialization
 * - Provides consistent behavior across all platform validators
 *
 * @module PlatformFormValidator
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Creates a lifecycle-aware validator function for Angular reactive forms.
 *
 * This utility function wraps a validation function with additional logic to ensure
 * that validation only occurs when the control is properly attached to a form.
 * This prevents issues with validation running on controls during form initialization
 * or when controls are detached from their parent forms.
 *
 * ## Features
 *
 * - **Attachment Check**: Only validates controls attached to forms
 * - **Performance**: Prevents unnecessary validation during initialization
 * - **Stability**: Avoids errors from validation on incomplete form structures
 * - **Consistency**: Provides uniform behavior across all platform validators
 *
 * ## Validation Lifecycle
 *
 * The wrapper performs the following checks:
 * 1. **Form Attachment**: Ensures control is attached to a form structure
 * 2. **Root Check**: Verifies control is not an isolated, unattached control
 * 3. **Validation Execution**: Runs the actual validation logic only when safe
 *
 * ## Usage Patterns
 *
 * ### Basic Custom Validator
 * ```typescript
 * import { validator, buildFormValidationErrors } from '@libs/platform-core';
 *
 * // Create a simple validation rule
 * export const requiredValidator = validator((control: AbstractControl) => {
 *   if (!control.value || control.value.toString().trim() === '') {
 *     return buildFormValidationErrors('required', 'This field is required');
 *   }
 *   return null;
 * });
 *
 * // Use in form configuration
 * const form = new FormGroup({
 *   name: new FormControl('', [requiredValidator])
 * });
 * ```
 *
 * ### Complex Business Logic Validator
 * ```typescript
 * // Email domain validator
 * export const companyEmailValidator = validator((control: AbstractControl) => {
 *   if (!control.value) return null;
 *
 *   const email = control.value.toString().toLowerCase();
 *   const allowedDomains = ['company.com', 'subsidiary.com'];
 *
 *   const domain = email.split('@')[1];
 *   if (domain && !allowedDomains.includes(domain)) {
 *     return buildFormValidationErrors('invalidDomain', {
 *       errorMsg: 'Email must be from an approved domain: {domains}',
 *       params: {
 *         domains: allowedDomains.join(', '),
 *         providedDomain: domain
 *       }
 *     });
 *   }
 *
 *   return null;
 * });
 * ```
 *
 * ### Parameterized Validator Factory
 * ```typescript
 * // Create validator factories for reusable logic
 * export function minLengthValidator(minLength: number) {
 *   return validator((control: AbstractControl) => {
 *     if (!control.value) return null;
 *
 *     const value = control.value.toString();
 *     if (value.length < minLength) {
 *       return buildFormValidationErrors('minLength', {
 *         errorMsg: 'Minimum length is {minLength} characters (current: {currentLength})',
 *         params: {
 *           minLength: minLength,
 *           currentLength: value.length
 *         }
 *       });
 *     }
 *
 *     return null;
 *   });
 * }
 *
 * // Usage
 * const form = new FormGroup({
 *   username: new FormControl('', [minLengthValidator(3)]),
 *   password: new FormControl('', [minLengthValidator(8)])
 * });
 * ```
 *
 * ### Cross-Field Validation
 * ```typescript
 * // Password confirmation validator
 * export const passwordMatchValidator = validator((control: AbstractControl) => {
 *   const formGroup = control.parent as FormGroup;
 *   if (!formGroup) return null;
 *
 *   const passwordControl = formGroup.get('password');
 *   if (!passwordControl) return null;
 *
 *   if (control.value !== passwordControl.value) {
 *     return buildFormValidationErrors('passwordMismatch', {
 *       errorMsg: 'Passwords do not match'
 *     });
 *   }
 *
 *   return null;
 * });
 *
 * // Apply to confirm password field
 * const form = new FormGroup({
 *   password: new FormControl(''),
 *   confirmPassword: new FormControl('', [passwordMatchValidator])
 * });
 * ```
 *
 * ### Conditional Validation
 * ```typescript
 * // Validate field only when another field has specific value
 * export function conditionalRequiredValidator(dependentField: string, triggerValue: any) {
 *   return validator((control: AbstractControl) => {
 *     const formGroup = control.parent as FormGroup;
 *     if (!formGroup) return null;
 *
 *     const dependentControl = formGroup.get(dependentField);
 *     if (!dependentControl) return null;
 *
 *     // Only require this field when dependent field has trigger value
 *     if (dependentControl.value === triggerValue && !control.value) {
 *       return buildFormValidationErrors('conditionalRequired', {
 *         errorMsg: 'This field is required when {dependentField} is "{triggerValue}"',
 *         params: {
 *           dependentField: dependentField,
 *           triggerValue: triggerValue
 *         }
 *       });
 *     }
 *
 *     return null;
 *   });
 * }
 * ```
 *
 * ### File Validation
 * ```typescript
 * // File upload validator
 * export function fileValidator(options: {
 *   maxSizeMB?: number;
 *   allowedTypes?: string[];
 *   required?: boolean;
 * }) {
 *   return validator((control: AbstractControl) => {
 *     const file = control.value as File;
 *
 *     if (!file) {
 *       return options.required
 *         ? buildFormValidationErrors('required', 'Please select a file')
 *         : null;
 *     }
 *
 *     // Check file size
 *     if (options.maxSizeMB) {
 *       const fileSizeMB = file.size / (1024 * 1024);
 *       if (fileSizeMB > options.maxSizeMB) {
 *         return buildFormValidationErrors('fileSize', {
 *           errorMsg: 'File size ({actualSize}MB) exceeds limit ({maxSize}MB)',
 *           params: {
 *             actualSize: Math.round(fileSizeMB * 100) / 100,
 *             maxSize: options.maxSizeMB
 *           }
 *         });
 *       }
 *     }
 *
 *     // Check file type
 *     if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
 *       return buildFormValidationErrors('fileType', {
 *         errorMsg: 'File type "{fileType}" not allowed. Allowed: {allowedTypes}',
 *         params: {
 *           fileType: file.type,
 *           allowedTypes: options.allowedTypes.join(', ')
 *         }
 *       });
 *     }
 *
 *     return null;
 *   });
 * }
 * ```
 *
 * ## Real-World Integration Examples
 *
 * ### Form Component Integration
 * ```typescript
 * @Component({
 *   selector: 'user-registration-form',
 *   template: `
 *     <form [formGroup]="registrationForm" (ngSubmit)="onSubmit()">
 *       <input formControlName="email" type="email" />
 *       <div *ngIf="registrationForm.get('email')?.errors?.['companyEmail'] as error">
 *         {{ error.errorMsg }}
 *       </div>
 *
 *       <input formControlName="username" />
 *       <div *ngIf="registrationForm.get('username')?.errors?.['minLength'] as error">
 *         {{ error.errorMsg }}
 *       </div>
 *     </form>
 *   `
 * })
 * export class UserRegistrationComponent {
 *   registrationForm = new FormGroup({
 *     email: new FormControl('', [
 *       Validators.required,
 *       Validators.email,
 *       companyEmailValidator
 *     ]),
 *     username: new FormControl('', [
 *       Validators.required,
 *       minLengthValidator(3)
 *     ])
 *   });
 * }
 * ```
 *
 * ### Dynamic Validator Application
 * ```typescript
 * // Apply validators dynamically based on user role
 * function configureFormForRole(form: FormGroup, userRole: string) {
 *   const emailControl = form.get('email');
 *   if (!emailControl) return;
 *
 *   if (userRole === 'admin') {
 *     // Admins must use company email
 *     emailControl.setValidators([
 *       Validators.required,
 *       Validators.email,
 *       companyEmailValidator
 *     ]);
 *   } else {
 *     // Regular users can use any email
 *     emailControl.setValidators([
 *       Validators.required,
 *       Validators.email
 *     ]);
 *   }
 *
 *   emailControl.updateValueAndValidity();
 * }
 * ```
 *
 * ## Performance Considerations
 *
 * - **Lazy Execution**: Validation only runs when controls are attached
 * - **Early Returns**: Quick checks prevent expensive operations
 * - **Memory Efficient**: No unnecessary object creation during initialization
 * - **Change Detection**: Optimized to work with Angular's change detection
 *
 * ## Error Prevention
 *
 * The wrapper prevents common validator errors:
 * - Accessing parent form before control is attached
 * - Validation running on detached controls
 * - Errors during form initialization sequences
 * - Memory leaks from premature subscription creation
 *
 * @param {(control: AbstractControl) => ValidationErrors | null} validatorFn - The validation function to wrap
 * @returns {ValidatorFn} A lifecycle-aware Angular validator function
 *
 * @example
 * ```typescript
 * // Custom date validator
 * export const futureDateValidator = validator((control: AbstractControl) => {
 *   if (!control.value) return null;
 *
 *   const inputDate = new Date(control.value);
 *   const today = new Date();
 *   today.setHours(0, 0, 0, 0); // Start of today
 *
 *   if (inputDate <= today) {
 *     return buildFormValidationErrors('futureDate', {
 *       errorMsg: 'Date must be in the future (after {today})',
 *       params: {
 *         today: today.toLocaleDateString(),
 *         provided: inputDate.toLocaleDateString()
 *       }
 *     });
 *   }
 *
 *   return null;
 * });
 * ```
 *
 * @see {@link buildFormValidationErrors} Create standardized validation errors
 * @see {@link IPlatformFormValidationError} Error object interface
 * @see {@link https://angular.io/guide/form-validation#custom-validators} Angular Custom Validators
 */
export function validator(validatorFn: (control: AbstractControl) => ValidationErrors | null): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        // if control is not FormGroup and root of it equal itself mean that control is just new and not attached to any form group
        // no need to execute form validation
        if (!(control instanceof FormGroup) && control.root == control) return null;

        return validatorFn(control);
    };
}
