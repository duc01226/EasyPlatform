using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.AspNetCore.Controllers;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Application.RequestContext;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Application.UseCaseCommands;
using PlatformExampleApp.TaskManagement.Application.UseCaseQueries;

namespace PlatformExampleApp.TaskManagement.Api.Controllers;

/// <summary>
/// Thin TaskManagement HTTP adapter. All business and persistence work remains in CQRS handlers.
/// </summary>
[Route("api/task-board")]
[ApiController]
public sealed class TaskBoardController : PlatformBaseController
{
    public TaskBoardController(
        IPlatformCqrs cqrs,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
        : base(cqrs, cacheRepositoryProvider, configuration, requestContextAccessor)
    {
    }

    /// <summary>
    /// Lists one page (<c>SkipCount</c>, <c>MaxResultCount</c>) of the TaskManagement-owned board projection.
    /// </summary>
    [HttpGet]
    public async Task<GetTaskBoardItemsQueryResult> Get(
        [FromQuery] GetTaskBoardItemsQuery request,
        CancellationToken cancellationToken)
    {
        return await Cqrs.SendQuery(request, cancellationToken);
    }

    /// <summary>
    /// Creates or updates one TaskManagement board item through the application command pipeline.
    /// </summary>
    [HttpPost]
    public async Task<SaveTaskBoardItemCommandResult> Save(
        [FromBody] SaveTaskBoardItemCommand request,
        CancellationToken cancellationToken)
    {
        return await Cqrs.SendCommand(request, cancellationToken);
    }
}
