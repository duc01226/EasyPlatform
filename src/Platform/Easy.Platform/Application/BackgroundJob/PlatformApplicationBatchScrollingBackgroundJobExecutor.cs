#region

using System.Diagnostics;
using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.BackgroundJob;

/// <summary>
/// Abstract base class for background jobs that need to process large datasets using two-level pagination:
/// 1. Split dataset into batches (e.g., by companyId, organizationId, etc.)
/// 2. Process each batch with scrolling pagination in parallel
///
/// This pattern is ideal for scenarios where:
/// - Query results are affected by processing (scrolling pagination needed)
/// - Dataset can be logically split into independent batches
/// - Parallel processing can improve performance
/// - Resource isolation between batches is beneficial
///
/// ## How It Works:
///
/// **Master Job Execution:**
/// 1. Discovers all batch keys (e.g., company IDs) using EntitiesBatchKeyQueryBuilder
/// 2. Processes batch keys in pages to avoid memory issues (BatchKeyPageSize)
/// 3. Schedules individual background jobs for each batch key
/// 4. Each batch runs independently in parallel
///
/// **Individual Batch Execution:**
/// 1. Receives a specific batch key (e.g., companyId = "company-123")
/// 2. Uses EntitiesQueryBuilder to filter entities for that batch
/// 3. Applies scrolling pagination within the batch using ExecuteInjectScopedScrollingPagingAsync
/// 4. Processes entities using ProcessEntitiesAsync with business logic
/// 5. Continues until no more entities in the batch
///
/// ## Implementation Example:
///
/// ```csharp
/// [PlatformRecurringJob("0 0 * * *")]
/// public class ProcessPendingTextSnippetsBackgroundJob
///     : PlatformApplicationBatchScrollingBackgroundJobExecutor<TextSnippetText, string>
/// {
///     // Repository access pattern
///     protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
///         IServiceProvider serviceProvider,
///         Func<IQueryable<TextSnippetText>, IQueryable<TSelector>> queryBuilder,
///         CancellationToken cancellationToken = default,
///         params Expression<Func<TextSnippetText, object?>>[] loadRelatedEntities)
///     {
///         return serviceProvider.GetRequiredService<IPlatformQueryableRootRepository<TextSnippetText, string>>()
///             .GetAllAsync(queryBuilder, cancellationToken, loadRelatedEntities);
///     }
///
///     // Query building for entities with batch filtering
///     protected override IQueryable<TextSnippetText> EntitiesQueryBuilder(
///         IQueryable<TextSnippetText> query, object? param, string? batchKey = null)
///     {
///         return query.Where(
///             TextSnippetText.GetPendingSnippetsExpr()
///                 .AndAlsoIf(batchKey != null, () => t => t.CreatedBy == batchKey));
///     }
///
///     // Batch key discovery (user IDs)
///     protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
///         IQueryable<TextSnippetText> query, object? param, string? batchKey = null)
///     {
///         return EntitiesQueryBuilder(query, param, batchKey)
///             .Select(t => t.CreatedBy)
///             .Distinct();
///     }
///
///     // Business logic processing
///     protected override async Task ProcessEntitiesAsync(
///         List<TextSnippetText> entities, string batchKey, object? param, IServiceProvider serviceProvider)
///     {
///         var helper = serviceProvider.GetRequiredService<TextSnippetProcessingHelper>();
///         await entities.ParallelAsync(async snippet => {
///             // Apply business logic to each entity
///         });
///     }
/// }
/// ```
///
/// ## Key Benefits:
/// - **Scalability**: Handles thousands of companies without memory issues
/// - **Parallel Processing**: Multiple companies processed simultaneously
/// - **Error Isolation**: One company's failure doesn't affect others
/// - **Memory Efficiency**: Paged batch key discovery and scrolling pagination
/// - **Platform Integration**: Uses existing repository patterns and dependency injection
/// - **Flexibility**: Generic design supports any entity type and batch key type
///
/// ## Configuration Options:
/// - **BatchKeyPageSize**: Number of batch keys processed per page (default: 1000)
/// - **BatchPageSize**: Page size for scrolling pagination within batches (default: 100)
/// - **EnableForwardProgressGuard**: Whether a repeated scrolling page throws (default: true). MUST be turned off by a
///   job that legitimately leaves rows matching EntitiesQueryBuilder — see the property's own docs for the contract
/// - **HandleBatchErrorAsync**: Override for custom error handling per batch
/// </summary>
/// <typeparam name="TEntity">The entity type being processed</typeparam>
/// <typeparam name="TBatchKey">The type of key used to identify batches (e.g., string for companyId)</typeparam>
/// <typeparam name="TParam">The parameter type for the background job</typeparam>
public abstract class PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey, TParam>
    : PlatformApplicationBackgroundJobExecutor<PlatformBatchScrollingJobParam<TBatchKey, TParam>>
    where TEntity : class
    where TBatchKey : IEquatable<TBatchKey>
    where TParam : class
{
    protected PlatformApplicationBatchScrollingBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler
    )
        : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }

    public override bool AutoOpenUow => false;

    /// <summary>
    /// Main processing method that coordinates batch splitting and parallel execution
    /// </summary>
    public override async Task ProcessAsync(PlatformBatchScrollingJobParam<TBatchKey, TParam>? param)
    {
        if (param != null && param.BatchKey is not null)
        {
            // Process individual batch with scrolling pagination
            await ProcessSingleBatchAsync(param.BatchKey, param.Param);
        }
        else
        {
            // Master job: identify batches and schedule parallel processing
            await ProcessAllBatchesAsync(param?.Param);
        }
    }

    /// <summary>
    /// Master job execution: identifies all batch keys and schedules parallel batch processing using paging
    /// </summary>
    private async Task ProcessAllBatchesAsync(TParam? param)
    {
        var currentPage = 0;
        var totalBatchKeysCount = await CountEntitiesAsync(ServiceProvider, query => EntitiesBatchKeyQueryBuilder(query, param, null));

        // Process batch keys in pages to avoid memory issues with large datasets
        while (true)
        {
            // Step 1: Get batch keys for current page
            var batchKeysPage = await GetAllEntitiesAsync(
                ServiceProvider,
                query => EntitiesBatchKeyQueryBuilder(query, param, null).OrderBy(p => p).Skip(currentPage * BatchKeyPageSize).Take(BatchKeyPageSize),
                loadRelatedEntities: EntitiesQueryLoadRelatedEntities()
            );

            // Step 2: Schedule batch jobs for this page with throttling
            await batchKeysPage.ParallelAsync(async batchKey =>
            {
                // Schedule individual batch job for parallel execution
                var batchParam = new PlatformBatchScrollingJobParam<TBatchKey, TParam> { Param = param, BatchKey = batchKey };

                await BackgroundJobScheduler.Schedule(GetType(), batchParam, DateTimeOffset.UtcNow);
            });

            if (batchKeysPage.Count == 0 || currentPage * BatchKeyPageSize >= totalBatchKeysCount)
                break;

            currentPage++;
        }
    }

    /// <summary>
    /// Processes a single batch using scrolling pagination
    /// </summary>
    private async Task ProcessSingleBatchAsync(TBatchKey batchKey, TParam? param)
    {
        try
        {
            // Forward-progress state for the guard below. Holds ONLY the immediately preceding page's identity set —
            // never an accumulated history of every entity seen, which would grow with the batch (unbounded memory on a
            // large batch) and would also fire on legitimate re-selection several pages apart.
            HashSet<object>? previousPageEntityIds = null;
            var guardInactiveLogged = false;

            // Execute scrolling pagination for this batch
            await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<TEntity>(
                async (IServiceProvider serviceProvider) =>
                {
                    var entities = await GetAllEntitiesAsync(
                        serviceProvider,
                        query => EntitiesQueryBuilder(query, param, batchKey).Take(BatchPageSize),
                        loadRelatedEntities: EntitiesQueryLoadRelatedEntities());

                    if (entities.Count > 0)
                    {
                        // The page query above is Take(BatchPageSize) with NO Skip, so this is not offset paging: it
                        // advances ONLY because processing mutates entities out of EntitiesQueryBuilder's match set.
                        // For a job that owes that drain contract, pages 2..N re-selecting the SAME rows is a
                        // data-corruption defect — detect it and fail loudly instead of repeating the work. A job that
                        // LEGITIMATELY leaves rows in the match set opts out via EnableForwardProgressGuard instead.
                        (previousPageEntityIds, guardInactiveLogged) =
                            CheckPageForwardProgress(entities, batchKey, previousPageEntityIds, guardInactiveLogged);

                        await ProcessEntitiesAsync(entities, batchKey, param, serviceProvider);
                    }

                    return entities;
                },
                // Divide by BatchPageSize — the page size the query above actually pages by (:185) — NOT by
                // BatchKeyPageSize, which sizes the batch-KEY pages in ProcessAllBatchesAsync and is a different unit entirely.
                // Dividing an ENTITY count by the KEY page size (default 1000 vs 100) made maxExecutionCount 0 for any
                // batch under 1000 entities. ExecuteScrollingPagingAsync runs the body once and then loops only
                // `while (totalExecutionCount <= maxExecutionCount && ...)` (Util.Pager.cs:109-118), so 0 meant exactly
                // one page ran and every later page was silently skipped while the job still reported success.
                // Floor division is correct, not a truncation bug: the body gets one free execution before the loop, so
                // N/PageSize == ceil(N/PageSize) - 1 covers the final partial page. Same convention as
                // PlatformMongoDbContext.cs:1355 and the Inbox/Outbox cleaner hosted services.
                await CountEntitiesAsync(ServiceProvider, query => EntitiesQueryBuilder(query, param, batchKey)) / BatchPageSize
            );
        }
        catch (Exception ex)
        {
            await HandleBatchErrorAsync(batchKey, param, ex);
            throw;
        }
    }

    /// <summary>
    /// Runs the forward-progress guard for ONE scrolled page and returns the state the NEXT page must be compared
    /// against. Extracted from the scrolling body so the guard reads as one named concept and the body stays flat.
    /// <para>
    /// Returns a null id set — which disables every later comparison, because the guard only fires when BOTH sides are
    /// non-null — in the two cases where the guard must not judge the batch: the subclass turned it off via
    /// <see cref="EnableForwardProgressGuard" />, or entity identity is unresolvable (<see cref="ResolvePageEntityIds" />).
    /// When it is off, identity is never even resolved, so a disabled guard costs nothing per page.
    /// </para>
    /// </summary>
    /// <returns>
    /// The page's identity set to remember as "previous", and whether the guard-inactive warning has now been logged
    /// for this batch (carried through so it is logged at most once per batch rather than once per page).
    /// </returns>
    private (HashSet<object>? PageEntityIds, bool GuardInactiveLogged) CheckPageForwardProgress(
        List<TEntity> entities,
        TBatchKey batchKey,
        HashSet<object>? previousPageEntityIds,
        bool guardInactiveAlreadyLogged)
    {
        // A subclass whose ProcessEntitiesAsync may legitimately leave rows matching EntitiesQueryBuilder opted out —
        // comparing pages for it would halt a HEALTHY job, so skip the comparison and its identity capture entirely.
        if (!EnableForwardProgressGuard) return (null, guardInactiveAlreadyLogged);

        var currentPageEntityIds = ResolvePageEntityIds(entities);
        var guardInactiveLogged = guardInactiveAlreadyLogged;

        // A guard that silently cannot run is indistinguishable from one that runs and passes, so say when it is off.
        // ONCE per batch, never per page: the cause is structural (TEntity is only constrained to class), so it cannot
        // change mid-batch and per-page logging would flood a large batch.
        if (currentPageEntityIds == null && !guardInactiveAlreadyLogged)
        {
            guardInactiveLogged = true;

            Logger.LogWarning(
                "[BackgroundJob] Job Batch forward-progress guard is INACTIVE because entity identity is unresolvable. BackgroundJobType_Name:{BackgroundJobType_Name}. BatchKey:{BatchKey}",
                GetType().Name,
                batchKey);
        }

        if (previousPageEntityIds != null && currentPageEntityIds != null && previousPageEntityIds.SetEquals(currentPageEntityIds))
            throw LogBatchNotDrainingError(batchKey, entities.Count);

        return (currentPageEntityIds, guardInactiveLogged);
    }

    /// <summary>
    /// Resolves the identity of every entity in one page, for the forward-progress guard in <see cref="ProcessSingleBatchAsync" />.
    /// Identity is the entity KEY (<see cref="IEntity.GetId" />) — never the reference and never object equality, because
    /// each page comes back as freshly materialized instances.
    /// <para>
    /// Returns null when identity is NOT resolvable for the whole page — <typeparamref name="TEntity" /> is only
    /// constrained to <c>class</c>, and a null key cannot be told apart from another null key. The guard then stays OFF
    /// for that comparison: a false positive halts a healthy production job, so "cannot prove" must never mean "fail".
    /// </para>
    /// </summary>
    private static HashSet<object>? ResolvePageEntityIds(List<TEntity> entities)
    {
        var entityIds = new HashSet<object>(entities.Count);

        foreach (var entity in entities)
        {
            if (entity is not IEntity identifiableEntity) return null;

            var entityId = identifiableEntity.GetId();

            if (entityId is null) return null;

            entityIds.Add(entityId);
        }

        return entityIds;
    }

    /// <summary>
    /// Logs and builds the error thrown when a batch's scrolling page repeats the previous page's entities, i.e. the
    /// scroll cannot drain. Returned rather than thrown so the <c>throw</c> stays visible at the detection site.
    /// </summary>
    private InvalidOperationException LogBatchNotDrainingError(TBatchKey batchKey, int pageEntitiesCount)
    {
        var error = new InvalidOperationException(
            $"[BackgroundJob] {GetType().Name} scrolling cannot drain BatchKey:{batchKey}. The page just fetched returned the SAME "
            + $"{pageEntitiesCount} entities (by id) as the page before it, so THIS run is stopped here instead of scrolling the same "
            + $"page for the rest of its budget. It does NOT prevent every repeat: the job now fails loudly and the scheduler retries "
            + $"it, and each retry reprocesses the earlier page(s) before stopping here again — bounded, alertable repetition instead "
            + $"of a silent one. "
            + $"The page query is Take({BatchPageSize}) with NO Skip, so it advances ONLY when processing moves entities OUT of the "
            + $"{nameof(EntitiesQueryBuilder)} match set — the likely cause is that {GetType().Name}.{nameof(EntitiesQueryBuilder)} does "
            + $"not exclude already-processed entities. Fix it by filtering on the field {nameof(ProcessEntitiesAsync)} updates, or make "
            + $"{nameof(ProcessEntitiesAsync)} actually persist that change on EVERY path including its failure paths — an entity whose "
            + $"processing failed silently still matches the filter and is re-selected forever. If instead this job is MEANT to leave "
            + $"rows matching (swallow-and-continue error handling, a filtered subtype, an unstamped branch, or a drain applied "
            + $"asynchronously by an event handler / bus consumer), override {nameof(EnableForwardProgressGuard)} to false. "
            + $"BatchPageSize:{BatchPageSize}.");

        Logger.LogError(
            error.BeautifyStackTrace(),
            "[BackgroundJob] Job Batch scrolling did not drain and was stopped before reprocessing. BackgroundJobType_Name:{BackgroundJobType_Name}. BatchKey:{BatchKey}. BatchPageSize:{BatchPageSize}. PageEntitiesCount:{PageEntitiesCount}",
            GetType().Name,
            batchKey,
            BatchPageSize,
            pageEntitiesCount);

        return error;
    }

    #region Abstract Methods - Must be implemented by derived classes

    /// <summary>
    /// Builds the main query for entities that need processing, with optional batch filtering.
    /// This method defines the core business logic for which entities should be processed.
    ///
    /// **Purpose**: Define the filtering criteria for entities that need processing
    /// **When Called**:
    /// - During batch key discovery (batchKey = null)
    /// - During individual batch processing (batchKey = specific value)
    ///
    /// **Implementation Pattern**:
    /// ```csharp
    /// protected override IQueryable<TextSnippetText> EntitiesQueryBuilder(
    ///     IQueryable<TextSnippetText> query, object? param, string? batchKey = null)
    /// {
    ///     return query.Where(
    ///         TextSnippetText.GetPendingSnippetsExpr()
    ///             .AndAlsoIf(batchKey != null, () => t => t.CreatedBy == batchKey));
    /// }
    /// ```
    ///
    /// **Key Considerations**:
    /// - Use `.AndAlsoIf(batchKey != null, ...)` for batch-specific filtering
    /// - Apply all business rules (subscriptions, statuses, dates, etc.)
    /// - Include necessary joins for related entities
    /// - Ensure query is optimized with proper indexes
    /// </summary>
    /// <param name="query">The base IQueryable for the entity</param>
    /// <param name="param">Job parameters (can contain additional filtering criteria)</param>
    /// <param name="batchKey">The batch key (null for batch discovery, specific value for batch processing)</param>
    /// <returns>Filtered queryable for entities that need processing</returns>
    protected abstract IQueryable<TEntity> EntitiesQueryBuilder(IQueryable<TEntity> query, TParam? param, TBatchKey? batchKey = default);

    /// <summary>
    /// Override to include related entities needed for accrual processing
    /// </summary>
    protected virtual Expression<Func<TEntity, object?>>[] EntitiesQueryLoadRelatedEntities() { return []; }

    /// <summary>
    /// Builds the query for discovering batch keys (e.g., company IDs, organization IDs).
    /// This method determines how the dataset will be split into independent batches.
    ///
    /// **Purpose**: Extract unique batch keys for parallel processing
    /// **When Called**: During master job execution to discover all batches
    ///
    /// **Implementation Pattern**:
    /// ```csharp
    /// protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
    ///     IQueryable<TextSnippetText> query, object? param, string? batchKey = null)
    /// {
    ///     return EntitiesQueryBuilder(query, param, batchKey)
    ///         .Select(t => t.CreatedBy)
    ///         .Distinct();
    /// }
    /// ```
    ///
    /// **Key Considerations**:
    /// - Always call EntitiesQueryBuilder first to apply business rules
    /// - Select the appropriate batch key field (CompanyId, OrganizationId, etc.)
    /// - Use Distinct() to avoid duplicate batch keys
    /// - Consider the cardinality - too many batches may overwhelm the scheduler
    /// - Ensure the batch key field is indexed for performance
    /// </summary>
    /// <param name="query">The base IQueryable for the entity</param>
    /// <param name="param">Job parameters</param>
    /// <param name="batchKey">Usually null for batch key discovery</param>
    /// <returns>Queryable that yields unique batch keys</returns>
    protected abstract IQueryable<TBatchKey> EntitiesBatchKeyQueryBuilder(IQueryable<TEntity> query, TParam? param, string? batchKey = null);

    /// <summary>
    /// Processes a list of entities within a specific batch.
    /// This method contains the core business logic that operates on the entities.
    ///
    /// **Purpose**: Apply business logic to entities within a batch
    /// **When Called**: For each page of entities within a batch during scrolling pagination
    ///
    /// </summary>
    /// <param name="entities">List of entities to process (one page worth)</param>
    /// <param name="batchKey">The batch key identifying this batch (e.g., specific companyId)</param>
    /// <param name="param">Job parameters</param>
    /// <param name="serviceProvider">Scoped service provider for dependency injection</param>
    protected abstract Task ProcessEntitiesAsync(List<TEntity> entities, TBatchKey batchKey, TParam param, IServiceProvider serviceProvider);

    /// <summary>
    /// Executes queries against the repository to retrieve entities or projections.
    /// This method provides access to the repository layer with proper dependency injection.
    ///
    /// **Purpose**: Execute repository queries with proper scoping and relationships
    /// **When Called**:
    /// - During batch key discovery
    /// - During entity retrieval for processing
    ///
    /// **Implementation Pattern**:
    /// ```csharp
    /// protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
    ///     IServiceProvider serviceProvider,
    ///     Func<IQueryable<TextSnippetText>, IQueryable<TSelector>> queryBuilder,
    ///     CancellationToken cancellationToken = default,
    ///     params Expression<Func<TextSnippetText, object?>>[] loadRelatedEntities)
    /// {
    ///     return serviceProvider.GetRequiredService<IPlatformQueryableRootRepository<TextSnippetText, string>>()
    ///         .GetAllAsync(queryBuilder, cancellationToken, loadRelatedEntities);
    /// }
    /// ```
    ///
    /// **Key Considerations**:
    /// - Use the appropriate service-specific repository (IPlatformQueryableRootRepository<TEntity, TKey>)
    /// - Pass through all parameters to the repository method
    /// - Include necessary related entities for business logic
    /// - Handle cancellation tokens properly
    /// - Ensure proper scoping of the repository
    /// </summary>
    /// <typeparam name="TSelector">The type of the query result (could be entity or projection)</typeparam>
    /// <param name="serviceProvider">Scoped service provider for repository access</param>
    /// <param name="queryBuilder">Function that builds the query using fluent API</param>
    /// <param name="cancellationToken">Cancellation token for async operations</param>
    /// <param name="loadRelatedEntities">Related entities to include in the query</param>
    /// <returns>List of query results</returns>
    protected abstract Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
        IServiceProvider serviceProvider,
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Counts entities matching the query criteria.
    /// Used for calculating pagination parameters and progress tracking.
    ///
    /// **Purpose**: Count entities for pagination and progress calculation
    /// **When Called**:
    /// - During batch key discovery to determine total pages
    /// - During batch processing to calculate scrolling pagination limits
    ///
    /// **Implementation Pattern**:
    /// ```csharp
    /// protected override Task<int> CountEntitiesAsync<TQueryItemResult>(
    ///     IServiceProvider serviceProvider,
    ///     Func<IQueryable<TextSnippetText>, IQueryable<TQueryItemResult>> queryBuilder,
    ///     CancellationToken cancellationToken = default)
    /// {
    ///     return serviceProvider.GetRequiredService<IPlatformQueryableRootRepository<TextSnippetText, string>>()
    ///         .CountAsync(queryBuilder, cancellationToken);
    /// }
    /// ```
    ///
    /// **Key Considerations**:
    /// - Use the same repository as GetAllEntitiesAsync
    /// - Ensure the count query is optimized (avoid unnecessary joins)
    /// - Handle large counts gracefully
    /// - Use appropriate indexes for performance
    /// </summary>
    /// <typeparam name="TQueryItemResult">The result type of the query</typeparam>
    /// <param name="serviceProvider">Scoped service provider for repository access</param>
    /// <param name="queryBuilder">Function that builds the count query</param>
    /// <param name="cancellationToken">Cancellation token for async operations</param>
    /// <returns>Count of entities matching the criteria</returns>
    protected abstract Task<int> CountEntitiesAsync<TQueryItemResult>(
        IServiceProvider serviceProvider,
        Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default
    );

    #endregion

    #region Virtual Methods - Can be overridden by derived classes

    /// <summary>
    /// The page size for batch key retrieval to avoid loading too many batch keys at once.
    /// Controls how many batch keys (e.g., company IDs) are processed in each page during
    /// the master job execution phase.
    ///
    /// **Default**: 1000 batch keys per page
    /// **Considerations**:
    /// - Large values: Better performance but higher memory usage
    /// - Small values: Lower memory usage but more iterations
    /// - Enterprise scenarios: Consider 100-500 for very large datasets
    /// - Small/medium scenarios: Default 1000 is usually optimal
    ///
    /// **Example Override**:
    /// ```csharp
    /// protected override int BatchKeyPageSize => 200; // For enterprise with 10k+ companies
    /// ```
    /// </summary>
    protected virtual int BatchKeyPageSize => 1000;

    /// <summary>
    /// The page size for scrolling pagination within each individual batch.
    /// Controls how many entities are processed at once during the scrolling pagination
    /// phase within a single batch (e.g., text snippets within one user batch).
    ///
    /// **Default**: 100 entities per page
    /// **Considerations**:
    /// - Entity complexity: Large entities may need smaller page sizes
    /// - Processing intensity: Complex business logic may need smaller pages
    /// - Memory constraints: Adjust based on available memory
    /// - Database performance: Balance between query overhead and result size
    ///
    /// **Example Override**:
    /// ```csharp
    /// protected override int BatchPageSize => 50; // For complex entities or intensive processing
    /// ```
    /// </summary>
    protected virtual int BatchPageSize => 100;

    /// <summary>
    /// Whether the forward-progress guard is ACTIVE for this job. The guard throws when a scrolled page returns the
    /// same entities (by id) as the page immediately before it.
    ///
    /// **Default**: true
    ///
    /// **The drain contract this enforces**: the page query is `Take(BatchPageSize)` with NO `Skip`, so scrolling
    /// advances ONLY because <see cref="ProcessEntitiesAsync" /> moves the entities it just processed OUT of the
    /// <see cref="EntitiesQueryBuilder" /> match set — on EVERY page, on EVERY code path, and visibly to the very next
    /// page query. A job that owes that contract keeps the guard ON and gets loud detection of a stuck scroll instead
    /// of silently reprocessing the same rows.
    ///
    /// **MUST override to false when the job legitimately leaves rows matching EntitiesQueryBuilder**, because for
    /// such a job a repeated page is normal and the guard would halt a HEALTHY run. Known shapes:
    /// - **swallow-and-continue error handling**: a failed item is logged, left unstamped, and retried on the next scan;
    /// - **a filtered subtype or skipped branch**: `OfType&lt;TSub&gt;()`, an early `return`, or a `switch` with no
    ///   `default`, so some matched rows are never stamped;
    /// - **asynchronous drain**: the state change is applied by an entity-event handler, a bus consumer, or a
    ///   search-index projection, so it is not yet visible to the next page query.
    ///
    /// **Example Override**:
    /// ```csharp
    /// // ProcessEntitiesAsync logs and continues on failure, leaving those rows matching until the next scan.
    /// protected override bool EnableForwardProgressGuard => false;
    /// ```
    ///
    /// Turning it off does NOT make a stuck scroll safe — it restores the pre-guard behavior, where such a batch
    /// reprocesses the same page until the scrolling budget (entity count / <see cref="BatchPageSize" />) is spent.
    /// </summary>
    protected virtual bool EnableForwardProgressGuard => true;

    /// <summary>
    /// Handles errors that occur during individual batch processing.
    /// Override this method to implement custom error handling strategies
    /// such as retry logic, dead letter queues, or notification systems.
    ///
    /// **Default Behavior**: Logs the error and re-throws the exception
    /// **When Called**: When ProcessSingleBatchAsync encounters an exception
    ///
    /// **Error Handling Strategies**:
    /// - **Fail Fast**: Re-throw exception to stop entire job (default)
    /// - **Continue Processing**: Log and continue with other batches
    /// - **Retry Logic**: Implement exponential backoff for transient failures
    /// - **Dead Letter Queue**: Store failed batches for manual intervention
    /// - **Circuit Breaker**: Stop processing after consecutive failures
    /// </summary>
    /// <param name="batchKey">The batch key that failed (e.g., companyId)</param>
    /// <param name="param">The job parameters</param>
    /// <param name="exception">The exception that occurred</param>
    protected virtual async Task HandleBatchErrorAsync(TBatchKey batchKey, TParam param, Exception exception)
    {
        Logger.LogError(
            exception.BeautifyStackTrace(),
            "[BackgroundJob] Job Batch execution was failed. BackgroundJobType_Name:{BackgroundJobType_Name}. BatchKey:{BatchKey}. ParamType:{ParamType}. ParamContent:{@ParamContent}",
            GetType().Name,
            batchKey,
            param?.GetType().Name ?? "null",
            param);
    }

    #endregion
}

/// <summary>
/// Parameter class for batch scrolling background jobs that coordinates the two-level execution flow.
/// This class distinguishes between master job execution (BatchKey = null) and individual batch
/// execution (BatchKey = specific value).
///
/// ## Execution Flow:
///
/// **Master Job** (BatchKey = null):
/// ```csharp
/// var masterParam = new PlatformBatchScrollingJobParam<string, MyJobParam>
/// {
///     Param = new MyJobParam { ... },
///     BatchKey = null  // Indicates this is the master job
/// };
/// // This triggers batch key discovery and scheduling of individual batch jobs
/// ```
///
/// **Individual Batch Job** (BatchKey = specific value):
/// ```csharp
/// var batchParam = new PlatformBatchScrollingJobParam<string, MyJobParam>
/// {
///     Param = new MyJobParam { ... },
///     BatchKey = "company-123"  // Specific batch to process
/// };
/// // This triggers scrolling pagination for this specific batch
/// ```
///
/// ## Usage in Background Job Framework:
/// The framework automatically creates these parameters:
/// - Master job receives parameter with BatchKey = null
/// - Individual batch jobs receive parameters with specific BatchKey values
/// - The Param property carries through any custom job parameters
/// </summary>
/// <typeparam name="TBatchKey">The type of key used to identify batches (e.g., string for companyId, Guid for organizationId)</typeparam>
/// <typeparam name="TParam">The type of custom parameters for the job (use object? if no custom parameters needed)</typeparam>
public class PlatformBatchScrollingJobParam<TBatchKey, TParam>
    where TBatchKey : IEquatable<TBatchKey>
    where TParam : class
{
    /// <summary>
    /// The original parameter passed to the master job.
    /// This property carries custom job parameters through the entire execution flow.
    ///
    /// **Purpose**: Preserve custom job configuration across master and batch executions
    /// **Examples**:
    /// - Processing date ranges
    /// - Feature flags or processing options
    /// - User context or tenant information
    /// - Custom filtering criteria
    ///
    /// **Usage**:
    /// ```csharp
    /// public class MyJobParam
    /// {
    ///     public DateTime StartDate { get; set; }
    ///     public DateTime EndDate { get; set; }
    ///     public bool IncludeArchived { get; set; }
    /// }
    /// ```
    /// </summary>
    public TParam? Param { get; set; }

    /// <summary>
    /// The batch key for this specific batch execution.
    ///
    /// **Values**:
    /// - **null**: Indicates this is a master job execution (batch discovery phase)
    /// - **Specific value**: Indicates this is an individual batch execution (e.g., "company-123")
    ///
    /// **Purpose**: Determines the execution mode and identifies which batch to process
    ///
    /// **Master Job Flow** (BatchKey = null):
    /// 1. Discover all batch keys using EntitiesBatchKeyQueryBuilder
    /// 2. Schedule individual background jobs for each batch key
    /// 3. Each scheduled job gets a copy of this parameter with BatchKey set
    ///
    /// **Individual Batch Flow** (BatchKey = specific value):
    /// 1. Filter entities using EntitiesQueryBuilder with this batch key
    /// 2. Apply scrolling pagination within this batch
    /// 3. Process entities using ProcessEntitiesAsync
    ///
    /// **Examples**:
    /// - Company-based batching: BatchKey = "company-123"
    /// - Organization-based batching: BatchKey = Guid.Parse("...")
    /// - Department-based batching: BatchKey = "dept-hr"
    /// - Region-based batching: BatchKey = "us-west"
    /// </summary>
    public TBatchKey? BatchKey { get; set; }
}

/// <summary>
/// Convenience base class for batch scrolling jobs that don't need custom parameters.
/// This class simplifies implementation when you only need the standard batch processing
/// functionality without additional job parameters.
///
/// ## When to Use:
/// - **Simple Processing**: Job doesn't require custom parameters or configuration
/// - **Standard Batching**: Only need entity type and batch key type specification
/// - **Minimal Setup**: Want to minimize the generic type parameters
///
/// ## Usage Example:
/// ```csharp
/// [PlatformRecurringJob("0 2 * * *")]
/// public class CleanupExpiredTokensBackgroundJob
///     : PlatformApplicationBatchScrollingBackgroundJobExecutor<SecurityToken, string>
/// {
///     // Batch by organizationId, no custom parameters needed
///     // Implement the same abstract methods as the full version
/// }
/// ```
///
/// ## Equivalent Full Declaration:
/// This convenience class is equivalent to:
/// ```csharp
/// PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey, object?>
/// ```
///
/// The `object?` parameter type allows the job to run without requiring custom parameters,
/// making the implementation simpler when custom parameters are not needed.
/// </summary>
/// <typeparam name="TEntity">The entity type being processed (e.g., SecurityToken, LogEntry)</typeparam>
/// <typeparam name="TBatchKey">The type of key used to identify batches (e.g., string for organizationId)</typeparam>
public abstract class PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey>
    : PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey, object?>
    where TEntity : class
    where TBatchKey : IEquatable<TBatchKey>
{
    protected PlatformApplicationBatchScrollingBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler
    )
        : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }
}
