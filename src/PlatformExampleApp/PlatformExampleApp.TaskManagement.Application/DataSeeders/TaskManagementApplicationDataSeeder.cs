using System;
using System.Threading.Tasks;
using Easy.Platform.Application;
using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.TaskManagement.Application.DataSeeders;

/// <summary>
/// Seeds a small, deterministic TaskManagement work board. The stable IDs make repeated startup and bounded replay
/// checks converge without creating duplicate business aggregates.
/// </summary>
public sealed class TaskManagementApplicationDataSeeder : PlatformApplicationDataSeeder
{
    private static readonly (string Id, string Title)[] SeedItems =
    [
        ("taskmanagement-demo-001", "Review modular composition"),
        ("taskmanagement-demo-002", "Replay the creation event"),
        ("taskmanagement-demo-003", "Prepare standalone extraction")
    ];

    private readonly ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository;

    public TaskManagementApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        ITaskManagementRootRepository<TaskBoardItemEntity> taskBoardItemRepository)
        : base(unitOfWorkManager, serviceProvider, configuration, loggerFactory, rootServiceProvider)
    {
        this.taskBoardItemRepository = taskBoardItemRepository;
    }

    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        foreach (var (id, title) in SeedItems)
        {
            var task = TaskBoardItemEntity.Create(id, title).EnsureValid();

            await taskBoardItemRepository.CreateIfNotExistAsync(
                task,
                predicate: existingTask => existingTask.Id == id);
        }
    }
}
