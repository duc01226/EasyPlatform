using System.Linq.Expressions;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using FluentAssertions;
using Moq;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;
using PlatformExampleApp.TaskManagement.Domain.Repositories.Extensions;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

public sealed class TaskManagementProjectionConcurrencyTests
{
    // TC-EVT-107: an older writer must fail rather than erase a committed newer projection; retry reloads both reads.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-107")]
    public async Task ConcurrentUpdate_RejectsOldSnapshotAndRetryPreservesLatestState()
    {
        var store = new ProjectionStore { Row = Projection("Original", "aggregate-1", "row-1") };
        var current = TaskBoardItemEntity.Reconstitute("task", "Original", TaskBoardItemStatus.Open, "aggregate-1");
        var reads = new List<string>();
        store.OnRead = () => reads.Add("projection");
        store.BeforeWrite = () =>
        {
            store.BeforeWrite = null;
            store.Row = Projection("Newer", "aggregate-2", "row-2");
            current = TaskBoardItemEntity.Reconstitute("task", "Newer", TaskBoardItemStatus.InProgress, "aggregate-2");
        };
        // The first writer computes a change, then loses to another committed writer before its write.
        current.Title = "Older update";
        Task<TaskBoardItemEntity> Load(CancellationToken _)
        {
            reads.Add("aggregate");
            return Task.FromResult(current);
        }

        var write = () => store.Repository.Object.UpsertTaskBoardItemProjectionAsync("task", null!, Load);
        await write.Should().ThrowAsync<PlatformDomainRowVersionConflictException>();
        await write();

        store.Row!.Title.Should().Be("Newer");
        store.Row.Should().BeAssignableTo<IRowVersionEntity>("the real persistence adapter must enforce the captured row version");
        store.Row.Status.Should().Be(TaskBoardItemStatus.InProgress);
        store.Row.TaskConcurrencyUpdateToken.Should().Be("aggregate-2");
        reads.Should().Equal("projection", "aggregate", "projection", "aggregate");
        new TaskBoardItemDto(store.Row).ConcurrencyUpdateToken.Should().Be("aggregate-2");
    }

    // TC-EVT-107: a version read after aggregate state could authorize an old state over a newer row.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-107")]
    public async Task ProjectionSnapshot_IsCapturedBeforeReloadingAggregateState()
    {
        var store = new ProjectionStore { Row = Projection("Original", "aggregate-1", "row-1") };
        var current = TaskBoardItemEntity.Reconstitute("task", "Original", TaskBoardItemStatus.Open, "aggregate-1");
        store.OnRead = () => current = TaskBoardItemEntity.Reconstitute(
            "task", "Committed during read", TaskBoardItemStatus.InProgress, "aggregate-2");

        await store.Repository.Object.UpsertTaskBoardItemProjectionAsync(
            "task", null!, _ => Task.FromResult(current));

        store.Row!.Title.Should().Be("Committed during read");
        store.Row.TaskConcurrencyUpdateToken.Should().Be("aggregate-2");
        store.Row.ConcurrencyUpdateToken.Should().NotBe("row-1");
    }

    // TC-EVT-103: transport creation racing a local insert must not turn into an overwrite of the local state.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-103")]
    public async Task ConcurrentCreation_RejectsDuplicateInsertAndRetryDoesNotOverwriteWinner()
    {
        var store = new ProjectionStore();
        store.BeforeWrite = () =>
        {
            store.BeforeWrite = null;
            store.Row = Projection("Local current title", "aggregate-2", "row-2");
        };
        var created = new TaskBoardItemCreatedDomainEvent
        {
            TaskId = "task",
            SourceEventId = "creation",
            Title = "Old transport title",
            Status = TaskBoardItemStatus.Open
        };
        var write = () => store.Repository.Object.UpsertTaskBoardItemProjectionAsync("task", created, null!);

        await write.Should().ThrowAsync<InvalidOperationException>().WithMessage("Duplicate projection");
        await write();

        store.Row!.Title.Should().Be("Local current title");
        store.Row.TaskConcurrencyUpdateToken.Should().Be("aggregate-2");
    }

    private static TaskBoardItemProjectionEntity Projection(string title, string taskToken, string rowToken) => new()
    {
        Id = "task",
        TaskId = "task",
        SourceEventId = "creation",
        Title = title,
        Status = taskToken == "aggregate-1" ? TaskBoardItemStatus.Open : TaskBoardItemStatus.InProgress,
        TaskConcurrencyUpdateToken = taskToken,
        ConcurrencyUpdateToken = rowToken
    };

    // A deterministic persistence seam: detached reads, atomic unique inserts and row-version compare-and-swap.
    private sealed class ProjectionStore
    {
        public TaskBoardItemProjectionEntity? Row { get; set; }
        public Action? OnRead { get; set; }
        public Action? BeforeWrite { get; set; }
        public Mock<ITaskManagementProjectionRepository<TaskBoardItemProjectionEntity>> Repository { get; } = new();

        public ProjectionStore()
        {
            Repository.Setup(r => r.FirstOrDefaultAsync(
                    It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, bool>>>(), It.IsAny<CancellationToken>(),
                    It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, object?>>[]>()))
                .Returns(() =>
                {
                    var snapshot = Row == null ? null : Projection(Row.Title, Row.TaskConcurrencyUpdateToken, Row.ConcurrencyUpdateToken);
                    OnRead?.Invoke();
                    return Task.FromResult(snapshot!);
                });
            Repository.Setup(r => r.CreateAsync(It.IsAny<TaskBoardItemProjectionEntity>(), It.IsAny<bool>(),
                    It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
                .Returns((TaskBoardItemProjectionEntity entity, bool _, Action<PlatformCqrsEntityEvent> __, CancellationToken ___) =>
                {
                    BeforeWrite?.Invoke();
                    if (Row != null) throw new InvalidOperationException("Duplicate projection");
                    Row = entity;
                    return Task.FromResult(entity);
                });
            Repository.Setup(r => r.CreateOrUpdateAsync(It.IsAny<TaskBoardItemProjectionEntity>(),
                    It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, bool>>>(), It.IsAny<bool>(), It.IsAny<bool>(),
                    It.IsAny<Action<PlatformCqrsEntityEvent>>(), It.IsAny<CancellationToken>()))
                .Returns((TaskBoardItemProjectionEntity entity, Expression<Func<TaskBoardItemProjectionEntity, bool>> _,
                    bool __, bool ___, Action<PlatformCqrsEntityEvent> ____, CancellationToken _____) =>
                {
                    BeforeWrite?.Invoke();
                    if (Row?.ConcurrencyUpdateToken != entity.ConcurrencyUpdateToken)
                        throw new PlatformDomainRowVersionConflictException("Projection changed");
                    entity.ConcurrencyUpdateToken = Ulid.NewUlid().ToString();
                    Row = entity;
                    return Task.FromResult(entity);
                });
        }
    }
}
