#region

using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;

#endregion

namespace Easy.Platform.Common.Cqrs.Queries;

/// <summary>
/// Abstract base class for Platform CQRS query paged results.
/// Provides standardized structure for returning paged data with metadata.
/// </summary>
/// <typeparam name="TItem">The type of individual items in the paged collection</typeparam>
/// <remarks>
/// Foundation class for all paged query results in the Platform CQRS framework.
/// Implements IPlatformPagedResult&lt;TItem&gt; to provide consistent paging interface.
/// 
/// Key features:
/// - Structured paged data with items and metadata
/// - Automatic page calculation and indexing
/// - Integration with paging request parameters
/// - Support for large dataset handling
/// - Client-side pagination support
/// 
/// Paging metadata includes:
/// - Items: The actual data items for current page
/// - TotalCount: Total number of items across all pages
/// - PageSize: Number of items per page (from request)
/// - SkipCount: Number of items skipped (from request)
/// - TotalPages: Calculated total number of pages
/// - PageIndex: Calculated current page index (zero-based)
/// 
/// Used extensively across platform services:
/// - Growth service: Paged employee lists, leave request history
/// - Employee service: Payroll records, employee directory
/// - Talents service: Candidate lists, hiring pipeline data
/// - Permission Provider: Subscription usage, audit logs
/// 
/// Design supports both offset-based and cursor-based paging patterns.
/// Essential for performance when dealing with large datasets.
/// </remarks>
public abstract class PlatformCqrsQueryPagedResult<TItem> : IPlatformPagedResult<TItem>
{
    /// <summary>
    /// Initializes a new paged result with default values.
    /// Used for deserialization and framework scenarios.
    /// </summary>
    /// <remarks>
    /// Protected parameterless constructor required for:
    /// - JSON deserialization scenarios
    /// - Framework instantiation patterns
    /// - Generic constraints and reflection
    /// - Inheritance by concrete result classes
    /// 
    /// Properties should be set explicitly after construction.
    /// Prefer using the parameterized constructor for normal usage scenarios.
    /// </remarks>
    protected PlatformCqrsQueryPagedResult() { }

    /// <summary>
    /// Initializes a paged result with items, count, and paging information.
    /// Creates complete paged result structure from query execution data.
    /// </summary>
    /// <param name="items">The collection of items for current page</param>
    /// <param name="totalCount">Total number of items across all pages</param>
    /// <param name="pagedRequest">Original paging request with skip count and page size</param>
    /// <remarks>
    /// Primary constructor for creating paged results from query execution.
    /// Automatically extracts paging parameters from original request for consistency.
    /// 
    /// Constructor workflow:
    /// 1. Sets items collection for current page
    /// 2. Sets total count for all pages
    /// 3. Extracts page size from original request
    /// 4. Extracts skip count from original request
    /// 5. Enables automatic calculation of derived properties
    /// 
    /// Used by query handlers to create consistent paged results.
    /// Ensures paging metadata matches original request parameters.
    /// Critical for client-side pagination control and navigation.
    /// </remarks>
    public PlatformCqrsQueryPagedResult(List<TItem> items, long totalCount, IPlatformPagedRequest pagedRequest)
    {
        Items = items;
        TotalCount = totalCount;
        PageSize = pagedRequest.MaxResultCount;
        SkipCount = pagedRequest.SkipCount;
    }

    /// <summary>
    /// Gets or sets the collection of items for the current page.
    /// Contains the actual data requested by the paged query.
    /// </summary>
    /// <value>
    /// List of items for current page, may be empty if no items match criteria.
    /// Size should not exceed PageSize when specified.
    /// </value>
    /// <remarks>
    /// Primary data property containing query results for current page.
    /// Empty list indicates no items match query criteria for current page.
    /// 
    /// Item collection characteristics:
    /// - Ordered according to query sorting parameters
    /// - Filtered based on query criteria
    /// - Limited to PageSize items maximum
    /// - Offset by SkipCount from total result set
    /// 
    /// Used by clients for data display and processing.
    /// Should be optimized DTOs for efficient data transfer.
    /// </remarks>
    public List<TItem> Items { get; set; }

    /// <summary>
    /// Gets or sets the total number of items across all pages.
    /// Represents complete result set size before paging is applied.
    /// </summary>
    /// <value>
    /// Total count of items matching query criteria across all pages.
    /// Used for pagination control and progress indication.
    /// </value>
    /// <remarks>
    /// Essential metadata for pagination functionality:
    /// - Enables calculation of total pages
    /// - Supports pagination control rendering
    /// - Provides progress indication (item X of Y)
    /// - Enables client-side paging decisions
    /// 
    /// Represents count BEFORE paging (SkipCount/MaxResultCount) is applied.
    /// Should include all items matching query filter criteria.
    /// Critical for accurate pagination control on client side.
    /// </remarks>
    public long TotalCount { get; set; }

    /// <summary>
    /// Gets or sets the page size (maximum items per page).
    /// Indicates the requested number of items per page.
    /// </summary>
    /// <value>
    /// Maximum number of items per page from original request, or null if no limit.
    /// Should match MaxResultCount from original paging request.
    /// </value>
    /// <remarks>
    /// Page size metadata enabling:
    /// - Client-side pagination control calculation
    /// - Consistent paging behavior across requests
    /// - Total pages calculation when combined with TotalCount
    /// 
    /// Null value indicates no page size limit was specified.
    /// Should match original request MaxResultCount for consistency.
    /// Used with TotalCount to calculate TotalPages property.
    /// </remarks>
    public int? PageSize { get; set; }

    /// <summary>
    /// Gets or sets the number of items skipped (offset).
    /// Indicates how many items were skipped to reach current page.
    /// </summary>
    /// <value>
    /// Number of items skipped from original request, or null if no offset.
    /// Should match SkipCount from original paging request.
    /// </value>
    /// <remarks>
    /// Offset metadata enabling:
    /// - Current page index calculation
    /// - Navigation to adjacent pages
    /// - Consistent paging state tracking
    /// 
    /// Null value indicates no items were skipped (first page).
    /// Should match original request SkipCount for consistency.
    /// Used with PageSize to calculate PageIndex property.
    /// </remarks>
    public int? SkipCount { get; set; }

    /// <summary>
    /// Gets the calculated total number of pages based on total count and page size.
    /// Automatically computed from TotalCount and PageSize properties.
    /// </summary>
    /// <value>
    /// Total number of pages required to display all items, or null if PageSize is null.
    /// Calculated using ceiling division of TotalCount by PageSize.
    /// </value>
    /// <remarks>
    /// Calculated property providing essential pagination metadata:
    /// - Enables pagination control rendering (page 1 of 10)
    /// - Supports navigation boundary checking
    /// - Provides total pages context for user interface
    /// 
    /// Calculation: Math.Ceiling(TotalCount / PageSize)
    /// Returns null when PageSize is null (no paging limit).
    /// Always rounds up to ensure all items are included in page count.
    /// 
    /// Examples:
    /// - 100 items, 10 per page = 10 pages
    /// - 101 items, 10 per page = 11 pages (ceiling of 10.1)
    /// - 50 items, no page size = null pages
    /// </remarks>
    public int? TotalPages => PageSize != null ? (int)Math.Ceiling(TotalCount / (double)PageSize) : null;

    /// <summary>
    /// Gets the calculated current page index (zero-based).
    /// Automatically computed from SkipCount and PageSize using platform extensions.
    /// </summary>
    /// <value>
    /// Zero-based index of current page, or null if paging parameters are incomplete.
    /// Calculated using GetPageIndex extension method from platform framework.
    /// </value>
    /// <remarks>
    /// Calculated property providing current page position:
    /// - Zero-based indexing (first page = 0, second page = 1)
    /// - Enables current page highlighting in navigation
    /// - Supports relative navigation (next/previous page)
    /// 
    /// Calculation delegated to IPlatformPagedResult.GetPageIndex() extension method.
    /// Returns null when paging parameters are insufficient for calculation.
    /// 
    /// Examples:
    /// - Skip 0, PageSize 10 = Page 0 (first page)
    /// - Skip 10, PageSize 10 = Page 1 (second page)
    /// - Skip 25, PageSize 10 = Page 2 (third page)
    /// - No skip or page size = null
    /// 
    /// Used by client-side pagination controls for current page indication.
    /// </remarks>
    public int? PageIndex => this.As<IPlatformPagedResult<TItem>>().GetPageIndex();
}
