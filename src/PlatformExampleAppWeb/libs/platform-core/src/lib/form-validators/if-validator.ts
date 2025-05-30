/**
 * @fileoverview Conditional Form Validators Module
 *
 * This module provides utilities for conditional validation in Angular reactive forms.
 * It enables applying validators based on dynamic conditions, allowing for flexible
 * form validation logic that adapts to user input, form state, or business rules.
 *
 * ## Key Features
 *
 * - **Conditional Logic**: Apply validators only when specific conditions are met
 * - **Performance Optimized**: Validators only execute when conditions are satisfied
 * - **Type Safety**: Properly typed for both sync and async validators
 * - **Form Integration**: Seamless integration with Angular reactive forms
 * - **Business Rules**: Support complex conditional business logic
 *
 * ## Common Use Cases
 *
 * - **Required Fields**: Make fields required based on other field values
 * - **Validation Rules**: Apply different validation rules based on user type/role
 * - **Business Logic**: Implement complex conditional business rules
 * - **Progressive Disclosure**: Show/validate fields based on previous selections
 * - **Dynamic Forms**: Adapt validation to changing form configurations
 *
 * ## Architecture Benefits
 *
 * The conditional validators provide:
 * - Reduced unnecessary validation execution
 * - Dynamic form behavior based on user interaction
 * - Clean separation of validation logic and conditions
 * - Improved user experience with context-sensitive validation
 *
 * @module ConditionalFormValidators
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

import { AbstractControl, AsyncValidatorFn, FormControl, FormGroup, ValidatorFn } from '@angular/forms';

import { of } from 'rxjs';

import { validator } from './validator';

/**
 * Creates a conditional synchronous validator that applies validation logic only when a condition is met.
 *
 * This function provides a way to conditionally apply validators based on dynamic conditions
 * such as form state, user input, or business rules. The validator only executes when the
 * condition function returns true, providing performance benefits and flexible validation logic.
 *
 * ## Features
 *
 * - **Conditional Execution**: Only validates when condition is satisfied
 * - **Performance Optimized**: Avoids unnecessary validation overhead
 * - **Flexible Conditions**: Supports any boolean condition logic
 * - **Type Safety**: Properly typed for FormControl integration
 * - **Lifecycle Aware**: Uses platform validator wrapper for stability
 *
 * ## Condition Function Patterns
 *
 * ### Field Value-Based Conditions
 * ```typescript
 * // Required only when another field has a value
 * ifValidator(
 *   (control) => control.parent?.get('hasPreferences')?.value === true,
 *   () => Validators.required
 * )
 *
 * // Validation based on current control value
 * ifValidator(
 *   (control) => control.value && control.value.length > 0,
 *   () => Validators.minLength(5)
 * )
 * ```
 *
 * ### Form State-Based Conditions
 * ```typescript
 * // Validate only when form is in specific state
 * ifValidator(
 *   (control) => {
 *     const form = control.parent as FormGroup;
 *     return form?.get('mode')?.value === 'advanced';
 *   },
 *   () => customComplexValidator
 * )
 * ```
 *
 * ## Real-World Usage Examples
 *
 * ### Goal Management System
 * Based on actual usage in `upsert-goal-form.component.ts`:
 * ```typescript
 * // Start date required only for certain goal types
 * startDate: new FormControl('', [
 *   ifValidator(
 *     () => this.checkIsValueRequired(GoalTypes.Objective),
 *     () => Validators.required
 *   ),
 *   ifValidator(
 *     () => this.checkIsValueRequired(GoalTypes.Objective),
 *     () => this.isDueTimeBeforeStartDateValidator(GoalTypes.KeyResult, index)
 *   ),
 *   ifValidator(
 *     () => this.checkIsValueRequired(GoalTypes.Objective),
 *     () => this.isKRStartDateBeforeObjectiveStartDateValidator(index)
 *   )
 * ])
 * ```
 *
 * ### User Registration Form
 * ```typescript
 * // Phone required only for premium users
 * phone: new FormControl('', [
 *   ifValidator(
 *     (control) => control.parent?.get('accountType')?.value === 'premium',
 *     () => Validators.required
 *   ),
 *   ifValidator(
 *     (control) => control.value,
 *     () => Validators.pattern(/^\+?[\d\s\-\(\)]+$/)
 *   )
 * ])
 * ```
 *
 * ### Dynamic Validation Rules
 * ```typescript
 * // Password requirements based on security level
 * password: new FormControl('', [
 *   ifValidator(
 *     (control) => control.parent?.get('securityLevel')?.value === 'high',
 *     () => this.strongPasswordValidator
 *   ),
 *   ifValidator(
 *     (control) => control.parent?.get('securityLevel')?.value === 'medium',
 *     () => this.mediumPasswordValidator
 *   )
 * ])
 * ```
 *
 * @param {(control: FormControl) => boolean} condition - Function that determines whether to apply validation
 * @param {() => ValidatorFn} validatorFn - Factory function that returns the validator to apply
 * @returns {ValidatorFn} A conditional validator function compatible with Angular reactive forms
 *
 * @example
 * ```typescript
 * // Basic conditional required field
 * const form = new FormGroup({
 *   hasAddress: new FormControl(false),
 *   address: new FormControl('', [
 *     ifValidator(
 *       control => control.parent?.get('hasAddress')?.value === true,
 *       () => Validators.required
 *     )
 *   ])
 * });
 *
 * // Multiple conditional validators
 * email: new FormControl('', [
 *   ifValidator(
 *     control => control.value && control.value.length > 0,
 *     () => Validators.email
 *   ),
 *   ifValidator(
 *     control => control.parent?.get('userType')?.value === 'admin',
 *     () => companyEmailValidator
 *   )
 * ])
 * ```
 *
 * @see {@link ifAsyncValidator} Async version of conditional validation
 * @see {@link validator} Platform validator wrapper
 * @see {@link https://angular.io/guide/reactive-forms#conditional-validation} Angular Conditional Validation
 */
export function ifValidator(condition: (control: FormControl) => boolean, validatorFn: () => ValidatorFn): ValidatorFn {
    return validator((control: AbstractControl) => {
        if (!condition(<FormControl>control)) {
            return null;
        }
        return validatorFn()(control);
    });
}

/**
 * Creates a conditional asynchronous validator that applies async validation logic only when a condition is met.
 *
 * This function enables conditional async validation, allowing expensive operations like API calls
 * to be performed only when specific conditions are satisfied. It provides the same conditional
 * logic as `ifValidator` but for asynchronous validation scenarios.
 *
 * ## Features
 *
 * - **Conditional Async Execution**: Only performs async validation when condition is met
 * - **Performance Optimized**: Prevents unnecessary API calls and async operations
 * - **Lifecycle Aware**: Includes attachment checking to prevent validation on detached controls
 * - **Observable Integration**: Returns proper Observable streams for Angular integration
 * - **Error Handling**: Provides consistent error handling for async operations
 *
 * ## Common Use Cases
 *
 * ### API-Based Validation
 * ```typescript
 * // Check username availability only when field has content
 * username: new FormControl('', {
 *   asyncValidators: [
 *     ifAsyncValidator(
 *       control => control.value && control.value.length >= 3,
 *       usernameAvailabilityValidator
 *     )
 *   ]
 * })
 *
 * // Validate email domain only for external users
 * email: new FormControl('', {
 *   asyncValidators: [
 *     ifAsyncValidator(
 *       control => control.parent?.get('userType')?.value === 'external',
 *       externalEmailDomainValidator
 *     )
 *   ]
 * })
 * ```
 *
 * ### Complex Business Logic Validation
 * ```typescript
 * // Validate project code only when organization is selected
 * projectCode: new FormControl('', {
 *   asyncValidators: [
 *     ifAsyncValidator(
 *       control => {
 *         const orgId = control.parent?.get('organizationId')?.value;
 *         return orgId && control.value;
 *       },
 *       (control) => projectCodeValidator(
 *         control.parent?.get('organizationId')?.value
 *       )(control)
 *     )
 *   ]
 * })
 * ```
 *
 * ### File Upload Validation
 * ```typescript
 * // Security scan only for certain file types
 * uploadedFile: new FormControl(null, {
 *   asyncValidators: [
 *     ifAsyncValidator(
 *       control => {
 *         const file = control.value as File;
 *         return file && ['exe', 'dll', 'bat'].includes(
 *           file.name.split('.').pop()?.toLowerCase() || ''
 *         );
 *       },
 *       fileSecurityScanValidator
 *     )
 *   ]
 * })
 * ```
 *
 * ## Performance Optimization
 *
 * The conditional async validator prevents expensive operations:
 * - **Network Requests**: API calls only when necessary
 * - **File Processing**: Heavy file operations only for specific conditions
 * - **Database Queries**: Expensive lookups only when required
 * - **External Services**: Third-party validations only when conditions are met
 *
 * ## Error Handling Patterns
 *
 * ```typescript
 * // Robust error handling with fallbacks
 * const conditionalValidator = ifAsyncValidator(
 *   control => control.value,
 *   (control) => apiValidationService.validate(control.value).pipe(
 *     map(result => result.isValid ? null : buildFormValidationErrors('invalid', result.error)),
 *     catchError(error => {
 *       console.error('Validation API error:', error);
 *       // Return null to allow form submission if validation service fails
 *       return of(null);
 *     }),
 *     timeout(5000),
 *     catchError(() => of(buildFormValidationErrors('timeout', 'Validation timeout')))
 *   )
 * );
 * ```
 *
 * ## Integration with Form State
 *
 * ```typescript
 * // Conditional validation based on multiple form fields
 * const complexConditionalValidator = ifAsyncValidator(
 *   (control) => {
 *     const form = control.parent as FormGroup;
 *     if (!form) return false;
 *
 *     const isAdvancedMode = form.get('mode')?.value === 'advanced';
 *     const hasRequiredFields = form.get('requiredField')?.valid;
 *     const userHasPermission = form.get('userRole')?.value === 'admin';
 *
 *     return isAdvancedMode && hasRequiredFields && userHasPermission;
 *   },
 *   advancedBusinessRuleValidator
 * );
 * ```
 *
 * @param {(control: FormControl) => boolean} condition - Function that determines whether to apply async validation
 * @param {AsyncValidatorFn} validatorFn - The async validator function to apply when condition is true
 * @returns {AsyncValidatorFn} A conditional async validator function compatible with Angular reactive forms
 *
 * @example
 * ```typescript
 * // Email availability check only when email format is valid
 * const form = new FormGroup({
 *   email: new FormControl('', {
 *     validators: [Validators.required, Validators.email],
 *     asyncValidators: [
 *       ifAsyncValidator(
 *         control => control.valid && control.value,
 *         emailAvailabilityValidator
 *       )
 *     ]
 *   })
 * });
 *
 * // Organization-specific validation
 * organizationCode: new FormControl('', {
 *   asyncValidators: [
 *     ifAsyncValidator(
 *       control => {
 *         const userType = control.parent?.get('userType')?.value;
 *         return userType === 'organization_admin' && control.value;
 *       },
 *       organizationCodeValidator
 *     )
 *   ]
 * })
 * ```
 *
 * @see {@link ifValidator} Synchronous version of conditional validation
 * @see {@link asyncValidator} Platform async validator wrapper
 * @see {@link https://angular.io/guide/form-validation#async-validation} Angular Async Validation
 */
export function ifAsyncValidator(condition: (control: FormControl) => boolean, validatorFn: AsyncValidatorFn): AsyncValidatorFn {
    return (control: AbstractControl) => {
        // if control is not FormGroup and root of it equal itself mean that control is just new and not attached to any form group
        // no need to execute form validation or check if condition
        if (!(control instanceof FormGroup) && control.root == control) return of(null);

        if (!condition(<FormControl>control)) {
            return of(null);
        }
        return validatorFn(control);
    };
}
