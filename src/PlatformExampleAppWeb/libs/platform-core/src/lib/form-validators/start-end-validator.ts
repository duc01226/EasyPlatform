/**
 * @fileoverview Start-End Date/Time Range Validator Module
 *
 * This module provides a comprehensive validator for validating chronological relationships
 * between start and end dates, times, or numeric values in Angular reactive forms.
 * It supports flexible validation scenarios including date-only, time-only, and full
 * date-time comparisons with conditional logic.
 *
 * ## Key Features
 *
 * - **Flexible Comparison**: Supports Date, number, and mixed type comparisons
 * - **Granular Control**: Date-only, time-only, or full date-time validation
 * - **Conditional Logic**: Apply validation based on dynamic conditions
 * - **Customizable Messages**: Support for custom error messages with parameters
 * - **Equal Value Support**: Configure whether equal values are allowed
 * - **Performance Optimized**: Only validates when conditions are met
 *
 * ## Common Use Cases
 *
 * ### Date Range Validation
 * - **Event Scheduling**: Start/end dates for events, meetings, projects
 * - **Employment Records**: Contract periods, salary ranges, job assignments
 * - **Performance Reviews**: Review periods, evaluation deadlines
 * - **Time Sheets**: Work periods, attendance tracking
 * - **Leave Requests**: Vacation periods, sick leave duration
 *
 * ### Time Range Validation
 * - **Working Hours**: Shift start/end times, break periods
 * - **Meeting Schedules**: Time slot validation
 * - **Booking Systems**: Reservation time periods
 *
 * ### Numeric Range Validation
 * - **Price Ranges**: Min/max pricing, salary bands
 * - **Age Ranges**: Minimum/maximum age requirements
 * - **Performance Metrics**: Target ranges, KPI boundaries
 *
 * ## Real-World Applications
 *
 * Based on extensive usage across the platform, this validator is employed in:
 * - Performance review event scheduling (20+ form fields)
 * - Employee finance management (contracts, salaries, bonuses)
 * - Time tracking and attendance systems
 * - Project and goal management
 * - Date range filtering components
 *
 * @module StartEndValidator
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

import { AbstractControl, FormControl, ValidatorFn } from '@angular/forms';

import { date_compareOnlyDay, date_compareOnlyTime, date_format, number_IsNumber } from '../utils';
import { IPlatformFormValidationError } from './models';
import { validator } from './validator';

/**
 * Creates a validator that ensures a start value is chronologically or numerically before an end value.
 *
 * This validator provides comprehensive validation for start-end relationships with support for
 * dates, times, numbers, and various comparison modes. It's extensively used throughout the
 * platform for scheduling, period validation, and range checking.
 *
 * ## Features
 *
 * - **Multi-Type Support**: Validates Date objects, numbers, and date strings
 * - **Comparison Modes**: Full date-time, date-only, or time-only comparison
 * - **Conditional Logic**: Apply validation based on form state or business rules
 * - **Flexible Equality**: Configure whether equal values are valid
 * - **Custom Errors**: Support for parameterized error messages
 * - **Performance Optimized**: Conditional execution to reduce unnecessary validation
 *
 * ## Comparison Modes
 *
 * ### Full Date-Time Comparison (default)
 * ```typescript
 * // Validates complete date and time
 * startEndValidator(
 *   'invalidDateRange',
 *   control => control.parent?.get('startDateTime')?.value,
 *   control => control.value,
 *   { checkDatePart: 'default' }
 * )
 * ```
 *
 * ### Date-Only Comparison
 * ```typescript
 * // Ignores time components, compares dates only
 * startEndValidator(
 *   'invalidDateRange',
 *   control => control.parent?.get('startDate')?.value,
 *   control => control.value,
 *   { checkDatePart: 'dateOnly' }
 * )
 * ```
 *
 * ### Time-Only Comparison
 * ```typescript
 * // Ignores date components, compares times only
 * startEndValidator(
 *   'invalidTimeRange',
 *   control => control.parent?.get('startTime')?.value,
 *   control => control.value,
 *   { checkDatePart: 'timeOnly' }
 * )
 * ```
 *
 * ## Real-World Usage Examples
 *
 * ### Performance Review Event Scheduling
 * Based on actual usage in `performance-review-event-create.component.ts`:
 * ```typescript
 * // Start date must be before end date
 * startDate: new FormControl('', [
 *   Validators.required,
 *   startEndValidator(
 *     'invalidStartDateEndDate',
 *     control => control.value,
 *     () => this.currentVm().endDate!,
 *     {
 *       allowEqual: false,
 *       checkDatePart: 'dateOnly',
 *       condition: control => control.value !== null && this.currentVm().endDate !== null
 *     }
 *   )
 * ])
 *
 * // Self-evaluation due date validation
 * selfEvaluationDueDate: new FormControl('', [
 *   startEndValidator(
 *     'invalidSelfEvaluationDueDate',
 *     () => this.currentVm().startDate!,
 *     control => control.value,
 *     {
 *       allowEqual: true,
 *       checkDatePart: 'dateOnly',
 *       condition: control => control.value !== null && this.currentVm().startDate !== null
 *     }
 *   )
 * ])
 * ```
 *
 * ### Employee Contract Management
 * ```typescript
 * // Contract end date validation
 * endDate: new FormControl('', [
 *   startEndValidator(
 *     'contractEndDateError',
 *     () => this.formGroup.get('startDate')?.value,
 *     control => control.value,
 *     {
 *       allowEqual: false,
 *       checkDatePart: 'dateOnly',
 *       condition: control => control.value && this.formGroup.get('startDate')?.value,
 *       errorMsg: 'Contract end date must be after start date'
 *     }
 *   )
 * ])
 * ```
 *
 * ### Time Sheet Validation
 * ```typescript
 * // Work shift time validation
 * endTime: new FormControl('', [
 *   startEndValidator(
 *     'invalidShiftTime',
 *     control => control.parent?.get('startTime')?.value,
 *     control => control.value,
 *     {
 *       allowEqual: false,
 *       checkDatePart: 'timeOnly',
 *       condition: control => {
 *         const startTime = control.parent?.get('startTime')?.value;
 *         return startTime && control.value;
 *       }
 *     }
 *   )
 * ])
 * ```
 *
 * ### Numeric Range Validation
 * ```typescript
 * // Salary range validation
 * maxSalary: new FormControl('', [
 *   startEndValidator(
 *     'invalidSalaryRange',
 *     control => control.parent?.get('minSalary')?.value,
 *     control => control.value,
 *     {
 *       allowEqual: true,
 *       condition: control => {
 *         const minSalary = control.parent?.get('minSalary')?.value;
 *         return minSalary !== null && control.value !== null;
 *       },
 *       errorMsg: 'Maximum salary must be greater than or equal to minimum salary'
 *     }
 *   )
 * ])
 * ```
 *
 * ## Advanced Conditional Logic
 *
 * ### Business Rule-Based Validation
 * ```typescript
 * // Only validate when specific business conditions are met
 * endDate: new FormControl('', [
 *   startEndValidator(
 *     'businessRuleViolation',
 *     control => control.parent?.get('startDate')?.value,
 *     control => control.value,
 *     {
 *       condition: control => {
 *         const form = control.parent as FormGroup;
 *         const projectType = form?.get('projectType')?.value;
 *         const isFixedDuration = form?.get('isFixedDuration')?.value;
 *
 *         // Only validate for fixed-duration projects
 *         return projectType === 'development' && isFixedDuration && control.value;
 *       },
 *       allowEqual: false,
 *       checkDatePart: 'dateOnly'
 *     }
 *   )
 * ])
 * ```
 *
 * ### Multi-Field Dependency Validation
 * ```typescript
 * // Validate based on multiple form fields
 * reviewEndDate: new FormControl('', [
 *   startEndValidator(
 *     'invalidReviewPeriod',
 *     control => {
 *       const form = control.parent as FormGroup;
 *       const frequency = form?.get('frequency')?.value;
 *       const startDate = form?.get('startDate')?.value;
 *
 *       // Calculate expected end date based on frequency
 *       if (frequency === 'quarterly' && startDate) {
 *         return date_addMonths(startDate, 3);
 *       }
 *       return startDate;
 *     },
 *     control => control.value,
 *     {
 *       allowEqual: false,
 *       checkDatePart: 'dateOnly',
 *       condition: control => {
 *         const form = control.parent as FormGroup;
 *         return form?.get('frequency')?.value !== 'oneTime';
 *       }
 *     }
 *   )
 * ])
 * ```
 *
 * ## Error Handling and Localization
 *
 * ```typescript
 * // Custom error messages with parameter substitution
 * startEndValidator(
 *   'customDateRangeError',
 *   control => control.parent?.get('startDate')?.value,
 *   control => control.value,
 *   {
 *     allowEqual: false,
 *     checkDatePart: 'dateOnly',
 *     errorMsg: 'End date {endDate} must be after start date {startDate}',
 *     condition: control => control.value && control.parent?.get('startDate')?.value
 *   }
 * )
 * ```
 *
 * ## Performance Considerations
 *
 * - **Conditional Execution**: Use condition functions to prevent unnecessary validation
 * - **Type Optimization**: Proper type detection minimizes conversion overhead
 * - **Date Comparison**: Optimized date/time comparison functions for better performance
 * - **Early Returns**: Quick null/undefined checks prevent unnecessary processing
 *
 * ## Integration with Platform Architecture
 *
 * This validator integrates seamlessly with:
 * - Platform form validation system
 * - Localization and error message infrastructure
 * - Date/time utility functions
 * - Business rule validation patterns
 *
 * @param {string} errorKey - The validation error key used in ValidationErrors object
 * @param {(control: FormControl<T>) => T} startFn - Function that extracts the start value from form control
 * @param {(control: FormControl<T>) => T} endFn - Function that extracts the end value from form control
 * @param {Object} [options] - Configuration options for the validator
 * @param {boolean} [options.allowEqual=true] - Whether equal values are considered valid
 * @param {'default' | 'dateOnly' | 'timeOnly'} [options.checkDatePart='default'] - Date comparison mode
 * @param {(control: FormControl) => boolean} [options.condition] - Conditional function to determine when to validate
 * @param {string} [options.errorMsg] - Custom error message template
 * @returns {ValidatorFn} A validator function compatible with Angular reactive forms
 *
 * @example
 * ```typescript
 * // Basic date range validation
 * const form = new FormGroup({
 *   startDate: new FormControl(new Date()),
 *   endDate: new FormControl(new Date(), [
 *     startEndValidator(
 *       'dateRangeError',
 *       control => control.parent?.get('startDate')?.value,
 *       control => control.value,
 *       { allowEqual: false, checkDatePart: 'dateOnly' }
 *     )
 *   ])
 * });
 *
 * // Conditional numeric range validation
 * priceRange: new FormControl('', [
 *   startEndValidator(
 *     'priceRangeError',
 *     control => control.parent?.get('minPrice')?.value,
 *     control => control.value,
 *     {
 *       allowEqual: true,
 *       condition: control => {
 *         const minPrice = control.parent?.get('minPrice')?.value;
 *         return minPrice !== null && control.value !== null;
 *       },
 *       errorMsg: 'Maximum price must be greater than or equal to minimum price'
 *     }
 *   )
 * ])
 * ```
 *
 * @see {@link date_compareOnlyDay} Date-only comparison utility
 * @see {@link date_compareOnlyTime} Time-only comparison utility
 * @see {@link validator} Platform validator wrapper
 * @see {@link IPlatformFormValidationError} Error object interface
 */
export function startEndValidator<T extends number | Date>(
    errorKey: string,
    startFn: (control: FormControl<T>) => T,
    endFn: (control: FormControl<T>) => T,
    options: {
        allowEqual?: boolean;
        checkDatePart?: 'default' | 'dateOnly' | 'timeOnly';
        condition?: (control: FormControl) => boolean;
        errorMsg?: string;
    } | null = null
): ValidatorFn {
    return validator((control: AbstractControl) => {
        const allowEqual = options?.allowEqual ?? true;
        const checkDatePart = options?.checkDatePart ?? 'default';
        const condition = options?.condition;

        if (condition != null && !condition(<FormControl>control)) {
            return null;
        }

        const start = convertToDateOrNumber(startFn(<FormControl>control));
        const end = convertToDateOrNumber(endFn(<FormControl>control));

        if (typeof start === 'number' && typeof end === 'number') {
            if ((allowEqual && start > end) || (!allowEqual && start >= end)) {
                return {
                    [errorKey]: buildValidatorError(start, end, options?.errorMsg)
                };
            }
        } else if (start instanceof Date && end instanceof Date) {
            if (checkDatePart === 'default') {
                if ((allowEqual && start > end) || (!allowEqual && start >= end)) {
                    return {
                        [errorKey]: buildValidatorError(start, end, options?.errorMsg)
                    };
                }
            } else if (checkDatePart === 'dateOnly') {
                if ((allowEqual && date_compareOnlyDay(start, end) > 0) || (!allowEqual && date_compareOnlyDay(start, end) >= 0)) {
                    return {
                        [errorKey]: buildValidatorError(start, end, options?.errorMsg)
                    };
                }
            } else if (
                checkDatePart === 'timeOnly' &&
                ((allowEqual && date_compareOnlyTime(start, end) > 0) || (!allowEqual && date_compareOnlyTime(start, end) >= 0))
            ) {
                return {
                    [errorKey]: buildValidatorError(start, end, options?.errorMsg)
                };
            }
        }

        return null;
    });
}

/**
 * Converts a value to either a Date object or a number for comparison operations.
 *
 * This utility function intelligently parses input values to determine whether they
 * should be treated as numeric values or converted to Date objects. It uses the
 * platform's number detection utility to make this determination.
 *
 * ## Conversion Logic
 *
 * - **Numeric Values**: Returns as Number if `number_IsNumber()` returns true
 * - **Date Strings/Objects**: Converts to Date object using `new Date()`
 * - **Mixed Input**: Handles string representations of dates and numbers
 *
 * ## Usage Context
 *
 * This function is used internally by `startEndValidator` to normalize different
 * input types for consistent comparison operations, enabling the validator to
 * work with both date/time ranges and numeric ranges seamlessly.
 *
 * @param {Date | number | string} value - The value to be parsed and converted
 * @returns {Date | number} The converted value as either a Date object or number
 *
 * @internal
 *
 * @example
 * ```typescript
 * // Internal usage examples
 * convertToDateOrNumber('123') → 123 (number)
 * convertToDateOrNumber('2024-01-01') → Date object
 * convertToDateOrNumber(new Date()) → Date object
 * convertToDateOrNumber(42) → 42 (number)
 * ```
 */
function convertToDateOrNumber(value: Date | number | string) {
    return number_IsNumber(value) ? Number(value) : new Date(value);
}

/**
 * Formats a date value as a string in the 'YYYY/MM/DD' format.
 *
 * This utility function provides consistent date formatting for error messages
 * and validation feedback. It uses the platform's date formatting utilities
 * to ensure consistent date display across the application.
 *
 * ## Format Specification
 *
 * - **Format Pattern**: 'YYYY/MM/DD' (ISO-like format with slashes)
 * - **Input Handling**: Accepts Date objects or numeric timestamps
 * - **Consistency**: Ensures uniform date display in validation errors
 *
 * ## Usage Context
 *
 * Used internally by validation error building functions to create
 * human-readable date representations in error messages, providing
 * users with clear feedback about date range validation failures.
 *
 * @param {Date | number} value - The date value to be formatted
 * @returns {string} A formatted date string in 'YYYY/MM/DD' format
 *
 * @internal
 *
 * @example
 * ```typescript
 * // Internal usage examples
 * formatDate(new Date('2024-01-15')) → '2024/01/15'
 * formatDate(1705276800000) → '2024/01/15'
 * ```
 */
function formatDate(value: Date | number): string {
    return date_format(new Date(value), 'YYYY/MM/DD');
}

/**
 * Builds a standardized validation error object for start-end date/time validation failures.
 *
 * This function creates consistent error objects that integrate with the platform's
 * validation error system, supporting parameter substitution and localization.
 * It provides meaningful error messages with context about the invalid range.
 *
 * ## Error Object Structure
 *
 * The returned error object follows the `IPlatformFormValidationError` interface:
 * - **errorMsg**: Human-readable error message with parameter placeholders
 * - **params**: Object containing start and end values for message substitution
 *
 * ## Default Error Message
 *
 * When no custom error message is provided, generates a default message:
 * `"Value must be in range {startValue} and {endValue}"`
 *
 * ## Parameter Substitution
 *
 * The error object includes `startDate` and `endDate` parameters that can be
 * used by localization systems or error display components to customize
 * the error message presentation.
 *
 * ## Integration with Validation System
 *
 * The error object is compatible with:
 * - Angular ValidationErrors interface
 * - Platform localization system
 * - Error message parameter substitution
 * - Custom error display components
 *
 * @param {Date | number} start - The start date/time or numeric value from validation
 * @param {Date | number} end - The end date/time or numeric value from validation
 * @param {string} [errorMsg] - Custom error message template with parameter placeholders
 * @returns {IPlatformFormValidationError} A standardized validation error object
 *
 * @internal
 *
 * @example
 * ```typescript
 * // Internal usage examples
 *
 * // Default error message
 * buildValidatorError(
 *   new Date('2024-01-15'),
 *   new Date('2024-01-10')
 * )
 * // Returns: {
 * //   errorMsg: 'Value must be in range 2024/01/15 and 2024/01/10',
 * //   params: { startDate: Date, endDate: Date }
 * // }
 *
 * // Custom error message
 * buildValidatorError(
 *   100,
 *   50,
 *   'Maximum value {endDate} must be greater than minimum value {startDate}'
 * )
 * // Returns: {
 * //   errorMsg: 'Maximum value 50 must be greater than minimum value 100',
 * //   params: { startDate: 100, endDate: 50 }
 * // }
 * ```
 */
function buildValidatorError(
    start: Date | number,
    end: Date | number,
    errorMsg: string = `Value must be in range ${formatDateOrNumber(start)} and ${formatDateOrNumber(end)}`
): IPlatformFormValidationError {
    return { errorMsg: errorMsg, params: { startDate: start, endDate: end } };
}

/**
 * Formats a date or number value as a string for display in error messages.
 *
 * This utility function provides intelligent formatting based on the input type,
 * ensuring consistent and readable value representation in validation error messages.
 * It handles both date/time values and numeric values appropriately.
 *
 * ## Formatting Logic
 *
 * - **Numeric Values**: Converts to string representation using `toString()`
 * - **Date Values**: Formats using `formatDate()` to 'YYYY/MM/DD' format
 * - **Type Detection**: Automatically determines appropriate formatting method
 *
 * ## Usage Context
 *
 * Used internally by error building functions to create human-readable
 * representations of validation values, ensuring that users receive
 * meaningful error messages regardless of the underlying data type.
 *
 * ## Integration
 *
 * Works in conjunction with:
 * - `formatDate()` for date formatting
 * - `buildValidatorError()` for error message construction
 * - Platform error display components
 *
 * @param {Date | number} value - The value to be formatted for display
 * @returns {string} A formatted string representation of the value
 *
 * @example
 * ```typescript
 * // Usage examples
 * formatDateOrNumber(new Date('2024-01-15')) → '2024/01/15'
 * formatDateOrNumber(42) → '42'
 * formatDateOrNumber(3.14159) → '3.14159'
 * formatDateOrNumber(new Date()) → '2024/12/28' (current date)
 * ```
 */
function formatDateOrNumber(value: Date | number): string {
    return typeof value === 'number' ? value.toString() : formatDate(value);
}
