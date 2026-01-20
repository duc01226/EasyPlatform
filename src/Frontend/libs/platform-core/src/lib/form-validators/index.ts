/**
 * @fileoverview Platform Form Validators Module
 *
 * This module provides a comprehensive suite of form validation utilities for Angular
 * reactive forms, designed to enhance form validation capabilities with platform-specific
 * features and best practices. It includes both synchronous and asynchronous validators,
 * conditional validation logic, and specialized validators for common use cases.
 *
 * ## Module Overview
 *
 * The form validators module offers a complete validation ecosystem that addresses
 * common validation scenarios while providing extensibility for custom business rules.
 * All validators are designed with performance, type safety, and developer experience
 * in mind.
 *
 * ## Exported Validators
 *
 * ### Core Validation Utilities
 * - **`validator()`** - Basic lifecycle-aware validator wrapper
 * - **`asyncValidator()`** - Advanced async validation with throttling and error handling
 *
 * ### Conditional Validation
 * - **`ifValidator()`** - Apply sync validators based on conditions
 * - **`ifAsyncValidator()`** - Apply async validators based on conditions
 *
 * ### Specialized Validators
 * - **`startEndValidator()`** - Date/time/numeric range validation
 * - **`noWhitespaceValidator()`** - Prevent whitespace-only input
 *
 * ### Validation Models & Utilities
 * - **`IPlatformFormValidationError`** - Standardized error interface
 * - **`buildFormValidationError()`** - Error object creation utility
 * - **`buildFormValidationErrors()`** - Angular ValidationErrors creation
 *
 * ## Key Features
 *
 * ### Performance Optimized
 * - **Lifecycle Awareness**: Prevents validation on detached controls
 * - **Conditional Execution**: Only runs when necessary
 * - **Throttling Support**: Configurable async validation throttling
 * - **Memory Efficient**: Minimal object creation and cleanup
 *
 * ### Developer Experience
 * - **Type Safety**: Full TypeScript support with proper typing
 * - **Consistent API**: Uniform interface across all validators
 * - **Rich Documentation**: Comprehensive JSDoc with examples
 * - **Error Integration**: Seamless Angular ValidationErrors compatibility
 *
 * ### Enterprise Features
 * - **Localization Support**: Parameter substitution for error messages
 * - **Business Rules**: Complex conditional validation logic
 * - **Async Operations**: Network validation with proper error handling
 * - **Form State Integration**: Validation based on form context
 *
 * ## Architecture Integration
 *
 * ### Platform Component Integration
 * ```typescript
 * import {
 *   validator,
 *   asyncValidator,
 *   ifValidator,
 *   startEndValidator,
 *   noWhitespaceValidator,
 *   buildFormValidationErrors
 * } from '@libs/platform-core';
 *
 * // Use in PlatformVmComponent or PlatformComponent forms
 * class MyFormComponent extends PlatformVmComponent<MyFormVm> {
 *   protected initialFormConfig = (): PlatformFormConfig<MyFormVm> => ({
 *     controls: {
 *       // Various validator combinations
 *     }
 *   });
 * }
 * ```
 *
 * ### Reactive Forms Integration
 * ```typescript
 * import { FormGroup, FormControl, Validators } from '@angular/forms';
 * import { validator, asyncValidator, ifValidator } from '@libs/platform-core';
 *
 * const form = new FormGroup({
 *   email: new FormControl('', {
 *     validators: [Validators.required, Validators.email],
 *     asyncValidators: [emailAvailabilityValidator]
 *   }),
 *   dateRange: new FormControl('', [
 *     startEndValidator('dateRangeError', getStartDate, getEndDate)
 *   ])
 * });
 * ```
 *
 * ## Common Usage Patterns
 *
 * ### User Registration Form
 * ```typescript
 * import {
 *   validator,
 *   asyncValidator,
 *   ifValidator,
 *   noWhitespaceValidator,
 *   buildFormValidationErrors
 * } from '@libs/platform-core';
 *
 * const registrationForm = new FormGroup({
 *   firstName: new FormControl('', [
 *     Validators.required,
 *     noWhitespaceValidator
 *   ]),
 *   email: new FormControl('', {
 *     validators: [Validators.required, Validators.email],
 *     asyncValidators: [
 *       ifAsyncValidator(
 *         control => control.valid,
 *         emailUniqueValidator
 *       )
 *     ]
 *   }),
 *   confirmEmail: new FormControl('', [
 *     Validators.required,
 *     ifValidator(
 *       control => control.parent?.get('email')?.value,
 *       () => matchEmailValidator
 *     )
 *   ])
 * });
 * ```
 *
 * ### Event Scheduling Form
 * ```typescript
 * const eventForm = new FormGroup({
 *   startDate: new FormControl('', [Validators.required]),
 *   endDate: new FormControl('', [
 *     Validators.required,
 *     startEndValidator(
 *       'invalidDateRange',
 *       control => control.parent?.get('startDate')?.value,
 *       control => control.value,
 *       {
 *         allowEqual: false,
 *         checkDatePart: 'dateOnly',
 *         condition: control => control.value && control.parent?.get('startDate')?.value
 *       }
 *     )
 *   ])
 * });
 * ```
 *
 * ### Business Rule Validation
 * ```typescript
 * const businessForm = new FormGroup({
 *   userType: new FormControl(''),
 *   companyEmail: new FormControl('', [
 *     ifValidator(
 *       control => control.parent?.get('userType')?.value === 'employee',
 *       () => validator((control) => {
 *         const email = control.value;
 *         if (email && !email.endsWith('@company.com')) {
 *           return buildFormValidationErrors('companyEmailRequired', {
 *             errorMsg: 'Employees must use company email address',
 *             params: { domain: '@company.com' }
 *           });
 *         }
 *         return null;
 *       })
 *     )
 *   ])
 * });
 * ```
 *
 * ## Error Handling Patterns
 *
 * ```typescript
 * // Component error handling
 * get validationErrors(): string[] {
 *   const errors: string[] = [];
 *
 *   Object.keys(this.form.controls).forEach(key => {
 *     const control = this.form.get(key);
 *     if (control?.errors) {
 *       Object.values(control.errors).forEach(error => {
 *         if (error && typeof error === 'object' && 'errorMsg' in error) {
 *           errors.push(error.errorMsg);
 *         }
 *       });
 *     }
 *   });
 *
 *   return errors;
 * }
 * ```
 *
 * ## Testing Support
 *
 * ```typescript
 * // Unit testing validators
 * import { validator, buildFormValidationErrors } from '@libs/platform-core';
 *
 * describe('Custom Validators', () => {
 *   it('should validate business rules', () => {
 *     const testValidator = validator((control) => {
 *       return control.value === 'invalid'
 *         ? buildFormValidationErrors('test', 'Test error')
 *         : null;
 *     });
 *
 *     const control = new FormControl('invalid');
 *     expect(testValidator(control)).toBeTruthy();
 *   });
 * });
 * ```
 *
 * ## Performance Best Practices
 *
 * - **Use Conditional Validators**: Apply `ifValidator` to prevent unnecessary execution
 * - **Throttle Async Validators**: Configure appropriate throttling for network operations
 * - **Leverage Lifecycle Awareness**: Validators automatically handle detached controls
 * - **Optimize Conditions**: Keep condition functions lightweight and efficient
 *
 * ## Migration and Upgrade
 *
 * When upgrading existing forms to use platform validators:
 *
 * 1. **Wrap Existing Validators**: Use `validator()` wrapper for lifecycle safety
 * 2. **Add Conditional Logic**: Use `ifValidator` for performance improvements
 * 3. **Standardize Error Objects**: Migrate to `buildFormValidationErrors` format
 * 4. **Implement Async Throttling**: Add throttling to existing async validators
 *
 * @module PlatformFormValidators
 * @since Platform Core v1.0.0
 * @author Platform Team
 *
 * @example
 * ```typescript
 * // Complete example: Advanced form validation
 * import {
 *   validator,
 *   asyncValidator,
 *   ifValidator,
 *   startEndValidator,
 *   noWhitespaceValidator,
 *   buildFormValidationErrors
 * } from '@libs/platform-core';
 *
 * const advancedForm = new FormGroup({
 *   // Basic validation with whitespace check
 *   name: new FormControl('', [
 *     Validators.required,
 *     noWhitespaceValidator,
 *     Validators.minLength(2)
 *   ]),
 *
 *   // Conditional email validation
 *   email: new FormControl('', {
 *     validators: [
 *       Validators.required,
 *       Validators.email,
 *       ifValidator(
 *         control => control.parent?.get('requiresCompanyEmail')?.value,
 *         () => companyEmailValidator
 *       )
 *     ],
 *     asyncValidators: [
 *       ifAsyncValidator(
 *         control => control.valid,
 *         emailAvailabilityValidator
 *       )
 *     ]
 *   }),
 *
 *   // Date range validation
 *   projectStart: new FormControl('', [Validators.required]),
 *   projectEnd: new FormControl('', [
 *     Validators.required,
 *     startEndValidator(
 *       'invalidProjectDuration',
 *       control => control.parent?.get('projectStart')?.value,
 *       control => control.value,
 *       {
 *         allowEqual: false,
 *         checkDatePart: 'dateOnly',
 *         condition: control => control.value && control.parent?.get('projectStart')?.value
 *       }
 *     )
 *   ])
 * });
 * ```
 */

export * from './async-validator';
export * from './if-validator';
export * from './models';
export * from './start-end-validator';
export * from './validator';
export * from './white-space-validator';
