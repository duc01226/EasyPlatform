/**
 * @fileoverview Platform Form Validation Error Models
 *
 * This module provides type definitions and utility functions for handling form validation
 * errors in a standardized way across the platform. It extends Angular's validation
 * system with additional metadata and localization support.
 *
 * ## Key Features
 *
 * - **Standardized Error Structure**: Consistent error format across all forms
 * - **Localization Support**: Error messages with parameter substitution
 * - **Type Safety**: Full TypeScript support for validation errors
 * - **Angular Integration**: Compatible with Angular reactive forms
 *
 * ## Usage Patterns
 *
 * ### Basic Error Creation
 * ```typescript
 * // Simple string error
 * const error = buildFormValidationError('Email is required');
 *
 * // Complex error with parameters
 * const error = buildFormValidationError({
 *   errorMsg: 'Password must be at least {minLength} characters',
 *   params: { minLength: 8 }
 * });
 * ```
 *
 * ### Form Integration
 * ```typescript
 * // In custom validators
 * static customValidator(control: AbstractControl): ValidationErrors | null {
 *   if (control.value?.length < 3) {
 *     return buildFormValidationErrors('tooShort', {
 *       errorMsg: 'Value must be at least {min} characters',
 *       params: { min: 3 }
 *     });
 *   }
 *   return null;
 * }
 * ```
 *
 * @module PlatformFormValidationErrors
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

import { ValidationErrors } from '@angular/forms';
import { Dictionary } from '../../common-types';

/**
 * Standardized platform form validation error interface.
 *
 * This interface defines the structure for all validation errors in the platform,
 * providing a consistent format that supports localization and parameter substitution.
 *
 * ## Features
 *
 * - **Error Message**: Human-readable error description
 * - **Parameters**: Dynamic values for message interpolation
 * - **Localization Ready**: Supports i18n message keys and parameter substitution
 * - **Type Safe**: Full TypeScript support with proper typing
 *
 * ## Usage Examples
 *
 * ### Simple Error Messages
 * ```typescript
 * const requiredError: IPlatformFormValidationError = {
 *   errorMsg: 'This field is required'
 * };
 *
 * const emailError: IPlatformFormValidationError = {
 *   errorMsg: 'Please enter a valid email address'
 * };
 * ```
 *
 * ### Parameterized Error Messages
 * ```typescript
 * const lengthError: IPlatformFormValidationError = {
 *   errorMsg: 'Value must be between {min} and {max} characters',
 *   params: { min: 3, max: 50 }
 * };
 *
 * const dateError: IPlatformFormValidationError = {
 *   errorMsg: 'Date must be after {minDate}',
 *   params: { minDate: new Date('2023-01-01') }
 * };
 * ```
 *
 * ### Localization Keys
 * ```typescript
 * const localizedError: IPlatformFormValidationError = {
 *   errorMsg: 'validation.password.tooWeak',
 *   params: {
 *     requiredStrength: 'medium',
 *     currentStrength: 'weak'
 *   }
 * };
 * ```
 *
 * ### Real-World Validator Examples
 * ```typescript
 * // Password strength validator
 * static passwordStrength(control: AbstractControl): ValidationErrors | null {
 *   const value = control.value;
 *   if (!value) return null;
 *
 *   if (value.length < 8) {
 *     return buildFormValidationErrors('passwordTooShort', {
 *       errorMsg: 'Password must be at least {minLength} characters',
 *       params: { minLength: 8 }
 *     });
 *   }
 *
 *   if (!/[A-Z]/.test(value)) {
 *     return buildFormValidationErrors('passwordNoUppercase', {
 *       errorMsg: 'Password must contain at least one uppercase letter'
 *     });
 *   }
 *
 *   return null;
 * }
 *
 * // Date range validator
 * static dateRange(minDate: Date, maxDate: Date) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     const value = control.value;
 *     if (!value) return null;
 *
 *     const date = new Date(value);
 *     if (date < minDate || date > maxDate) {
 *       return buildFormValidationErrors('dateOutOfRange', {
 *         errorMsg: 'Date must be between {minDate} and {maxDate}',
 *         params: {
 *           minDate: minDate.toLocaleDateString(),
 *           maxDate: maxDate.toLocaleDateString()
 *         }
 *       });
 *     }
 *
 *     return null;
 *   };
 * }
 * ```
 *
 * ## Parameter Types
 *
 * The `params` object supports various data types:
 * - **string**: Text values, labels, enum values
 * - **number**: Numeric limits, counts, thresholds
 * - **Date**: Date/time values for temporal validations
 *
 * ## Template Integration
 *
 * ```html
 * <!-- Display validation errors in templates -->
 * <div *ngIf="form.get('email')?.errors?.['emailInvalid'] as error">
 *   <span class="error-message">{{ error.errorMsg }}</span>
 *   <span *ngIf="error.params" class="error-details">
 *     <!-- Process parameters for display -->
 *   </span>
 * </div>
 * ```
 *
 * @interface IPlatformFormValidationError
 *
 * @property {string} errorMsg - The error message text or localization key
 * @property {Dictionary<string | number | Date>} [params] - Optional parameters for message interpolation
 *
 * @example
 * ```typescript
 * // Custom validation with complex parameters
 * const validationError: IPlatformFormValidationError = {
 *   errorMsg: 'File size {actualSize}MB exceeds maximum allowed size of {maxSize}MB',
 *   params: {
 *     actualSize: 15.7,
 *     maxSize: 10,
 *     uploadDate: new Date()
 *   }
 * };
 * ```
 *
 * @see {@link buildFormValidationError} Helper function to create error objects
 * @see {@link buildFormValidationErrors} Helper function for Angular ValidationErrors
 */
export interface IPlatformFormValidationError {
    errorMsg: string;
    params?: Dictionary<string | number | Date>;
}

/**
 * Creates a standardized validation error object from a string or error object.
 *
 * This utility function provides a convenient way to create IPlatformFormValidationError
 * objects from either simple string messages or complex error objects. It ensures
 * consistency in error object structure throughout the application.
 *
 * ## Features
 *
 * - **Flexible Input**: Accepts both strings and error objects
 * - **Normalization**: Converts string inputs to proper error objects
 * - **Type Safety**: Returns properly typed error objects
 * - **Consistency**: Ensures uniform error structure
 *
 * ## Usage Patterns
 *
 * ### String to Error Object
 * ```typescript
 * // Simple string message
 * const error = buildFormValidationError('Email is required');
 * // Result: { errorMsg: 'Email is required' }
 *
 * // Used in validators
 * static required(control: AbstractControl): ValidationErrors | null {
 *   return control.value ? null : {
 *     required: buildFormValidationError('This field is required')
 *   };
 * }
 * ```
 *
 * ### Pass-through Complex Objects
 * ```typescript
 * // Complex error object (passed through unchanged)
 * const complexError = buildFormValidationError({
 *   errorMsg: 'Value must be between {min} and {max}',
 *   params: { min: 1, max: 100 }
 * });
 * // Result: { errorMsg: 'Value must be between {min} and {max}', params: { min: 1, max: 100 } }
 * ```
 *
 * ### Dynamic Error Creation
 * ```typescript
 * function createLengthError(actualLength: number, requiredLength: number) {
 *   const message = actualLength < requiredLength
 *     ? 'Value is too short (minimum {required} characters)'
 *     : 'Value is too long (maximum {required} characters)';
 *
 *   return buildFormValidationError({
 *     errorMsg: message,
 *     params: {
 *       actual: actualLength,
 *       required: requiredLength
 *     }
 *   });
 * }
 * ```
 *
 * ### Integration with Existing Validators
 * ```typescript
 * // Enhance existing validators with standardized errors
 * static enhancedEmail(control: AbstractControl): ValidationErrors | null {
 *   const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 *
 *   if (!control.value) {
 *     return null; // Let required validator handle empty values
 *   }
 *
 *   if (!emailPattern.test(control.value)) {
 *     return {
 *       email: buildFormValidationError({
 *         errorMsg: 'Please enter a valid email address (example: user@domain.com)',
 *         params: {
 *           providedValue: control.value,
 *           exampleFormat: 'user@domain.com'
 *         }
 *       })
 *     };
 *   }
 *
 *   return null;
 * }
 * ```
 *
 * ## Type Guards and Validation
 *
 * ```typescript
 * function isValidationError(error: any): error is IPlatformFormValidationError {
 *   return error && typeof error.errorMsg === 'string';
 * }
 *
 * function processFormError(input: string | IPlatformFormValidationError) {
 *   const error = buildFormValidationError(input);
 *
 *   // Now we know 'error' is properly structured
 *   console.log(`Error: ${error.errorMsg}`);
 *   if (error.params) {
 *     console.log('Parameters:', error.params);
 *   }
 * }
 * ```
 *
 * @param {IPlatformFormValidationError | string} validationErrorOrMsg - Error object or string message
 * @returns {IPlatformFormValidationError} Standardized error object
 *
 * @example
 * ```typescript
 * // Various usage scenarios
 * const errors = [
 *   buildFormValidationError('Simple message'),
 *   buildFormValidationError({
 *     errorMsg: 'Complex message with {param}',
 *     params: { param: 'value' }
 *   }),
 *   buildFormValidationError('validation.key.from.i18n')
 * ];
 * ```
 *
 * @see {@link IPlatformFormValidationError} Error interface definition
 * @see {@link buildFormValidationErrors} Create Angular ValidationErrors object
 */
export function buildFormValidationError(validationErrorOrMsg: IPlatformFormValidationError | string): IPlatformFormValidationError {
    if (typeof validationErrorOrMsg == 'string') return { errorMsg: validationErrorOrMsg };
    return validationErrorOrMsg;
}

/**
 * Creates an Angular ValidationErrors object with a standardized platform error.
 *
 * This function creates a properly formatted ValidationErrors object that Angular
 * reactive forms can understand, while maintaining the platform's standardized
 * error structure. It's the bridge between platform error objects and Angular's
 * validation system.
 *
 * ## Features
 *
 * - **Angular Compatibility**: Creates proper ValidationErrors objects
 * - **Platform Standards**: Uses standardized error structure
 * - **Key-Value Mapping**: Associates errors with specific validation keys
 * - **Type Safety**: Fully typed return values
 *
 * ## Usage in Custom Validators
 *
 * ### Simple Validators
 * ```typescript
 * // Basic required validator
 * static required(control: AbstractControl): ValidationErrors | null {
 *   if (!control.value || control.value.trim() === '') {
 *     return buildFormValidationErrors('required', 'This field is required');
 *   }
 *   return null;
 * }
 *
 * // Email format validator
 * static email(control: AbstractControl): ValidationErrors | null {
 *   const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 *   if (control.value && !emailPattern.test(control.value)) {
 *     return buildFormValidationErrors('email', 'Please enter a valid email address');
 *   }
 *   return null;
 * }
 * ```
 *
 * ### Complex Validators with Parameters
 * ```typescript
 * // Minimum length validator
 * static minLength(length: number) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     if (control.value && control.value.length < length) {
 *       return buildFormValidationErrors('minLength', {
 *         errorMsg: 'Minimum length is {minLength} characters',
 *         params: {
 *           minLength: length,
 *           currentLength: control.value.length
 *         }
 *       });
 *     }
 *     return null;
 *   };
 * }
 *
 * // Date range validator
 * static dateAfter(minDate: Date) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     if (control.value) {
 *       const date = new Date(control.value);
 *       if (date <= minDate) {
 *         return buildFormValidationErrors('dateAfter', {
 *           errorMsg: 'Date must be after {minDate}',
 *           params: {
 *             minDate: minDate.toLocaleDateString(),
 *             providedDate: date.toLocaleDateString()
 *           }
 *         });
 *       }
 *     }
 *     return null;
 *   };
 * }
 * ```
 *
 * ### Business Logic Validators
 * ```typescript
 * // Unique username validator (with async support)
 * static uniqueUsername(userService: UserService) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     if (!control.value) return null;
 *
 *     // This would typically be async, but showing the error structure
 *     const isUnique = userService.checkUsernameSync(control.value);
 *     if (!isUnique) {
 *       return buildFormValidationErrors('usernameNotUnique', {
 *         errorMsg: 'Username "{username}" is already taken',
 *         params: {
 *           username: control.value,
 *           suggestions: ['user123', 'user456'] // Could include suggestions
 *         }
 *       });
 *     }
 *     return null;
 *   };
 * }
 *
 * // Password confirmation validator
 * static passwordMatch(passwordControlName: string) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     const formGroup = control.parent as FormGroup;
 *     if (!formGroup) return null;
 *
 *     const passwordControl = formGroup.get(passwordControlName);
 *     if (!passwordControl) return null;
 *
 *     if (control.value !== passwordControl.value) {
 *       return buildFormValidationErrors('passwordMismatch', {
 *         errorMsg: 'Passwords do not match'
 *       });
 *     }
 *     return null;
 *   };
 * }
 * ```
 *
 * ### File Upload Validators
 * ```typescript
 * // File size validator
 * static maxFileSize(maxSizeInMB: number) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     const file = control.value as File;
 *     if (file && file.size) {
 *       const fileSizeInMB = file.size / (1024 * 1024);
 *       if (fileSizeInMB > maxSizeInMB) {
 *         return buildFormValidationErrors('fileTooLarge', {
 *           errorMsg: 'File size ({actualSize}MB) exceeds maximum allowed size ({maxSize}MB)',
 *           params: {
 *             actualSize: Math.round(fileSizeInMB * 100) / 100,
 *             maxSize: maxSizeInMB,
 *             fileName: file.name
 *           }
 *         });
 *       }
 *     }
 *     return null;
 *   };
 * }
 *
 * // File type validator
 * static allowedFileTypes(allowedTypes: string[]) {
 *   return (control: AbstractControl): ValidationErrors | null => {
 *     const file = control.value as File;
 *     if (file && file.type) {
 *       if (!allowedTypes.includes(file.type)) {
 *         return buildFormValidationErrors('invalidFileType', {
 *           errorMsg: 'File type "{fileType}" is not allowed. Allowed types: {allowedTypes}',
 *           params: {
 *             fileType: file.type,
 *             allowedTypes: allowedTypes.join(', '),
 *             fileName: file.name
 *           }
 *         });
 *       }
 *     }
 *     return null;
 *   };
 * }
 * ```
 *
 * ## Template Error Display
 *
 * ```html
 * <!-- Access the structured error in templates -->
 * <div class="form-field">
 *   <input formControlName="email" type="email" />
 *   <div *ngIf="form.get('email')?.errors as errors" class="error-messages">
 *     <div *ngFor="let errorKey of objectKeys(errors)" class="error-item">
 *       <span class="error-text">{{ errors[errorKey].errorMsg }}</span>
 *       <small *ngIf="errors[errorKey].params" class="error-params">
 *         <!-- Display parameter information if needed -->
 *       </small>
 *     </div>
 *   </div>
 * </div>
 * ```
 *
 * ## Error Key Conventions
 *
 * Use descriptive, consistent error keys:
 * - `required` - Field is required
 * - `email` - Invalid email format
 * - `minLength` / `maxLength` - Length constraints
 * - `pattern` - Pattern/regex validation
 * - `dateAfter` / `dateBefore` - Date constraints
 * - `fileSize` / `fileType` - File validation
 * - `custom{ValidationName}` - Custom business logic
 *
 * @param {string} key - The validation error key (used in ValidationErrors object)
 * @param {IPlatformFormValidationError | string} validationErrorOrMsg - Error object or message
 * @returns {ValidationErrors} Angular-compatible ValidationErrors object
 *
 * @example
 * ```typescript
 * // Usage in various validator scenarios
 * return buildFormValidationErrors('customRule', {
 *   errorMsg: 'Custom validation failed: {reason}',
 *   params: { reason: 'Business rule violation' }
 * });
 *
 * // Simple string message
 * return buildFormValidationErrors('required', 'This field is required');
 *
 * // Multiple validations in one validator
 * static complexValidator(control: AbstractControl): ValidationErrors | null {
 *   const errors: ValidationErrors = {};
 *
 *   if (!control.value) {
 *     Object.assign(errors, buildFormValidationErrors('required', 'Field is required'));
 *   } else if (control.value.length < 3) {
 *     Object.assign(errors, buildFormValidationErrors('minLength', {
 *       errorMsg: 'Minimum {min} characters required',
 *       params: { min: 3 }
 *     }));
 *   }
 *
 *   return Object.keys(errors).length > 0 ? errors : null;
 * }
 * ```
 *
 * @see {@link IPlatformFormValidationError} Error object interface
 * @see {@link buildFormValidationError} Create individual error objects
 * @see {@link https://angular.io/guide/form-validation#custom-validators} Angular Custom Validators
 */
export function buildFormValidationErrors(key: string, validationErrorOrMsg: IPlatformFormValidationError | string): ValidationErrors {
    return { [key]: buildFormValidationError(validationErrorOrMsg) };
}
