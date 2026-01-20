#region

using System.Linq.Expressions;
using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.BackgroundJob;

/// <summary>
/// Demonstration of PlatformApplicationBatchScrollingBackgroundJobExecutor pattern.
/// 
/// This background job showcases the batch scrolling pattern by:
/// 1. Splitting TextSnippetEntity processing by batch keys (first letter of SnippetText)
/// 2. Using two-level pagination: batch discovery + scrolling within each batch
/// 3. Processing entities in parallel batches for better performance and error isolation
/// 4. Demonstrating proper repository patterns and entity querying
/// 
/// ## Key Features Demonstrated:
/// - **Batch Processing**: Entities grouped by logical key (first letter) for parallel execution
/// - **Two-Level Pagination**: Master job discovers batches, individual jobs process batch content
/// - **Error Isolation**: One batch failure doesn't affect other batches
/// - **Scalability**: Can handle large datasets through efficient pagination
/// - **Repository Integration**: Uses service-specific repository patterns
/// - **Related Entity Loading**: Demonstrates how to include related entities
/// 
/// ## Business Logic Example:
/// Updates FullText property of text snippets by appending processing information,
/// demonstrating how to apply business logic within the batch processing pattern.
/// 
/// ## Usage Example:
/// ```csharp
/// // Schedule manually with parameters
/// await backgroundJobScheduler.Schedule(
///     typeof(DemoBatchScrollingBackgroundJobExecutor),
///     new PlatformBatchScrollingJobParam<string, DemoBatchScrollingParam>
///     {
///         Param = new DemoBatchScrollingParam 
///         { 
///             ProcessingMode = BatchProcessingMode.UpdateFullText,
///             MaxItemsPerBatch = 50
///         },
///         BatchKey = null // null triggers master job execution
///     },
///     DateTimeOffset.UtcNow.AddMinutes(1)
/// );
/// 
/// // Or let the recurring job handle it automatically
/// ```
/// 
/// ## Execution Flow:
/// 1. **Master Job** (BatchKey = null): Discovers all batch keys (A, B, C, etc.)
/// 2. **Batch Jobs** (BatchKey = "A"): Processes all snippets starting with "A"
/// 3. **Scrolling Pagination**: Each batch uses scrolling to handle large result sets
/// 4. **Business Logic**: Applied to each entity within ProcessEntitiesAsync
/// </summary>
[PlatformRecurringJob("0 2 * * *")] // Runs daily at 2:00 AM UTC for demonstration
public sealed class DemoBatchScrollingBackgroundJobExecutor
    : PlatformApplicationBatchScrollingBackgroundJobExecutor<TextSnippetEntity, string, DemoBatchScrollingParam>
{
    public DemoBatchScrollingBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler
    ) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }

    /// <summary>
    /// Optional: Override batch key page size for batch discovery.
    /// Controls how many batch keys are processed per page during batch discovery.
    /// </summary>
    protected override int BatchKeyPageSize => 50; // Process 50 batch keys per page

    /// <summary>
    /// Optional: Override batch page size for entity processing within each batch.
    /// Controls how many entities are processed per page within each batch.
    /// </summary>
    protected override int BatchPageSize => 25; // Process 25 entities per page within each batch

    /// <summary>
    /// Repository access pattern for TextSnippetEntity.
    /// Uses the service-specific repository to execute queries with proper scoping.
    /// </summary>
    protected override Task<List<TSelector>> GetAllEntitiesAsync<TSelector>(
        IServiceProvider serviceProvider,
        Func<IQueryable<TextSnippetEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TextSnippetEntity, object?>>[] loadRelatedEntities)
    {
        return serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>()
            .GetAllAsync(
                queryBuilder,
                cancellationToken,
                loadRelatedEntities);
    }

    /// <summary>
    /// Count entities for pagination calculations.
    /// Used by the framework to determine total pages and batch sizes.
    /// </summary>
    protected override Task<int> CountEntitiesAsync<TQueryItemResult>(
        IServiceProvider serviceProvider,
        Func<IQueryable<TextSnippetEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>()
            .CountAsync(queryBuilder, cancellationToken);
    }

    /// <summary>
    /// Builds the main query for entities that need processing.
    /// 
    /// This method defines which TextSnippetEntity records should be processed:
    /// - Filters by processing mode from parameters
    /// - Optionally filters by batch key (first letter of SnippetText)
    /// - Applies business rules for entity selection
    /// 
    /// The batchKey parameter enables the two-level pagination:
    /// - When null: Used for batch key discovery (finds all relevant entities)
    /// - When set: Used for processing specific batch (entities starting with that letter)
    /// </summary>
    protected override IQueryable<TextSnippetEntity> EntitiesQueryBuilder(
        IQueryable<TextSnippetEntity> query,
        DemoBatchScrollingParam? param,
        string? batchKey = null)
    {
        var baseQuery = query.Where(entity => !string.IsNullOrEmpty(entity.SnippetText));

        // Apply parameter-based filtering
        if (param?.ProcessingMode == BatchProcessingMode.UpdateFullText)
        {
            // Only process entities that haven't been updated recently
            baseQuery = baseQuery.Where(entity =>
                string.IsNullOrEmpty(entity.FullText) ||
                !entity.FullText.Contains("[BatchProcessed]"));
        }
        else if (param?.ProcessingMode == BatchProcessingMode.CleanupOld)
        {
            // Process old entities for cleanup
            var cutoffDate = Clock.UtcNow.AddDays(-param.CleanupOlderThanDays);

            baseQuery = baseQuery.Where(entity => entity.CreatedDate < cutoffDate);
        }

        // Apply batch key filtering for specific batch processing
        // This is the key to batch scrolling: each batch processes only entities with specific first letter
        if (batchKey != null)
        {
            baseQuery = baseQuery.Where(entity =>
                entity.SnippetText != null &&
                entity.SnippetText.ToUpper().StartsWith(batchKey.ToUpper()));
        }

        return baseQuery.OrderBy(entity => entity.Id);
    }

    /// <summary>
    /// Discovers all batch keys for parallel processing.
    /// 
    /// This method extracts unique first letters from SnippetText to create batches.
    /// Each unique letter becomes a batch key, enabling parallel processing of entities
    /// grouped by their first letter (A, B, C, etc.).
    /// 
    /// The framework will schedule separate background jobs for each batch key.
    /// </summary>
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<TextSnippetEntity> query,
        DemoBatchScrollingParam? param,
        string? batchKey = null)
    {
        return EntitiesQueryBuilder(query, param, batchKey)
            .Where(entity => !string.IsNullOrEmpty(entity.SnippetText))
            .Select(entity => entity.SnippetText!.Substring(0, 1).ToUpper())
            .Distinct();
    }

    /// <summary>
    /// Processes a list of entities within a specific batch.
    /// 
    /// This is where the actual business logic is applied to entities.
    /// All entities in the list belong to the same batch (same first letter)
    /// and are processed according to the specified parameters.
    /// 
    /// The method demonstrates:
    /// - Business logic application based on parameters
    /// - Entity updates with proper change tracking
    /// - Parallel processing within the batch (with controlled concurrency)
    /// - Repository save operations
    /// </summary>
    protected override async Task ProcessEntitiesAsync(
        List<TextSnippetEntity> entities,
        string batchKey,
        DemoBatchScrollingParam? param,
        IServiceProvider serviceProvider)
    {
        var repository = serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();

        await entities.ParallelAsync(
            async entity =>
            {
                switch (param?.ProcessingMode)
                {
                    case BatchProcessingMode.UpdateFullText:
                        // Demonstrate business logic: update FullText with processing info
                        entity.FullText = $"{entity.FullText ?? ""} [BatchProcessed: {batchKey} at {Clock.UtcNow:yyyy-MM-dd HH:mm:ss}]";
                        break;

                    case BatchProcessingMode.CleanupOld:
                        // Demonstrate cleanup logic: mark for deletion or update
                        entity.FullText = $"{entity.FullText ?? ""} [MarkedForCleanup: {Clock.UtcNow:yyyy-MM-dd}]";
                        break;
                }

                // Save the updated entity
                await repository.CreateOrUpdateAsync(entity);
            },
            param?.MaxItemsPerBatch > 0 ? Math.Min(param.MaxItemsPerBatch, 10) : 5);
    }

    /// <summary>
    /// Specifies related entities to load for processing.
    /// In this demo, TextSnippetEntity doesn't have navigation properties,
    /// but this shows how to include related entities when needed.
    /// </summary>
    protected override Expression<Func<TextSnippetEntity, object?>>[] EntitiesQueryLoadRelatedEntities()
    {
        // TextSnippetEntity doesn't have navigation properties in this demo,
        // but this demonstrates the pattern for including related entities
        return [];
    }
}

/// <summary>
/// Parameter class for DemoBatchScrollingBackgroundJobExecutor.
/// Defines configuration options for batch processing behavior.
/// </summary>
public sealed class DemoBatchScrollingParam
{
    /// <summary>
    /// Determines what type of processing to apply to entities.
    /// </summary>
    public BatchProcessingMode ProcessingMode { get; set; } = BatchProcessingMode.UpdateFullText;

    /// <summary>
    /// Maximum number of items to process per batch concurrently.
    /// Controls parallel processing within each batch to prevent resource exhaustion.
    /// </summary>
    public int MaxItemsPerBatch { get; set; } = 5;

    /// <summary>
    /// For CleanupOld mode: number of days after which entities are considered old.
    /// </summary>
    public int CleanupOlderThanDays { get; set; } = 30;

    /// <summary>
    /// Optional filter text for additional entity filtering.
    /// </summary>
    public string? FilterText { get; set; }
}

/// <summary>
/// Enumeration of processing modes for demonstration purposes.
/// Shows how parameters can control business logic behavior.
/// </summary>
public enum BatchProcessingMode
{
    /// <summary>
    /// Updates the FullText property with processing information.
    /// </summary>
    UpdateFullText = 1,

    /// <summary>
    /// Marks old entities for cleanup or deletion.
    /// </summary>
    CleanupOld = 2
}
