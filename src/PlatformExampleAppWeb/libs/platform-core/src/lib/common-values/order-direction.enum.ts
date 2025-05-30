/**
 * Enumeration for specifying sort order direction in queries and data operations.
 *
 * @remarks
 * This enum provides a standardized way to specify sorting direction across the platform.
 * It's designed to be compatible with various data sources including databases, APIs,
 * and client-side sorting operations.
 *
 * **Key Features:**
 * - **Consistent Naming**: Uses standard ascending/descending terminology
 * - **String Values**: Enum values are strings for better serialization and debugging
 * - **API Compatibility**: Values align with common backend sorting conventions
 * - **Type Safety**: Provides compile-time validation for sort operations
 *
 * **Common Use Cases:**
 * - Database query sorting (ORDER BY clauses)
 * - API request parameters for sorted data
 * - Client-side table and list sorting
 * - Search result ordering
 * - Data export and reporting
 *
 * @example
 * **Database query sorting:**
 * ```typescript
 * import { OrderDirection } from '@platform/common-values';
 *
 * interface UserQuery {
 *   sortBy: string;
 *   sortDirection: OrderDirection;
 * }
 *
 * const query: UserQuery = {
 *   sortBy: 'lastName',
 *   sortDirection: OrderDirection.Asc
 * };
 *
 * // Translates to SQL: ORDER BY lastName ASC
 * ```
 *
 * @example
 * **API request parameters:**
 * ```typescript
 * const searchParams = {
 *   page: 1,
 *   size: 20,
 *   sort: 'createdDate',
 *   direction: OrderDirection.Desc
 * };
 *
 * // GET /api/users?page=1&size=20&sort=createdDate&direction=Desc
 * ```
 *
 * @example
 * **Client-side sorting:**
 * ```typescript
 * interface SortConfig {
 *   field: string;
 *   direction: OrderDirection;
 * }
 *
 * const sortUsers = (users: User[], config: SortConfig): User[] => {
 *   return users.sort((a, b) => {
 *     const aValue = a[config.field];
 *     const bValue = b[config.field];
 *
 *     const comparison = aValue.localeCompare(bValue);
 *     return config.direction === OrderDirection.Asc ? comparison : -comparison;
 *   });
 * };
 * ```
 *
 * @example
 * **Table column sorting:**
 * ```typescript
 * class DataTableComponent {
 *   currentSort: { column: string; direction: OrderDirection } | null = null;
 *
 *   toggleSort(column: string) {
 *     if (this.currentSort?.column === column) {
 *       // Toggle direction
 *       this.currentSort.direction = this.currentSort.direction === OrderDirection.Asc
 *         ? OrderDirection.Desc
 *         : OrderDirection.Asc;
 *     } else {
 *       // New column, start with ascending
 *       this.currentSort = { column, direction: OrderDirection.Asc };
 *     }
 *     this.loadData();
 *   }
 * }
 * ```
 */
export enum OrderDirection {
    /** Ascending order (A-Z, 0-9, oldest to newest) */
    Asc = 'Asc',
    /** Descending order (Z-A, 9-0, newest to oldest) */
    Desc = 'Desc'
}
