using System;
using System.Linq;
using System.Linq.Expressions;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Validations;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Infrastructures.MessageBus;

namespace PlatformExampleApp.TaskManagement.Domain.Entities;

/// <summary>
/// The finite status vocabulary for a TaskManagement task-board item.
/// Numeric values are explicit so persisted values remain stable if members are appended later.
/// </summary>
public enum TaskBoardItemStatus
{
    Open = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4
}

/// <summary>
/// Domain event raised exactly once by the create factory for a new task-board item.
/// It is an internal domain event and is intentionally distinct from the transport contract.
/// </summary>
public sealed class TaskBoardItemCreatedDomainEvent : ISupportDomainEventsEntity.DomainEvent, IPlatformSubMessageQueuePrefixSupport
{
    /// <summary>
    /// Stable event-instance identity used by projection idempotency.
    /// </summary>
    public string SourceEventId { get; set; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// Opaque TaskManagement aggregate identifier.
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Task title captured at creation time.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Task status captured at creation time.
    /// </summary>
    public TaskBoardItemStatus Status { get; set; }

    /// <inheritdoc />
    public string SubQueuePrefix()
    {
        return TaskId;
    }

    /// <summary>
    /// Creates the internal event payload from the aggregate's committed creation state.
    /// </summary>
    public static TaskBoardItemCreatedDomainEvent Create(TaskBoardItemEntity item)
    {
        return new TaskBoardItemCreatedDomainEvent
        {
            TaskId = item.Id,
            Title = item.Title,
            Status = item.Status
        };
    }

    /// <summary>
    /// Returns the creation event carried by a created aggregate entity event, or null when the entity event is not a
    /// creation or does not carry one. Every reader of "was this task created?" asks this one owner.
    /// </summary>
    public static TaskBoardItemCreatedDomainEvent FindIn(PlatformCqrsEntityEvent<TaskBoardItemEntity> entityEvent)
    {
        if (entityEvent?.CrudAction != PlatformCqrsEntityEventCrudAction.Created)
            return null;

        return entityEvent
            .FindEvents<TaskBoardItemCreatedDomainEvent>()
            .FirstOrDefault(createdEvent => createdEvent != null);
    }
}

/// <summary>
/// TaskManagement aggregate root. It is OO-mutable, owns title/status/concurrency invariants,
/// and contains no navigation to another bounded context or any persistence provider.
/// </summary>
public sealed class TaskBoardItemEntity : RootEntity<TaskBoardItemEntity, string>, IRowVersionEntity
{
    public const int TitleMaxLength = 200;

    /// <summary>
    /// Public parameterless constructor required by platform persistence/materialization.
    /// Reconstitution callers should use <see cref="Reconstitute"/> so loading never raises a create event.
    /// </summary>
    public TaskBoardItemEntity()
    {
    }

    /// <summary>
    /// Gets or sets the deterministic opaque task-board identifier.
    /// </summary>
    public override string Id { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the required task title. Command/application callers should use the factory or
    /// an invariant-preserving update path rather than bypassing validation with direct assignment.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the current finite status. Valid transitions are enforced by <see cref="ChangeStatus"/>.
    /// </summary>
    public TaskBoardItemStatus Status { get; set; } = TaskBoardItemStatus.Open;

    /// <inheritdoc />
    public string ConcurrencyUpdateToken { get; set; }

    /// <summary>
    /// Builds a deterministic aggregate identifier from the caller-owned opaque task key.
    /// </summary>
    public static string CreateDeterministicId(string taskId)
    {
        return taskId?.Trim() ?? string.Empty;
    }

    /// <summary>
    /// Creates a new aggregate, validates its input, and raises one creation event only when valid.
    /// Expected invalid input is returned as a <see cref="PlatformValidationResult{TValue}"/>.
    /// </summary>
    public static PlatformValidationResult<TaskBoardItemEntity> Create(string taskId, string title)
    {
        var item = new TaskBoardItemEntity
        {
            Id = CreateDeterministicId(taskId),
            Title = title?.Trim() ?? string.Empty,
            Status = TaskBoardItemStatus.Open,
            ConcurrencyUpdateToken = Ulid.NewUlid().ToString()
        };

        var validation = item.Validate();

        if (validation.IsValid)
            item.AddDomainEvent(TaskBoardItemCreatedDomainEvent.Create(item));

        return validation;
    }

    /// <summary>
    /// Generates a new opaque task identifier. The single ID source for command creates and DTO new-entity maps.
    /// </summary>
    public static string GenerateNewId()
    {
        return Ulid.NewUlid().ToString();
    }

    /// <summary>
    /// Builds an aggregate from already-persisted state without re-running creation behavior or raising a domain event.
    /// Mongo materialization uses the parameterless constructor; this factory is the explicit in-code equivalent for
    /// callers (such as tests or future non-Mongo adapters) that must rebuild stored state without the create path.
    /// </summary>
    public static TaskBoardItemEntity Reconstitute(
        string taskId,
        string title,
        TaskBoardItemStatus status,
        string concurrencyUpdateToken)
    {
        return new TaskBoardItemEntity
        {
            Id = CreateDeterministicId(taskId),
            Title = title ?? string.Empty,
            Status = status,
            ConcurrencyUpdateToken = concurrencyUpdateToken
        };
    }

    /// <summary>
    /// Changes status only when the target is part of the explicit finite transition graph and
    /// the required expected concurrency token matches the loaded aggregate.
    /// </summary>
    /// <remarks>
    /// The aggregate keeps the loaded token: the persistence layer uses it as the optimistic-concurrency filter and
    /// rotates it atomically on write. Rotating it here would make that filter miss the stored row on every update.
    /// </remarks>
    public PlatformValidationResult<TaskBoardItemEntity> ChangeStatus(
        TaskBoardItemStatus nextStatus,
        string expectedConcurrencyUpdateToken)
    {
        var validation = Validate()
            .And(_ => Enum.IsDefined(nextStatus), "Task status is not supported")
            .And(_ => IsAllowedStatusTransition(Status, nextStatus), "Task status transition is not allowed")
            .And(_ => !string.IsNullOrWhiteSpace(expectedConcurrencyUpdateToken), "Task concurrency token is required")
            .And(_ => HasMatchingConcurrencyToken(expectedConcurrencyUpdateToken), "Task has changed since it was loaded");

        if (validation.IsValid)
        {
            Status = nextStatus;

            return PlatformValidationResult.Valid(this);
        }

        return validation;
    }

    /// <summary>
    /// Changes the title through the aggregate's title invariants. The trimmed title must be non-empty and within
    /// <see cref="TitleMaxLength" />; on failure the aggregate keeps its previous title.
    /// </summary>
    public PlatformValidationResult<TaskBoardItemEntity> ChangeTitle(string nextTitle)
    {
        var trimmedTitle = nextTitle?.Trim() ?? string.Empty;

        var validation = PlatformValidationResult.Validate(this, !string.IsNullOrWhiteSpace(trimmedTitle), "Task title is required")
            .And(_ => trimmedTitle.Length <= TitleMaxLength, $"Task title must be {TitleMaxLength} characters or fewer");

        if (validation.IsValid)
            Title = trimmedTitle;

        return validation;
    }

    /// <summary>
    /// Validates an expected row-version token without mutating the aggregate.
    /// </summary>
    public PlatformValidationResult<TaskBoardItemEntity> ValidateConcurrency(string expectedConcurrencyUpdateToken)
    {
        return PlatformValidationResult.Validate(
            this,
            HasMatchingConcurrencyToken(expectedConcurrencyUpdateToken),
            "Task has changed since it was loaded");
    }

    /// <summary>
    /// The one optimistic-concurrency comparison rule: a non-blank expected token equal (ordinal) to the loaded token.
    /// </summary>
    private bool HasMatchingConcurrencyToken(string expectedConcurrencyUpdateToken)
    {
        return !string.IsNullOrWhiteSpace(expectedConcurrencyUpdateToken) &&
               string.Equals(expectedConcurrencyUpdateToken, ConcurrencyUpdateToken, StringComparison.Ordinal);
    }

    /// <summary>
    /// Returns whether the status graph explicitly permits the requested transition.
    /// </summary>
    public static bool IsAllowedStatusTransition(TaskBoardItemStatus currentStatus, TaskBoardItemStatus nextStatus)
    {
        return currentStatus switch
        {
            TaskBoardItemStatus.Open => nextStatus is TaskBoardItemStatus.InProgress or TaskBoardItemStatus.Cancelled,
            TaskBoardItemStatus.InProgress => nextStatus is TaskBoardItemStatus.Open or TaskBoardItemStatus.Completed or TaskBoardItemStatus.Cancelled,
            TaskBoardItemStatus.Completed => false,
            TaskBoardItemStatus.Cancelled => nextStatus is TaskBoardItemStatus.Open,
            _ => false
        };
    }

    /// <inheritdoc />
    public override PlatformValidationResult<TaskBoardItemEntity> Validate()
    {
        return PlatformValidationResult.Validate(this, !string.IsNullOrWhiteSpace(Id), "Task ID is required")
            .And(_ => !string.IsNullOrWhiteSpace(Title), "Task title is required")
            .And(_ => Title.Length <= TitleMaxLength, $"Task title must be {TitleMaxLength} characters or fewer")
            .And(_ => Enum.IsDefined(Status), "Task status is not supported")
            .And(_ => !string.IsNullOrWhiteSpace(ConcurrencyUpdateToken), "Task concurrency token is required");
    }
}

/// <summary>
/// TaskManagement-owned read-side projection. There is exactly one projection per task: its identity is the TaskId,
/// so replaying a creation event resolves the same row and later task changes update that row instead of leaving a
/// stale copy. <see cref="SourceEventId" /> records the creation event that first materialized the projection.
/// </summary>
public sealed class TaskBoardItemProjectionEntity : Entity<TaskBoardItemProjectionEntity, string>, IRowVersionEntity
{
    /// <summary>
    /// Public parameterless constructor required by platform query/persistence materialization.
    /// </summary>
    public TaskBoardItemProjectionEntity()
    {
    }

    public override string Id { get; set; } = string.Empty;
    public string TaskId { get; set; } = string.Empty;
    public string SourceEventId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public TaskBoardItemStatus Status { get; set; }

    /// <summary>
    /// The projection row's own version. Persistence rotates this token to reject a writer whose projection read
    /// predates another write; it must remain independent of the aggregate token exposed to clients.
    /// </summary>
    public string ConcurrencyUpdateToken { get; set; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// The aggregate's current optimistic-concurrency token, projected so a client that lists items can submit an
    /// update. It is empty only while the projection holds transport-only creation state (the integration contract
    /// deliberately carries no aggregate token); the next local aggregate event fills it.
    /// </summary>
    public string TaskConcurrencyUpdateToken { get; set; }

    /// <summary>
    /// Creates the deterministic projection identity: one projection per task.
    /// </summary>
    public static string CreateDeterministicId(string taskId)
    {
        return taskId?.Trim() ?? string.Empty;
    }

    /// <summary>
    /// The one per-task identity predicate used by every projection reader and writer.
    /// </summary>
    public static Expression<Func<TaskBoardItemProjectionEntity, bool>> ByTaskIdExpr(string taskId)
    {
        return projection => projection.TaskId == taskId;
    }

    /// <summary>
    /// Decides how the stored projection must change so it converges on one row per task, whatever order and however
    /// many times creation (local or transport) and aggregate-state deliveries arrive.
    /// <list type="bullet">
    /// <item>No stored projection and no creation event: nothing to project yet (returns a valid null).</item>
    /// <item>No stored projection: materialize from the creation event.</item>
    /// <item>A stored projection is never replaced by a creation event (replay/late delivery cannot regress state).</item>
    /// <item>When the current aggregate state is supplied and differs, it is applied (title, status, token).</item>
    /// </list>
    /// </summary>
    /// <param name="existingProjection">The stored projection for the task, or null.</param>
    /// <param name="createdEvent">The creation event being delivered, or null for a state-only delivery.</param>
    /// <param name="currentTaskState">The latest aggregate state, or null when the caller only has the transport contract.</param>
    /// <param name="hasChanges">True when the returned projection must be written.</param>
    public static PlatformValidationResult<TaskBoardItemProjectionEntity> Converge(
        TaskBoardItemProjectionEntity existingProjection,
        TaskBoardItemCreatedDomainEvent createdEvent,
        TaskBoardItemEntity currentTaskState,
        out bool hasChanges)
    {
        hasChanges = false;

        var projectionResult = (existingProjection, createdEvent) switch
        {
            ({ } existing, _) => PlatformValidationResult.Valid(existing),
            (null, { } creation) => ApplyCreatedEvent(creation),
            _ => PlatformValidationResult.Valid<TaskBoardItemProjectionEntity>(null)
        };

        if (!projectionResult.IsValid || projectionResult.Value == null)
            return projectionResult;

        var projection = projectionResult.Value;
        hasChanges = existingProjection == null;

        if (currentTaskState == null || projection.IsInSyncWith(currentTaskState))
            return projectionResult;

        hasChanges = true;

        return projection.ApplyTaskState(currentTaskState);
    }

    /// <summary>
    /// Applies a creation event. When a projection for the task already exists it is returned unchanged, so duplicate
    /// or late creation delivery can neither duplicate the read model nor regress state applied by a later change.
    /// </summary>
    public static PlatformValidationResult<TaskBoardItemProjectionEntity> ApplyCreatedEvent(
        TaskBoardItemCreatedDomainEvent createdEvent,
        TaskBoardItemProjectionEntity existingProjection = null)
    {
        if (createdEvent == null)
            return PlatformValidationResult.Validate(existingProjection, false, "Task creation event is required");

        if (existingProjection != null &&
            string.Equals(existingProjection.TaskId, createdEvent.TaskId, StringComparison.Ordinal))
            return PlatformValidationResult.Valid(existingProjection);

        var projection = new TaskBoardItemProjectionEntity
        {
            Id = CreateDeterministicId(createdEvent.TaskId),
            TaskId = createdEvent.TaskId,
            SourceEventId = createdEvent.SourceEventId,
            Title = createdEvent.Title,
            Status = createdEvent.Status
        };

        return projection.Validate();
    }

    /// <summary>
    /// Returns whether this projection already reflects the projected fields of the given aggregate state.
    /// </summary>
    public bool IsInSyncWith(TaskBoardItemEntity item)
    {
        return item != null &&
               string.Equals(Title, item.Title, StringComparison.Ordinal) &&
               Status == item.Status &&
               string.Equals(TaskConcurrencyUpdateToken, item.ConcurrencyUpdateToken, StringComparison.Ordinal);
    }

    /// <summary>
    /// Applies the current aggregate state to this task's existing projection.
    /// </summary>
    public PlatformValidationResult<TaskBoardItemProjectionEntity> ApplyTaskState(TaskBoardItemEntity item)
    {
        if (item == null || !string.Equals(item.Id, TaskId, StringComparison.Ordinal))
            return PlatformValidationResult.Validate(this, false, "Task state must belong to the projected task");

        Title = item.Title;
        Status = item.Status;
        TaskConcurrencyUpdateToken = item.ConcurrencyUpdateToken;

        return Validate();
    }

    /// <inheritdoc />
    public override string UniqueCompositeId()
    {
        return CreateDeterministicId(TaskId);
    }

    /// <inheritdoc />
    public override Expression<Func<TaskBoardItemProjectionEntity, bool>> FindByUniqueCompositeIdExpr()
    {
        return ByTaskIdExpr(TaskId);
    }

    /// <inheritdoc />
    public override PlatformValidationResult<TaskBoardItemProjectionEntity> Validate()
    {
        return PlatformValidationResult.Validate(this, !string.IsNullOrWhiteSpace(TaskId), "Projection task ID is required")
            .And(_ => !string.IsNullOrWhiteSpace(SourceEventId), "Projection source event ID is required")
            .And(_ => !string.IsNullOrWhiteSpace(Title), "Projection title is required")
            .And(_ => Title.Length <= TaskBoardItemEntity.TitleMaxLength, $"Projection title must be {TaskBoardItemEntity.TitleMaxLength} characters or fewer")
            .And(_ => Enum.IsDefined(Status), "Projection status is not supported");
    }
}
