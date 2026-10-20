using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Entities;
using FluentAssertions;
using PlatformExampleApp.TaskManagement.Domain.Entities;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Verifies TaskManagement aggregate invariants and its domain-to-projection seam without a database or broker.
/// </summary>
public sealed class TaskManagementDomainTests
{
    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-101")]
    public void Create_WithBoundaryTitleLengths_SucceedsAndRaisesOneEvent()
    {
        foreach (var titleLength in new[] { 1, TaskBoardItemEntity.TitleMaxLength })
        {
            var result = TaskBoardItemEntity.Create($"task-{titleLength}", new string('x', titleLength));

            result.IsValid.Should().BeTrue();
            result.Value.GetDomainEvents().Should().ContainSingle();
            result.Value.GetDomainEvents().Single().Value.Should().BeOfType<TaskBoardItemCreatedDomainEvent>();
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-101")]
    public void Create_WithInvalidTitle_DoesNotRaiseAnEvent()
    {
        foreach (var title in new[] { string.Empty, new string('x', TaskBoardItemEntity.TitleMaxLength + 1) })
        {
            var result = TaskBoardItemEntity.Create("invalid-task", title);

            result.IsValid.Should().BeFalse();
            result.Value.GetDomainEvents().Should().BeEmpty();
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-102")]
    public void ChangeStatus_AllowsOnlyTheDeclaredFiniteTransitionGraph()
    {
        var declaredTransitions = new Dictionary<TaskBoardItemStatus, TaskBoardItemStatus[]>
        {
            [TaskBoardItemStatus.Open] = [TaskBoardItemStatus.InProgress, TaskBoardItemStatus.Cancelled],
            [TaskBoardItemStatus.InProgress] = [TaskBoardItemStatus.Open, TaskBoardItemStatus.Completed, TaskBoardItemStatus.Cancelled],
            [TaskBoardItemStatus.Completed] = [],
            [TaskBoardItemStatus.Cancelled] = [TaskBoardItemStatus.Open]
        };

        foreach (var currentStatus in Enum.GetValues<TaskBoardItemStatus>())
        {
            foreach (var nextStatus in Enum.GetValues<TaskBoardItemStatus>())
            {
                var item = TaskBoardItemEntity.Reconstitute("task-transition", "Transition", currentStatus, "version-1");
                var result = item.ChangeStatus(nextStatus, "version-1");
                var isDeclared = declaredTransitions[currentStatus].Contains(nextStatus);

                result.IsValid.Should().Be(isDeclared);
                item.Status.Should().Be(isDeclared ? nextStatus : currentStatus);

                // The aggregate never rotates its own token: persistence uses the loaded token as the concurrency filter.
                item.ConcurrencyUpdateToken.Should().Be("version-1");
            }
        }
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-103")]
    public void Reconstitute_DoesNotRaiseCreationEvent_AndRejectsStaleVersion()
    {
        var item = TaskBoardItemEntity.Reconstitute("task-reconstituted", "Reconstituted", TaskBoardItemStatus.Open, "version-1");

        item.GetDomainEvents().Should().BeEmpty();

        var staleResult = item.ChangeStatus(TaskBoardItemStatus.InProgress, "stale-version");

        staleResult.IsValid.Should().BeFalse();
        staleResult.ErrorsMsg().Should().Contain("Task has changed since it was loaded");
        item.Status.Should().Be(TaskBoardItemStatus.Open);
        item.ConcurrencyUpdateToken.Should().Be("version-1");
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-DOM-105")]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void MissingConcurrencyToken_IsRejectedBeforeAggregateMutation(string? expectedConcurrencyUpdateToken)
    {
        var item = TaskBoardItemEntity.Reconstitute(
            "task-concurrency",
            "Concurrency",
            TaskBoardItemStatus.Open,
            "version-1");

        item.ValidateConcurrency(expectedConcurrencyUpdateToken!).IsValid.Should().BeFalse();

        var changeResult = item.ChangeStatus(TaskBoardItemStatus.InProgress, expectedConcurrencyUpdateToken!);

        changeResult.IsValid.Should().BeFalse();
        changeResult.ErrorsMsg().Should().Contain("Task concurrency token is required");
        item.Status.Should().Be(TaskBoardItemStatus.Open);
        item.ConcurrencyUpdateToken.Should().Be("version-1");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-106")]
    public void ApplyCreatedEvent_WithNullEvent_ReturnsValidationFailureAndPreservesProjection()
    {
        var existingProjection = new TaskBoardItemProjectionEntity
        {
            Id = "task-1",
            TaskId = "task-1",
            SourceEventId = "event-1",
            Title = "Existing",
            Status = TaskBoardItemStatus.Open
        };

        var result = TaskBoardItemProjectionEntity.ApplyCreatedEvent(null!, existingProjection);

        result.IsValid.Should().BeFalse();
        result.Value.Should().BeSameAs(existingProjection);
    }

    [Theory]
    [Trait("TechnicalSpec", "TC-DOM-107")]
    [InlineData("  ", "Task title is required")]
    [InlineData(null, "Task title is required")]
    [InlineData("TOO_LONG", "Task title must be")]
    public void ChangeTitle_WithInvalidTitle_KeepsThePreviousTitle(string? nextTitle, string expectedError)
    {
        var item = TaskBoardItemEntity.Reconstitute("task-title", "Original", TaskBoardItemStatus.Open, "version-1");
        var submittedTitle = nextTitle == "TOO_LONG" ? new string('x', TaskBoardItemEntity.TitleMaxLength + 1) : nextTitle;

        var result = item.ChangeTitle(submittedTitle!);

        result.IsValid.Should().BeFalse();
        result.ErrorsMsg().Should().Contain(expectedError);
        item.Title.Should().Be("Original");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-107")]
    public void ChangeTitle_WithValidTitle_StoresTheTrimmedTitle()
    {
        var item = TaskBoardItemEntity.Reconstitute("task-title", "Original", TaskBoardItemStatus.Open, "version-1");

        var result = item.ChangeTitle("  Renamed  ");

        result.IsValid.Should().BeTrue();
        item.Title.Should().Be("Renamed");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-108")]
    public void Converge_MaterializesOnceThenAppliesOnlyNewerAggregateState()
    {
        var item = TaskBoardItemEntity.Create("task-converge", "Converge").EnsureValid();
        var createdEvent = item.FindDomainEvents<TaskBoardItemCreatedDomainEvent>().Single();

        // Nothing stored and no creation event: nothing to project.
        TaskBoardItemProjectionEntity.Converge(null!, null!, item, out var nothingChanged).Value.Should().BeNull();
        nothingChanged.Should().BeFalse();

        // Creation with the current aggregate state materializes the row, including the token for later updates.
        var created = TaskBoardItemProjectionEntity.Converge(null!, createdEvent, item, out var createdChanged).Value;
        createdChanged.Should().BeTrue();
        created.TaskId.Should().Be("task-converge");
        created.SourceEventId.Should().Be(createdEvent.SourceEventId);
        created.TaskConcurrencyUpdateToken.Should().Be(item.ConcurrencyUpdateToken);

        // A replayed creation for an in-sync row is a no-op.
        TaskBoardItemProjectionEntity.Converge(created, createdEvent, item, out var replayChanged).Value.Should().BeSameAs(created);
        replayChanged.Should().BeFalse();

        // A later aggregate state is applied to the same row.
        var changedState = TaskBoardItemEntity.Reconstitute("task-converge", "Converge renamed", TaskBoardItemStatus.InProgress, "version-2");
        var updated = TaskBoardItemProjectionEntity.Converge(created, null!, changedState, out var updateChanged).Value;
        updateChanged.Should().BeTrue();
        updated.Should().BeSameAs(created);
        updated.Title.Should().Be("Converge renamed");
        updated.Status.Should().Be(TaskBoardItemStatus.InProgress);
        updated.TaskConcurrencyUpdateToken.Should().Be("version-2");
        updated.SourceEventId.Should().Be(createdEvent.SourceEventId);

        // A transport-only creation (no aggregate state) never overwrites an existing row.
        var lateTransportCreation = new TaskBoardItemCreatedDomainEvent { TaskId = "task-converge", SourceEventId = "late", Title = "Stale", Status = TaskBoardItemStatus.Open };
        TaskBoardItemProjectionEntity.Converge(updated, lateTransportCreation, null!, out var lateChanged).Value.Title.Should().Be("Converge renamed");
        lateChanged.Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-DOM-104")]
    public void DomainAssembly_DoesNotReferenceTextSnippet()
    {
        var referencedAssemblyNames = typeof(TaskBoardItemEntity).Assembly
            .GetReferencedAssemblies()
            .Select(reference => reference.Name)
            .Where(name => name != null)
            .ToArray();

        referencedAssemblyNames.Should().NotContain(name =>
            name!.Contains("TextSnippet", StringComparison.OrdinalIgnoreCase));
    }
}
