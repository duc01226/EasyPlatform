using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Exceptions.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.TaskManagement.Application.UseCaseCommands;

/// <summary>
/// Creates or updates one TaskManagement aggregate within the platform command/UoW pipeline.
/// </summary>
public sealed class SaveTaskBoardItemCommand : PlatformCqrsCommand<SaveTaskBoardItemCommandResult>
{
    public TaskBoardItemDto Item { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Item != null, "Task board item is required")
            .And(_ => Item == null || !string.IsNullOrWhiteSpace(Item.Title), "Task title is required")
            .And(_ => Item == null || Item.Title.Length <= TaskBoardItemEntity.TitleMaxLength,
                $"Task title must be {TaskBoardItemEntity.TitleMaxLength} characters or fewer")
            .And(_ => Item == null || !Item.HasSubmitId() || !string.IsNullOrWhiteSpace(Item.Id), "Task ID is required for an update")
            .And(_ => Item == null || !Item.HasSubmitId() || !string.IsNullOrWhiteSpace(Item.ConcurrencyUpdateToken),
                "Task concurrency token is required for an update")
            .And(_ => Item == null || Enum.IsDefined(Item.Status), "Task status is not supported")
            .And(_ => Item == null || Item.HasSubmitId() || Item.Status == TaskBoardItemStatus.Open,
                "New tasks must start in Open status");
    }
}

/// <summary>
/// Result of <see cref="SaveTaskBoardItemCommand"/>.
/// </summary>
public sealed class SaveTaskBoardItemCommandResult : PlatformCqrsCommandResult
{
    public TaskBoardItemDto SavedItem { get; set; }

    public bool WasCreated { get; set; }
}

internal class SaveTaskBoardItemCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveTaskBoardItemCommand, SaveTaskBoardItemCommandResult>
{
    private readonly ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository;

    public SaveTaskBoardItemCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository)
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.taskBoardItemRepository = taskBoardItemRepository;
    }

    protected override async Task<SaveTaskBoardItemCommandResult> HandleAsync(
        SaveTaskBoardItemCommand request,
        CancellationToken cancellationToken)
    {
        var isCreate = request.Item.NotHasSubmitId();
        TaskBoardItemEntity taskBoardItem;

        if (isCreate)
        {
            // The factory owns creation (trimmed title, Open status, token, one creation event).
            taskBoardItem = TaskBoardItemEntity.Create(
                    TaskBoardItemEntity.GenerateNewId(),
                    request.Item.Title)
                .EnsureValid();
        }
        else
        {
            // One read: a missing item surfaces as not-found from EnsureFound, not as a separate pre-check query.
            taskBoardItem = await taskBoardItemRepository
                .GetByIdAsync(request.Item.Id, cancellationToken)
                .EnsureFound("Task board item was not found");

            // Check the token first so a stale request is rejected before any aggregate mutation is attempted.
            taskBoardItem.ValidateConcurrency(request.Item.ConcurrencyUpdateToken).EnsureValid();
            taskBoardItem.ChangeTitle(request.Item.Title).EnsureValid();

            if (request.Item.Status != taskBoardItem.Status)
            {
                taskBoardItem
                    .ChangeStatus(request.Item.Status, request.Item.ConcurrencyUpdateToken)
                    .EnsureValid();
            }
        }

        taskBoardItem.Validate().EnsureValid();

        var savedTaskBoardItem = await taskBoardItemRepository.CreateOrUpdateAsync(
            taskBoardItem,
            cancellationToken: cancellationToken);

        return new SaveTaskBoardItemCommandResult
        {
            SavedItem = new TaskBoardItemDto(savedTaskBoardItem),
            WasCreated = isCreate
        };
    }
}
