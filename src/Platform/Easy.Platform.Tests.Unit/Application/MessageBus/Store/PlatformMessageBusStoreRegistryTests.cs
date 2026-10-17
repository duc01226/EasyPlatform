using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Tests.Unit.Common.Modules;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Store;

/// <summary>
/// Executable contract coverage for the provider-neutral message-store composition boundary.
/// These tests intentionally construct contributions directly so the registry is exercised without a database,
/// broker, provider module, connection string, or unqualified repository lookup.
/// </summary>
public sealed class PlatformMessageBusStoreRegistryTests : PlatformModuleTestBase
{
    private const string SecretSentinel = "super-secret-sentinel";
    private const string SecretLookingApplicationName = "Password=" + SecretSentinel;

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-101")]
    public void SingleBinding_ResolvesThroughLegacyDefault_AndExposesTheSelectedApplicationName()
    {
        var key = new PlatformMessageBusStoreKey(" Default ");
        var applicationLane = CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement");
        var persistenceStore = CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext));

        var registry = new PlatformMessageBusStoreRegistry(
            [applicationLane],
            [persistenceStore],
            [new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule))]);

        var descriptor = registry.Get(PlatformMessageBusStoreKey.Default);

        descriptor.StoreKey.Should().Be(PlatformMessageBusStoreKey.Default);
        descriptor.GetSingleApplicationLane().ApplicationName.Should().Be("TaskManagement");
        registry.ResolveLegacyDefault().Should().BeSameAs(descriptor);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-101")]
    public void StrictLegacyDefault_RejectsMultipleExplicitStores_EvenWhenOneUsesTheDefaultKey()
    {
        var defaultKey = PlatformMessageBusStoreKey.Default;
        var secondKey = new PlatformMessageBusStoreKey("Store-B");
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(defaultKey, typeof(FirstApplicationModule), "TaskManagement"),
                CreateApplicationLane(secondKey, typeof(SecondApplicationModule), "Reporting")
            ],
            [
                CreatePersistenceStore(defaultKey, typeof(FirstPersistenceModule), typeof(FirstDbContext)),
                CreatePersistenceStore(secondKey, typeof(SecondPersistenceModule), typeof(SecondDbContext))
            ],
            [
                new PlatformMessageBusStoreBinding(defaultKey, typeof(FirstApplicationModule), typeof(FirstPersistenceModule)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(SecondApplicationModule), typeof(SecondPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: true);

        var act = () => registry.Get(PlatformMessageBusStoreKey.Default);

        act.Should().Throw<InvalidOperationException>().WithMessage("*legacy message-bus store path is ambiguous*");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-109")]
    public void NonStrictLegacyDefault_RejectsMultipleExplicitStores_InsteadOfSelectingTheLastBinding()
    {
        // Bindings are an explicit API with no legacy last-wins behavior. Selecting the last binding would route an
        // unqualified producer of one module into another module's store and transaction.
        var firstKey = new PlatformMessageBusStoreKey("Store-A");
        var secondKey = new PlatformMessageBusStoreKey("Store-B");
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(firstKey, typeof(FirstApplicationModule), "TaskManagement"),
                CreateApplicationLane(secondKey, typeof(SecondApplicationModule), "Reporting")
            ],
            [
                CreatePersistenceStore(firstKey, typeof(FirstPersistenceModule), typeof(FirstDbContext)),
                CreatePersistenceStore(secondKey, typeof(SecondPersistenceModule), typeof(SecondDbContext))
            ],
            [
                new PlatformMessageBusStoreBinding(firstKey, typeof(FirstApplicationModule), typeof(FirstPersistenceModule)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(SecondApplicationModule), typeof(SecondPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: false);

        registry.Invoking(item => item.ResolveLegacyDefault())
            .Should().Throw<InvalidOperationException>().WithMessage("*multiple explicitly bound stores exist*");
        registry.Invoking(item => item.Get(PlatformMessageBusStoreKey.Default))
            .Should().Throw<InvalidOperationException>().WithMessage("*multiple explicitly bound stores exist*");
        registry.Get(secondKey).GetSingleApplicationLane().ApplicationName.Should().Be("Reporting", "an explicit key still resolves");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-109")]
    public void NonStrictLegacyDefault_WithoutBindings_KeepsTheLegacyLastRegistrationForCompatiblePairs()
    {
        var key = PlatformMessageBusStoreKey.Default;
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement"),
                CreateApplicationLane(key, typeof(SecondApplicationModule), "Reporting")
            ],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            [],
            isStrictCompositionValidationEnabled: false);

        registry.ResolveLegacyDefault().GetSingleApplicationLane().ApplicationName
            .Should().Be("Reporting", "unbound compatible pairs mirror legacy DI, where the last registration wins");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-110")]
    public void TryGet_ReturnsFalseForEmptyOrUnboundKeys_AndNeverThrows()
    {
        var key = new PlatformMessageBusStoreKey("Store-A");
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement")],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            [new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule))]);

        PlatformMessageBusStoreDescriptor emptyDescriptor = null!;
        PlatformMessageBusStoreDescriptor unboundDescriptor = null!;
        var emptyLookup = () => registry.TryGet(default, out emptyDescriptor);
        var unboundLookup = () => registry.TryGet(new PlatformMessageBusStoreKey("Store-Missing"), out unboundDescriptor);

        emptyLookup.Should().NotThrow().Which.Should().BeFalse();
        emptyDescriptor.Should().BeNull();
        unboundLookup.Should().NotThrow().Which.Should().BeFalse();
        unboundDescriptor.Should().BeNull();
        registry.TryGet(key, out var boundDescriptor).Should().BeTrue();
        boundDescriptor.StoreKey.Should().Be(key);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-101")]
    public void LegacyApplicationLookup_ResolvesTheSingleCompatiblePairWithoutAnExplicitBinding()
    {
        var key = PlatformMessageBusStoreKey.Default;
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement")],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            []);

        registry.GetForApplication(typeof(FirstApplicationModule))
            .GetSingleApplicationLane()
            .ApplicationName
            .Should()
            .Be("TaskManagement");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-102")]
    public void DistinctBindings_EnumerateDeterministically_AndResolveTheirOwnLaneContracts()
    {
        var firstKey = new PlatformMessageBusStoreKey("Store-A");
        var secondKey = new PlatformMessageBusStoreKey("Store-B");
        var firstApplication = CreateApplicationLane(firstKey, typeof(FirstApplicationModule), "TaskManagement", 101);
        var secondApplication = CreateApplicationLane(secondKey, typeof(SecondApplicationModule), "Reporting", 202);
        var firstPersistence = CreatePersistenceStore(
            firstKey,
            typeof(FirstPersistenceModule),
            typeof(FirstDbContext),
            typeof(FirstInboxRepository),
            typeof(FirstOutboxRepository),
            typeof(FirstUnitOfWorkManager));
        var secondPersistence = CreatePersistenceStore(
            secondKey,
            typeof(SecondPersistenceModule),
            typeof(SecondDbContext),
            typeof(SecondInboxRepository),
            typeof(SecondOutboxRepository),
            typeof(SecondUnitOfWorkManager));

        var registry = new PlatformMessageBusStoreRegistry(
            [secondApplication, firstApplication],
            [secondPersistence, firstPersistence],
            [
                new PlatformMessageBusStoreBinding(secondKey, typeof(SecondApplicationModule), typeof(SecondPersistenceModule)),
                new PlatformMessageBusStoreBinding(firstKey, typeof(FirstApplicationModule), typeof(FirstPersistenceModule))
            ]);

        registry.Descriptors.Select(descriptor => descriptor.StoreKey.Value).Should().Equal("Store-A", "Store-B");

        using var serviceProvider = new Microsoft.Extensions.DependencyInjection.ServiceCollection().BuildServiceProvider();
        var firstDescriptor = registry.GetForApplication(typeof(FirstApplicationModule));
        var secondDescriptor = registry.GetForApplication(typeof(SecondApplicationModule));

        firstDescriptor.ApplicationLanes.Should().ContainSingle().Which.ApplicationName.Should().Be("TaskManagement");
        firstDescriptor.InboxRepositoryServiceType.Should().Be(typeof(FirstInboxRepository));
        firstDescriptor.OutboxRepositoryServiceType.Should().Be(typeof(FirstOutboxRepository));
        firstDescriptor.UnitOfWorkManagerServiceType.Should().Be(typeof(FirstUnitOfWorkManager));
        firstDescriptor.ResolveInboxConfig(serviceProvider, typeof(FirstApplicationModule)).MaxStoreProcessedMessageCount.Should().Be(101);
        firstDescriptor.ResolveOutboxConfig(serviceProvider, typeof(FirstApplicationModule)).MaxStoreProcessedMessageCount.Should().Be(101);

        secondDescriptor.ApplicationLanes.Should().ContainSingle().Which.ApplicationName.Should().Be("Reporting");
        secondDescriptor.InboxRepositoryServiceType.Should().Be(typeof(SecondInboxRepository));
        secondDescriptor.OutboxRepositoryServiceType.Should().Be(typeof(SecondOutboxRepository));
        secondDescriptor.UnitOfWorkManagerServiceType.Should().Be(typeof(SecondUnitOfWorkManager));
        secondDescriptor.ResolveInboxConfig(serviceProvider, typeof(SecondApplicationModule)).MaxStoreProcessedMessageCount.Should().Be(202);
        secondDescriptor.ResolveOutboxConfig(serviceProvider, typeof(SecondApplicationModule)).MaxStoreProcessedMessageCount.Should().Be(202);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-103")]
    public void CompatibleApplicationAliasesShareOneDescriptor_ButConflictingPersistenceContractsFail()
    {
        var key = new PlatformMessageBusStoreKey("Shared");
        // The lane identity carries a secret-looking value so a conflict diagnostic that echoed lane input would leak it.
        var firstApplication = CreateApplicationLane(key, typeof(FirstApplicationModule), SecretLookingApplicationName);
        var secondApplication = CreateApplicationLane(key, typeof(SecondApplicationModule), "Reporting");
        var persistenceStore = CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext));

        var compatibleRegistry = new PlatformMessageBusStoreRegistry(
            [firstApplication, secondApplication],
            [persistenceStore],
            [
                new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule)),
                new PlatformMessageBusStoreBinding(key, typeof(SecondApplicationModule), typeof(FirstPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: true);

        compatibleRegistry.Validate();
        compatibleRegistry.Descriptors.Should().ContainSingle();
        compatibleRegistry.Descriptors.Single().ApplicationLanes.Select(lane => lane.ApplicationName)
            .Should()
            .Equal(SecretLookingApplicationName, "Reporting");

        var conflictingRegistry = new PlatformMessageBusStoreRegistry(
            [firstApplication],
            [
                persistenceStore,
                CreatePersistenceStore(
                    key,
                    typeof(SecondPersistenceModule),
                    typeof(SecondDbContext),
                    typeof(SecondInboxRepository),
                    typeof(SecondOutboxRepository),
                    typeof(SecondUnitOfWorkManager))
            ],
            [new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule))],
            isStrictCompositionValidationEnabled: true);

        var act = () => conflictingRegistry.Validate();

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*conflicting persistence contracts*")
            .Which.Message.Should().Contain(typeof(FirstDbContext).FullName)
            .And.Contain(typeof(SecondDbContext).FullName)
            .And.NotContain(SecretSentinel)
            .And.NotContain("Password=");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-104")]
    public void RepeatedApplicationModuleRegistration_ProducesOneSharedMessageBusInfrastructureSet_AndOneLanePerModule()
    {
        var (services, configuration) = NewHost();
        var firstModule = CreateModule<FirstApplicationModule>(services, configuration);
        var secondModule = CreateModule<SecondApplicationModule>(services, configuration);

        firstModule.RegisterServices(services);
        var countsAfterFirstModule = GetMessageBusRegistrationCounts(services);

        secondModule.RegisterServices(services);
        var countsAfterSecondModule = GetMessageBusRegistrationCounts(services);

        countsAfterSecondModule.Should().BeEquivalentTo(countsAfterFirstModule);
        // Equivalence alone passes when every count is zero, e.g. if the shared infrastructure silently stopped
        // registering. Each shared registration must exist exactly once.
        countsAfterFirstModule.Should().BeEquivalentTo(new RegistrationCounts(1, 1, 1, 1, 1, 1, 1, 1, 1));
        services.Where(descriptor => descriptor.ServiceType == typeof(PlatformMessageBusApplicationLaneRegistration))
            .Should()
            .HaveCount(2);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusStoreRegistry)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusScanner)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformApplicationBusMessageProducer)).Should().Be(1);
        services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformKeyedApplicationBusMessageProducer)).Should().Be(1);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-105")]
    public void CompositionDiagnostics_ContainOnlyLogicalOwnershipInformation()
    {
        var key = new PlatformMessageBusStoreKey("Sensitive-proof");
        // Seed secrets where a leak could originate: the lane identity and the configuration captured by the lane's
        // config factories. The diagnostic may carry only the module type, the logical key, and rule text.
        var registry = new PlatformMessageBusStoreRegistry(
            [
                new PlatformMessageBusApplicationLaneRegistration(
                    key,
                    typeof(FirstApplicationModule),
                    SecretLookingApplicationName,
                    typeof(FirstApplicationModule).Assembly,
                    _ => new PlatformInboxConfig { MaxStoreProcessedMessageCount = SecretSentinel.Length },
                    _ => new PlatformOutboxConfig { MaxStoreProcessedMessageCount = SecretSentinel.Length })
            ],
            [],
            [],
            isStrictCompositionValidationEnabled: true);

        var act = () => registry.Validate();

        act.Should().Throw<InvalidOperationException>()
            .Which.Message.Should().Be(
                $"Message-bus store composition is invalid: Application lane '{typeof(FirstApplicationModule).FullName}' with key 'Sensitive-proof' has no explicit store binding.")
            .And.NotContain(SecretSentinel);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-106")]
    public void StrictSeederValidation_RequiresExactlyOneApplicationOwner_AndAllowsExplicitExternalSeeders()
    {
        var key = new PlatformMessageBusStoreKey("Seeders");
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(
                    key,
                    typeof(FirstApplicationModule),
                    "TaskManagement",
                    seeders: [typeof(FirstSeeder), typeof(ExternalSeeder)]),
                CreateApplicationLane(key, typeof(SecondApplicationModule), "Reporting", seeders: [typeof(SecondSeeder)])
            ],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            [
                new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule)),
                new PlatformMessageBusStoreBinding(key, typeof(SecondApplicationModule), typeof(FirstPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: true);

        registry.ValidateSeederOwnership([typeof(FirstSeeder), typeof(SecondSeeder), typeof(ExternalSeeder)]);

        var zeroOwnerAct = () => registry.ValidateSeederOwnership([typeof(FirstSeeder), typeof(UnknownSeeder)]);
        zeroOwnerAct.Should().Throw<InvalidOperationException>().WithMessage("*no application-lane owner*");

        var multiOwnerRegistry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement", seeders: [typeof(SharedSeeder)]),
                CreateApplicationLane(key, typeof(SecondApplicationModule), "Reporting", seeders: [typeof(SharedSeeder)])
            ],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            [
                new PlatformMessageBusStoreBinding(key, typeof(FirstApplicationModule), typeof(FirstPersistenceModule)),
                new PlatformMessageBusStoreBinding(key, typeof(SecondApplicationModule), typeof(FirstPersistenceModule))
            ],
            isStrictCompositionValidationEnabled: true);

        var multiOwnerAct = () => multiOwnerRegistry.ValidateSeederOwnership([typeof(SharedSeeder)]);
        multiOwnerAct.Should().Throw<InvalidOperationException>().WithMessage("*2 application-lane owners*");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-107")]
    public void LegacyHostWithoutStoreContributions_StaysOnLegacyPath_AndResolvesWithoutThrowing()
    {
        // A legacy service registers several application lanes under the default key but no persistence module opts in
        // to store contribution, so the registry must report no composition instead of failing registration.
        var registry = new PlatformMessageBusStoreRegistry(
            [
                CreateApplicationLane(PlatformMessageBusStoreKey.Default, typeof(FirstApplicationModule), "Surveys"),
                CreateApplicationLane(new PlatformMessageBusStoreKey("Custom"), typeof(SecondApplicationModule), "Surveys.Execution")
            ],
            [],
            []);

        registry.HasRuntimeStoreComposition.Should().BeFalse();
        registry.Invoking(item => item.Validate()).Should().NotThrow();
        registry.TryResolveUnboundLegacyDefault().Should().BeNull();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-107")]
    public void MigrationOnlyContribution_DoesNotCountAsRuntimeComposition()
    {
        var key = PlatformMessageBusStoreKey.Default;
        var migrationOnlyStore = new PlatformPersistenceMessageBusStoreRegistration(
            key,
            typeof(FirstPersistenceModule),
            typeof(FirstDbContext),
            null!,
            null!,
            null!,
            null!,
            null!,
            null!,
            isRuntimeEnabled: false);
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement")],
            [migrationOnlyStore],
            []);

        registry.HasRuntimeStoreComposition.Should().BeFalse();
        registry.TryResolveUnboundLegacyDefault().Should().BeNull();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-107")]
    public void RuntimeContribution_EnablesComposition_AndResolvesTheSingleCompatiblePair()
    {
        var key = PlatformMessageBusStoreKey.Default;
        var registry = new PlatformMessageBusStoreRegistry(
            [CreateApplicationLane(key, typeof(FirstApplicationModule), "TaskManagement")],
            [CreatePersistenceStore(key, typeof(FirstPersistenceModule), typeof(FirstDbContext))],
            []);

        registry.HasRuntimeStoreComposition.Should().BeTrue();
        registry.TryResolveUnboundLegacyDefault()!.GetSingleApplicationLane().ApplicationName.Should().Be("TaskManagement");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-108")]
    public void ApplicationLane_WithoutExplicitName_UsesTheHostConfiguredApplicationName()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<UnnamedApplicationModule>(services, configuration);

        module.RegisterServices(services);

        var laneDescriptor = services.Single(descriptor => descriptor.ServiceType == typeof(PlatformMessageBusApplicationLaneRegistration));
        laneDescriptor.ImplementationFactory.Should().NotBeNull("the lane name must be resolved from the final provider");

        var settingContext = new Mock<IPlatformApplicationSettingContext>();
        settingContext.SetupGet(context => context.ApplicationName).Returns("Configured.Host.Name");
        using var provider = new ServiceCollection()
            .AddSingleton(settingContext.Object)
            .BuildServiceProvider();

        var lane = (PlatformMessageBusApplicationLaneRegistration)laneDescriptor.ImplementationFactory!(provider);

        lane.ApplicationName.Should().Be("Configured.Host.Name");
        lane.ApplicationName.Should().NotBe(typeof(UnnamedApplicationModule).Assembly.GetName().Name);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-STORE-108")]
    public void ApplicationLane_WithExplicitName_IgnoresTheHostConfiguredApplicationName()
    {
        var (services, configuration) = NewHost();
        var module = CreateModule<FirstApplicationModule>(services, configuration);

        module.RegisterServices(services);

        var laneDescriptor = services.Single(descriptor => descriptor.ServiceType == typeof(PlatformMessageBusApplicationLaneRegistration));
        var settingContext = new Mock<IPlatformApplicationSettingContext>();
        settingContext.SetupGet(context => context.ApplicationName).Returns("Configured.Host.Name");
        using var provider = new ServiceCollection()
            .AddSingleton(settingContext.Object)
            .BuildServiceProvider();

        var lane = (PlatformMessageBusApplicationLaneRegistration)laneDescriptor.ImplementationFactory!(provider);

        lane.ApplicationName.Should().Be("FirstApplication");
    }

    private static RegistrationCounts GetMessageBusRegistrationCounts(IServiceCollection services)
    {
        // Hosted workers are counted by their concrete singleton registration. RegisterHostedService adds that one to
        // every service collection, while the IHostedService forwarding descriptor is factory-based (no
        // ImplementationType) and gated by process-wide static state, so it cannot be counted per collection.
        return new RegistrationCounts(
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformInboxConfig)),
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformOutboxConfig)),
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformInboxBusMessageCleanerHostedService)),
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformConsumeInboxBusMessageHostedService)),
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformOutboxBusMessageCleanerHostedService)),
            services.Count(descriptor => descriptor.ServiceType == typeof(PlatformSendOutboxBusMessageHostedService)),
            services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusScanner)),
            services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformApplicationBusMessageProducer)),
            services.Count(descriptor => descriptor.ServiceType == typeof(IPlatformMessageBusStoreRegistry)));
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateApplicationLane(
        PlatformMessageBusStoreKey key,
        Type moduleType,
        string applicationName,
        int configurationMarker = 1,
        params Type[] seeders)
    {
        return new PlatformMessageBusApplicationLaneRegistration(
            key,
            moduleType,
            applicationName,
            moduleType.Assembly,
            _ => new PlatformInboxConfig { MaxStoreProcessedMessageCount = configurationMarker },
            _ => new PlatformOutboxConfig { MaxStoreProcessedMessageCount = configurationMarker },
            seeders);
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePersistenceStore(
        PlatformMessageBusStoreKey key,
        Type ownerType,
        Type contextType,
        Type inboxRepositoryType = null!,
        Type outboxRepositoryType = null!,
        Type unitOfWorkManagerType = null!)
    {
        var inboxRepository = new Mock<IPlatformInboxBusMessageRepository>().Object;
        var outboxRepository = new Mock<IPlatformOutboxBusMessageRepository>().Object;
        var unitOfWorkManager = new Mock<IPlatformUnitOfWorkManager>().Object;

        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            ownerType,
            contextType,
            inboxRepositoryType,
            outboxRepositoryType,
            unitOfWorkManagerType,
            _ => inboxRepository,
            _ => outboxRepository,
            _ => unitOfWorkManager);
    }

    private sealed record RegistrationCounts(
        int InboxConfig,
        int OutboxConfig,
        int InboxCleaner,
        int InboxConsumer,
        int OutboxCleaner,
        int OutboxSender,
        int Scanner,
        int Producer,
        int Registry);

    private sealed class FirstApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestApplicationModule(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("First");

        public override string MessageBusApplicationName => "FirstApplication";
    }

    private sealed class SecondApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestApplicationModule(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("Second");

        public override string MessageBusApplicationName => "SecondApplication";
    }

    private sealed class UnnamedApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : TestApplicationModule(serviceProvider, configuration)
    {
        public override PlatformMessageBusStoreKey MessageBusStoreKey => new("Unnamed");
    }

    private abstract class TestApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : Easy.Platform.Application.PlatformApplicationModule(serviceProvider, configuration)
    {
        protected override bool EnableDefaultCachingModule => false;

        public override bool AutoClearMemoryEnabled => false;

        public override List<Assembly> GetAssembliesForServiceScanning() => [];
    }

    private sealed class FirstPersistenceModule;
    private sealed class SecondPersistenceModule;
    private sealed class FirstDbContext;
    private sealed class SecondDbContext;
    private sealed class FirstInboxRepository;
    private sealed class SecondInboxRepository;
    private sealed class FirstOutboxRepository;
    private sealed class SecondOutboxRepository;
    private sealed class FirstUnitOfWorkManager;
    private sealed class SecondUnitOfWorkManager;
    private sealed class FirstSeeder;
    private sealed class SecondSeeder;
    private sealed class ExternalSeeder;
    private sealed class UnknownSeeder;
    private sealed class SharedSeeder;
}
