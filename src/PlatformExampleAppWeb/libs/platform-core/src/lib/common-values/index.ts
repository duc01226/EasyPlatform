/**
 * @fileoverview Platform Common Values Module
 *
 * This module provides standardized constants, enumerations, and predefined values
 * used throughout the platform architecture. It ensures consistency in data representation,
 * sorting operations, and date/time handling across all applications.
 *
 * **Core Components:**
 * - **Sort Direction**: Standardized ascending/descending enumeration
 * - **Date Constants**: Weekday and month mappings compatible with JavaScript Date
 * - **Display Values**: User-friendly names and abbreviations for UI components
 * - **Business Constants**: Predefined values for common business operations
 *
 * **Design Principles:**
 * - **JavaScript Compatibility**: All date constants align with native Date object values
 * - **Type Safety**: Enums and constants provide compile-time validation
 * - **Internationalization Ready**: Structured for easy localization support
 * - **Performance Optimized**: Static constants reduce runtime computation
 *
 * **Architecture Integration:**
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                  Platform Common Values                    │
 * ├─────────────────────┬───────────────────────────────────────┤
 * │  Sort Operations    │  OrderDirection enum for data sorting │
 * │                     │  Query and table operations          │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Date & Time        │  Weekday and month constants         │
 * │                     │  Business hours and scheduling       │
 * ├─────────────────────┼───────────────────────────────────────┤
 * │  Display Values     │  User-friendly labels and names      │
 * │                     │  UI components and formatting        │
 * └─────────────────────┴───────────────────────────────────────┘
 * ```
 *
 * @example
 * **Sorting and query operations:**
 * ```typescript
 * import { OrderDirection } from '@platform/common-values';
 *
 * const userQuery = {
 *   sortBy: 'lastName',
 *   direction: OrderDirection.Asc,
 *   page: 1,
 *   size: 25
 * };
 *
 * // Use in API calls, database queries, or client-side sorting
 * ```
 *
 * @example
 * **Date and calendar operations:**
 * ```typescript
 * import { WEEKDAY, MONTH, WORKING_TIME_DAY_DISPLAY } from '@platform/common-values';
 *
 * // Business logic for working days
 * const isWorkingDay = (date: Date): boolean => {
 *   const dayOfWeek = date.getDay();
 *   return dayOfWeek >= WEEKDAY.Monday && dayOfWeek <= WEEKDAY.Friday;
 * };
 *
 * // Calendar display
 * const getMonthName = (date: Date): string => {
 *   const monthIndex = date.getMonth();
 *   return Object.keys(MONTH).find(key => MONTH[key] === monthIndex) ?? 'Unknown';
 * };
 * ```
 *
 * @example
 * **UI component integration:**
 * ```typescript
 * import { WORKING_TIME_DAY_DISPLAY, MONTH_DISPLAY } from '@platform/common-values';
 *
 * // Generate calendar headers
 * const dayHeaders = Object.values(WORKING_TIME_DAY_DISPLAY);
 *
 * // Create month dropdown options
 * const monthOptions = Object.entries(MONTH_DISPLAY).map(([key, display]) => ({
 *   value: MONTH[key],
 *   label: display
 * }));
 * ```
 */

// Sorting and query operations
export * from './order-direction.enum';

// Date and time constants
export * from './weekdays.const';
