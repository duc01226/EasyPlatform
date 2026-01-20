#region

using System.Linq.Expressions;
using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Validators;
using Easy.Platform.Common.ValueObjects.Abstract;
using Easy.Platform.Domain.Entities;
using FluentValidation;

#endregion

namespace PlatformExampleApp.TextSnippet.Domain.Entities;

/// <summary>
/// TaskItem entity demonstrating:
/// - Hierarchical data with SubTasks (value object list)
/// - Date range validation patterns
/// - Time-based filtering (overdue, due soon)
/// - Soft delete with restore capability
/// - Cross-entity references (RelatedSnippetId)
/// - Computed properties with [ComputedEntityProperty]
/// - Static expressions with AndAlsoIf composition
/// </summary>
[TrackFieldUpdatedDomainEvent]
public class TaskItemEntity : RootAuditedEntity<TaskItemEntity, string, string>, IRowVersionEntity
{
    public const int TitleMaxLength = 200;
    public const int DescriptionMaxLength = 4000;
    public const int MaxSubTasksCount = 50;

    #region Core Properties

    /// <summary>
    /// Task title - required, searchable
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Task description - optional, searchable
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Current status of the task - tracks field updates for notifications
    /// </summary>
    [TrackFieldUpdatedDomainEvent]
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;

    /// <summary>
    /// Task priority level
    /// </summary>
    public TaskItemPriority Priority { get; set; } = TaskItemPriority.Medium;

    /// <summary>
    /// Planned start date
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Due date - used for overdue calculations
    /// </summary>
    public DateTime? DueDate { get; set; }

    /// <summary>
    /// Actual completion date - set when task is completed
    /// </summary>
    public DateTime? CompletedDate { get; set; }

    /// <summary>
    /// Assignee ID - tracks field updates for notifications
    /// </summary>
    [TrackFieldUpdatedDomainEvent]
    public string? AssigneeId { get; set; }

    /// <summary>
    /// Optional reference to related TextSnippet - demonstrates cross-entity relationships
    /// </summary>
    public string? RelatedSnippetId { get; set; }

    /// <summary>
    /// Navigation property to related snippet
    /// </summary>
    [JsonIgnore]
    public TextSnippetEntity? RelatedSnippet { get; set; }

    /// <summary>
    /// Estimated hours to complete
    /// </summary>
    public decimal? EstimatedHours { get; set; }

    /// <summary>
    /// Actual hours spent
    /// </summary>
    public decimal? ActualHours { get; set; }

    /// <summary>
    /// Tags for categorization - demonstrates List property
    /// </summary>
    public List<string> Tags { get; set; } = [];

    #endregion

    #region Soft Delete Properties

    /// <summary>
    /// Soft delete flag - task is marked deleted but not removed
    /// </summary>
    public bool IsDeleted { get; set; }

    /// <summary>
    /// Date when the task was soft deleted
    /// </summary>
    public DateTime? DeletedDate { get; set; }

    /// <summary>
    /// User who deleted the task
    /// </summary>
    public string? DeletedBy { get; set; }

    #endregion

    #region Hierarchical Data - SubTasks

    /// <summary>
    /// List of subtasks - demonstrates value object list pattern for hierarchical data.
    /// Using value objects instead of separate entity for simpler use cases.
    /// </summary>
    public List<SubTaskItem> SubTasks { get; set; } = [];

    #endregion

    #region Concurrency Control

    public string? ConcurrencyUpdateToken { get; set; }

    #endregion

    #region Computed Properties (Platform Pattern)

    /// <summary>
    /// Computed flag indicating if task is overdue.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsOverdue
    {
        get => DueDate.HasValue &&
               DueDate.Value.Date < Clock.UtcNow.Date &&
               Status != TaskItemStatus.Completed &&
               Status != TaskItemStatus.Cancelled &&
               !IsDeleted;
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed days until due date (negative if overdue).
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public int? DaysUntilDue
    {
        get => DueDate.HasValue ? (DueDate.Value.Date - Clock.UtcNow.Date).Days : null;
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed completion percentage based on subtasks.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public int CompletionPercentage
    {
        get
        {
            if (Status == TaskItemStatus.Completed) return 100;
            if (Status == TaskItemStatus.Cancelled) return 0;
            if (SubTasks.IsNullOrEmpty()) return Status == TaskItemStatus.InProgress ? 50 : 0;

            var completedCount = SubTasks.Count(st => st.IsCompleted);
            return (int)Math.Round(completedCount * 100.0 / SubTasks.Count);
        }
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed flag indicating if task is due soon (within 3 days).
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsDueSoon
    {
        get => DueDate.HasValue &&
               DueDate.Value.Date >= Clock.UtcNow.Date &&
               DueDate.Value.Date <= Clock.UtcNow.Date.AddDays(3) &&
               Status != TaskItemStatus.Completed &&
               Status != TaskItemStatus.Cancelled &&
               !IsDeleted;
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed display title with status indicator.
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public string DisplayTitle
    {
        get
        {
            var prefix = Status switch
            {
                TaskItemStatus.Completed => "[Done]",
                TaskItemStatus.Cancelled => "[Cancelled]",
                TaskItemStatus.InProgress => "[In Progress]",
                _ => ""
            };

            var overdueMarker = IsOverdue ? " [OVERDUE]" : "";
            return $"{prefix} {Title}{overdueMarker}".Trim();
        }
        set { } // Required empty setter for EF Core
    }

    /// <summary>
    /// Computed flag indicating if task is active (not completed, cancelled, or deleted).
    /// MUST have empty setter for EF Core compatibility.
    /// </summary>
    [ComputedEntityProperty]
    public bool IsActive
    {
        get => Status != TaskItemStatus.Completed &&
               Status != TaskItemStatus.Cancelled &&
               !IsDeleted;
        set { } // Required empty setter for EF Core
    }

    #endregion

    #region Static Expressions (Platform Pattern)

    /// <summary>
    /// Filter by status expression.
    /// Usage: repository.GetAllAsync(TaskItemEntity.ByStatusExpr(status))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByStatusExpr(TaskItemStatus status)
        => t => t.Status == status;

    /// <summary>
    /// Filter by multiple statuses using HashSet for performance.
    /// Usage: repository.GetAllAsync(TaskItemEntity.ByStatusesExpr(statuses))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByStatusesExpr(List<TaskItemStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return t => statusSet.Contains(t.Status);
    }

    /// <summary>
    /// Filter by priority expression.
    /// Usage: repository.GetAllAsync(TaskItemEntity.ByPriorityExpr(priority))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByPriorityExpr(TaskItemPriority priority)
        => t => t.Priority == priority;

    /// <summary>
    /// Filter by multiple priorities.
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByPrioritiesExpr(List<TaskItemPriority> priorities)
    {
        var prioritySet = priorities.ToHashSet();
        return t => prioritySet.Contains(t.Priority);
    }

    /// <summary>
    /// Overdue tasks expression - due date passed, not completed/cancelled, not deleted.
    /// Usage: repository.GetAllAsync(TaskItemEntity.OverdueExpr())
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> OverdueExpr()
        => t => t.DueDate != null &&
                t.DueDate.Value.Date < Clock.UtcNow.Date &&
                t.Status != TaskItemStatus.Completed &&
                t.Status != TaskItemStatus.Cancelled &&
                !t.IsDeleted;

    /// <summary>
    /// Due soon expression - due within specified days.
    /// Usage: repository.GetAllAsync(TaskItemEntity.DueSoonExpr(3))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> DueSoonExpr(int withinDays = 3)
    {
        var today = Clock.UtcNow.Date;

        var targetDate = today.AddDays(withinDays);

        return t => t.DueDate != null &&
                    t.DueDate.Value.Date >= today &&
                    t.DueDate.Value.Date <= targetDate &&
                    t.Status != TaskItemStatus.Completed &&
                    t.Status != TaskItemStatus.Cancelled &&
                    !t.IsDeleted;
    }

    /// <summary>
    /// Filter by assignee expression.
    /// Usage: repository.GetAllAsync(TaskItemEntity.ByAssigneeExpr(userId))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByAssigneeExpr(string assigneeId)
        => t => t.AssigneeId == assigneeId;

    /// <summary>
    /// Filter by related snippet expression.
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ByRelatedSnippetExpr(string snippetId)
        => t => t.RelatedSnippetId == snippetId;

    /// <summary>
    /// Not deleted expression - common filter.
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> NotDeletedExpr()
        => t => !t.IsDeleted;

    /// <summary>
    /// Active tasks expression - not completed, not cancelled, not deleted.
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> ActiveExpr()
        => t => t.Status != TaskItemStatus.Completed &&
                t.Status != TaskItemStatus.Cancelled &&
                !t.IsDeleted;

    /// <summary>
    /// Conditional composite filter expression using AndAlsoIf.
    /// Demonstrates the platform pattern for building complex filters.
    /// Usage: repository.GetAllAsync(TaskItemEntity.FilterExpr(statuses, priorities, assigneeId, overdueOnly))
    /// </summary>
    public static Expression<Func<TaskItemEntity, bool>> FilterExpr(
        List<TaskItemStatus>? statuses = null,
        List<TaskItemPriority>? priorities = null,
        string? assigneeId = null,
        bool overdueOnly = false,
        bool dueSoonOnly = false,
        bool includeDeleted = false)
    {
        return ((Expression<Func<TaskItemEntity, bool>>)(t => true))
            .AndAlsoIf(!includeDeleted, NotDeletedExpr)
            .AndAlsoIf(statuses?.Count > 0, () => ByStatusesExpr(statuses!))
            .AndAlsoIf(priorities?.Count > 0, () => ByPrioritiesExpr(priorities!))
            .AndAlsoIf(assigneeId.IsNotNullOrEmpty(), () => ByAssigneeExpr(assigneeId!))
            .AndAlsoIf(overdueOnly, OverdueExpr)
            .AndAlsoIf(dueSoonOnly, () => DueSoonExpr(3));
    }

    /// <summary>
    /// Full-text search columns for IPlatformFullTextSearchPersistenceService.
    /// </summary>
    public static Expression<Func<TaskItemEntity, object?>>[] DefaultFullTextSearchColumns()
        => [t => t.Title, t => t.Description];

    #endregion

    #region Instance Validation Methods (Platform Pattern)

    /// <summary>
    /// Validates date range - DueDate must be >= StartDate when both are set.
    /// Usage: task.ValidateDateRange().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TaskItemEntity> ValidateDateRange()
    {
        return this.Validate(
                _ => !StartDate.HasValue || !DueDate.HasValue || DueDate.Value >= StartDate.Value,
                "Due date must be on or after start date")
            .And(_ => !CompletedDate.HasValue || !StartDate.HasValue || CompletedDate.Value >= StartDate.Value,
                "Completed date must be on or after start date");
    }

    /// <summary>
    /// Validates if the task can be completed.
    /// Usage: task.ValidateCanComplete().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TaskItemEntity> ValidateCanComplete()
    {
        return this.Validate(_ => Status != TaskItemStatus.Completed, "Task is already completed")
            .And(_ => Status != TaskItemStatus.Cancelled, "Cannot complete a cancelled task")
            .And(_ => !IsDeleted, "Cannot complete a deleted task");
    }

    /// <summary>
    /// Validates if the task can be cancelled.
    /// Usage: task.ValidateCanCancel().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TaskItemEntity> ValidateCanCancel()
    {
        return this.Validate(_ => Status != TaskItemStatus.Cancelled, "Task is already cancelled")
            .And(_ => Status != TaskItemStatus.Completed, "Cannot cancel a completed task")
            .And(_ => !IsDeleted, "Cannot cancel a deleted task");
    }

    /// <summary>
    /// Validates if the task can be restored from soft delete.
    /// Usage: task.ValidateCanRestore().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TaskItemEntity> ValidateCanRestore()
    {
        return this.Validate(_ => IsDeleted, "Task is not deleted");
    }

    /// <summary>
    /// Validates if the task can be soft deleted.
    /// Usage: task.ValidateCanDelete().EnsureValid()
    /// </summary>
    public PlatformValidationResult<TaskItemEntity> ValidateCanDelete()
    {
        return this.Validate(_ => !IsDeleted, "Task is already deleted");
    }

    #endregion

    #region Entity Methods

    /// <summary>
    /// Mark task as completed with current timestamp.
    /// </summary>
    public TaskItemEntity MarkCompleted()
    {
        ValidateCanComplete().EnsureValid();
        Status = TaskItemStatus.Completed;
        CompletedDate = Clock.UtcNow;
        return this;
    }

    /// <summary>
    /// Mark task as cancelled.
    /// </summary>
    public TaskItemEntity MarkCancelled()
    {
        ValidateCanCancel().EnsureValid();
        Status = TaskItemStatus.Cancelled;
        return this;
    }

    /// <summary>
    /// Soft delete the task.
    /// </summary>
    public TaskItemEntity SoftDelete(string deletedByUserId)
    {
        ValidateCanDelete().EnsureValid();
        IsDeleted = true;
        DeletedDate = Clock.UtcNow;
        DeletedBy = deletedByUserId;
        return this;
    }

    /// <summary>
    /// Restore a soft-deleted task.
    /// </summary>
    public TaskItemEntity Restore()
    {
        ValidateCanRestore().EnsureValid();
        IsDeleted = false;
        DeletedDate = null;
        DeletedBy = null;
        return this;
    }

    /// <summary>
    /// Add a subtask to the list.
    /// </summary>
    public TaskItemEntity AddSubTask(string title)
    {
        var maxOrder = SubTasks.Any() ? SubTasks.Max(st => st.Order) : 0;

        SubTasks.Add(new SubTaskItem
        {
            Title = title,
            IsCompleted = false,
            Order = maxOrder + 1
        });

        return this;
    }

    /// <summary>
    /// Mark a subtask as completed by index.
    /// </summary>
    public TaskItemEntity CompleteSubTask(int index)
    {
        if (index >= 0 && index < SubTasks.Count)
        {
            SubTasks[index].IsCompleted = true;
        }

        return this;
    }

    #endregion

    #region Validators

    public static PlatformSingleValidator<TaskItemEntity, string> TitleValidator()
    {
        return new PlatformSingleValidator<TaskItemEntity, string>(
            t => t.Title,
            p => p.NotNull().NotEmpty().MaximumLength(TitleMaxLength));
    }

    public static PlatformSingleValidator<TaskItemEntity, string?> DescriptionValidator()
    {
        return new PlatformSingleValidator<TaskItemEntity, string?>(
            t => t.Description,
            p => p.MaximumLength(DescriptionMaxLength));
    }

    public override PlatformValidator<TaskItemEntity> GetValidator()
    {
        return PlatformValidator<TaskItemEntity>.Create(TitleValidator(), DescriptionValidator());
    }

    #endregion
}

#region Value Object - SubTaskItem

/// <summary>
/// SubTaskItem value object - demonstrates hierarchical data pattern using value objects.
/// Stored as JSON in the parent entity rather than separate table for simpler use cases.
/// </summary>
public class SubTaskItem : PlatformValueObject<SubTaskItem>
{
    /// <summary>
    /// Unique identifier for the subtask within the parent task.
    /// Generated using ULID for client-side generation capability.
    /// </summary>
    public string Id { get; set; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// Subtask title
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Whether the subtask is completed
    /// </summary>
    public bool IsCompleted { get; set; }

    /// <summary>
    /// Order for display/sorting
    /// </summary>
    public int Order { get; set; }

    /// <summary>
    /// When the subtask was completed (null if not completed)
    /// </summary>
    public DateTime? CompletedDate { get; set; }

    /// <summary>
    /// Optional notes for the subtask
    /// </summary>
    public string? Notes { get; set; }

    public static PlatformSingleValidator<SubTaskItem, string> TitleValidator()
    {
        return new PlatformSingleValidator<SubTaskItem, string>(
            st => st.Title,
            p => p.NotNull().NotEmpty().MaximumLength(200));
    }

    /// <summary>
    /// Validates the SubTaskItem using the TitleValidator.
    /// PlatformValueObject uses Validate() pattern instead of GetValidator().
    /// </summary>
    public override PlatformValidationResult<SubTaskItem> Validate()
    {
        return PlatformValidator<SubTaskItem>.Create(TitleValidator()).Validate(this);
    }
}

#endregion

#region Enums

/// <summary>
/// Task status enum - demonstrates workflow status pattern.
/// </summary>
public enum TaskItemStatus
{
    /// <summary>
    /// Task is created but not started
    /// </summary>
    Todo = 0,

    /// <summary>
    /// Task is being worked on
    /// </summary>
    InProgress = 1,

    /// <summary>
    /// Task is completed successfully
    /// </summary>
    Completed = 2,

    /// <summary>
    /// Task is cancelled and won't be completed
    /// </summary>
    Cancelled = 3
}

/// <summary>
/// Task priority enum - demonstrates priority filtering pattern.
/// </summary>
public enum TaskItemPriority
{
    /// <summary>
    /// Low priority - can be deferred
    /// </summary>
    Low = 0,

    /// <summary>
    /// Medium priority - normal work
    /// </summary>
    Medium = 1,

    /// <summary>
    /// High priority - should be addressed soon
    /// </summary>
    High = 2,

    /// <summary>
    /// Critical priority - urgent attention required
    /// </summary>
    Critical = 3
}

#endregion
