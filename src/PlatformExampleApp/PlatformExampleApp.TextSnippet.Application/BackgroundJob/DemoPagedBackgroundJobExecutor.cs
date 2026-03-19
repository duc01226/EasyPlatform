#region

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
/// Demonstration of PlatformApplicationPagedBackgroundJobExecutor pattern.
/// 
/// This background job showcases the paged processing pattern by:
/// 1. Processing TextSnippetEntity records in sequential pages
/// 2. Using simple skip/take pagination for large datasets
/// 3. Demonstrating cleanup and maintenance operations
/// 4. Showing how to handle different processing modes
/// 
/// ## Key Features Demonstrated:
/// - **Paged Processing**: Handles large datasets through sequential page-based processing
/// - **Simple Pagination**: Uses skip/take approach instead of complex batch coordination
/// - **Configurable Processing**: Different modes for various maintenance tasks
/// - **Memory Efficiency**: Processes data in smaller chunks to avoid memory issues
/// - **Progress Tracking**: Framework automatically tracks progress through pages
/// 
/// ## Business Logic Examples:
/// - **Cleanup Mode**: Removes or archives old text snippets
/// - **Optimization Mode**: Updates and optimizes existing snippet data
/// - **Validation Mode**: Validates and fixes data integrity issues
/// 
/// ## When to Use Paged vs Batch Scrolling:
/// - **Use Paged**: Simple sequential processing, no need for parallel batches
/// - **Use Batch Scrolling**: Need parallel processing with logical grouping (e.g., by company)
/// 
/// ## Usage Example:
/// ```csharp
/// // Schedule manually with parameters
/// await backgroundJobScheduler.Schedule(
///     typeof(DemoPagedBackgroundJobExecutor),
///     new PlatformApplicationPagedBackgroundJobParam<DemoPagedParam>
///     {
///         Param = new DemoPagedParam 
///         { 
///             ProcessingMode = PagedProcessingMode.CleanupOld,
///             CleanupOlderThanDays = 90,
///             PageSize = 100
///         },
///         Skip = null, // null triggers master job execution
///         Take = null
///     },
///     DateTimeOffset.UtcNow.AddMinutes(5)
/// );
/// 
/// // Or let the recurring job handle it automatically
/// ```
/// 
/// ## Execution Flow:
/// 1. **Master Job** (Skip/Take = null): Calculates total items and schedules paged jobs
/// 2. **Paged Jobs** (Skip = 0, 100, 200...): Processes each page sequentially
/// 3. **Business Logic**: Applied to each page of entities in ProcessPagedAsync
/// 4. **Progress Tracking**: Framework automatically manages pagination state
/// </summary>
[PlatformRecurringJob("0 3 * * *")] // Runs daily at 3:00 AM UTC for demonstration
public sealed class DemoPagedBackgroundJobExecutor
    : PlatformApplicationPagedBackgroundJobExecutor<DemoPagedParam>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository;

    public DemoPagedBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetRepository
    ) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
        this.textSnippetRepository = textSnippetRepository;
    }

    /// <summary>
    /// Override the default page size for this job.
    /// This demonstrates how to customize the page size based on the job's requirements.
    /// </summary>
    protected override int PageSize => 50; // Process 50 entities per page by default

    /// <summary>
    /// Processes a single page of entities.
    /// 
    /// This method is called for each page and contains the core business logic.
    /// It demonstrates different processing modes and shows how to handle
    /// entities within a paged context.
    /// 
    /// The framework automatically manages the pagination state and ensures
    /// all pages are processed sequentially.
    /// </summary>
    /// <param name="skipCount">Number of entities to skip (page offset)</param>
    /// <param name="pageSize">Number of entities to process in this page</param>
    /// <param name="param">Processing parameters</param>
    /// <param name="serviceProvider">Scoped service provider for this page</param>
    /// <param name="uowManager">Unit of work manager for transaction handling</param>
    protected override async Task ProcessPagedAsync(
        int? skipCount,
        int? pageSize,
        DemoPagedParam? param,
        IServiceProvider serviceProvider,
        IPlatformUnitOfWorkManager uowManager)
    {
        var scopedRepository = serviceProvider.GetRequiredService<ITextSnippetRootRepository<TextSnippetEntity>>();

        // Build query based on processing mode
        var entities = await scopedRepository.GetAllAsync(query =>
        {
            var filteredQuery = BuildQueryForProcessingMode(query, param);

            // Apply pagination
            return filteredQuery
                .OrderBy(entity => entity.CreatedDate)
                .ThenBy(entity => entity.Id)
                .Skip(skipCount ?? 0)
                .Take(pageSize ?? param?.PageSize ?? int.MaxValue);
        });

        if (!entities.Any())
        {
            // No entities to process in this page
            return;
        }

        // Apply business logic based on processing mode
        await ProcessEntitiesForMode(entities, param, scopedRepository);
    }

    /// <summary>
    /// Calculates the total number of items to be processed.
    /// 
    /// This method is used by the framework to determine how many pages
    /// are needed and to schedule the appropriate number of paged jobs.
    /// 
    /// The count should match the same filtering logic used in ProcessPagedAsync
    /// to ensure accurate pagination.
    /// </summary>
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<DemoPagedParam> pagedParam)
    {
        var param = pagedParam?.Param ?? new DemoPagedParam();

        return await textSnippetRepository.CountAsync(query =>
            BuildQueryForProcessingMode(query, param));
    }

    /// <summary>
    /// Builds the query for entity selection based on processing mode.
    /// This ensures consistent filtering between counting and processing operations.
    /// </summary>
    private static IQueryable<TextSnippetEntity> BuildQueryForProcessingMode(
        IQueryable<TextSnippetEntity> query,
        DemoPagedParam? param)
    {
        var baseQuery = query.Where(entity => !string.IsNullOrEmpty(entity.SnippetText));

        return param?.ProcessingMode switch
        {
            PagedProcessingMode.CleanupOld => baseQuery.Where(entity =>
                entity.CreatedDate < Clock.UtcNow.AddDays(-param.CleanupOlderThanDays)),

            PagedProcessingMode.OptimizeData => baseQuery.Where(entity =>
                string.IsNullOrEmpty(entity.FullText) ||
                entity.FullText.Length < entity.SnippetText.Length),

            PagedProcessingMode.ValidateData => baseQuery.Where(entity =>
                entity.SnippetText.Length > param.MinTextLength),

            PagedProcessingMode.ArchiveProcessed => baseQuery.Where(entity =>
                !string.IsNullOrEmpty(entity.FullText) &&
                entity.FullText.Contains("[Processed]")),

            _ => baseQuery
        };
    }

    /// <summary>
    /// Applies business logic to entities based on the processing mode.
    /// This demonstrates different types of operations that can be performed
    /// in a paged background job context.
    /// </summary>
    private static async Task ProcessEntitiesForMode(
        List<TextSnippetEntity> entities,
        DemoPagedParam? param,
        ITextSnippetRootRepository<TextSnippetEntity> repository)
    {
        await entities.ParallelAsync(async entity =>
        {
            switch (param?.ProcessingMode)
            {
                case PagedProcessingMode.CleanupOld:
                    // Demonstrate cleanup: mark for deletion or soft delete
                    entity.FullText = $"{entity.FullText ?? ""} [MarkedForDeletion: {Clock.UtcNow:yyyy-MM-dd}]";
                    await repository.CreateOrUpdateAsync(entity);
                    break;

                case PagedProcessingMode.OptimizeData:
                    // Demonstrate optimization: ensure FullText is properly set
                    if (string.IsNullOrEmpty(entity.FullText))
                        entity.FullText = $"Optimized content: {entity.SnippetText} [Optimized: {Clock.UtcNow:yyyy-MM-dd HH:mm:ss}]";
                    await repository.CreateOrUpdateAsync(entity);
                    break;

                case PagedProcessingMode.ValidateData:
                    // Demonstrate validation: check and fix data integrity
                    var isValid = !string.IsNullOrWhiteSpace(entity.SnippetText) &&
                                  entity.SnippetText.Length >= param.MinTextLength;

                    if (!isValid)
                    {
                        entity.FullText = $"{entity.FullText ?? ""} [ValidationFailed: {Clock.UtcNow:yyyy-MM-dd}]";
                        await repository.CreateOrUpdateAsync(entity);
                    }

                    break;

                case PagedProcessingMode.ArchiveProcessed:
                    // Demonstrate archiving: move processed items to archive state
                    entity.FullText = $"{entity.FullText} [Archived: {Clock.UtcNow:yyyy-MM-dd HH:mm:ss}]";
                    await repository.CreateOrUpdateAsync(entity);
                    break;
            }

            // Add small delay to demonstrate controlled processing
            if (param?.ProcessingDelayMs > 0) await Task.Delay(param.ProcessingDelayMs);
        });
    }
}

/// <summary>
/// Parameter class for DemoPagedBackgroundJobExecutor.
/// Defines configuration options for paged processing behavior.
/// </summary>
public sealed class DemoPagedParam
{
    /// <summary>
    /// Determines what type of processing to apply to entities.
    /// </summary>
    public PagedProcessingMode ProcessingMode { get; set; } = PagedProcessingMode.OptimizeData;

    /// <summary>
    /// Number of entities to process per page.
    /// Can override the default page size from the executor.
    /// </summary>
    public int PageSize { get; set; } = 50;

    /// <summary>
    /// For CleanupOld mode: number of days after which entities are considered old.
    /// </summary>
    public int CleanupOlderThanDays { get; set; } = 90;

    /// <summary>
    /// For ValidateData mode: minimum required text length.
    /// </summary>
    public int MinTextLength { get; set; } = 5;

    /// <summary>
    /// Optional delay in milliseconds between processing each entity.
    /// Useful for controlling processing speed and system load.
    /// </summary>
    public int ProcessingDelayMs { get; set; } = 0;

    /// <summary>
    /// Optional filter text for additional entity filtering.
    /// </summary>
    public string? FilterText { get; set; }

    /// <summary>
    /// Whether to process entities in parallel within each page.
    /// </summary>
    public bool EnableParallelProcessing { get; set; } = false;
}

/// <summary>
/// Enumeration of processing modes for paged background job demonstration.
/// Shows different types of maintenance and optimization operations.
/// </summary>
public enum PagedProcessingMode
{
    /// <summary>
    /// Removes or marks old entities for deletion.
    /// </summary>
    CleanupOld = 1,

    /// <summary>
    /// Optimizes existing entity data (e.g., ensures FullText is populated).
    /// </summary>
    OptimizeData = 2,

    /// <summary>
    /// Validates entity data and marks invalid entries.
    /// </summary>
    ValidateData = 3,

    /// <summary>
    /// Archives entities that have been processed.
    /// </summary>
    ArchiveProcessed = 4
}
