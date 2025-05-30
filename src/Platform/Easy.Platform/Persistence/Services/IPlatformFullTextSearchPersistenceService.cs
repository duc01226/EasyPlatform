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
/// - PostgreSQL with full-text search capabilities (Growth service)
/// - MongoDB with text indexes and aggregation framework (Employee, Talents, Surveys services)
/// - SQL Server with full-text indexing
/// - Elasticsearch integration for advanced search scenarios
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
/// - Used by Employee service for talent search across skills and experience
/// - Used by Surveys service for response content analysis
/// - Used by Growth service for user and company search functionality
/// - Integrates with Permission Provider for access-controlled search results
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
    /// **Database-Specific Implementations:**
    /// - **PostgreSQL**: Uses tsvector and tsquery for linguistic search
    /// - **MongoDB**: Uses $text operator with text indexes
    /// - **SQL Server**: Uses CONTAINS and FREETEXT functions
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
    /// - Entity Framework Core queries (SQL Server, PostgreSQL, MySQL)
    /// - MongoDB queries (MongoDB.Driver)
    /// - In-memory queries (LINQ to Objects)
    /// - Custom query providers
    ///
    /// **Implementation Examples:**
    /// ```csharp
    /// // PostgreSQL/Entity Framework implementation
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query)
    /// {
    ///     return query.Provider is Microsoft.EntityFrameworkCore.Query.Internal.EntityQueryProvider;
    /// }
    ///
    /// // MongoDB implementation
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query)
    /// {
    ///     return query.Provider is MongoDB.Driver.Linq.MongoQueryProvider;
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
/// // PostgreSQL full-text search service
/// public class PostgreSqlFullTextSearchService : PlatformFullTextSearchPersistenceService
/// {
///     public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
///         query.Provider is EntityQueryProvider;
///
///     protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...) =>
///         // PostgreSQL-specific full-text search implementation
/// }
///
/// // MongoDB text search service
/// public class MongoDbTextSearchService : PlatformFullTextSearchPersistenceService
/// {
///     public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
///         query.Provider is MongoQueryProvider;
///
///     protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...) =>
///         // MongoDB text search implementation
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
    /// var pgResults = searchService.Search(postgresQuery, "search term", props);  // Uses PostgreSQL service
    /// var mongoResults = searchService.Search(mongoQuery, "search term", props); // Uses MongoDB service
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
    /// // MongoDB support
    /// public override bool IsSupportQuery&lt;T&gt;(IQueryable&lt;T&gt; query) =>
    ///     query.Provider is MongoQueryProvider;
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
    /// // PostgreSQL with full-text vectors
    /// protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...)
    /// {
    ///     // Use to_tsvector and to_tsquery for advanced search
    ///     return query.Where(predicate using PostgreSQL full-text functions);
    /// }
    ///
    /// // MongoDB with text search
    /// protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...)
    /// {
    ///     // Use $text operator with text indexes
    ///     return query.Where(predicate using MongoDB text search);
    /// }
    ///
    /// // SQL Server with CONTAINS/FREETEXT
    /// protected override IQueryable&lt;T&gt; DoSearch&lt;T&gt;(...)
    /// {
    ///     // Use CONTAINS, FREETEXT, or CONTAINSTABLE functions
    ///     return query.Where(predicate using SQL Server full-text);
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
    /// - Cross-database search scenarios (PostgreSQL + MongoDB)
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
    /// // PostgreSQL service doesn't support MongoDB query
    /// var postgresService = new PostgreSqlFullTextSearchService();
    /// var result = postgresService.Search(mongoQuery, "search term", props);
    ///
    /// // Automatically falls back to MongoDB service
    /// // 1. Detects MongoDB query provider
    /// // 2. Finds MongoDbTextSearchService in DI container
    /// // 3. Delegates search to MongoDB service
    /// // 4. Returns MongoDB search results
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
