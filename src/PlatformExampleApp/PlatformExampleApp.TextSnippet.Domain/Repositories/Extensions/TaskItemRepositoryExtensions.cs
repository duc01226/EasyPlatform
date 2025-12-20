using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Exceptions.Extensions;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

/// <summary>
/// Repository extensions for TaskItemEntity demonstrating platform patterns:
/// - EnsureFound for single entity retrieval with validation
/// - EnsureFoundAllBy for batch retrieval with validation
/// - Aggregate queries with GroupBy
/// - Time-based filtering (overdue, due soon)
/// - Composite expression queries
/// </summary>
public static class TaskItemRepositoryExtensions
{
    #region Get Single with Validation (EnsureFound Pattern)

    /// <summary>
    /// Get task by ID with EnsureFound validation and optional related entity loading.
    /// Usage: repository.GetByIdValidatedAsync(id, ct, t => t.RelatedSnippet)
    /// </summary>
    public static async Task<TaskItemEntity> GetByIdValidatedAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string id,
        CancellationToken cancellationToken = default,
        params Expression<Func<TaskItemEntity, object?>>[] loadRelatedEntities)
    {
        return await repository
            .GetByIdAsync(id, cancellationToken, loadRelatedEntities)
            .EnsureFound($"Task not found: Id={id}");
    }

    /// <summary>
    /// Get task by ID including deleted ones (for restore operations).
    /// Usage: repository.GetByIdIncludingDeletedAsync(id, ct)
    /// </summary>
    public static async Task<TaskItemEntity> GetByIdIncludingDeletedAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string id,
        CancellationToken cancellationToken = default)
    {
        return await repository
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken)
            .EnsureFound($"Task not found: Id={id}");
    }

    #endregion

    #region Get Multiple with Validation (EnsureFoundAllBy Pattern)

    /// <summary>
    /// Get tasks by IDs with validation that all IDs are found.
    /// Usage: repository.GetByIdsValidatedAsync(ids, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetByIdsValidatedAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        return await repository
            .GetByIdsAsync(ids, cancellationToken)
            .EnsureFoundAllBy(t => t.Id, ids, notFoundIds => $"Tasks not found: {string.Join(", ", notFoundIds)}");
    }

    #endregion

    #region Time-Based Queries (Overdue, Due Soon)

    /// <summary>
    /// Get overdue tasks - due date passed, not completed/cancelled, not deleted.
    /// Usage: repository.GetOverdueTasksAsync(assigneeId, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetOverdueTasksAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TaskItemEntity.OverdueExpr()
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get tasks due soon (within specified days) - demonstrates time-based filtering.
    /// Usage: repository.GetTasksDueSoonAsync(days: 3, assigneeId, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetTasksDueSoonAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        int withinDays = 3,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TaskItemEntity.DueSoonExpr(withinDays)
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get tasks due today - combines overdue and due soon for urgent items.
    /// Usage: repository.GetTasksDueTodayAsync(assigneeId, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetTasksDueTodayAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var today = Clock.UtcNow.Date;

        var expr = ((Expression<Func<TaskItemEntity, bool>>)(t =>
                t.DueDate != null &&
                t.DueDate.Value.Date == today &&
                t.Status != TaskItemStatus.Completed &&
                t.Status != TaskItemStatus.Cancelled &&
                !t.IsDeleted))
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    #endregion

    #region Assignee Queries

    /// <summary>
    /// Get all tasks for a specific assignee.
    /// Usage: repository.GetByAssigneeAsync(assigneeId, includeCompleted, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetByAssigneeAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string assigneeId,
        bool includeCompleted = false,
        CancellationToken cancellationToken = default)
    {
        var expr = TaskItemEntity.ByAssigneeExpr(assigneeId)
            .AndAlso(TaskItemEntity.NotDeletedExpr())
            .AndAlsoIf(!includeCompleted, () => t =>
                t.Status != TaskItemStatus.Completed &&
                t.Status != TaskItemStatus.Cancelled);

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get unassigned tasks - demonstrates null checking pattern.
    /// Usage: repository.GetUnassignedTasksAsync(ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetUnassignedTasksAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        CancellationToken cancellationToken = default)
    {
        return await repository.GetAllAsync(
            t => t.AssigneeId == null &&
                 t.Status != TaskItemStatus.Completed &&
                 t.Status != TaskItemStatus.Cancelled &&
                 !t.IsDeleted,
            cancellationToken);
    }

    #endregion

    #region Aggregate Queries (GroupBy Pattern)

    /// <summary>
    /// Get task counts grouped by status - demonstrates aggregation pattern.
    /// Usage: repository.GetCountsByStatusAsync(assigneeId, ct)
    /// </summary>
    public static async Task<Dictionary<TaskItemStatus, int>> GetCountsByStatusAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        var counts = await repository.GetAllAsync(
            query => query
                .WhereIf(!includeDeleted, t => !t.IsDeleted)
                .WhereIf(assigneeId.IsNotNullOrEmpty(), t => t.AssigneeId == assigneeId)
                .GroupBy(t => t.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.Status, x => x.Count);
    }

    /// <summary>
    /// Get task counts grouped by priority - demonstrates priority aggregation.
    /// Usage: repository.GetCountsByPriorityAsync(assigneeId, ct)
    /// </summary>
    public static async Task<Dictionary<TaskItemPriority, int>> GetCountsByPriorityAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        var counts = await repository.GetAllAsync(
            query => query
                .WhereIf(!includeDeleted, t => !t.IsDeleted)
                .WhereIf(assigneeId.IsNotNullOrEmpty(), t => t.AssigneeId == assigneeId)
                .Where(t => t.Status != TaskItemStatus.Completed && t.Status != TaskItemStatus.Cancelled)
                .GroupBy(t => t.Priority)
                .Select(g => new { Priority = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.Priority, x => x.Count);
    }

    /// <summary>
    /// Get overdue count - demonstrates scalar aggregate with filter.
    /// Usage: repository.GetOverdueCountAsync(assigneeId, ct)
    /// </summary>
    public static async Task<int> GetOverdueCountAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = TaskItemEntity.OverdueExpr()
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        return await repository.CountAsync(expr, cancellationToken);
    }

    /// <summary>
    /// Get task counts grouped by assignee - demonstrates grouping by foreign key.
    /// Usage: repository.GetCountsByAssigneeAsync(ct)
    /// </summary>
    public static async Task<Dictionary<string, int>> GetCountsByAssigneeAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        bool activeOnly = true,
        CancellationToken cancellationToken = default)
    {
        var counts = await repository.GetAllAsync(
            query => query
                .Where(t => t.AssigneeId != null && !t.IsDeleted)
                .WhereIf(activeOnly, t =>
                    t.Status != TaskItemStatus.Completed &&
                    t.Status != TaskItemStatus.Cancelled)
                .GroupBy(t => t.AssigneeId!)
                .Select(g => new { AssigneeId = g.Key, Count = g.Count() }),
            cancellationToken);

        return counts.ToDictionary(x => x.AssigneeId, x => x.Count);
    }

    #endregion

    #region Related Snippet Queries

    /// <summary>
    /// Get tasks related to a specific snippet.
    /// Usage: repository.GetByRelatedSnippetAsync(snippetId, ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetByRelatedSnippetAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string snippetId,
        bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        var expr = TaskItemEntity.ByRelatedSnippetExpr(snippetId)
            .AndAlsoIf(!includeDeleted, TaskItemEntity.NotDeletedExpr);

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    #endregion

    #region Completion Statistics

    /// <summary>
    /// Get completion statistics - demonstrates multi-value aggregate.
    /// Returns: (TotalCount, CompletedCount, CompletionRate)
    /// </summary>
    public static async Task<(int TotalCount, int CompletedCount, decimal CompletionRate)> GetCompletionStatsAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var baseExpr = TaskItemEntity.NotDeletedExpr()
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        var (totalCount, completedCount) = await (
            repository.CountAsync(baseExpr, cancellationToken),
            repository.CountAsync(
                baseExpr.AndAlso(t => t.Status == TaskItemStatus.Completed),
                cancellationToken)
        );

        var completionRate = totalCount > 0
            ? Math.Round(completedCount * 100.0m / totalCount, 2)
            : 0m;

        return (totalCount, completedCount, completionRate);
    }

    #endregion

    #region Soft Delete Queries

    /// <summary>
    /// Get deleted tasks for potential restore.
    /// Usage: repository.GetDeletedTasksAsync(ct)
    /// </summary>
    public static async Task<List<TaskItemEntity>> GetDeletedTasksAsync(
        this ITextSnippetRootRepository<TaskItemEntity> repository,
        string? assigneeId = null,
        CancellationToken cancellationToken = default)
    {
        var expr = ((Expression<Func<TaskItemEntity, bool>>)(t => t.IsDeleted))
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => TaskItemEntity.ByAssigneeExpr(assigneeId!));

        return await repository.GetAllAsync(expr, cancellationToken);
    }

    #endregion
}
