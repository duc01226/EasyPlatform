/**
 * @fileoverview Platform Common Types Module
 *
 * This module provides essential type definitions and utility classes used throughout
 * the platform architecture. It includes time handling, generic dictionary interfaces,
 * and other fundamental type structures.
 *
 * **Core Components:**
 * - **Time Class**: Comprehensive time-of-day handling with arithmetic and formatting
 * - **Dictionary Interface**: Generic key-value pair structure for flexible data modeling
 * - **Type Utilities**: Common type definitions for platform-wide consistency
 *
 * **Architecture Integration:**
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                  Platform Common Types                     │
 * ├─────────────────────┬───────────────────────────────────────┤
 * │  Time Management    │  Time-of-day operations + arithmetic   │
 * │                     │  Business hours + scheduling          │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Data Structures    │  Generic dictionaries + collections   │
 * │                     │  Type-safe key-value mappings         │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Utility Types      │  Platform-wide type consistency       │
 * │                     │  Shared interfaces + contracts        │
 * └─────────────────────┴───────────────────────────────────────┘
 * ```
 *
 * @example
 * **Time management in business applications:**
 * ```typescript
 * import { Time } from '@platform/common-types';
 *
 * // Business hours validation
 * const workStart = new Time({ hour: 9, minute: 0 });
 * const workEnd = new Time({ hour: 17, minute: 30 });
 * const currentTime = Time.parse("14:15:00");
 *
 * const isWorkingHours = Time.isTimeInRange(
 *   workStart, workEnd, currentTime, true, false
 * );
 * ```
 *
 * @example
 * **Dictionary usage for flexible data structures:**
 * ```typescript
 * import { Dictionary } from '@platform/common-types';
 *
 * // Configuration settings
 * const appSettings: Dictionary<string> = {
 *   apiUrl: 'https://api.example.com',
 *   timeout: '30000',
 *   retryCount: '3'
 * };
 *
 * // Dynamic form fields
 * const formValues: Dictionary<any> = {
 *   username: 'john.doe',
 *   preferences: { theme: 'dark', language: 'en' },
 *   permissions: ['read', 'write']
 * };
 * ```
 */

// Time management utilities
export * from './time';

/**
 * Generic dictionary interface for key-value pair collections.
 *
 * @remarks
 * This interface provides a type-safe way to work with dynamic key-value collections
 * where the keys are strings and values are of a consistent type. It's commonly used
 * for configuration objects, form data, lookup tables, and other scenarios requiring
 * flexible object structures.
 *
 * **Common Use Cases:**
 * - **Configuration Settings**: Application settings with string keys
 * - **Form Data**: Dynamic form fields with varying value types
 * - **Lookup Tables**: Key-based data retrieval structures
 * - **API Parameters**: Dynamic query parameters or request payloads
 * - **Localization**: Translation key-value mappings
 *
 * @template T - The type of values stored in the dictionary
 *
 * @example
 * **Configuration management:**
 * ```typescript
 * const apiConfig: Dictionary<string> = {
 *   baseUrl: 'https://api.platform.com',
 *   version: 'v1',
 *   timeout: '30000'
 * };
 *
 * const endpoint = `${apiConfig.baseUrl}/${apiConfig.version}/users`;
 * ```
 *
 * @example
 * **Form validation errors:**
 * ```typescript
 * const validationErrors: Dictionary<string[]> = {
 *   email: ['Email is required', 'Invalid email format'],
 *   password: ['Password must be at least 8 characters'],
 *   confirmPassword: ['Passwords do not match']
 * };
 *
 * // Check if field has errors
 * const hasEmailErrors = validationErrors.email?.length > 0;
 * ```
 *
 * @example
 * **Dynamic API parameters:**
 * ```typescript
 * const searchParams: Dictionary<string | number | boolean> = {
 *   query: 'javascript developer',
 *   location: 'New York',
 *   experience: 5,
 *   remote: true,
 *   salary_min: 80000
 * };
 *
 * // Convert to query string
 * const queryString = Object.entries(searchParams)
 *   .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
 *   .join('&');
 * ```
 *
 * @example
 * **Localization and translations:**
 * ```typescript
 * const translations: Dictionary<string> = {
 *   'common.save': 'Save',
 *   'common.cancel': 'Cancel',
 *   'user.profile.title': 'User Profile',
 *   'validation.email.required': 'Email address is required'
 * };
 *
 * const getMessage = (key: string) => translations[key] ?? key;
 * ```
 */
export interface Dictionary<T> {
    [index: string]: T;
}
