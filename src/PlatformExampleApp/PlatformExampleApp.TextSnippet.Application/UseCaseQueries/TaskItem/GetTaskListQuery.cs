#region

using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Persistence.Services;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;

/// <summary>
/// Query for listing TaskItems with filtering and pagination.
/// Demonstrates platform patterns:
/// - Multiple filter parameters
/// - GetQueryBuilder pattern with WhereIf and PipeIf
/// - Parallel tuple await for count + data
/// - Full-text search integration
/// - Time-based filtering (overdue, due soon)
/// </summary>
public sealed class GetTaskListQuery : PlatformCqrsPagedQuery<GetTaskListQueryResult, TaskItemEntityDto>
{
    /// <summary>
    /// Filter by status(es) - supports multiple statuses
    /// </summary>
    public List<TaskItemStatus> Statuses { get; set; } = [];

    /// <summary>
    /// Filter by priority(ies)
    /// </summary>
    public List<TaskItemPriority> Priorities { get; set; } = [];

    /// <summary>
    /// Filter by assignee ID
    /// </summary>
    public string? AssigneeId { get; set; }

    /// <summary>
    /// Full-text search on title and description
    /// </summary>
    public string? SearchText { get; set; }

    /// <summary>
    /// Filter to only overdue tasks
    /// </summary>
    public bool OverdueOnly { get; set; }

    /// <summary>
    /// Filter to tasks due within specified days (default 3)
    /// </summary>
    public bool DueSoonOnly { get; set; }

    /// <summary>
    /// Number of days for "due soon" filter
    /// </summary>
    public int DueSoonDays { get; set; } = 3;

    /// <summary>
    /// Filter by related snippet ID
    /// </summary>
    public string? RelatedSnippetId { get; set; }

    /// <summary>
    /// Include soft-deleted tasks
    /// </summary>
    public bool IncludeDeleted { get; set; }

    /// <summary>
    /// Filter by tag
    /// </summary>
    public string? Tag { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => DueSoonDays > 0 && DueSoonDays <= 30, "DueSoonDays must be between 1 and 30");
    }
}

/// <summary>
/// Result for GetTaskListQuery with additional summary statistics.
/// </summary>
public sealed class GetTaskListQueryResult : PlatformCqrsQueryPagedResult<TaskItemEntityDto>
{
    public GetTaskListQueryResult() { }

    public GetTaskListQueryResult(
        List<TaskItemEntityDto> items,
        long totalCount,
        IPlatformPagedRequest pagedRequest) : base(items, totalCount, pagedRequest)
    {
    }

    /// <summary>
    /// Summary counts by status (from filtered set)
    /// </summary>
    public Dictionary<TaskItemStatus, int> StatusCounts { get; set; } = [];

    /// <summary>
    /// Count of overdue tasks (from filtered set)
    /// </summary>
    public int OverdueCount { get; set; }
}

internal sealed class GetTaskListQueryHandler
    : PlatformCqrsQueryApplicationHandler<GetTaskListQuery, GetTaskListQueryResult>
{
    private readonly ITextSnippetRootRepository<TaskItemEntity> taskRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;
    private readonly IPlatformFullTextSearchPersistenceService fullTextSearchService;

    public GetTaskListQueryHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        ITextSnippetRootRepository<TaskItemEntity> taskRepository,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository,
        IPlatformFullTextSearchPersistenceService fullTextSearchService)
        : base(requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider)
    {
        this.taskRepository = taskRepository;
        this.snippetRepository = snippetRepository;
        this.fullTextSearchService = fullTextSearchService;
    }

    protected override async Task<GetTaskListQueryResult> HandleAsync(
        GetTaskListQuery request,
        CancellationToken cancellationToken)
    {
        // STEP 1: Build base query with all filters using GetQueryBuilder
        var baseQueryBuilder = taskRepository.GetQueryBuilder(
            builderFn: query => query
                // Apply entity filter expression with AndAlsoIf composition
                .Where(TaskItemEntity.FilterExpr(
                    request.Statuses,
                    request.Priorities,
                    request.AssigneeId,
                    request.OverdueOnly,
                    request.DueSoonOnly && !request.OverdueOnly, // Don't apply both
                    request.IncludeDeleted))
                // Full-text search with PipeIf
                .PipeIf(
                    request.SearchText.IsNotNullOrEmpty(),
                    q => fullTextSearchService.Search(
                        q,
                        request.SearchText!,
                        TaskItemEntity.DefaultFullTextSearchColumns(),
                        fullTextAccurateMatch: true,
                        includeStartWithProps: [t => t.Title]))
                // Tag filter
                .WhereIf(
                    request.Tag.IsNotNullOrEmpty(),
                    t => t.Tags.Contains(request.Tag!))
                // Related snippet filter
                .WhereIf(
                    request.RelatedSnippetId.IsNotNullOrEmpty(),
                    t => t.RelatedSnippetId == request.RelatedSnippetId)
                // Due soon with custom days
                .PipeIf(
                    request.DueSoonOnly && request.DueSoonDays != 3,
                    q => q.Where(TaskItemEntity.DueSoonExpr(request.DueSoonDays))));

        // STEP 2: Execute parallel queries for paged data, total count, and aggregates
        var (pagedEntities, totalCount, statusCounts, overdueCount) = await (
            // Paged entities with ordering
            taskRepository.GetAllAsync(
                query => baseQueryBuilder(query)
                    .OrderBy(t => t.Status)
                    .ThenByDescending(t => t.Priority)
                    .ThenBy(t => t.DueDate ?? DateTime.MaxValue)
                    .ThenByDescending(t => t.CreatedDate)
                    .PageBy(request.SkipCount, request.MaxResultCount),
                cancellationToken,
                t => t.RelatedSnippet),
            // Total count
            taskRepository.CountAsync(baseQueryBuilder, cancellationToken),
            // Status counts for summary
            taskRepository.GetAllAsync(
                query => baseQueryBuilder(query)
                    .GroupBy(t => t.Status)
                    .Select(g => new { Status = g.Key, Count = g.Count() }),
                cancellationToken),
            // Overdue count
            taskRepository.CountAsync(
                query => baseQueryBuilder(query)
                    .Where(TaskItemEntity.OverdueExpr()),
                cancellationToken));

        // STEP 3: Load related snippets for response (if not already loaded via navigation)
        var snippetIds = pagedEntities
            .Where(t => t.RelatedSnippetId.IsNotNullOrEmpty() && t.RelatedSnippet == null)
            .Select(t => t.RelatedSnippetId!)
            .Distinct()
            .ToList();

        var snippetsDict = snippetIds.IsNullOrEmpty()
            ? []
            : (await snippetRepository.GetByIdsAsync(snippetIds, cancellationToken))
                .ToDictionary(s => s.Id);

        // STEP 4: Build and return result with DTOs
        var dtos = pagedEntities.SelectList(entity =>
            new TaskItemEntityDto(entity)
                .WithRelatedSnippet(entity.RelatedSnippet ?? snippetsDict.GetValueOrDefault(entity.RelatedSnippetId ?? "")));

        return new GetTaskListQueryResult(dtos, totalCount, request)
        {
            StatusCounts = statusCounts.ToDictionary(x => x.Status, x => x.Count),
            OverdueCount = overdueCount
        };
    }
}
