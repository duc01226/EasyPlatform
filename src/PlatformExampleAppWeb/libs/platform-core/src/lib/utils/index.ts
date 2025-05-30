/**
 * @fileoverview Platform Core Utilities Module
 *
 * This module provides a comprehensive collection of utility functions for common
 * programming tasks across the platform. These utilities are designed to be:
 * - Type-safe: Full TypeScript support with proper typing
 * - Performance-optimized: Efficient implementations for common operations
 * - Reusable: Generic functions that work across different contexts
 * - Well-tested: Thoroughly tested for reliability and edge cases
 *
 * Utility Categories:
 *
 * Date & Time Operations:
 * - Date manipulation and formatting
 * - Timezone handling and conversion
 * - Duration calculations and comparisons
 *
 * Data Structure Utilities:
 * - Dictionary/Map operations and transformations
 * - List processing, filtering, and manipulation
 * - Object property handling and cloning
 * - Record type utilities and transformations
 *
 * Type & Validation Utilities:
 * - Enum processing and validation
 * - String manipulation and validation
 * - Number formatting and conversion
 * - Type checking and assertion helpers
 *
 * Browser & DOM Utilities:
 * - DOM element manipulation
 * - File handling and processing
 * - HTTP response processing
 * - Task execution and timing utilities
 *
 * ID & Identifier Utilities:
 * - GUID generation and validation
 * - Unique identifier creation
 * - Hierarchy selection algorithms
 *
 * @example
 * Date utilities:
 * ```typescript
 * import { date_timeDiff, date_format } from '@platform/core';
 *
 * const diff = date_timeDiff(new Date(), startDate);
 * const formatted = date_format(new Date(), 'yyyy-MM-dd');
 * ```
 *
 * @example
 * Object utilities:
 * ```typescript
 * import { removeNullProps, toPlainObj, deepClone } from '@platform/core';
 *
 * const cleaned = removeNullProps(data);
 * const plain = toPlainObj(complexObject);
 * const copy = deepClone(originalObject);
 * ```
 *
 * @example
 * List utilities:
 * ```typescript
 * import { list_groupBy, list_distinctBy, list_sortBy } from '@platform/core';
 *
 * const grouped = list_groupBy(items, item => item.category);
 * const unique = list_distinctBy(items, item => item.id);
 * const sorted = list_sortBy(items, item => item.name);
 * ```
 *
 * @example
 * String utilities:
 * ```typescript
 * import { string_isEmpty, string_truncate, string_toCamelCase } from '@platform/core';
 *
 * if (!string_isEmpty(text)) {
 *   const truncated = string_truncate(text, 100);
 *   const camelCase = string_toCamelCase(text);
 * }
 * ```
 *
 * Performance Considerations:
 * - All utilities are optimized for common use cases
 * - Minimal dependencies to reduce bundle size
 * - Lazy evaluation where applicable
 * - Memory-efficient implementations
 *
 * Usage Guidelines:
 * - Import specific utilities rather than the entire module
 * - Use TypeScript for better type checking and IntelliSense
 * - Follow naming conventions (category_functionName)
 * - Check utility documentation for specific usage patterns
 *
 * @see {@link utils.date} - Date and time manipulation utilities
 * @see {@link utils.object} - Object manipulation and transformation utilities
 * @see {@link utils.list} - Array and list processing utilities
 * @see {@link utils.string} - String manipulation and validation utilities
 *
 * @since Platform Core v1.0.0
 * @author Platform Team
 */

// Date and time utilities
export * from './utils.date';

// Data structure utilities
export * from './utils.dictionary';
export * from './utils.list';
export * from './utils.object';
export * from './utils.record';

// Browser and DOM utilities
export * from './utils.dom';
export * from './utils.file';
export * from './utils.http-response';
export * from './utils.task';

// Type and validation utilities
export * from './utils.enum';
export * from './utils.number';
export * from './utils.string';
export * from './utils.timezone';

// ID and identifier utilities
export * from './utils.guid';
export * from './utils.hierarchy-selector';
