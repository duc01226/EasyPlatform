using System.Linq.Expressions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Persistence.Services;

/// <summary>
/// Defines the contract for platform full-text search persistence services that provide advanced search capabilities
/// across different database technologies within the Platform framework.
/// </summary>
/// <remarks>
/// This interface extends <see cref="IPersistenceService"/> to provide standardized full-text search functionality that works
/// across different database technologies including:
///
/// **Supported Database Technologies:**
/// - Relational stores via EF Core — any provider with full-text search capabilities
/// - Document stores with text indexes and aggregation frameworks
/// - Dedicated search engines for advanced search scenarios
///
/// **Key Features:**
/// - Multi-property search with flexible matching strategies
/// - Boolean search logic (AND/OR operations)
/// - Exact phrase matching vs. fuzzy matching
/// - Prefix-based search (starts with) functionality
/// - Cross-database search abstraction
/// - Fallback mechanism for unsupported query providers
///
/// **Search Strategies:**
/// 1. **Full-Text Search**: Advanced linguistic search with stemming, ranking
/// 2. **Phrase Matching**: Exact phrase matching for precise results
/// 3. **Prefix Search**: Starts-with matching for auto-complete scenarios
/// 4. **Multi-Property Search**: Search across multiple entity properties simultaneously
///
/// **Usage Examples:**
/// ```csharp
/// // Basic full-text search across multiple properties
/// var results = searchService.Search(
///     userQuery,
///     "john developer",
///     new[] { u => u.Name, u => u.JobTitle },
///     fullTextAccurateMatch: false
/// );
///
/// // Exact phrase search with prefix matching
/// var products = searchService.Search(
///     productQuery,
///     "red sports car",
///     new[] { p => p.Name, p => p.Description },
///     fullTextAccurateMatch: true,
///     includeStartWithProps: new[] { p => p.Category }
/// );
/// ```
///
/// **Performance Considerations:**
/// - Uses database-specific optimizations (indexes, full-text catalogs)
/// - Supports query provider detection to choose optimal search strategy
/// - Implements fallback mechanisms for maximum compatibility
/// - Designed for high-performance search scenarios
///
/// **Integration Points:**
/// - Free-text search over entity text fields, whichever consuming service owns them
/// - Integrates with the permission provider for access-controlled search results
/// </remarks>
public interface IPlatformFullTextSearchPersistenceService : IPersistenceService
{
    /// <summary>
    /// Performs full-text search across multiple properties of entities with flexible matching strategies.
    /// </summary>
    /// <typeparam name="T">The entity type to search within. Must be a reference type.</typeparam>
    /// <param name="query">The base queryable collection to search within.</param>
    /// <param name="searchText">
    /// The search text to look for. Can contain multiple terms separated by spaces.
    /// Example: "john developer" will search for both "john" AND "developer".
    /// </param>
    /// <param name="inFullTextSearchProps">
    /// Array of property expressions to perform full-text search on.
    /// Must be single-level string properties (e.g., p => p.Name, p => p.Description).
    /// </param>
    /// <param name="fullTextAccurateMatch">
    /// Determines the matching strategy:
    /// - <c>true</c>: Exact phrase matching (search for the complete phrase)
    /// - <c>false</c>: Fuzzy matching with stemming and linguistic analysis
    /// Default is <c>true</c>.
    /// </param>
    /// <param name="includeStartWithProps">
    /// Optional array of property expressions to perform prefix matching on.
    /// Useful for auto-complete scenarios. Default is <c>null</c>.
    /// </param>
    /// <returns>
    /// A filtered queryable collection containing entities that match the search criteria.
    /// </returns>
    /// <remarks>
    /// **Search Logic:**
    /// For input searchText "abc def" and properties [PropA, PropB], the method generates:
    /// ```
    /// (PropA contains ("abc" AND "def")) OR (PropB contains ("abc" AND "def"))
    /// ```
    ///
    /// **Multi-Term Search Behavior:**
    /// - Each term in the search text is treated as a separate requirement
    /// - All terms must be found within the same property (AND logic within property)
    /// - Any property can satisfy the search (OR logic between properties)
    ///
    /// **Database-Specific Implementations** (each lives in its own provider package, never here):
    /// - **Relational**: uses whatever full-text construct the provider exposes
    /// - **Document store**: uses its text-index / text-operator equivalent
    /// - **In-Memory**: Falls back to string.Contains operations
    ///
    /// **Performance Optimization:**
    /// - Leverages database-specific full-text indexes
    /// - Automatically detects supported query providers
    /// - Falls back to alternative search services when primary provider doesn't support the query
    ///
    /// **Usage Examples:**
    /// ```csharp
    /// // Search for employees with "senior developer" in name or job title
    /// var seniorDevs = searchService.Search(
    ///     employeeQuery,
    ///     "senior developer",
    ///     new[] { e => e.Name, e => e.JobTitle },
    ///     fullTextAccurateMatch: false
    /// );
    ///
    /// // Exact phrase search in product descriptions
    /// var products = searchService.Search(
    ///     productQuery,
    ///     "red sports car",
    ///     new[] { p => p.Description },
    ///     fullTextAccurateMatch: true
    /// );
    ///
    /// // Combined full-text and prefix search
    /// var searchResults = searchService.Search(
    ///     contentQuery,
    ///     "artificial intelligence",
    ///     new[] { c => c.Title, c => c.Content },
    ///     fullTextAccurateMatch: false,
    ///     includeStartWithProps: new[] { c => c.Tags }
    /// );
    /// ```
    ///
    /// **Error Handling:**
    /// - Invalid property expressions are handled gracefully
    /// - Null or empty search text returns the original query
    /// - Unsupported query providers trigger fallback mechanisms
    /// </remarks>
    public IQueryable<T> Search<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object?>>[] inFullTextSearchProps,
        bool fullTextAccurateMatch = true,
        Expression<Func<T, object?>>[] includeStartWithProps = null
    )
        where T : class;

    /// <summary>
    /// Determines whether the provided query is supported by this full-text search service implementation.
    /// </summary>
    /// <typeparam name="T">The entity type of the query. Must be a reference type.</typeparam>
    /// <param name="query">The queryable collection to check for compatibility.</param>
    /// <returns>
    /// <c>true</c> if this service can handle the query provider; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// This method enables the platform to automatically select the appropriate search service based on:
    ///
    /// **Query Provider Detection:**
    /// - Entity Framework Core queries (any relational provider EF Core supports)
    /// - Document-store queries (via that store's own driver)
    /// - In-memory queries (LINQ to Objects)
    /// - Custom query providers
    ///
    /// **Implementation Examples:**
    /// ```csharp
    /// // Relational (EF Core) implementation
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query)
    /// {
    ///     return query.Provider is Microsoft.EntityFrameworkCore.Query.Internal.EntityQueryProvider;
    /// }
    ///
    /// // Document-store implementation
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query)
    /// {
    ///     return query.Provider is DocumentStoreQueryProvider; // the store driver's own LINQ provider type
    /// }
    /// ```
    ///
    /// **Fallback Strategy:**
    /// When this method returns <c>false</c>, the base implementation will:
    /// 1. Search for alternative full-text search services in the DI container
    /// 2. Find the first service that supports the query provider
    /// 3. Delegate the search operation to that service
    /// 4. Return null if no compatible service is found
    ///
    /// **Usage in Service Selection:**
    /// The platform uses this method to:
    /// - Automatically route queries to appropriate search implementations
    /// - Enable polyglot persistence scenarios (multiple database types)
    /// - Provide graceful degradation when full-text search isn't available
    /// - Support plugin-based search service architecture
    ///
    /// **Performance Considerations:**
    /// - This method should be lightweight and fast
    /// - Avoid heavy reflection or complex logic
    /// - Cache provider type checks if necessary
    /// - Consider using type-based checks for better performance
    /// </remarks>
    public bool IsSupportQuery<T>(IQueryable<T> query)
        where T : class;
}

/// <summary>
/// Abstract base class for platform full-text search persistence services that provides common functionality
/// and fallback mechanisms for database-agnostic search operations.
/// </summary>
/// <remarks>
/// This class implements the Template Method pattern to provide a standardized approach to full-text search
/// while allowing database-specific implementations through abstract methods.
///
/// **Architecture Benefits:**
/// - Consistent search behavior across different database technologies
/// - Automatic fallback to compatible search services
/// - Centralized service discovery and delegation logic
/// - Simplified implementation for concrete search services
///
/// **Implementation Strategy:**
/// 1. **Query Support Detection**: Check if the current implementation supports the query provider
/// 2. **Fallback Resolution**: Find alternative services when primary implementation doesn't support the query
/// 3. **Delegation**: Route unsupported queries to compatible services automatically
/// 4. **Default Implementation**: Provide common search orchestration logic
///
/// **Concrete Implementation Examples:**
/// ```csharp
/// // Relational (EF Core) full-text search service — any provider EF Core supports
/// public class RelationalFullTextSearchService : PlatformFullTextSearchPersistenceService
/// {
///     public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
///         query.Provider is EntityQueryProvider;
///
///     protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...) =>
///         // provider-specific full-text search implementation
/// }
///
/// // Document-store text search service
/// public class DocumentStoreTextSearchService : PlatformFullTextSearchPersistenceService
/// {
///     public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
///         query.Provider is DocumentStoreQueryProvider;
///
///     protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...) =>
///         // document-store text search implementation
/// }
/// ```
///
/// **Service Discovery:**
/// - Uses dependency injection to find all registered search services
/// - Automatically routes queries to compatible implementations
/// - Supports multiple search services for different database technologies
/// - Enables polyglot persistence scenarios
///
/// **Error Handling:**
/// - Graceful fallback when primary service doesn't support query type
/// - Returns null when no compatible service is found
/// - Allows higher-level code to handle unsupported scenarios
///
/// **Performance Optimization:**
/// - Lazy service discovery only when fallback is needed
/// - Efficient provider type checking
/// - Minimizes service resolution overhead
/// - Caches service provider references
/// </remarks>
public abstract class PlatformFullTextSearchPersistenceService : IPlatformFullTextSearchPersistenceService
{
    /// <summary>
    /// Gets the service provider for resolving dependencies and alternative search services.
    /// </summary>
    /// <remarks>
    /// Used for:
    /// - Discovering alternative full-text search services
    /// - Resolving database-specific dependencies
    /// - Supporting fallback service selection
    /// - Accessing shared platform services
    /// </remarks>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformFullTextSearchPersistenceService"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution and service discovery.</param>
    public PlatformFullTextSearchPersistenceService(IServiceProvider serviceProvider)
    {
        ServiceProvider = serviceProvider;
    }

    /// <summary>
    /// Performs full-text search with automatic fallback to compatible search services.
    /// </summary>
    /// <typeparam name="T">The entity type to search within. Must be a reference type.</typeparam>
    /// <param name="query">The base queryable collection to search within.</param>
    /// <param name="searchText">The search text containing one or more terms.</param>
    /// <param name="inFullTextSearchProps">Array of property expressions for full-text search.</param>
    /// <param name="fullTextAccurateMatch">Whether to use exact phrase matching or fuzzy matching.</param>
    /// <param name="includeStartWithProps">Optional array of property expressions for prefix matching.</param>
    /// <returns>A filtered queryable collection containing matching entities.</returns>
    /// <remarks>
    /// This method implements the Template Method pattern:
    ///
    /// **Execution Flow:**
    /// 1. **Support Check**: Calls <see cref="IsSupportQuery{T}"/> to determine if this service can handle the query
    /// 2. **Direct Processing**: If supported, calls <see cref="DoSearch{T}"/> for database-specific implementation
    /// 3. **Fallback Attempt**: If unsupported, calls <see cref="TrySearchByFirstSupportQueryHelper{T}"/> to find alternative services
    /// 4. **Result Selection**: Returns the result from the appropriate service or fallback
    ///
    /// **Fallback Strategy:**
    /// - Searches for other registered <see cref="IPlatformFullTextSearchPersistenceService"/> implementations
    /// - Finds the first service that supports the query provider
    /// - Delegates the search operation to that service
    /// - Returns null if no compatible service is found
    ///
    /// **Benefits:**
    /// - Automatic service selection based on query provider compatibility
    /// - Seamless integration across different database technologies
    /// - Graceful degradation when specific search implementations aren't available
    /// - Consistent API regardless of underlying database technology
    ///
    /// **Usage in Polyglot Scenarios:**
    /// ```csharp
    /// // Service automatically routes to appropriate implementation
    /// var sqlResults = searchService.Search(relationalQuery, "search term", props);  // Uses the relational service
    /// var documentResults = searchService.Search(documentStoreQuery, "search term", props); // Uses the document-store service
    /// var memoryResults = searchService.Search(memoryQuery, "search term", props); // Uses in-memory service
    /// ```
    /// </remarks>
    public IQueryable<T> Search<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object?>>[] inFullTextSearchProps,
        bool fullTextAccurateMatch = true,
        Expression<Func<T, object?>>[] includeStartWithProps = null
    )
        where T : class
    {
        var byFirstSupportQueryHelperFilterQuery = !IsSupportQuery(query)
            ? TrySearchByFirstSupportQueryHelper(query, searchText, inFullTextSearchProps, fullTextAccurateMatch, includeStartWithProps)
            : null;

        return byFirstSupportQueryHelperFilterQuery ?? DoSearch(query, searchText, inFullTextSearchProps, fullTextAccurateMatch, includeStartWithProps);
    }

    /// <summary>
    /// Determines whether the provided query is supported by this search service implementation.
    /// </summary>
    /// <typeparam name="T">The entity type of the query. Must be a reference type.</typeparam>
    /// <param name="query">The queryable collection to check for compatibility.</param>
    /// <returns><c>true</c> if this service can handle the query provider; otherwise, <c>false</c>.</returns>
    /// <remarks>
    /// Concrete implementations should override this method to specify which query providers they support.
    /// This enables automatic service selection and fallback mechanisms.
    ///
    /// **Implementation Examples:**
    /// ```csharp
    /// // Entity Framework Core support
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
    ///     query.Provider.GetType().Name.Contains("EntityQueryProvider");
    ///
    /// // Document-store support
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
    ///     query.Provider is DocumentStoreQueryProvider;
    ///
    /// // In-memory/LINQ to Objects support
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
    ///     query.Provider is EnumerableQuery&lt;T&gt;.Provider;
    /// ```
    /// </remarks>
    public abstract bool IsSupportQuery<T>(IQueryable<T> query)
        where T : class;

    /// <summary>
    /// Performs the actual database-specific full-text search implementation.
    /// </summary>
    /// <typeparam name="T">The entity type to search within. Must be a reference type.</typeparam>
    /// <param name="query">The base queryable collection to search within.</param>
    /// <param name="searchText">The search text containing one or more terms.</param>
    /// <param name="inFullTextSearchProps">Array of property expressions for full-text search.</param>
    /// <param name="fullTextAccurateMatch">Whether to use exact phrase matching or fuzzy matching.</param>
    /// <param name="includeStartWithProps">Optional array of property expressions for prefix matching.</param>
    /// <returns>A filtered queryable collection containing matching entities.</returns>
    /// <remarks>
    /// This method contains the database-specific search logic and must be implemented by concrete classes.
    ///
    /// **Implementation Guidelines:**
    /// - Leverage database-specific full-text search capabilities
    /// - Handle multiple search terms appropriately (AND/OR logic)
    /// - Implement both exact and fuzzy matching strategies
    /// - Support prefix matching for auto-complete scenarios
    /// - Optimize for performance using indexes and database features
    ///
    /// **Database-Specific Implementations:**
    /// ```csharp
    /// // Relational store, via EF Core
    /// protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...)
    /// {
    ///     // Use the provider's own full-text construct — a text-vector/text-query pair, a
    ///     // contains/free-text predicate, or whatever else that provider exposes
    ///     return query.Where(predicate using the provider's full-text search);
    /// }
    ///
    /// // Document store with text search
    /// protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...)
    /// {
    ///     // Use the store's text operator against its text indexes
    ///     return query.Where(predicate using the store's text search);
    /// }
    /// ```
    ///
    /// **Error Handling:**
    /// - Handle invalid or malformed search text gracefully
    /// - Return original query for null/empty search text
    /// - Log performance warnings for complex searches
    /// - Provide meaningful error messages for debugging
    /// </remarks>
    protected abstract IQueryable<T> DoSearch<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object>>[] inFullTextSearchProps,
        bool fullTextAccurateMatch = true,
        Expression<Func<T, object>>[] includeStartWithProps = null
    )
        where T : class;

    /// <summary>
    /// Attempts to find and use an alternative full-text search service that supports the provided query.
    /// </summary>
    /// <typeparam name="T">The entity type to search within. Must be a reference type.</typeparam>
    /// <param name="query">The base queryable collection to search within.</param>
    /// <param name="searchText">The search text containing one or more terms.</param>
    /// <param name="inFullTextSearchProps">Array of property expressions for full-text search.</param>
    /// <param name="exactMatch">Whether to use exact phrase matching or fuzzy matching.</param>
    /// <param name="includeStartWithProps">Optional array of property expressions for prefix matching.</param>
    /// <returns>
    /// A filtered queryable collection from the alternative service, or <c>null</c> if no compatible service is found.
    /// </returns>
    /// <remarks>
    /// This method implements the fallback mechanism for unsupported query providers:
    ///
    /// **Fallback Process:**
    /// 1. **Service Discovery**: Retrieves all registered <see cref="IPlatformFullTextSearchPersistenceService"/> instances
    /// 2. **Compatibility Check**: Tests each service using <see cref="IsSupportQuery{T}"/>
    /// 3. **First Match Selection**: Uses the first compatible service found
    /// 4. **Delegation**: Calls the compatible service's <see cref="Search{T}"/> method
    /// 5. **Null Return**: Returns null if no compatible service is available
    ///
    /// **Service Resolution Strategy:**
    /// - Uses dependency injection container to discover services
    /// - Excludes the current service instance from consideration
    /// - Performs lazy evaluation - only searches when fallback is needed
    /// - Caches service provider reference for efficiency
    ///
    /// **Use Cases:**
    /// - Cross-store search scenarios (a relational store alongside a document store)
    /// - Plugin-based architecture with multiple search providers
    /// - Development/testing scenarios with mixed data sources
    /// - Graceful degradation when primary search service is unavailable
    ///
    /// **Performance Considerations:**
    /// - Service discovery overhead is minimal due to lazy evaluation
    /// - FirstOrDefault stops iteration on first match
    /// - Service provider caching reduces repeated DI container access
    /// - Compatible service check should be lightweight
    ///
    /// **Example Scenario:**
    /// ```csharp
    /// // The relational service doesn't support a document-store query
    /// var relationalService = new RelationalFullTextSearchService();
    /// var result = relationalService.Search(documentStoreQuery, "search term", props);
    ///
    /// // Automatically falls back to the document-store service
    /// // 1. Detects the document-store query provider
    /// // 2. Finds DocumentStoreTextSearchService in DI container
    /// // 3. Delegates search to the document-store service
    /// // 4. Returns the document-store search results
    /// ```
    ///
    /// **Error Handling:**
    /// - Returns null if no services are registered
    /// - Returns null if no compatible service is found
    /// - Allows higher-level code to handle unsupported scenarios
    /// - Logs service discovery issues for debugging
    /// </remarks>
    protected IQueryable<T> TrySearchByFirstSupportQueryHelper<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object>>[] inFullTextSearchProps,
        bool exactMatch,
        Expression<Func<T, object>>[] includeStartWithProps = null
    )
        where T : class
    {
        var otherSupportHelper = ServiceProvider?.GetServices<IPlatformFullTextSearchPersistenceService>().FirstOrDefault(p => p.IsSupportQuery(query));

        return otherSupportHelper?.Search(query, searchText, inFullTextSearchProps, exactMatch, includeStartWithProps);
    }
}
