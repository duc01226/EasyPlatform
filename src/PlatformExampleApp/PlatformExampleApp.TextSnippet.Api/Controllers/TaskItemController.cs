using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Controllers;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands.TaskItem;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries.TaskItem;

namespace PlatformExampleApp.TextSnippet.Api.Controllers;

/// <summary>
/// API controller for TaskItem operations demonstrating:
/// - Standard CRUD endpoints
/// - Query with filtering
/// - Statistics/aggregate endpoint
/// - Soft delete with restore capability
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class TaskItemController : PlatformBaseController
{
    public TaskItemController(
        IPlatformCqrs cqrs,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
        : base(cqrs, cacheRepositoryProvider, configuration, requestContextAccessor)
    {
    }

    /// <summary>
    /// Get paginated list of tasks with filtering.
    /// GET: api/TaskItem/list
    /// </summary>
    [HttpGet]
    [Route("list")]
    public async Task<GetTaskListQueryResult> GetList([FromQuery] GetTaskListQuery request)
    {
        return await Cqrs.SendQuery(request);
    }

    /// <summary>
    /// Get task statistics and aggregates.
    /// GET: api/TaskItem/stats
    /// </summary>
    [HttpGet]
    [Route("stats")]
    public async Task<GetTaskStatisticsQueryResult> GetStatistics([FromQuery] GetTaskStatisticsQuery request)
    {
        return await Cqrs.SendQuery(request);
    }

    /// <summary>
    /// Create or update a task.
    /// POST: api/TaskItem/save
    /// </summary>
    [HttpPost]
    [Route("save")]
    public async Task<SaveTaskItemCommandResult> Save([FromBody] SaveTaskItemCommand request)
    {
        return await Cqrs.SendCommand(request);
    }

    /// <summary>
    /// Soft delete or permanently delete a task.
    /// POST: api/TaskItem/delete
    /// </summary>
    [HttpPost]
    [Route("delete")]
    public async Task<DeleteTaskItemCommandResult> Delete([FromBody] DeleteTaskItemCommand request)
    {
        return await Cqrs.SendCommand(request);
    }

    /// <summary>
    /// Restore a soft-deleted task.
    /// POST: api/TaskItem/restore
    /// </summary>
    [HttpPost]
    [Route("restore")]
    public async Task<SaveTaskItemCommandResult> Restore([FromBody] RestoreTaskItemRequest request)
    {
        return await Cqrs.SendCommand(new SaveTaskItemCommand
        {
            Task = request.Task,
            RestoreDeleted = true
        });
    }
}

/// <summary>
/// Request model for restore operation.
/// </summary>
public sealed class RestoreTaskItemRequest
{
    /// <summary>
    /// Task data to restore (must include valid ID of deleted task)
    /// </summary>
    public Application.Dtos.EntityDtos.TaskItemEntityDto Task { get; set; } = null!;
}
