import { OrderDirection } from '../common-values/order-direction.enum';
import { clone } from '../utils';

/**
 * Base interface for all platform query data transfer objects.
 *
 * @remarks
 * This interface serves as the foundation for all query DTOs in the platform,
 * ensuring consistent structure and enabling polymorphic query handling.
 * While currently empty, it provides a type-safe base for query extensions.
 */
/* eslint-disable @typescript-eslint/no-empty-interface */
export interface IPlatformQueryDto {}

/**
 * Base class for platform query data transfer objects.
 *
 * @remarks
 * This class provides the foundational structure for all query operations
 * in the platform. It serves as the base for specialized query types such
 * as paged queries, filtered queries, and search queries.
 *
 * **Design Purpose:**
 * - Consistent query structure across the platform
 * - Type safety for query operations
 * - Foundation for query composition and extension
 * - Serialization support for API communication
 */
export class PlatformQueryDto implements IPlatformQueryDto {}

/**
 * Interface for paginated and sortable query operations.
 *
 * @remarks
 * This interface extends the base query structure with pagination and sorting
 * capabilities, providing a standardized approach to data retrieval with
 * performance optimization through result limiting and ordering.
 *
 * **Pagination Model:**
 * - **skipCount**: Number of records to skip (offset-based pagination)
 * - **maxResultCount**: Maximum number of records to return
 * - **orderBy**: Field name for sorting
 * - **orderDirection**: Sort direction (ascending/descending)
 */
export interface IPlatformRepositoryPagedQuery extends IPlatformQueryDto {
    /** Number of records to skip from the beginning */
    skipCount?: number | null;
    /** Maximum number of records to return */
    maxResultCount?: number | null;
    /** Field name to sort by */
    orderBy?: string;
    /** Sort direction */
    orderDirection?: OrderDirection;
}

/**
 * Concrete implementation of paginated and sortable queries.
 *
 * @remarks
 * This class provides a complete implementation for pagination and sorting
 * in data queries. It includes utility methods for common pagination operations
 * and immutable update patterns for maintaining query state consistency.
 *
 * **Key Features:**
 * - **Immutable Updates**: Methods return new instances to prevent state mutation
 * - **Page Calculation**: Automatic conversion between page-based and offset-based pagination
 * - **Default Values**: Sensible defaults for common pagination scenarios
 * - **Type Safety**: Full TypeScript support with proper typing
 * - **API Compatibility**: Designed for seamless backend integration
 *
 * **Pagination Strategy:**
 * The class uses offset-based pagination (skipCount + maxResultCount) which is
 * efficient for most database operations and provides consistent results across
 * different data sources.
 *
 * @example
 * **Basic pagination setup:**
 * ```typescript
 * const query = new PlatformPagedQueryDto({
 *   maxResultCount: 25,
 *   orderBy: 'createdDate',
 *   orderDirection: OrderDirection.Desc
 * });
 *
 * // Get first page
 * const firstPage = query.withPageIndex(0);
 *
 * // Get second page
 * const secondPage = query.withPageIndex(1);
 *
 * console.log(firstPage.skipCount);  // 0
 * console.log(secondPage.skipCount); // 25
 * ```
 *
 * @example
 * **Dynamic sorting:**
 * ```typescript
 * let userQuery = new PlatformPagedQueryDto({ maxResultCount: 20 });
 *
 * // Sort by name ascending
 * userQuery = userQuery.withSort(OrderDirection.Asc, 'lastName');
 *
 * // Sort by creation date descending
 * userQuery = userQuery.withSort(OrderDirection.Desc, 'createdDate');
 *
 * // Remove sorting
 * userQuery = userQuery.withSort(undefined);
 * ```
 *
 * @example
 * **Table component integration:**
 * ```typescript
 * export class UserTableComponent {
 *   query = new PlatformPagedQueryDto({ maxResultCount: 50 });
 *
 *   onPageChange(pageIndex: number) {
 *     this.query = this.query.withPageIndex(pageIndex);
 *     this.loadUsers();
 *   }
 *
 *   onSortChange(field: string, direction: OrderDirection) {
 *     this.query = this.query.withSort(direction, field);
 *     this.loadUsers();
 *   }
 *
 *   private loadUsers() {
 *     this.userService.getUsers(this.query).subscribe(result => {
 *       this.users = result.items;
 *       this.totalCount = result.totalCount;
 *     });
 *   }
 * }
 * ```
 *
 * @example
 * **Search with pagination:**
 * ```typescript
 * export class ProductSearchComponent {
 *   searchQuery = new PlatformPagedQueryDto({ maxResultCount: 12 });
 *
 *   searchProducts(searchTerm: string, category?: string) {
 *     // Reset to first page when searching
 *     this.searchQuery = this.searchQuery
 *       .withPageIndex(0)
 *       .withSort(OrderDirection.Desc, 'relevance');
 *
 *     const searchParams = {
 *       ...this.searchQuery,
 *       searchTerm,
 *       category
 *     };
 *
 *     this.productService.searchProducts(searchParams).subscribe();
 *   }
 * }
 * ```
 *
 * @example
 * **Advanced query composition:**
 * ```typescript
 * class AdvancedQuery extends PlatformPagedQueryDto {
 *   constructor(
 *     public filters?: ProductFilters,
 *     public searchTerm?: string,
 *     public dateRange?: DateRange,
 *     baseQuery?: Partial<IPlatformRepositoryPagedQuery>
 *   ) {
 *     super(baseQuery);
 *   }
 *
 *   withFilters(filters: ProductFilters): AdvancedQuery {
 *     return new AdvancedQuery(filters, this.searchTerm, this.dateRange, this);
 *   }
 *
 *   withSearchTerm(searchTerm: string): AdvancedQuery {
 *     return new AdvancedQuery(this.filters, searchTerm, this.dateRange, this);
 *   }
 * }
 * ```
 */
export class PlatformPagedQueryDto extends PlatformQueryDto implements IPlatformRepositoryPagedQuery {
    /** Sort direction for query results */
    public orderDirection?: OrderDirection;
    /** Field name to sort by */
    public orderBy?: string;

    /**
     * Creates a new PlatformPagedQueryDto instance.
     *
     * @param data - Optional initial data for the query
     *
     * @example
     * ```typescript
     * // Default pagination
     * const defaultQuery = new PlatformPagedQueryDto();
     *
     * // Custom pagination with sorting
     * const customQuery = new PlatformPagedQueryDto({
     *   maxResultCount: 50,
     *   orderBy: 'name',
     *   orderDirection: OrderDirection.Asc
     * });
     * ```
     */
    public constructor(data?: Partial<IPlatformRepositoryPagedQuery>) {
        super();

        if (data == null) return;

        if (data.skipCount !== undefined) this.skipCount = data.skipCount;
        if (data.maxResultCount !== undefined) this.maxResultCount = data.maxResultCount;
        if (data.orderDirection !== undefined) this.orderDirection = data.orderDirection;
        if (data.orderBy !== undefined) this.orderBy = data.orderBy;
    }

    /** Number of records to skip (default: 0) */
    public skipCount?: number | null = 0;
    /** Maximum number of records to return (default: 20) */
    public maxResultCount?: number | null = 20;

    /**
     * Creates a new query instance with the specified page index.
     *
     * @remarks
     * This method provides immutable updates by returning a new instance
     * rather than modifying the current one. The page index is converted
     * to the appropriate skipCount value automatically.
     *
     * @param pageIndex - Zero-based page index
     * @returns New query instance with updated skipCount
     *
     * @example
     * ```typescript
     * const query = new PlatformPagedQueryDto({ maxResultCount: 25 });
     *
     * const page1 = query.withPageIndex(0); // skipCount: 0
     * const page2 = query.withPageIndex(1); // skipCount: 25
     * const page3 = query.withPageIndex(2); // skipCount: 50
     * ```
     */
    public withPageIndex(pageIndex: number) {
        const newSkipCount = pageIndex * (this.maxResultCount ?? 0);

        if (this.skipCount == newSkipCount) return this;
        return clone(this, _ => {
            _.skipCount = newSkipCount;
        });
    }

    /**
     * Creates a new query instance with the specified sorting configuration.
     *
     * @remarks
     * This method enables immutable sorting updates. If the sort configuration
     * is unchanged, the same instance is returned for performance optimization.
     *
     * @param orderDirection - Sort direction (Asc/Desc or undefined to remove sorting)
     * @param orderBy - Field name to sort by (optional)
     * @returns New query instance with updated sorting or same instance if unchanged
     *
     * @example
     * ```typescript
     * const query = new PlatformPagedQueryDto();
     *
     * // Sort by name ascending
     * const sortedQuery = query.withSort(OrderDirection.Asc, 'name');
     *
     * // Sort by date descending
     * const dateSorted = query.withSort(OrderDirection.Desc, 'createdDate');
     *
     * // Remove sorting
     * const unsorted = query.withSort(undefined);
     * ```
     */
    public withSort(orderDirection: OrderDirection | undefined, orderBy?: string) {
        if (this.orderBy == orderBy && this.orderDirection == orderDirection) return this;
        return clone(this, _ => {
            _.orderBy = orderBy;
            _.orderDirection = orderDirection;
        });
    }

    /**
     * Calculates the current page index based on skipCount and maxResultCount.
     *
     * @returns Zero-based page index
     *
     * @example
     * ```typescript
     * const query = new PlatformPagedQueryDto({
     *   skipCount: 50,
     *   maxResultCount: 25
     * });
     *
     * console.log(query.pageIndex()); // 2 (50 / 25 = 2)
     * ```
     */
    public pageIndex(): number {
        if (this.maxResultCount == 0 || this.maxResultCount == null || this.skipCount == null) return 0;

        return Math.floor(this.skipCount / this.maxResultCount);
    }

    /**
     * Gets the page size (number of records per page).
     *
     * @returns Number of records per page or maximum safe integer if unlimited
     *
     * @example
     * ```typescript
     * const query = new PlatformPagedQueryDto({ maxResultCount: 25 });
     * console.log(query.pageSize()); // 25
     *
     * const unlimitedQuery = new PlatformPagedQueryDto({ maxResultCount: null });
     * console.log(unlimitedQuery.pageSize()); // Number.MAX_SAFE_INTEGER
     * ```
     */
    public pageSize(): number {
        return this.maxResultCount ?? Number.MAX_SAFE_INTEGER;
    }
}
