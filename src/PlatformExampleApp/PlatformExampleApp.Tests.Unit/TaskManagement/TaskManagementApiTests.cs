using System.Reflection;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Controllers;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Infrastructures.Caching;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using PlatformExampleApp.TaskManagement.Api;
using PlatformExampleApp.TaskManagement.Api.Controllers;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.Dtos;
using PlatformExampleApp.TaskManagement.Application.UseCaseCommands;
using PlatformExampleApp.TaskManagement.Application.UseCaseQueries;
using PlatformExampleApp.TaskManagement.Domain.Entities;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;
using PlatformExampleApp.Tests.Unit.TestInfrastructure;

namespace PlatformExampleApp.Tests.Unit.TaskManagement;

/// <summary>
/// Standalone/API composition contracts for the TaskManagement module. These tests avoid starting external services;
/// live database, broker, migration, and seed execution belong to the later integration phase.
/// </summary>
public sealed class TaskManagementApiTests : ExampleAppModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-101")]
    public void StandaloneModule_RegistersItsDependenciesOnce_WhenMessagingIsDisabled()
    {
        var (services, configuration) = NewHost(CreateConfigurationValues(messagingEnabled: false));

        services.RegisterModule<TaskManagementStandaloneModule>();

        services
            .Where(descriptor => descriptor.ServiceType == typeof(TaskManagementStandaloneModule))
            .Should()
            .ContainSingle();

        using var serviceProvider = services.BuildServiceProvider();
        serviceProvider.GetServices<TaskManagementStandaloneModule>().Should().ContainSingle();

        var module = serviceProvider.GetRequiredService<TaskManagementStandaloneModule>();
        var dependencyTypes = module.GetDependentModuleTypes()
            .Select(dependencyFactory => dependencyFactory(configuration))
            .ToList();

        dependencyTypes.Should().OnlyHaveUniqueItems();
        dependencyTypes.Should().Contain(typeof(TaskManagementApplicationModule));
        dependencyTypes.Should().Contain(typeof(TaskManagementMongoPersistenceModule));
        dependencyTypes.Should().NotContain(typeof(TaskManagementRabbitMqMessageBusModule));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    [Trait("TechnicalSpec", "TC-HOST-103")]
    public void StandaloneModule_MessagingFlag_SelectsTheTransportDependencyDeterministically(bool messagingEnabled)
    {
        var (services, configuration) = NewHost(CreateConfigurationValues(messagingEnabled));
        var module = CreateModule<TaskManagementStandaloneModule>(services, configuration);

        var dependencyTypes = module.GetDependentModuleTypes()
            .Select(dependencyFactory => dependencyFactory(configuration))
            .ToList();

        dependencyTypes.Contains(typeof(TaskManagementRabbitMqMessageBusModule))
            .Should()
            .Be(messagingEnabled);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-105")]
    public void ApiModule_ExposesOnlyTheTaskManagementControllerAssembly()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<TaskManagementApiAspNetCoreModule>(services, configuration);

        module.GetAssembliesForControllerDiscovery()
            .Should()
            .ContainSingle()
            .Which
            .Should()
            .BeSameAs(typeof(TaskBoardController).Assembly);

        module.GetAssembliesForControllerDiscovery()
            .Should()
            .NotContain(typeof(PlatformBaseController).Assembly);
        module.GetDependentModuleTypes()
            .Select(dependencyFactory => dependencyFactory(configuration))
            .Should()
            .BeEquivalentTo(
                [typeof(TaskManagementApplicationModule), typeof(TaskManagementMongoPersistenceModule)]);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-102")]
    public async Task TaskBoardController_DispatchesGetAndSaveThroughCqrsWithoutPersistenceDependencies()
    {
        var expectedItem = new TaskBoardItemDto { Id = "task-api-001", Title = "API composition", Status = TaskBoardItemStatus.Open };
        var pageRequest = new GetTaskBoardItemsQuery { SkipCount = 10, MaxResultCount = 5 };
        var expectedPage = new GetTaskBoardItemsQueryResult([expectedItem], 11, pageRequest);
        var expectedSave = new SaveTaskBoardItemCommandResult
        {
            SavedItem = expectedItem,
            WasCreated = true
        };
        var cancellationToken = new CancellationTokenSource().Token;
        var cqrs = new Mock<IPlatformCqrs>();

        cqrs.Setup(platformCqrs => platformCqrs.SendQuery<GetTaskBoardItemsQueryResult>(
                It.IsAny<PlatformCqrsQuery<GetTaskBoardItemsQueryResult>>(),
                cancellationToken))
            .ReturnsAsync(expectedPage);
        cqrs.Setup(platformCqrs => platformCqrs.SendCommand<SaveTaskBoardItemCommandResult>(
                It.IsAny<PlatformCqrsCommand<SaveTaskBoardItemCommandResult>>(),
                cancellationToken))
            .ReturnsAsync(expectedSave);

        var controller = new TaskBoardController(
            cqrs.Object,
            Mock.Of<IPlatformCacheRepositoryProvider>(),
            new ConfigurationBuilder().Build(),
            Mock.Of<IPlatformApplicationRequestContextAccessor>());

        (await controller.Get(pageRequest, cancellationToken)).Should().BeSameAs(expectedPage);
        (await controller.Save(new SaveTaskBoardItemCommand(), cancellationToken)).Should().BeSameAs(expectedSave);

        // The bound page request is forwarded unchanged, so paging parameters reach the handler.
        cqrs.Verify(platformCqrs => platformCqrs.SendQuery<GetTaskBoardItemsQueryResult>(
            It.Is<PlatformCqrsQuery<GetTaskBoardItemsQueryResult>>(query => ReferenceEquals(query, pageRequest)),
            cancellationToken), Times.Once);
        cqrs.Verify(platformCqrs => platformCqrs.SendCommand<SaveTaskBoardItemCommandResult>(
            It.IsAny<PlatformCqrsCommand<SaveTaskBoardItemCommandResult>>(),
            cancellationToken), Times.Once);

        var constructorParameterTypes = typeof(TaskBoardController)
            .GetConstructors(BindingFlags.Public | BindingFlags.Instance)
            .Single()
            .GetParameters()
            .Select(parameter => parameter.ParameterType)
            .ToList();

        constructorParameterTypes.Should().NotContain(type =>
            type.Assembly == typeof(TaskManagementMongoPersistenceModule).Assembly ||
            type.Name.Contains("TaskManagementDbContext", StringComparison.Ordinal));
        typeof(TaskBoardController).Should().BeDerivedFrom<PlatformBaseController>();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-102")]
    public void TaskBoardController_UsesTheStableTaskBoardRoute()
    {
        typeof(TaskBoardController)
            .GetCustomAttribute<RouteAttribute>()
            ?.Template
            .Should()
            .Be("api/task-board");

        var getMethod = typeof(TaskBoardController).GetMethod(nameof(TaskBoardController.Get));

        getMethod?.GetCustomAttribute<HttpGetAttribute>().Should().NotBeNull();
        getMethod!.GetParameters()[0].GetCustomAttribute<FromQueryAttribute>().Should().NotBeNull();
        typeof(TaskBoardController).GetMethod(nameof(TaskBoardController.Save))
            ?.GetCustomAttribute<HttpPostAttribute>()
            .Should()
            .NotBeNull();
    }

    private static Dictionary<string, string?> CreateConfigurationValues(bool messagingEnabled)
    {
        return new Dictionary<string, string?>
        {
            ["MongoDB:ConnectionString"] = "mongodb://localhost:27017",
            ["MongoDB:Database"] = "taskmanagement-api-tests",
            ["TaskManagement:Messaging:Enabled"] = messagingEnabled.ToString()
        };
    }
}
