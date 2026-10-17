using System;
using Easy.Platform.Application.Dtos;
using Easy.Platform.Common;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.TaskManagement.Application.Dtos;

/// <summary>
/// Transport-safe TaskManagement representation. Mapping stays here so HTTP, background, and standalone callers
/// share one DTO-to-entity boundary.
/// </summary>
public sealed class TaskBoardItemDto : PlatformEntityDto<TaskBoardItemEntity, string>
{
    public TaskBoardItemDto()
    {
    }

    public TaskBoardItemDto(TaskBoardItemEntity entity)
    {
        Id = entity.Id;
        Title = entity.Title;
        Status = entity.Status;
        ConcurrencyUpdateToken = entity.ConcurrencyUpdateToken;
    }

    /// <summary>
    /// Builds a read response from the TaskManagement-owned projection without exposing persistence details.
    /// </summary>
    public TaskBoardItemDto(TaskBoardItemProjectionEntity projection)
    {
        Id = projection.TaskId;
        Title = projection.Title;
        Status = projection.Status;

        // Carried so a client that lists items can submit an update without a separate aggregate read.
        ConcurrencyUpdateToken = projection.TaskConcurrencyUpdateToken;
    }

    public string Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public TaskBoardItemStatus Status { get; set; } = TaskBoardItemStatus.Open;

    /// <summary>
    /// Required for existing-item updates and returned by aggregate saves.
    /// </summary>
    public string ConcurrencyUpdateToken { get; set; }

    protected override object? GetSubmittedId()
    {
        return Id;
    }

    protected override TaskBoardItemEntity MapToEntity(TaskBoardItemEntity entity, MapToEntityModes mode)
    {
        // Existing entities change only through TaskBoardItemEntity.ChangeTitle/ChangeStatus so title invariants, the
        // finite transition graph, and the concurrency rule cannot be bypassed by DTO mapping.
        if (mode == MapToEntityModes.MapToUpdateExistingEntity)
            return entity;

        entity.Title = Title?.Trim() ?? string.Empty;
        entity.Status = Status;

        return entity;
    }

    protected override string GenerateNewId()
    {
        return TaskBoardItemEntity.GenerateNewId();
    }
}
