/**
 * @fileoverview Form Validation Models Module
 *
 * This module exports standardized models and interfaces for form validation
 * error handling in the platform. It provides consistent error structures
 * that support localization, parameter substitution, and Angular integration.
 *
 * ## Exported Models
 *
 * ### IPlatformFormValidationError
 * - Standardized validation error interface
 * - Supports parameterized error messages
 * - Compatible with localization systems
 *
 * ### Utility Functions
 * - `buildFormValidationError()` - Create error objects
 * - `buildFormValidationErrors()` - Create Angular ValidationErrors
 *
 * ## Usage Example
 *
 * ```typescript
 * import {
 *   IPlatformFormValidationError,
 *   buildFormValidationErrors
 * } from '@libs/platform-core';
 *
 * // Custom validator with standardized errors
 * static customValidator(control: AbstractControl): ValidationErrors | null {
 *   if (control.value?.length < 5) {
 *     return buildFormValidationErrors('tooShort', {
 *       errorMsg: 'Value must be at least {min} characters',
 *       params: { min: 5 }
 *     });
 *   }
 *   return null;
 * }
 * ```
 *
 * @module FormValidationModels
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

export * from './validation-error';
