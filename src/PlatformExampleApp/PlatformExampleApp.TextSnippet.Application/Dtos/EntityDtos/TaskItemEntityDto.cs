using Easy.Platform.Application.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;

/// <summary>
/// DTO for TaskItemEntity demonstrating platform patterns:
/// - PlatformEntityDto base class with type-safe mapping
/// - With* fluent methods for optional data loading
/// - MapToEntity with mode awareness (create vs update)
/// - SubTaskItemDto for hierarchical data representation
/// - Computed properties exposed as read-only
/// </summary>
public sealed class TaskItemEntityDto : PlatformEntityDto<TaskItemEntity, string>
{
    public TaskItemEntityDto() { }

    /// <summary>
    /// Constructor mapping from entity - maps core properties only.
    /// Use With* methods to populate optional/related data.
    /// </summary>
    public TaskItemEntityDto(TaskItemEntity entity)
    {
        Id = entity.Id;
        Title = entity.Title;
        Description = entity.Description;
        Status = entity.Status;
        Priority = entity.Priority;
        DueDate = entity.DueDate;
        StartDate = entity.StartDate;
        CompletedDate = entity.CompletedDate;
        AssigneeId = entity.AssigneeId;
        RelatedSnippetId = entity.RelatedSnippetId;
        Tags = entity.Tags;
        CreatedDate = entity.CreatedDate;
        LastUpdatedDate = entity.LastUpdatedDate;

        // Soft delete properties
        IsDeleted = entity.IsDeleted;
        DeletedDate = entity.DeletedDate;
        DeletedBy = entity.DeletedBy;

        // SubTasks - map to DTOs
        SubTasks = entity.SubTasks?.SelectList(s => new SubTaskItemDto(s)) ?? [];

        // Computed properties (read-only from entity)
        IsOverdue = entity.IsOverdue;
        DaysUntilDue = entity.DaysUntilDue;
        CompletionPercentage = entity.CompletionPercentage;
        IsDueSoon = entity.IsDueSoon;
        IsActive = entity.IsActive;
    }

    #region Core Properties

    public string? Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TaskItemStatus Status { get; set; } = TaskItemStatus.Todo;
    public TaskItemPriority Priority { get; set; } = TaskItemPriority.Medium;
    public DateTime? DueDate { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? CompletedDate { get; set; }
    public string? AssigneeId { get; set; }
    public string? RelatedSnippetId { get; set; }
    public List<string> Tags { get; set; } = [];
    public DateTime? CreatedDate { get; set; }
    public DateTime? LastUpdatedDate { get; set; }

    #endregion

    #region Soft Delete Properties

    /// <summary>
    /// Soft delete flag - indicates if task is deleted
    /// </summary>
    public bool IsDeleted { get; set; }

    /// <summary>
    /// When the task was soft deleted
    /// </summary>
    public DateTime? DeletedDate { get; set; }

    /// <summary>
    /// Who soft deleted the task
    /// </summary>
    public string? DeletedBy { get; set; }

    #endregion

    #region SubTasks (Hierarchical Data Pattern)

    /// <summary>
    /// List of subtasks - demonstrates hierarchical data with value object DTOs.
    /// SubTasks are value objects owned by the TaskItem entity.
    /// </summary>
    public List<SubTaskItemDto> SubTasks { get; set; } = [];

    #endregion

    #region Computed Properties (Read-Only from Entity)

    /// <summary>
    /// Computed: Task is past due date and not completed
    /// </summary>
    public bool IsOverdue { get; set; }

    /// <summary>
    /// Computed: Days until due date (negative if overdue)
    /// </summary>
    public int? DaysUntilDue { get; set; }

    /// <summary>
    /// Computed: Percentage of completed subtasks (0-100)
    /// </summary>
    public int CompletionPercentage { get; set; }

    /// <summary>
    /// Computed: Task is due within 3 days
    /// </summary>
    public bool IsDueSoon { get; set; }

    /// <summary>
    /// Computed: Task is active (not completed, cancelled, or deleted)
    /// </summary>
    public bool IsActive { get; set; }

    #endregion

    #region Optional Loaded Properties (Populated via With* Methods)

    /// <summary>
    /// Related snippet title - populated via WithRelatedSnippet()
    /// </summary>
    public string? RelatedSnippetTitle { get; set; }

    /// <summary>
    /// Related snippet preview - populated via WithRelatedSnippet()
    /// </summary>
    public string? RelatedSnippetPreview { get; set; }

    /// <summary>
    /// Assignee name - populated via WithAssigneeInfo()
    /// </summary>
    public string? AssigneeName { get; set; }

    /// <summary>
    /// Assignee email - populated via WithAssigneeInfo()
    /// </summary>
    public string? AssigneeEmail { get; set; }

    /// <summary>
    /// Created by user name - populated via WithCreatedByUser()
    /// </summary>
    public string? CreatedByUserName { get; set; }

    #endregion

    #region With* Fluent Methods (Platform Pattern)

    /// <summary>
    /// Populates related snippet data from TextSnippetEntity.
    /// Usage: new TaskItemEntityDto(entity).WithRelatedSnippet(snippetEntity)
    /// </summary>
    public TaskItemEntityDto WithRelatedSnippet(TextSnippetEntity? snippet)
    {
        if (snippet != null)
        {
            RelatedSnippetTitle = snippet.SnippetText;
            RelatedSnippetPreview = snippet.FullText?.TakeTop(100);
        }

        return this;
    }

    /// <summary>
    /// Populates related snippet data from dictionary lookup.
    /// Usage: new TaskItemEntityDto(entity).WithRelatedSnippetFromDict(snippetsDict)
    /// </summary>
    public TaskItemEntityDto WithRelatedSnippetFromDict(Dictionary<string, TextSnippetEntity>? snippetsDict)
    {
        if (snippetsDict != null && RelatedSnippetId.IsNotNullOrEmpty())
            WithRelatedSnippet(snippetsDict.GetValueOrDefault(RelatedSnippetId));
        return this;
    }

    /// <summary>
    /// Populates assignee information.
    /// Usage: new TaskItemEntityDto(entity).WithAssigneeInfo(name, email)
    /// </summary>
    public TaskItemEntityDto WithAssigneeInfo(string? name, string? email = null)
    {
        AssigneeName = name;
        AssigneeEmail = email;
        return this;
    }

    /// <summary>
    /// Populates assignee information from dictionary lookup.
    /// Usage: new TaskItemEntityDto(entity).WithAssigneeInfoFromDict(assigneesDict)
    /// </summary>
    public TaskItemEntityDto WithAssigneeInfoFromDict(Dictionary<string, (string Name, string? Email)>? assigneesDict)
    {
        if (assigneesDict != null && AssigneeId.IsNotNullOrEmpty())
        {
            var (name, email) = assigneesDict.GetValueOrDefault(AssigneeId);

            AssigneeName = name;
            AssigneeEmail = email;
        }

        return this;
    }

    /// <summary>
    /// Populates created by user name.
    /// Usage: new TaskItemEntityDto(entity).WithCreatedByUser(userName)
    /// </summary>
    public TaskItemEntityDto WithCreatedByUser(string? userName)
    {
        CreatedByUserName = userName;
        return this;
    }

    /// <summary>
    /// Conditional With method using WithIf pattern.
    /// Usage: dto.WithIf(includeSnippet, d => d.WithRelatedSnippet(snippet))
    /// </summary>
    public TaskItemEntityDto WithIf(bool condition, Func<TaskItemEntityDto, TaskItemEntityDto> action)
    {
        return condition ? action(this) : this;
    }

    #endregion

    #region Platform Overrides

    protected override object? GetSubmittedId()
    {
        return Id;
    }

    protected override TaskItemEntity MapToEntity(TaskItemEntity entity, MapToEntityModes mode)
    {
        entity.Title = Title;
        entity.Description = Description;
        entity.Priority = Priority;
        entity.DueDate = DueDate;
        entity.StartDate = StartDate;
        entity.AssigneeId = AssigneeId;
        entity.RelatedSnippetId = RelatedSnippetId;
        entity.Tags = Tags;

        // Map SubTasks from DTOs
        entity.SubTasks = SubTasks.SelectList(dto => dto.MapToValueObject());

        // Handle status changes with business logic
        if (mode == MapToEntityModes.MapToUpdateExistingEntity)
        {
            // Auto-set completed date when marking as completed
            if (Status == TaskItemStatus.Completed && entity.Status != TaskItemStatus.Completed)
                entity.CompletedDate = Clock.UtcNow;
            // Clear completed date if moving away from completed
            else if (Status != TaskItemStatus.Completed && entity.Status == TaskItemStatus.Completed)
                entity.CompletedDate = null;

            entity.Status = Status;
        }
        else
        {
            // For new entities, use provided status (default is Todo)
            entity.Status = Status;
        }

        return entity;
    }

    protected override string GenerateNewId()
    {
        return Ulid.NewUlid().ToString();
    }

    #endregion

    #region Static Factory Methods (Platform Pattern)

    /// <summary>
    /// Factory method to create DTO from entity with all related data.
    /// Usage: TaskItemEntityDto.FromEntityWithRelated(entity, snippet, assigneeName, assigneeEmail)
    /// </summary>
    public static TaskItemEntityDto FromEntityWithRelated(
        TaskItemEntity entity,
        TextSnippetEntity? relatedSnippet = null,
        string? assigneeName = null,
        string? assigneeEmail = null,
        string? createdByUserName = null)
    {
        return new TaskItemEntityDto(entity)
            .WithIf(relatedSnippet != null, dto => dto.WithRelatedSnippet(relatedSnippet))
            .WithIf(assigneeName.IsNotNullOrEmpty(), dto => dto.WithAssigneeInfo(assigneeName, assigneeEmail))
            .WithIf(createdByUserName.IsNotNullOrEmpty(), dto => dto.WithCreatedByUser(createdByUserName));
    }

    /// <summary>
    /// Factory method to create DTOs from entities list with batch-loaded related data.
    /// Usage: TaskItemEntityDto.FromEntitiesWithRelated(entities, snippetsDict, assigneesDict)
    /// </summary>
    public static List<TaskItemEntityDto> FromEntitiesWithRelated(
        List<TaskItemEntity> entities,
        Dictionary<string, TextSnippetEntity>? snippetsDict = null,
        Dictionary<string, (string Name, string? Email)>? assigneesDict = null,
        Dictionary<string, string>? userNamesDict = null)
    {
        return entities.SelectList(entity => new TaskItemEntityDto(entity)
            .WithRelatedSnippetFromDict(snippetsDict)
            .WithAssigneeInfoFromDict(assigneesDict)
            .WithIf(
                userNamesDict != null && entity.CreatedBy.IsNotNullOrEmpty(),
                dto => dto.WithCreatedByUser(userNamesDict!.GetValueOrDefault(entity.CreatedBy!))));
    }

    #endregion
}

/// <summary>
/// DTO for SubTaskItem value object.
/// Demonstrates value object DTO pattern with explicit mapping methods.
/// </summary>
public sealed class SubTaskItemDto
{
    public SubTaskItemDto() { }

    public SubTaskItemDto(SubTaskItem valueObject)
    {
        Id = valueObject.Id;
        Title = valueObject.Title;
        IsCompleted = valueObject.IsCompleted;
        Order = valueObject.Order;
        CompletedDate = valueObject.CompletedDate;
    }

    /// <summary>
    /// Unique identifier for the subtask (within parent task)
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Subtask title/description
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Whether subtask is completed
    /// </summary>
    public bool IsCompleted { get; set; }

    /// <summary>
    /// Display order within parent task
    /// </summary>
    public int Order { get; set; }

    /// <summary>
    /// When the subtask was completed
    /// </summary>
    public DateTime? CompletedDate { get; set; }

    /// <summary>
    /// Maps DTO back to SubTaskItem value object.
    /// Usage: dto.MapToValueObject()
    /// </summary>
    public SubTaskItem MapToValueObject()
    {
        return new SubTaskItem
        {
            Id = Id.IsNullOrEmpty() ? Ulid.NewUlid().ToString() : Id,
            Title = Title,
            IsCompleted = IsCompleted,
            Order = Order,
            CompletedDate = CompletedDate
        };
    }

    /// <summary>
    /// Factory method to create new SubTaskItemDto with generated ID.
    /// Usage: SubTaskItemDto.CreateNew("Task title", 0)
    /// </summary>
    public static SubTaskItemDto CreateNew(string title, int order)
    {
        return new SubTaskItemDto
        {
            Id = Ulid.NewUlid().ToString(),
            Title = title,
            IsCompleted = false,
            Order = order
        };
    }
}
