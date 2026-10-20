#region

using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;

/// <summary>
/// Query for getting task statistics demonstrating aggregate query patterns:
/// - Total counts with filters
/// - GroupBy aggregations (by status, priority)
/// - Multiple aggregate metrics in one query
/// - Completion rate calculation
/// - Time-based statistics (overdue, due today, due soon)
/// </summary>
public sealed class GetTaskStatisticsQuery : PlatformCqrsQuery<GetTaskStatisticsQueryResult>
{
    /// <summary>
    /// Optional filter by assignee
    /// </summary>
    public string? AssigneeId { get; set; }

    /// <summary>
    /// Include deleted tasks in statistics
    /// </summary>
    public bool IncludeDeleted { get; set; }
}

/// <summary>
/// Result containing comprehensive task statistics.
/// </summary>
public sealed class GetTaskStatisticsQueryResult
{
    #region Overall Counts

    /// <summary>
    /// Total number of tasks (respecting filters)
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Number of active tasks (not completed, cancelled, or deleted)
    /// </summary>
    public int ActiveCount { get; set; }

    /// <summary>
    /// Number of completed tasks
    /// </summary>
    public int CompletedCount { get; set; }

    /// <summary>
    /// Completion rate percentage (0-100)
    /// </summary>
    public decimal CompletionRate { get; set; }

    #endregion

    #region Time-Based Statistics

    /// <summary>
    /// Number of overdue tasks
    /// </summary>
    public int OverdueCount { get; set; }

    /// <summary>
    /// Number of tasks due today
    /// </summary>
    public int DueTodayCount { get; set; }

    /// <summary>
    /// Number of tasks due within 3 days
    /// </summary>
    public int DueSoonCount { get; set; }

    /// <summary>
    /// Number of tasks with no due date
    /// </summary>
    public int NoDueDateCount { get; set; }

    #endregion

    #region Grouped Statistics

    /// <summary>
    /// Task counts grouped by status
    /// </summary>
    public Dictionary<TaskItemStatus, int> CountsByStatus { get; set; } = [];

    /// <summary>
    /// Task counts grouped by priority
    /// </summary>
    public Dictionary<TaskItemPriority, int> CountsByPriority { get; set; } = [];

    /// <summary>
    /// Task counts grouped by assignee (assigneeId -> count)
    /// </summary>
    public Dictionary<string, int> CountsByAssignee { get; set; } = [];

    #endregion

    #region Trend Data

    /// <summary>
    /// Number of tasks created in the last 7 days
    /// </summary>
    public int CreatedLast7Days { get; set; }

    /// <summary>
    /// Number of tasks completed in the last 7 days
    /// </summary>
    public int CompletedLast7Days { get; set; }

    #endregion
}

internal sealed class GetTaskStatisticsQueryHandler
    : PlatformCqrsQueryApplicationHandler<GetTaskStatisticsQuery, GetTaskStatisticsQueryResult>
{
    private readonly ITextSnippetRootRepository<TaskItemEntity> taskRepository;

    public GetTaskStatisticsQueryHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        ITextSnippetRootRepository<TaskItemEntity> taskRepository)
        : base(requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider)
    {
        this.taskRepository = taskRepository;
    }

    protected override async Task<GetTaskStatisticsQueryResult> HandleAsync(
        GetTaskStatisticsQuery request,
        CancellationToken cancellationToken)
    {
        // STEP 1: Start all async tasks
        var totalCountTask = taskRepository.CountAsync(
            TaskItemEntity.FilterExpr(includeDeleted: request.IncludeDeleted)
                .AndAlsoIf(request.AssigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(request.AssigneeId!)),
            cancellationToken);
        var completionStatsTask = taskRepository.GetCompletionStatsAsync(request.AssigneeId, cancellationToken);
        var statusCountsTask = taskRepository.GetCountsByStatusAsync(request.AssigneeId, request.IncludeDeleted, cancellationToken);
        var priorityCountsTask = taskRepository.GetCountsByPriorityAsync(request.AssigneeId, request.IncludeDeleted, cancellationToken);
        var overdueCountTask = taskRepository.GetOverdueCountAsync(request.AssigneeId, cancellationToken);
        var dueTodayTasksTask = taskRepository.GetTasksDueTodayAsync(request.AssigneeId, cancellationToken);
        var dueSoonCountTask = taskRepository.CountAsync(
            TaskItemEntity.DueSoonExpr(3)
                .AndAlsoIf(request.AssigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(request.AssigneeId!)),
            cancellationToken);
        var noDueDateCountTask = taskRepository.CountAsync(
            query => query
                .WhereIf(!request.IncludeDeleted, t => !t.IsDeleted)
                .WhereIf(request.AssigneeId.IsNotNullOrEmpty(), t => t.AssigneeId == request.AssigneeId)
                .Where(t => t.DueDate == null)
                .Where(t => t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled),
            cancellationToken);
        var assigneeCountsTask = taskRepository.GetCountsByAssigneeAsync(!request.IncludeDeleted, cancellationToken);
        var createdLast7DaysTask = GetCreatedInPeriodCountAsync(7, request.AssigneeId, request.IncludeDeleted, cancellationToken);
        var completedLast7DaysTask = GetCompletedInPeriodCountAsync(7, request.AssigneeId, cancellationToken);

        // STEP 2: Await all tasks in parallel
        await Task.WhenAll(
            totalCountTask, completionStatsTask, statusCountsTask, priorityCountsTask,
            overdueCountTask, dueTodayTasksTask, dueSoonCountTask, noDueDateCountTask,
            assigneeCountsTask, createdLast7DaysTask, completedLast7DaysTask);

        // STEP 3: Extract results and build return value
        var statusCounts = await statusCountsTask;
        var (_, completedCount, completionRate) = await completionStatsTask;
        var dueTodayTasks = await dueTodayTasksTask;
        var activeCount = statusCounts.Where(kvp =>
                kvp.Key != TaskItemStatus.Completed && kvp.Key != TaskItemStatus.Cancelled)
            .Sum(kvp => kvp.Value);
        var dueTodayCount = dueTodayTasks.Count;

        return new GetTaskStatisticsQueryResult
        {
            TotalCount = await totalCountTask,
            ActiveCount = activeCount,
            CompletedCount = completedCount,
            CompletionRate = completionRate,
            OverdueCount = await overdueCountTask,
            DueTodayCount = dueTodayCount,
            DueSoonCount = await dueSoonCountTask,
            NoDueDateCount = await noDueDateCountTask,
            CountsByStatus = statusCounts,
            CountsByPriority = await priorityCountsTask,
            CountsByAssignee = await assigneeCountsTask,
            CreatedLast7Days = await createdLast7DaysTask,
            CompletedLast7Days = await completedLast7DaysTask
        };
    }

    private async Task<int> GetCreatedInPeriodCountAsync(
        int days,
        string? assigneeId,
        bool includeDeleted,
        CancellationToken cancellationToken)
    {
        var cutoffDate = Clock.UtcNow.AddDays(-days);

        return await taskRepository.CountAsync(
            query => query
                .WhereIf(!includeDeleted, t => !t.IsDeleted)
                .WhereIf(assigneeId.IsNotNullOrEmpty(), t => t.AssigneeId == assigneeId)
                .Where(t => t.CreatedDate >= cutoffDate),
            cancellationToken);
    }

    private async Task<int> GetCompletedInPeriodCountAsync(
        int days,
        string? assigneeId,
        CancellationToken cancellationToken)
    {
        var cutoffDate = Clock.UtcNow.AddDays(-days);

        return await taskRepository.CountAsync(
            query => query
                .Where(t => !t.IsDeleted)
                .WhereIf(assigneeId.IsNotNullOrEmpty(), t => t.AssigneeId == assigneeId)
                .Where(t => t.Status == TaskItemStatus.Completed)
                .Where(t => t.CompletedDate >= cutoffDate),
            cancellationToken);
    }
}
