#region

using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.Exceptions.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Dtos.EntityDtos;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;
using PlatformExampleApp.TextSnippet.Domain.Repositories.Extensions;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.TaskItem;

/// <summary>
/// Command for saving a TaskItem entity demonstrating platform patterns:
/// - Date range validation (DueDate >= StartDate)
/// - Cross-entity validation (RelatedSnippetId exists)
/// - Soft delete restore operation
/// - SubTasks list handling (hierarchical data)
/// - Create vs Update detection via GetSubmittedId
/// </summary>
public sealed class SaveTaskItemCommand : PlatformCqrsCommand<SaveTaskItemCommandResult>
{
    /// <summary>
    /// Task data to save
    /// </summary>
    public TaskItemEntityDto Task { get; set; } = null!;

    /// <summary>
    /// Whether to restore a soft-deleted task (only for update mode)
    /// </summary>
    public bool RestoreDeleted { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Task != null, "Task data is required")
            .And(_ => Task.Title.IsNotNullOrEmpty(), "Task title is required")
            .And(_ => Task.Title.Length <= TaskItemEntity.TitleMaxLength, $"Title must not exceed {TaskItemEntity.TitleMaxLength} characters")
            .And(
                _ => Task.Description.IsNullOrEmpty() || Task.Description!.Length <= TaskItemEntity.DescriptionMaxLength,
                $"Description must not exceed {TaskItemEntity.DescriptionMaxLength} characters")
            // Date range validation: StartDate must be before or equal to DueDate
            .And(
                _ => !Task.StartDate.HasValue || !Task.DueDate.HasValue || Task.StartDate.Value <= Task.DueDate.Value,
                "Start date must be before or equal to due date")
            // SubTasks validation
            .And(
                _ => Task.SubTasks.Count <= TaskItemEntity.MaxSubTasksCount,
                $"Cannot have more than {TaskItemEntity.MaxSubTasksCount} subtasks")
            .And(
                _ => Task.SubTasks.All(st => st.Title.IsNotNullOrEmpty()),
                "All subtasks must have a title");
    }
}

/// <summary>
/// Result of SaveTaskItemCommand
/// </summary>
public sealed class SaveTaskItemCommandResult : PlatformCqrsCommandResult
{
    public TaskItemEntityDto SavedTask { get; set; } = null!;

    /// <summary>
    /// Whether the task was restored from soft-deleted state
    /// </summary>
    public bool WasRestored { get; set; }

    /// <summary>
    /// Whether the task was newly created
    /// </summary>
    public bool WasCreated { get; set; }
}

internal sealed class SaveTaskItemCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveTaskItemCommand, SaveTaskItemCommandResult>
{
    private readonly ITextSnippetRootRepository<TaskItemEntity> taskRepository;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> snippetRepository;

    public SaveTaskItemCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TaskItemEntity> taskRepository,
        ITextSnippetRootRepository<TextSnippetEntity> snippetRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.taskRepository = taskRepository;
        this.snippetRepository = snippetRepository;
    }

    /// <summary>
    /// Async validation demonstrating:
    /// - Cross-entity validation (RelatedSnippetId exists)
    /// - Conditional validation based on request mode
    /// - Soft delete restore validation
    /// </summary>
    protected override async Task<PlatformValidationResult<SaveTaskItemCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveTaskItemCommand> requestSelfValidation,
        CancellationToken cancellationToken)
    {
        return await requestSelfValidation
            // Validate RelatedSnippetId exists (if specified)
            .AndAsync(
                async request => request.Task.RelatedSnippetId.IsNullOrEmpty() ||
                                 await snippetRepository.AnyAsync(
                                     s => s.Id == request.Task.RelatedSnippetId && !s.IsDeleted,
                                     cancellationToken),
                "Related snippet not found or has been deleted")
            // Validate task exists when updating
            .AndAsync(
                async request => request.Task.NotHasSubmitId() ||
                                 await taskRepository.AnyAsync(t => t.Id == request.Task.Id, cancellationToken),
                "Task not found")
            // Validate can restore (only deleted tasks can be restored)
            .AndAsync(
                async request =>
                {
                    if (!request.RestoreDeleted || request.Task.NotHasSubmitId()) return true;
                    var task = await taskRepository.FirstOrDefaultAsync(t => t.Id == request.Task.Id, cancellationToken);
                    return task?.IsDeleted == true;
                },
                "Can only restore a deleted task");
    }

    protected override async Task<SaveTaskItemCommandResult> HandleAsync(
        SaveTaskItemCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Determine operation mode
        var isCreate = request.Task.NotHasSubmitId();

        // Step 2: Get or create task entity
        var (task, wasRestored) = isCreate
            ? (request.Task.MapToNewEntity()
                .With(t => t.CreatedBy = RequestContext.UserId())
                .With(t => t.CreatedDate = Clock.UtcNow), false)
            : await GetExistingTaskWithRestoreAsync();

        async Task<(TaskItemEntity task, bool wasRestored)> GetExistingTaskWithRestoreAsync()
        {
            var existingTask = await taskRepository.GetByIdIncludingDeletedAsync(request.Task.Id!, cancellationToken);
            var restored = false;

            if (request.RestoreDeleted && existingTask.IsDeleted)
            {
                existingTask.ValidateCanRestore().EnsureValid();
                existingTask.Restore();
                restored = true;
            }

            request.Task.UpdateToEntity(existingTask);
            existingTask.LastUpdatedBy = RequestContext.UserId();
            existingTask.LastUpdatedDate = Clock.UtcNow;
            return (existingTask, restored);
        }

        // Step 3: Validate entity business rules
        task.ValidateDateRange().EnsureValid();
        if (request.Task.Status == TaskItemStatus.Completed)
            task.ValidateCanComplete().EnsureValid();

        // Step 4: Save task
        var savedTask = await taskRepository.CreateOrUpdateAsync(task, cancellationToken: cancellationToken);

        // Step 5: Load related data for response
        var relatedSnippet = savedTask.RelatedSnippetId.IsNotNullOrEmpty()
            ? await snippetRepository.GetByIdAsync(savedTask.RelatedSnippetId!, cancellationToken)
            : null;

        return new SaveTaskItemCommandResult
        {
            SavedTask = TaskItemEntityDto.FromEntityWithRelated(
                savedTask,
                relatedSnippet),
            WasRestored = wasRestored,
            WasCreated = isCreate
        };
    }
}

/// <summary>
/// Command for soft deleting a TaskItem.
/// Demonstrates soft delete pattern with validation.
/// </summary>
public sealed class DeleteTaskItemCommand : PlatformCqrsCommand<DeleteTaskItemCommandResult>
{
    /// <summary>
    /// ID of the task to delete
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Whether to permanently delete (hard delete) vs soft delete
    /// </summary>
    public bool PermanentDelete { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => TaskId.IsNotNullOrEmpty(), "Task ID is required");
    }
}

public sealed class DeleteTaskItemCommandResult : PlatformCqrsCommandResult
{
    /// <summary>
    /// Whether the task was soft deleted (vs hard deleted)
    /// </summary>
    public bool WasSoftDeleted { get; set; }
}

internal sealed class DeleteTaskItemCommandHandler
    : PlatformCqrsCommandApplicationHandler<DeleteTaskItemCommand, DeleteTaskItemCommandResult>
{
    private readonly ITextSnippetRootRepository<TaskItemEntity> taskRepository;

    public DeleteTaskItemCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITextSnippetRootRepository<TaskItemEntity> taskRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.taskRepository = taskRepository;
    }

    protected override async Task<DeleteTaskItemCommandResult> HandleAsync(
        DeleteTaskItemCommand request,
        CancellationToken cancellationToken)
    {
        // Step 1: Get task (including deleted for hard delete)
        var task = await taskRepository.GetByIdIncludingDeletedAsync(request.TaskId, cancellationToken);

        // Step 2: Handle delete type
        if (request.PermanentDelete)
        {
            // Hard delete
            await taskRepository.DeleteAsync(task, cancellationToken: cancellationToken);
            return new DeleteTaskItemCommandResult { WasSoftDeleted = false };
        }

        // Step 3: Soft delete
        task.ValidateCanDelete().EnsureValid();
        task.SoftDelete(RequestContext.UserId());

        await taskRepository.UpdateAsync(task, cancellationToken: cancellationToken);

        return new DeleteTaskItemCommandResult { WasSoftDeleted = true };
    }
}
