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

// Others
export interface Dictionary<T> {
    [index: string]: T;
}

export interface DictionaryItem<TKey, TValue> {
    key: TKey;
    value: TValue;
}

export type ArrayElement<T> = T extends readonly unknown[] ? T[0] : never;
