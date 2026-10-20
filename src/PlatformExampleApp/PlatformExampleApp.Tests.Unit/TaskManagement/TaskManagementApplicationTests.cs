using System.Linq.Expressions;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Caching;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Application.UseCaseCommands;
using PlatformExampleApp.TaskManagement.Application.UseCaseQueries;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Domain.Repositories;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Application-boundary contracts for the TaskManagement modular-monolith proof of concept.
/// These tests intentionally exercise the production handlers through small test-only subclasses and service-specific
/// repository doubles; they do not assert inbox/outbox bookkeeping, which belongs to later transport tests.
/// </summary>
public sealed class TaskManagementApplicationTests
{
    // TC-APP-101: command validation stops invalid input before a repository mutation can occur.
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-101")]
    public async Task SaveCommand_InvalidTitleOrStatus_ReturnsValidationErrorsWithoutRepositoryMutation()
    {
        var invalidTitleCommand = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto { Title = " ", Status = TaskBoardItemStatus.Open }
        };
        var invalidStatusCommand = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto { Title = "Valid title", Status = (TaskBoardItemStatus)999 }
        };

        var invalidTitleValidation = invalidTitleCommand.Validate();
        var invalidStatusValidation = invalidStatusCommand.Validate();

        invalidTitleValidation.IsValid.Should().BeFalse();
        invalidTitleValidation.ErrorsMsg().Should().Contain("Task title is required");
        invalidStatusValidation.IsValid.Should().BeFalse();
        invalidStatusValidation.ErrorsMsg().Should().Contain("Task status is not supported");

        var repository = new Mock<ITaskManagementRootRepository<TaskBoardItemEntity>>();
        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableSaveTaskBoardItemCommandHandler(serviceProvider, repository.Object);

        await Assert.ThrowsAsync<PlatformValidationException>(() => handler.Handle(invalidTitleCommand, CancellationToken.None));
        await Assert.ThrowsAsync<PlatformValidationException>(() => handler.Handle(invalidStatusCommand, CancellationToken.None));

        repository.Invocations.Should().BeEmpty();
    }

    // TC-APP-102: a valid create uses the aggregate factory, repository/UoW pipeline boundary, and DTO response map.
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-102")]
    public async Task SaveCommand_ValidCreate_PersistsOneAggregateAndMapsTheResponseThroughDto()
    {
        var repository = new Mock<ITaskManagementRootRepository<TaskBoardItemEntity>>();
        repository
            .Setup(itemRepository => itemRepository.CreateOrUpdateAsync(
                It.IsAny<TaskBoardItemEntity>(),
                false,
                true,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskBoardItemEntity entity, bool _, bool __, Action<PlatformCqrsEntityEvent> ___, CancellationToken ____) => entity);

        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableSaveTaskBoardItemCommandHandler(
            serviceProvider,
            repository.Object);
        var command = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto
            {
                Title = "  First task  ",
                Status = TaskBoardItemStatus.Open
            }
        };

        var result = await handler.InvokeHandleAsync(command, CancellationToken.None);

        repository.Verify(
            itemRepository => itemRepository.CreateOrUpdateAsync(
                It.Is<TaskBoardItemEntity>(entity =>
                    entity.Title == "First task" &&
                    entity.Status == TaskBoardItemStatus.Open &&
                    entity.FindDomainEvents<TaskBoardItemCreatedDomainEvent>().Count == 1),
                false,
                true,
                null,
                It.IsAny<CancellationToken>()),
            Times.Once);

        // A create performs no pre-read: the factory-generated id is new by construction.
        repository.Invocations.Should().ContainSingle();
        result.WasCreated.Should().BeTrue();
        result.SavedItem.Title.Should().Be("First task");
        result.SavedItem.Status.Should().Be(TaskBoardItemStatus.Open);
        result.SavedItem.Id.Should().NotBeNullOrWhiteSpace();
        result.SavedItem.ConcurrencyUpdateToken.Should().NotBeNullOrWhiteSpace();

        var mappedEntity = command.Item.MapToNewEntity();
        mappedEntity.Title.Should().Be("First task");
        mappedEntity.Status.Should().Be(TaskBoardItemStatus.Open);
    }

    // TC-APP-105: a valid update maps mutable fields, delegates status transition rules to the aggregate, and saves once.
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-105")]
    public async Task SaveCommand_ValidUpdate_UsesAggregateTransitionAndPersistsOneAggregate()
    {
        var existingItem = TaskBoardItemEntity.Reconstitute(
            "task-1",
            "Old title",
            TaskBoardItemStatus.Open,
            "token-1");
        var repository = CreateRepositoryWithExistingItem(existingItem);

        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableSaveTaskBoardItemCommandHandler(serviceProvider, repository.Object);
        var command = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto
            {
                Id = "task-1",
                Title = "  New title  ",
                Status = TaskBoardItemStatus.InProgress,
                ConcurrencyUpdateToken = "token-1"
            }
        };

        var result = await handler.InvokeHandleAsync(command, CancellationToken.None);

        repository.Verify(
            itemRepository => itemRepository.CreateOrUpdateAsync(
                It.Is<TaskBoardItemEntity>(entity =>
                    entity.Id == "task-1" &&
                    entity.Title == "New title" &&
                    entity.Status == TaskBoardItemStatus.InProgress &&
                    // The loaded token must reach persistence unchanged: it is the optimistic-concurrency filter,
                    // and the repository (not the aggregate) rotates it on write.
                    entity.ConcurrencyUpdateToken == "token-1"),
                false,
                true,
                null,
                It.IsAny<CancellationToken>()),
            Times.Once);
        result.WasCreated.Should().BeFalse();
        result.SavedItem.Id.Should().Be("task-1");
        result.SavedItem.Title.Should().Be("New title");
        result.SavedItem.Status.Should().Be(TaskBoardItemStatus.InProgress);
    }

    // TC-APP-106: forbidden status transitions fail through the aggregate before any persistence mutation.
    [Theory]
    [Trait("TechnicalSpec", "TC-APP-106")]
    [InlineData(TaskBoardItemStatus.Open, TaskBoardItemStatus.Completed)]
    [InlineData(TaskBoardItemStatus.Completed, TaskBoardItemStatus.Open)]
    [InlineData(TaskBoardItemStatus.Completed, TaskBoardItemStatus.InProgress)]
    [InlineData(TaskBoardItemStatus.Completed, TaskBoardItemStatus.Cancelled)]
    [InlineData(TaskBoardItemStatus.Cancelled, TaskBoardItemStatus.Completed)]
    [InlineData(TaskBoardItemStatus.Cancelled, TaskBoardItemStatus.InProgress)]
    public async Task SaveCommand_ForbiddenStatusTransition_ReturnsValidationErrorWithoutRepositoryMutation(
        TaskBoardItemStatus currentStatus,
        TaskBoardItemStatus nextStatus)
    {
        var existingItem = TaskBoardItemEntity.Reconstitute(
            "task-1",
            "Existing title",
            currentStatus,
            "current-token");
        var repository = CreateRepositoryWithExistingItem(existingItem);

        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableSaveTaskBoardItemCommandHandler(serviceProvider, repository.Object);
        var command = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto
            {
                Id = "task-1",
                Title = "Existing title",
                Status = nextStatus,
                ConcurrencyUpdateToken = "current-token"
            }
        };

        var exception = await Assert.ThrowsAsync<PlatformValidationException>(() =>
            handler.InvokeHandleAsync(command, CancellationToken.None));

        exception.ValidationResult.ErrorsMsg().Should().Contain("Task status transition is not allowed");
        existingItem.Status.Should().Be(currentStatus);
        repository.Invocations.Should().NotContain(item =>
            item.Method.Name == nameof(IPlatformRootRepository<TaskBoardItemEntity, string>.CreateOrUpdateAsync));
    }

    // TC-APP-107: stale optimistic-concurrency input fails before any persistence mutation.
    [Theory]
    [Trait("TechnicalSpec", "TC-APP-107")]
    [InlineData("stale-token")]
    [InlineData("")]
    [InlineData(null)]
    public async Task SaveCommand_StaleConcurrencyToken_ReturnsValidationErrorWithoutRepositoryMutation(
        string? submittedConcurrencyToken)
    {
        var existingItem = TaskBoardItemEntity.Reconstitute(
            "task-1",
            "Existing title",
            TaskBoardItemStatus.Open,
            "current-token");
        var repository = CreateRepositoryWithExistingItem(existingItem);

        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableSaveTaskBoardItemCommandHandler(serviceProvider, repository.Object);
        var command = new SaveTaskBoardItemCommand
        {
            Item = new TaskBoardItemDto
            {
                Id = "task-1",
                Title = "Updated title",
                Status = TaskBoardItemStatus.Open,
                ConcurrencyUpdateToken = submittedConcurrencyToken!
            }
        };

        var exception = await Assert.ThrowsAsync<PlatformValidationException>(() =>
            handler.InvokeHandleAsync(command, CancellationToken.None));

        exception.ValidationResult.ErrorsMsg().Should().Contain("Task has changed since it was loaded");

        // The token is checked before the title changes, so a rejected request leaves the loaded aggregate untouched.
        existingItem.Title.Should().Be("Existing title");
        repository.Invocations.Should().NotContain(item =>
            item.Method.Name == nameof(IPlatformRootRepository<TaskBoardItemEntity, string>.CreateOrUpdateAsync));
    }

    // TC-APP-103: listing uses only the TaskManagement-owned projection repository, orders by TaskId, and pages with a count.
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-103")]
    public async Task GetQuery_UsesTaskManagementProjectionRepositoryAndDeterministicOrdering()
    {
        // TaskId order (a, b, c) is deliberately the reverse of Title order (C, B, A), so the assertion can tell
        // which key the handler orders by.
        var projections = new List<TaskBoardItemProjectionEntity>
        {
            new() { TaskId = "task-b", SourceEventId = "event-2", Title = "B", Status = TaskBoardItemStatus.Open },
            new() { TaskId = "task-c", SourceEventId = "event-3", Title = "A", Status = TaskBoardItemStatus.Completed },
            new() { TaskId = "task-a", SourceEventId = "event-1", Title = "C", Status = TaskBoardItemStatus.InProgress }
        };
        var repository = new Mock<ITaskManagementRepository<TaskBoardItemProjectionEntity>>();
        repository
            .Setup(itemRepository => itemRepository.GetAllAsync(
                It.IsAny<Func<IQueryable<TaskBoardItemProjectionEntity>, IQueryable<TaskBoardItemProjectionEntity>>>(),
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, object?>>[]>()))
            .Returns((
                Func<IQueryable<TaskBoardItemProjectionEntity>, IQueryable<TaskBoardItemProjectionEntity>> queryBuilder,
                CancellationToken _,
                Expression<Func<TaskBoardItemProjectionEntity, object?>>[] __) =>
                Task.FromResult(queryBuilder(projections.AsQueryable()).ToList()));
        repository
            .Setup(itemRepository => itemRepository.CountAsync(
                It.IsAny<Expression<Func<TaskBoardItemProjectionEntity, bool>>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(projections.Count);

        using var serviceProvider = BuildServiceProvider();
        var handler = new TestableGetTaskBoardItemsQueryHandler(
            serviceProvider,
            repository.Object);

        var firstPage = await handler.InvokeHandleAsync(new GetTaskBoardItemsQuery { MaxResultCount = 2 }, CancellationToken.None);
        var secondPage = await handler.InvokeHandleAsync(
            new GetTaskBoardItemsQuery { SkipCount = 2, MaxResultCount = 2 },
            CancellationToken.None);

        firstPage.Items.Select(item => item.Id).Should().Equal("task-a", "task-b");
        firstPage.Items.Select(item => item.Title).Should().Equal("C", "B");
        firstPage.TotalCount.Should().Be(3);
        secondPage.Items.Select(item => item.Id).Should().Equal("task-c");
        secondPage.TotalCount.Should().Be(3);
        repository.Invocations.Should().OnlyContain(item =>
            item.Method.Name == nameof(IPlatformQueryableRepository<TaskBoardItemProjectionEntity, string>.GetAllAsync) ||
            item.Method.Name == nameof(IPlatformQueryableRepository<TaskBoardItemProjectionEntity, string>.CountAsync));
    }

    // TC-APP-109: the list query page size is bounded so one request cannot load the whole projection.
    [Theory]
    [Trait("TechnicalSpec", "TC-APP-109")]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(GetTaskBoardItemsQuery.MaxPageSize, true)]
    [InlineData(GetTaskBoardItemsQuery.MaxPageSize + 1, false)]
    public void GetQuery_PageSize_IsBounded(int maxResultCount, bool expectedValid)
    {
        new GetTaskBoardItemsQuery().MaxResultCount.Should().Be(GetTaskBoardItemsQuery.DefaultPageSize);

        var validation = new GetTaskBoardItemsQuery { MaxResultCount = maxResultCount }.Validate();

        validation.IsValid.Should().Be(expectedValid);
        if (!expectedValid)
            validation.ErrorsMsg().Should().Contain("MaxResultCount must be between 1 and");
    }

    // TC-APP-104: typed settings coexist with one process-wide compatibility context and no TextSnippet edge.
    [Fact]
    [Trait("TechnicalSpec", "TC-APP-104")]
    public void ApplicationModule_UsesTypedSettingsAndHasNoTextSnippetDependency()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TaskManagement:Messaging:Enabled"] = "false",
                ["TaskManagement:Messaging:InboxEnabled"] = "true",
                ["TaskManagement:Messaging:OutboxEnabled"] = "false",
                ["TaskManagement:PersistenceMode"] = "Isolated"
            })
            .Build();
        var settings = new TaskManagementApplicationSettings(configuration);

        settings.MessagingEnabled.Should().BeFalse();
        TaskManagementApplicationSettings.IsMessagingEnabled(configuration).Should().BeFalse();
        TaskManagementApplicationSettings.IsMessagingEnabled(new ConfigurationBuilder().Build()).Should().BeTrue();
        settings.InboxEnabled.Should().BeTrue();
        settings.OutboxEnabled.Should().BeFalse();
        settings.PersistenceMode.Should().Be(TaskManagementPersistenceMode.Isolated);

        typeof(TaskManagementApplicationModule).Assembly
            .GetTypes()
            .Should()
            .NotContain(type => typeof(IPlatformApplicationSettingContext).IsAssignableFrom(type) &&
                                type != typeof(IPlatformApplicationSettingContext));
        typeof(TaskManagementApplicationModule).Assembly
            .GetReferencedAssemblies()
            .Should()
            .NotContain(assembly => assembly.Name != null &&
                                    assembly.Name.Contains("TextSnippet", StringComparison.OrdinalIgnoreCase));
    }

    // TC-APP-108: unsupported non-empty persistence modes fail at the typed configuration boundary.
    [Theory]
    [Trait("TechnicalSpec", "TC-APP-108")]
    [InlineData("999")]
    [InlineData("0")]
    [InlineData("Bogus")]
    public void ApplicationSettings_RejectsUndefinedPersistenceMode(string invalidPersistenceMode)
    {
        var invalidConfiguration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TaskManagement:PersistenceMode"] = invalidPersistenceMode
            })
            .Build();

        Action createSettings = () => _ = new TaskManagementApplicationSettings(invalidConfiguration);

        createSettings.Should()
            .Throw<ArgumentException>()
            .WithMessage("*TaskManagement:PersistenceMode*");
        var defaultSettings = new TaskManagementApplicationSettings(new ConfigurationBuilder().Build());
        defaultSettings
            .PersistenceMode
            .Should()
            .Be(TaskManagementPersistenceMode.Shared);
    }

    private static Mock<ITaskManagementRootRepository<TaskBoardItemEntity>> CreateRepositoryWithExistingItem(
        TaskBoardItemEntity existingItem)
    {
        var repository = new Mock<ITaskManagementRootRepository<TaskBoardItemEntity>>();
        repository
            .Setup(itemRepository => itemRepository.GetByIdAsync(
                existingItem.Id,
                It.IsAny<CancellationToken>(),
                It.IsAny<Expression<Func<TaskBoardItemEntity, object?>>[]>()))
            .ReturnsAsync(existingItem);
        repository
            .Setup(itemRepository => itemRepository.CreateOrUpdateAsync(
                It.IsAny<TaskBoardItemEntity>(),
                false,
                true,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskBoardItemEntity entity, bool _, bool __, Action<PlatformCqrsEntityEvent> ___, CancellationToken ____) => entity);

        return repository;
    }

    private static ServiceProvider BuildServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddSingleton(Mock.Of<IPlatformRootServiceProvider>());
        services.AddSingleton(Mock.Of<IPlatformApplicationSettingContext>());
        return services.BuildServiceProvider();
    }

    private sealed class TestableSaveTaskBoardItemCommandHandler : SaveTaskBoardItemCommandHandler
    {
        public TestableSaveTaskBoardItemCommandHandler(
            IServiceProvider serviceProvider,
            ITaskManagementRootRepository<TaskBoardItemEntity> repository)
            : base(
                Mock.Of<IPlatformApplicationRequestContextAccessor>(),
                Mock.Of<IPlatformUnitOfWorkManager>(),
                new Lazy<IPlatformCqrs>(Mock.Of<IPlatformCqrs>),
                NullLoggerFactory.Instance,
                serviceProvider,
                repository)
        {
        }

        public Task<SaveTaskBoardItemCommandResult> InvokeHandleAsync(
            SaveTaskBoardItemCommand command,
            CancellationToken cancellationToken)
        {
            return HandleAsync(command, cancellationToken);
        }
    }

    private sealed class TestableGetTaskBoardItemsQueryHandler : GetTaskBoardItemsQueryHandler
    {
        public TestableGetTaskBoardItemsQueryHandler(
            IServiceProvider serviceProvider,
            ITaskManagementRepository<TaskBoardItemProjectionEntity> repository)
            : base(
                Mock.Of<IPlatformApplicationRequestContextAccessor>(),
                NullLoggerFactory.Instance,
                serviceProvider,
                Mock.Of<IPlatformCacheRepositoryProvider>(),
                repository)
        {
        }

        public Task<GetTaskBoardItemsQueryResult> InvokeHandleAsync(
            GetTaskBoardItemsQuery query,
            CancellationToken cancellationToken)
        {
            return HandleAsync(query, cancellationToken);
        }
    }
}
