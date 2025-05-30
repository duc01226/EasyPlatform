/**
 * @fileoverview Asynchronous Platform Form Validator Utilities
 *
 * This module provides advanced utilities for creating asynchronous form validators
 * with built-in throttling, cancellation, error handling, and lifecycle management.
 * It's designed for validators that need to make API calls or perform other async operations.
 *
 * ## Key Features
 *
 * - **Throttling**: Prevents excessive API calls during user input
 * - **Cancellation**: Automatically cancels previous requests when new validation starts
 * - **Error Handling**: Standardized error processing with fallback messages
 * - **Lifecycle Management**: Proper cleanup and subscription management
 * - **Performance Optimized**: Smart scheduling and duplicate request prevention
 *
 * ## Common Use Cases
 *
 * - Username/email uniqueness validation
 * - Real-time data verification against external systems
 * - Dynamic validation rules from server
 * - Complex business rule validation requiring API calls
 *
 * @module PlatformAsyncFormValidator
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

import { AbstractControl, AsyncValidatorFn, FormGroup, ValidationErrors } from '@angular/forms';

import { asyncScheduler, catchError, delay, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';

import { PlatformApiServiceErrorResponse } from '../api-services';
import { distinctUntilObjectValuesChanged } from '../rxjs';
import { buildFormValidationErrors } from './models';

/**
 * Creates a sophisticated asynchronous validator function for Angular reactive forms.
 *
 * This function provides a comprehensive solution for async validation scenarios,
 * including API-based validation, with built-in throttling, request cancellation,
 * error handling, and performance optimizations. It's designed to handle real-world
 * validation requirements while maintaining optimal user experience.
 *
 * ## Features
 *
 * ### Throttling & Performance
 * - **Configurable Throttling**: Prevents excessive API calls during rapid user input
 * - **Smart Scheduling**: Different throttling strategies based on form state
 * - **Request Cancellation**: Automatically cancels outdated validation requests
 * - **Duplicate Prevention**: Avoids redundant validation calls
 *
 * ### Error Handling
 * - **Comprehensive Error Processing**: Handles API errors, network failures, timeouts
 * - **Standardized Error Format**: Consistent error structure across validators
 * - **Fallback Messages**: Graceful degradation when error details unavailable
 * - **Type-Safe Error Handling**: Proper typing for different error scenarios
 *
 * ### Lifecycle Management
 * - **Attachment Verification**: Only validates properly attached form controls
 * - **Subscription Cleanup**: Automatic cleanup of observables and subscriptions
 * - **Memory Management**: Prevents memory leaks from abandoned validations
 * - **Form State Awareness**: Responds appropriately to form lifecycle events
 *
 * ## Usage Patterns
 *
 * ### Username Uniqueness Validation
 * ```typescript
 * import { asyncValidator, buildFormValidationErrors } from '@libs/platform-core';
 *
 * export const usernameUniqueValidator = asyncValidator(
 *   'usernameNotUnique',
 *   (control: AbstractControl) => {
 *     if (!control.value || control.value.length < 3) {
 *       return of(null); // Let other validators handle empty/short values
 *     }
 *
 *     return userService.checkUsernameAvailability(control.value).pipe(
 *       map(isAvailable => {
 *         if (!isAvailable) {
 *           return buildFormValidationErrors('usernameNotUnique', {
 *             errorMsg: 'Username "{username}" is already taken',
 *             params: {
 *               username: control.value,
 *               suggestions: ['user123', 'user456'] // Could include API suggestions
 *             }
 *           });
 *         }
 *         return null;
 *       })
 *     );
 *   },
 *   750, // 750ms throttle for username checks
 *   true  // Only throttle when form is valid
 * );
 *
 * // Usage in form
 * const form = new FormGroup({
 *   username: new FormControl('', {
 *     validators: [Validators.required, Validators.minLength(3)],
 *     asyncValidators: [usernameUniqueValidator]
 *   })
 * });
 * ```
 *
 * ### Email Domain Validation
 * ```typescript
 * // Validate email against company directory
 * export const emailDomainValidator = asyncValidator(
 *   'invalidEmailDomain',
 *   (control: AbstractControl) => {
 *     if (!control.value || !control.value.includes('@')) {
 *       return of(null);
 *     }
 *
 *     const domain = control.value.split('@')[1];
 *     return companyService.validateEmailDomain(domain).pipe(
 *       map(result => {
 *         if (!result.isValid) {
 *           return buildFormValidationErrors('invalidEmailDomain', {
 *             errorMsg: 'Email domain "{domain}" is not allowed. {reason}',
 *             params: {
 *               domain: domain,
 *               reason: result.reason,
 *               allowedDomains: result.allowedDomains?.join(', ')
 *             }
 *           });
 *         }
 *         return null;
 *       })
 *     );
 *   },
 *   500 // Standard 500ms throttle
 * );
 * ```
 *
 * ### Project Code Validation
 * ```typescript
 * // Validate project codes against active projects
 * export function projectCodeValidator(organizationId: string) {
 *   return asyncValidator(
 *     'invalidProjectCode',
 *     (control: AbstractControl) => {
 *       if (!control.value) return of(null);
 *
 *       return projectService.validateProjectCode(
 *         control.value,
 *         organizationId
 *       ).pipe(
 *         map(validation => {
 *           if (!validation.isValid) {
 *             return buildFormValidationErrors('invalidProjectCode', {
 *               errorMsg: 'Project code "{code}" is {status}. {additionalInfo}',
 *               params: {
 *                 code: control.value,
 *                 status: validation.status, // 'inactive', 'not found', etc.
 *                 additionalInfo: validation.message,
 *                 organizationName: validation.organizationName
 *               }
 *             });
 *           }
 *           return null;
 *         })
 *       );
 *     },
 *     1000, // Longer throttle for project lookups
 *     true  // Only validate when rest of form is valid
 *   );
 * }
 * ```
 *
 * ### Dynamic Business Rules Validation
 * ```typescript
 * // Validate against server-side business rules
 * export const businessRuleValidator = asyncValidator(
 *   'businessRuleViolation',
 *   (control: AbstractControl) => {
 *     const formGroup = control.parent as FormGroup;
 *     if (!formGroup || !control.value) return of(null);
 *
 *     // Collect all form data for comprehensive validation
 *     const formData = {
 *       ...formGroup.value,
 *       [control.value]: control.value // Ensure current field is included
 *     };
 *
 *     return businessRuleService.validateForm(formData).pipe(
 *       map(validationResult => {
 *         const fieldErrors = validationResult.fieldErrors?.[control.value];
 *         if (fieldErrors?.length > 0) {
 *           return buildFormValidationErrors('businessRuleViolation', {
 *             errorMsg: 'Business rule violation: {violations}',
 *             params: {
 *               violations: fieldErrors.join('; '),
 *               ruleCode: validationResult.ruleCode,
 *               severity: validationResult.severity
 *             }
 *           });
 *         }
 *         return null;
 *       })
 *     );
 *   },
 *   800 // Moderate throttle for business rules
 * );
 * ```
 *
 * ### File Upload Validation
 * ```typescript
 * // Async file validation (virus scan, content analysis)
 * export const fileSecurityValidator = asyncValidator(
 *   'fileSecurityIssue',
 *   (control: AbstractControl) => {
 *     const file = control.value as File;
 *     if (!file) return of(null);
 *
 *     return fileSecurityService.scanFile(file).pipe(
 *       map(scanResult => {
 *         if (!scanResult.isSafe) {
 *           return buildFormValidationErrors('fileSecurityIssue', {
 *             errorMsg: 'File security scan failed: {issues}',
 *             params: {
 *               issues: scanResult.issues.join(', '),
 *               fileName: file.name,
 *               scanId: scanResult.scanId
 *             }
 *           });
 *         }
 *         return null;
 *       }),
 *       timeout(30000), // 30 second timeout for file scans
 *       catchError(() => of(buildFormValidationErrors('fileSecurityTimeout', {
 *         errorMsg: 'File security scan timed out. Please try again.'
 *       })))
 *     );
 *   },
 *   0, // No throttling for file uploads
 *   false
 * );
 * ```
 *
 * ## Advanced Configuration Patterns
 *
 * ### Conditional Async Validation
 * ```typescript
 * // Only validate when specific conditions are met
 * export function conditionalAsyncValidator(
 *   condition: (control: AbstractControl) => boolean,
 *   baseValidator: AsyncValidatorFn
 * ): AsyncValidatorFn {
 *   return (control: AbstractControl) => {
 *     if (!condition(control)) {
 *       return of(null);
 *     }
 *     return baseValidator(control);
 *   };
 * }
 *
 * // Usage: Only validate email when user type is 'external'
 * const conditionalEmailValidator = conditionalAsyncValidator(
 *   (control) => {
 *     const userType = control.parent?.get('userType')?.value;
 *     return userType === 'external';
 *   },
 *   emailDomainValidator
 * );
 * ```
 *
 * ### Dependent Field Validation
 * ```typescript
 * // Validate based on other field values
 * export const departmentCodeValidator = asyncValidator(
 *   'invalidDepartmentCode',
 *   (control: AbstractControl) => {
 *     const formGroup = control.parent as FormGroup;
 *     if (!formGroup) return of(null);
 *
 *     const organizationId = formGroup.get('organizationId')?.value;
 *     const divisionId = formGroup.get('divisionId')?.value;
 *
 *     if (!organizationId || !divisionId || !control.value) {
 *       return of(null);
 *     }
 *
 *     return departmentService.validateCode(
 *       control.value,
 *       organizationId,
 *       divisionId
 *     ).pipe(
 *       map(isValid => {
 *         if (!isValid) {
 *           return buildFormValidationErrors('invalidDepartmentCode', {
 *             errorMsg: 'Department code "{code}" not found in {division}',
 *             params: {
 *               code: control.value,
 *               division: formGroup.get('divisionName')?.value || divisionId
 *             }
 *           });
 *         }
 *         return null;
 *       })
 *     );
 *   },
 *   600
 * );
 * ```
 *
 * ## Error Handling Patterns
 *
 * ### Custom Error Processing
 * ```typescript
 * // Handle different types of API errors
 * const enhancedValidator = asyncValidator(
 *   'validationError',
 *   (control: AbstractControl) => {
 *     return apiService.validate(control.value).pipe(
 *       map(result => result.isValid ? null : buildFormValidationErrors('invalid', result.message)),
 *       catchError((error: any) => {
 *         // Custom error handling based on error type
 *         if (error.status === 429) {
 *           return of(buildFormValidationErrors('rateLimited', {
 *             errorMsg: 'Too many validation requests. Please wait {waitTime} seconds.',
 *             params: { waitTime: error.retryAfter || 30 }
 *           }));
 *         }
 *
 *         if (error.status === 503) {
 *           return of(buildFormValidationErrors('serviceUnavailable', {
 *             errorMsg: 'Validation service temporarily unavailable. Please try again later.'
 *           }));
 *         }
 *
 *         // Use default error handling
 *         throw error;
 *       })
 *     );
 *   },
 *   500
 * );
 * ```
 *
 * ## Performance Optimization
 *
 * ### Throttling Strategies
 * ```typescript
 * // Different throttling for different scenarios
 * const fastValidator = asyncValidator('error', validationFn, 200);     // Quick response
 * const standardValidator = asyncValidator('error', validationFn, 500); // Standard
 * const slowValidator = asyncValidator('error', validationFn, 1000);    // Complex queries
 * const noThrottleValidator = asyncValidator('error', validationFn, 0); // Immediate
 * ```
 *
 * ### Form State-Based Throttling
 * ```typescript
 * // Only throttle when form is valid (faster feedback during initial input)
 * const smartValidator = asyncValidator(
 *   'error',
 *   validationFn,
 *   1000,  // Long throttle
 *   true   // Only when form is valid
 * );
 * ```
 *
 * ## Testing Considerations
 *
 * ```typescript
 * // Mock async validators in tests
 * const mockAsyncValidator: AsyncValidatorFn = (control) => {
 *   return of(control.value === 'invalid'
 *     ? buildFormValidationErrors('test', 'Test error')
 *     : null
 *   );
 * };
 * ```
 *
 * @param {string} errorKey - The validation error key (used in ValidationErrors object)
 * @param {(control: AbstractControl) => Observable<ValidationErrors | null>} validatorFn - The async validation function
 * @param {number} [throttleTimeMs=500] - Throttle delay in milliseconds to prevent excessive API calls
 * @param {boolean} [onlyThrottleValidForm=false] - If true, only throttle when the form is valid
 * @returns {AsyncValidatorFn} A configured Angular async validator function
 *
 * @example
 * ```typescript
 * // Complete example with multiple async validators
 * const registrationForm = new FormGroup({
 *   username: new FormControl('', {
 *     validators: [Validators.required, Validators.minLength(3)],
 *     asyncValidators: [usernameUniqueValidator]
 *   }),
 *   email: new FormControl('', {
 *     validators: [Validators.required, Validators.email],
 *     asyncValidators: [emailDomainValidator, emailUniqueValidator]
 *   }),
 *   projectCode: new FormControl('', {
 *     asyncValidators: [projectCodeValidator(currentOrgId)]
 *   })
 * });
 *
 * // Handle validation state in component
 * get isValidating(): boolean {
 *   return this.registrationForm.pending;
 * }
 *
 * get validationErrors(): string[] {
 *   const errors: string[] = [];
 *   Object.keys(this.registrationForm.controls).forEach(key => {
 *     const control = this.registrationForm.get(key);
 *     if (control?.errors) {
 *       Object.values(control.errors).forEach(error => {
 *         if (error && typeof error === 'object' && 'errorMsg' in error) {
 *           errors.push(error.errorMsg);
 *         }
 *       });
 *     }
 *   });
 *   return errors;
 * }
 * ```
 *
 * @see {@link validator} Synchronous validator utility
 * @see {@link buildFormValidationErrors} Error creation utility
 * @see {@link IPlatformFormValidationError} Error object interface
 * @see {@link https://angular.io/guide/form-validation#async-validation} Angular Async Validation
 */
export function asyncValidator(
    errorKey: string,
    validatorFn: (control: AbstractControl) => Observable<ValidationErrors | null>,
    throttleTimeMs: number = 500,
    onlyThrottleValidForm: boolean = false
): AsyncValidatorFn {
    const cancelPreviousSub: Subject<unknown> = new Subject();

    return (control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> => {
        // if control is not FormGroup and root of it equal itself mean that control is just new and not attached to any form group
        // no need to execute form validation
        if (!(control instanceof FormGroup) && control.root == control) return of(null);

        cancelPreviousSub.next(null);

        return of(null).pipe(
            takeUntil(cancelPreviousSub),
            delay(!onlyThrottleValidForm || control.root.valid || control.root.status == 'PENDING' ? throttleTimeMs : 0, asyncScheduler),
            switchMap(() =>
                validatorFn(control).pipe(
                    takeUntil(cancelPreviousSub),
                    catchError((error: PlatformApiServiceErrorResponse | Error) =>
                        of(buildFormValidationErrors(errorKey, PlatformApiServiceErrorResponse.getDefaultFormattedMessage(error)))
                    )
                )
            ),
            distinctUntilObjectValuesChanged()
        );
    };
}
