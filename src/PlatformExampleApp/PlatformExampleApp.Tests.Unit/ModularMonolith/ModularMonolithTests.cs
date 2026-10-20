using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.AspNetCore;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.MongoDB;
using Easy.Platform.RabbitMQ;
using Easy.Platform.RedisCache;
using PlatformExampleApp.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using PlatformExampleApp.ModularMonolith.Api;
using PlatformExampleApp.TaskManagement.Api;
using PlatformExampleApp.TaskManagement.Api.Controllers;
using PlatformExampleApp.TaskManagement.Application;
using PlatformExampleApp.TaskManagement.Application.DataSeeders;
using PlatformExampleApp.TaskManagement.Application.MessageBus.Consumers;
using PlatformExampleApp.TaskManagement.Application.MessageBus.Producers;
using PlatformExampleApp.TaskManagement.Application.UseCaseEvents.TaskBoardItem;
using PlatformExampleApp.TaskManagement.Persistence.Mongo;
using PlatformExampleApp.TextSnippet.Api;
using PlatformExampleApp.TextSnippet.Api.Controllers;
using PlatformExampleApp.TextSnippet.Application;
using PlatformExampleApp.TextSnippet.Persistence.Mongo;

namespace PlatformExampleApp.Tests.Unit.ModularMonolith;

/// <summary>
/// Executable architecture contracts for the modular-monolith proof of concept. These tests inspect the final
/// service graph and provider-neutral module metadata; MongoDB, Redis, RabbitMQ, migrations, and seed execution
/// remain integration concerns.
/// </summary>
public sealed class ModularMonolithTests : ExampleAppModuleTestBase
{
    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-201")]
    public void CompositeRoot_RegistersEachApplicationAndPersistenceBoundaryOnce_WithOneSharedProviderSet()
    {
        var (services, _) = RegisterCompositeRoot();

        var persistenceStoreRegistrations = services
            .Where(descriptor => descriptor.ServiceType == typeof(PlatformPersistenceMessageBusStoreRegistration))
            .Select(descriptor => (PlatformPersistenceMessageBusStoreRegistration)descriptor.ImplementationInstance!)
            .ToList();

        services.Count(descriptor => descriptor.ServiceType == typeof(PlatformMessageBusApplicationLaneRegistration))
            .Should()
            .Be(2);
        persistenceStoreRegistrations.Count(registration => registration.IsRuntimeEnabled)
            .Should()
            .Be(2, "the composite host has one runtime persistence store for each application lane");
        persistenceStoreRegistrations.Count(registration => !registration.IsRuntimeEnabled)
            .Should()
            .Be(0, "store contribution is opt-in and the migration-only cross-db context does not opt in");
        services.Count(descriptor => descriptor.ServiceType == typeof(PlatformMessageBusStoreBinding))
            .Should()
            .Be(2);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformApplicationSettingContext))
            .Should()
            .Be(1, "application settings are a process-wide compatibility context in this host");
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusStoreRegistry))
            .Should()
            .Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(TextSnippetRabbitMqMessageBusModule))
            .Should()
            .Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(TextSnippetRedisCacheModule))
            .Should()
            .Be(1);

        services.Should().NotContain(descriptor => descriptor.ServiceType == typeof(TextSnippetApiAspNetCoreModule));
        services.Should().NotContain(descriptor => descriptor.ServiceType == typeof(TaskManagementApiAspNetCoreModule));

        using var serviceProvider = services.BuildServiceProvider();
        var registry = serviceProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>();

        registry.IsStrictCompositionValidationEnabled.Should().BeTrue();
        registry.Validate();
        registry.Descriptors
            .Select(descriptor =>
                (descriptor.StoreKey.Value, descriptor.PersistenceContextType, descriptor.ApplicationLanes.Single().ApplicationModuleType))
            .Should()
            .BeEquivalentTo(
                [
                    (TextSnippetApplicationModule.MessageBusStoreKeyValue, typeof(TextSnippetDbContext), typeof(TextSnippetApplicationModule)),
                    (TaskManagementApplicationModule.MessageBusStoreKeyValue, typeof(TaskManagementDbContext), typeof(TaskManagementApplicationModule))
                ]);
    }

    // TC-EVT-106: in the composed host, each application lane owns only its own seeders, and the TaskManagement
    // projection handler and integration producer/consumer are registered from the TaskManagement boundary.
    [Fact]
    [Trait("TechnicalSpec", "TC-EVT-106")]
    public void CompositeRoot_TaskManagementLaneOwnsOnlyItsSeeder_AndRegistersItsPipelineComponents()
    {
        var (services, _) = RegisterCompositeRoot();

        services.Should().Contain(descriptor => descriptor.ImplementationType == typeof(TaskBoardItemProjectionEventHandler));
        services.Should().Contain(descriptor => descriptor.ImplementationType == typeof(TaskBoardItemCreatedIntegrationEventProducer));
        services.Should().Contain(descriptor => descriptor.ImplementationType == typeof(TaskBoardItemCreatedIntegrationEventConsumer));

        using var serviceProvider = services.BuildServiceProvider();
        var lanes = serviceProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>().ApplicationLaneRegistrations;

        lanes.Single(lane => lane.ApplicationModuleType == typeof(TaskManagementApplicationModule))
            .ApplicationDataSeederTypes
            .Should()
            .Equal(typeof(TaskManagementApplicationDataSeeder));
        lanes.Single(lane => lane.ApplicationModuleType == typeof(TextSnippetApplicationModule))
            .ApplicationDataSeederTypes
            .Should()
            .NotBeEmpty()
            .And.NotContain(typeof(TaskManagementApplicationDataSeeder));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-202")]
    public void CompositeRoot_ExposesBothControllerAssemblies_AndDeduplicatesApplicationParts()
    {
        var (services, _) = RegisterCompositeRoot();
        using var serviceProvider = services.BuildServiceProvider();
        var module = serviceProvider.GetRequiredService<ModularMonolithApiAspNetCoreModule>();

        var controllerAssemblies = module.GetAssembliesForControllerDiscovery();

        controllerAssemblies.Should().HaveCount(2).And.OnlyHaveUniqueItems();
        controllerAssemblies.Should().Contain(typeof(TextSnippetController).Assembly);
        controllerAssemblies.Should().Contain(typeof(TaskBoardController).Assembly);

        var applicationPartManager = serviceProvider.GetRequiredService<ApplicationPartManager>();
        var assemblyParts = applicationPartManager.ApplicationParts.OfType<AssemblyPart>().ToList();

        assemblyParts.Count(part => part.Assembly == typeof(TextSnippetController).Assembly).Should().Be(1);
        assemblyParts.Count(part => part.Assembly == typeof(TaskBoardController).Assembly).Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-203")]
    public void CompositeRoot_BindsTypedRepositoriesToDistinctLogicalStores()
    {
        var (services, _) = RegisterCompositeRoot();
        using var serviceProvider = services.BuildServiceProvider();
        var registry = serviceProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>();

        var textSnippetDescriptor = registry.GetForApplication(typeof(TextSnippetApplicationModule));
        var taskManagementDescriptor = registry.GetForApplication(typeof(TaskManagementApplicationModule));

        textSnippetDescriptor.PersistenceContextType.Should().Be(typeof(TextSnippetDbContext));
        textSnippetDescriptor.PersistenceModuleType.Should().Be(typeof(TextSnippetMongoPersistenceModule));
        taskManagementDescriptor.PersistenceContextType.Should().Be(typeof(TaskManagementDbContext));
        taskManagementDescriptor.PersistenceModuleType.Should().Be(typeof(TaskManagementMongoPersistenceModule));
        textSnippetDescriptor.StoreKey.Should().NotBe(taskManagementDescriptor.StoreKey);
    }

    [Theory]
    [InlineData(TaskManagementPersistenceMode.Shared, "shared-db", "shared-db")]
    [InlineData(TaskManagementPersistenceMode.Isolated, "shared-db", "task-db")]
    [Trait("TechnicalSpec", "TC-COMP-203")]
    [Trait("TechnicalSpec", "TC-COMP-204")]
    public void TaskManagementPersistenceMode_SelectsSharedOrIsolatedPhysicalDatabase(
        TaskManagementPersistenceMode mode,
        string textSnippetDatabase,
        string taskManagementDatabase)
    {
        var configurationValues = CreateConfigurationValues();
        configurationValues["MongoDB:Database"] = textSnippetDatabase;
        configurationValues["TaskManagement:PersistenceMode"] = mode.ToString();
        configurationValues[TaskManagementMongoPersistenceModule.TASK_MANAGEMENT_MONGO_DATABASE_CONFIGURATION_KEY] =
            mode == TaskManagementPersistenceMode.Isolated ? taskManagementDatabase : null;

        var (services, configuration) = NewHost(configurationValues);
        var textSnippetModule = CreateModule<InspectableTextSnippetMongoPersistenceModule>(services, configuration);
        var taskManagementModule = CreateModule<InspectableTaskManagementMongoPersistenceModule>(services, configuration);

        var textSnippetOptions = textSnippetModule.ReadMongoOptions();
        var taskManagementOptions = taskManagementModule.ReadMongoOptions();

        taskManagementModule.PersistenceMode.Should().Be(mode);
        textSnippetOptions.Database.Should().Be(textSnippetDatabase);
        taskManagementOptions.Database.Should().Be(taskManagementDatabase);
        (taskManagementOptions.Database == textSnippetOptions.Database)
            .Should()
            .Be(mode == TaskManagementPersistenceMode.Shared);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-205")]
    public void CompositeRoot_StrictCompositionPasses_AndConflictingBindingFailsBeforeReadiness()
    {
        var (services, _) = RegisterCompositeRoot();
        using (var serviceProvider = services.BuildServiceProvider())
        {
            var registry = serviceProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>();
            registry.Validate();
        }

        var (conflictingServices, _) = RegisterCompositeRoot();
        conflictingServices.AddSingleton(
            new PlatformMessageBusStoreBinding(
                new PlatformMessageBusStoreKey(TextSnippetApplicationModule.MessageBusStoreKeyValue),
                typeof(TextSnippetApplicationModule),
                typeof(TextSnippetMongoPersistenceModule)));

        using var conflictingProvider = conflictingServices.BuildServiceProvider();
        var conflictingRegistry = conflictingProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>();
        var act = () => conflictingRegistry.Validate();

        act.Should()
            .Throw<InvalidOperationException>()
            .Which.Message.Should()
            .Contain("duplicated")
            .And.Contain(TextSnippetApplicationModule.MessageBusStoreKeyValue);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-206")]
    public void CompositeRoot_StrictAspNetCompositionValidatorPasses_WithAllModuleComponentsCovered()
    {
        var (services, _) = RegisterCompositeRoot();
        using var serviceProvider = services.BuildServiceProvider();
        var root = serviceProvider.GetRequiredService<ModularMonolithApiAspNetCoreModule>();
        var registry = serviceProvider.GetRequiredService<IPlatformMessageBusStoreRegistry>();

        var act = () => PlatformModuleCompositionValidator.Validate(
            new PlatformModuleCompositionOptions
            {
                StrictValidationEnabled = true,
                ServiceCollection = services,
                ServiceProvider = serviceProvider,
                MessageBusStoreRegistry = registry,
                ControllerAssemblies = root.GetAssembliesForControllerDiscovery(),
                RegisteredSeederTypes = GetRegisteredImplementationTypes(services, typeof(IPlatformApplicationDataSeeder)),
                RegisteredConsumerTypes = GetRegisteredImplementationTypes(services, typeof(IPlatformMessageBusConsumer)),
                RegisteredProducerTypes = GetRegisteredImplementationTypes(services, typeof(IPlatformCqrsEventBusMessageProducer)),
                ApplicationSettingContextRegistrationCount = services.Count(
                    descriptor => descriptor.ServiceType == typeof(IPlatformApplicationSettingContext)),
                InfrastructureAssemblies = [typeof(PlatformApplicationModule).Assembly],
                HasMessageBusScannerRegistration = HasServiceRegistration(services, typeof(IPlatformMessageBusScanner)),
                HasInboxConsumerWorkerRegistration = HasServiceRegistration(
                    services,
                    typeof(PlatformConsumeInboxBusMessageHostedService)),
                HasInboxCleanerWorkerRegistration = HasServiceRegistration(
                    services,
                    typeof(PlatformInboxBusMessageCleanerHostedService)),
                HasApplicationProducerRegistration = HasServiceRegistration(
                    services,
                    typeof(IPlatformApplicationBusMessageProducer)),
                HasKeyedApplicationProducerRegistration = HasServiceRegistration(
                    services,
                    typeof(IPlatformKeyedApplicationBusMessageProducer)),
                HasOutboxSenderWorkerRegistration = HasServiceRegistration(
                    services,
                    typeof(PlatformSendOutboxBusMessageHostedService)),
                HasOutboxCleanerWorkerRegistration = HasServiceRegistration(
                    services,
                    typeof(PlatformOutboxBusMessageCleanerHostedService)),
                HasMessageBusStoreRegistryRegistration = HasServiceRegistration(
                    services,
                    typeof(IPlatformMessageBusStoreRegistry))
            });

        act.Should().NotThrow();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-HOST-201")]
    public void CompositeRoot_RegistersOneTransportProvider_AndProcessWideFanOutWorkerSet()
    {
        var (services, _) = RegisterCompositeRoot();

        services.Count(descriptor => descriptor.ServiceType == typeof(TextSnippetRabbitMqMessageBusModule)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusScanner)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformApplicationBusMessageProducer)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformKeyedApplicationBusMessageProducer)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(PlatformConsumeInboxBusMessageHostedService))
            .Should()
            .Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(PlatformSendOutboxBusMessageHostedService))
            .Should()
            .Be(1);

        using var serviceProvider = services.BuildServiceProvider();
        var scanner = serviceProvider.GetRequiredService<IPlatformMessageBusScanner>();
        scanner.ScanAllDefinedConsumerTypes()
            .Should()
            .Contain(type => type.Assembly == typeof(TextSnippetApplicationModule).Assembly)
            .And.Contain(type => type.Assembly == typeof(TaskManagementApplicationModule).Assembly);
    }

    private (IServiceCollection Services, IConfiguration Configuration) RegisterCompositeRoot(
        Dictionary<string, string?>? configurationValues = null)
    {
        var (services, configuration) = NewHost(configurationValues ?? CreateConfigurationValues());
        services.RegisterModule<ModularMonolithApiAspNetCoreModule>();
        return (services, configuration);
    }

    private static Dictionary<string, string?> CreateConfigurationValues()
    {
        return new Dictionary<string, string?>
        {
            ["MongoDB:ConnectionString"] = "mongodb://localhost:27017",
            ["MongoDB:Database"] = "modular-monolith-tests",
            ["RabbitMqOptions:HostNames"] = "localhost",
            ["RabbitMqOptions:UserName"] = "guest",
            ["RabbitMqOptions:Password"] = "guest",
            ["RedisCacheOptions:Connection"] = "localhost:6379,abortConnect=false",
            ["Caching:DefaultExpirationInSeconds"] = "300",
            ["PersistenceConfiguration:BadQueryWarning:IsEnabled"] = "false",
            ["PersistenceConfiguration:BadQueryWarning:TotalItemsThreshold"] = "200",
            ["PersistenceConfiguration:BadQueryWarning:SlowQueryMillisecondsThreshold"] = "500",
            ["PersistenceConfiguration:BadQueryWarning:SlowWriteQueryMillisecondsThreshold"] = "3000",
            ["PersistenceConfiguration:BadQueryWarning:IsLogWarningAsError"] = "false",
            [PlatformMessageBusStoreRegistry.StrictCompositionValidationConfigurationKey] = "true",
            ["TaskManagement:Messaging:Enabled"] = "true",
            ["TaskManagement:Messaging:InboxEnabled"] = "true",
            ["TaskManagement:Messaging:OutboxEnabled"] = "true",
            ["TaskManagement:PersistenceMode"] = TaskManagementPersistenceMode.Shared.ToString()
        };
    }

    private static List<Type> GetRegisteredImplementationTypes(IServiceCollection services, Type contractType)
    {
        return services
            .Select(descriptor => descriptor.ImplementationType)
            .Where(type => type != null && type.IsClass && !type.IsAbstract && type.IsAssignableTo(contractType))
            .Distinct()
            .ToList()!;
    }

    private static bool HasServiceRegistration(IServiceCollection services, Type serviceType)
    {
        return services.Any(descriptor => descriptor.ServiceType == serviceType ||
                                         descriptor.ImplementationType == serviceType ||
                                         descriptor.ImplementationInstance?.GetType() == serviceType);
    }

    private sealed class InspectableTextSnippetMongoPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : TextSnippetMongoPersistenceModule(serviceProvider, configuration)
    {
        public PlatformMongoOptions<TextSnippetDbContext> ReadMongoOptions()
        {
            var options = new PlatformMongoOptions<TextSnippetDbContext>();
            ConfigureMongoOptions(options);
            return options;
        }
    }

    private sealed class InspectableTaskManagementMongoPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : TaskManagementMongoPersistenceModule(serviceProvider, configuration)
    {
        public PlatformMongoOptions<TaskManagementDbContext> ReadMongoOptions()
        {
            var options = new PlatformMongoOptions<TaskManagementDbContext>();
            ConfigureMongoOptions(options);
            return options;
        }
    }
}
