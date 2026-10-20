using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Queries;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.TaskManagement.Application.UseCaseQueries;

/// <summary>
/// Lists one page of the TaskManagement-owned read projection in a stable order (by TaskId), with the total count.
/// The page size is always bounded: it defaults to <see cref="DefaultPageSize" /> and cannot exceed <see cref="MaxPageSize" />.
/// </summary>
public sealed class GetTaskBoardItemsQuery : PlatformCqrsPagedQuery<GetTaskBoardItemsQueryResult, TaskBoardItemDto>
{
    public const int DefaultPageSize = 50;

    public const int MaxPageSize = 200;

    /// <inheritdoc />
    public override int? MaxResultCount { get; set; } = DefaultPageSize;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => MaxResultCount is > 0 and <= MaxPageSize, $"MaxResultCount must be between 1 and {MaxPageSize}");
    }
}

/// <summary>
/// One page of task-board items plus the total number of projected items.
/// </summary>
public sealed class GetTaskBoardItemsQueryResult : PlatformCqrsQueryPagedResult<TaskBoardItemDto>
{
    public GetTaskBoardItemsQueryResult()
    {
    }

    public GetTaskBoardItemsQueryResult(List<TaskBoardItemDto> items, long totalCount, IPlatformPagedRequest pagedRequest)
        : base(items, totalCount, pagedRequest)
    {
    }
}

internal class GetTaskBoardItemsQueryHandler
    : PlatformCqrsQueryApplicationHandler<GetTaskBoardItemsQuery, GetTaskBoardItemsQueryResult>
{
    private readonly ITaskManagementRepository<TaskBoardItemProjectionEntity> projectionRepository;

    public GetTaskBoardItemsQueryHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        ITaskManagementRepository<TaskBoardItemProjectionEntity> projectionRepository)
        : base(requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider)
    {
        this.projectionRepository = projectionRepository;
    }

    protected override async Task<GetTaskBoardItemsQueryResult> HandleAsync(
        GetTaskBoardItemsQuery request,
        CancellationToken cancellationToken)
    {
        var (pagedProjections, totalCount) = await (
            projectionRepository.GetAllAsync(
                query => query
                    .OrderBy(item => item.TaskId)
                    .PageBy(request.SkipCount, request.MaxResultCount),
                cancellationToken),
            projectionRepository.CountAsync(cancellationToken: cancellationToken));

        return new GetTaskBoardItemsQueryResult(
            pagedProjections.Select(item => new TaskBoardItemDto(item)).ToList(),
            totalCount,
            request);
    }
}
