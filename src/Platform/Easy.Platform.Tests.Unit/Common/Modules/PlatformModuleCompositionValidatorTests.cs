using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.Modules;

/// <summary>
/// Executable contracts for strict root composition validation. The fixtures use provider-neutral metadata so these
/// tests prove the modular boundary without opening a database, broker, or physical persistence connection.
/// </summary>
public sealed class PlatformModuleCompositionValidatorTests : PlatformModuleTestBase
{
    /// <summary>
    /// A framework assembly that owns no application lane component. Lanes placed here leave every component declared
    /// in this test assembly covered by exactly the lanes a test intends.
    /// </summary>
    private static readonly Assembly ForeignLaneAssembly = typeof(object).Assembly;

    private const string SentinelConnectionString = "Server=sentinel-db.internal;User Id=sa;Password=super-secret-sentinel";
    private const string SentinelSecret = "super-secret-sentinel";
    private const string SentinelPayload = "message-payload-sentinel";

    [Theory]
    [InlineData("Tasks")]
    [InlineData("Reporting")]
    [InlineData("Auditing")]
    [Trait("TechnicalSpec", "TC-COMP-101")]
    public void EverySingleLaneWithOneCompatibleStore_PassesStrictValidation(string keyValue)
    {
        var key = new PlatformMessageBusStoreKey(keyValue);
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), keyValue)],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        var act = () => Validate(setup);

        act.Should().NotThrow("every single-lane composition with a compatible contract must be accepted");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-101")]
    public void SingleExplicitBinding_WithOneApplicationLane_PassesStrictValidation()
    {
        var key = new PlatformMessageBusStoreKey("Tasks");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        var act = () => Validate(setup);

        act.Should().NotThrow();
        setup.Registry.GetForApplication(typeof(ApplicationLaneA)).StoreKey.Should().Be(key);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-102")]
    public void DistinctApplicationAndPersistencePairs_PassAndRetainIndependentMappings()
    {
        var firstKey = new PlatformMessageBusStoreKey("Tasks");
        var secondKey = new PlatformMessageBusStoreKey("Reporting");
        var setup = CreateComposition(
            [
                CreateApplicationLane(firstKey, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(secondKey, typeof(ApplicationLaneB), "Reporting")
            ],
            [
                CreatePersistenceStore(firstKey, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)),
                CreatePersistenceStore(secondKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB))
            ],
            [
                new PlatformMessageBusStoreBinding(firstKey, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(ApplicationLaneB), typeof(PersistenceOwnerB))
            ]);

        var act = () => Validate(setup);

        act.Should().NotThrow();
        setup.Registry.GetForApplication(typeof(ApplicationLaneA)).PersistenceContextType.Should().Be(typeof(ContextA));
        setup.Registry.GetForApplication(typeof(ApplicationLaneB)).PersistenceContextType.Should().Be(typeof(ContextB));
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-103")]
    public void CompatibleApplicationAliases_OnOnePersistenceContract_PassStrictValidation()
    {
        var key = new PlatformMessageBusStoreKey("Shared");
        var setup = CreateComposition(
            [
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(key, typeof(ApplicationLaneB), "Reporting")
            ],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceOwnerA))
            ]);

        var act = () => Validate(setup);

        act.Should().NotThrow();
        setup.Registry.Descriptors.Should().ContainSingle()
            .Which.ApplicationLanes.Select(lane => lane.ApplicationName).Should().Equal("Reporting", "Tasks");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-104")]
    public void MissingBinding_FailsWithStableApplicationAndKeyDiagnostics()
    {
        var key = new PlatformMessageBusStoreKey("Unbound");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            []);

        var act = () => Validate(setup);

        var exception = act.Should().Throw<PlatformModuleCompositionException>().Which;
        exception.Message.Should().Contain(typeof(ApplicationLaneA).FullName)
            .And.Contain("Unbound")
            .And.Contain("no explicit store binding");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-118")]
    public void DuplicateApplicationLaneIdentity_FailsBeforeReadiness()
    {
        var key = new PlatformMessageBusStoreKey("Duplicate");
        var setup = CreateComposition(
            [
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks-Again")
            ],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("contributed 2 message-bus lanes")
            .And.Contain(typeof(ApplicationLaneA).FullName);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-119")]
    public void PartialRepositoryContract_IsNotSilentlyTreatedAsDisabled()
    {
        var key = new PlatformMessageBusStoreKey("Partial");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePartialPersistenceStore(key)],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("incomplete inbox repository contract")
            .And.Contain("Partial");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-120")]
    public void DuplicateConsumerType_IsReportedAsDuplicateIdentity()
    {
        var key = new PlatformMessageBusStoreKey("Consumer");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        setup.Options = CreateOptions(setup.Services, setup.Registry, registeredConsumerTypes: [typeof(DuplicateConsumer), typeof(DuplicateConsumer)]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("consumer identity")
            .And.Contain(typeof(DuplicateConsumer).FullName);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-121")]
    public void MultiStoreComposition_RejectsAnUnqualifiedConsumerRoute()
    {
        var firstKey = new PlatformMessageBusStoreKey("Tasks");
        var secondKey = new PlatformMessageBusStoreKey("Reporting");
        var setup = CreateComposition(
            [
                CreateApplicationLane(firstKey, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(secondKey, typeof(ApplicationLaneB), "Reporting")
            ],
            [
                CreatePersistenceStore(firstKey, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)),
                CreatePersistenceStore(secondKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB))
            ],
            [
                new PlatformMessageBusStoreBinding(firstKey, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(ApplicationLaneB), typeof(PersistenceOwnerB))
            ],
            registeredConsumerTypes: [typeof(UnqualifiedConsumer)]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("unqualified store path")
            .And.Contain(typeof(UnqualifiedConsumer).FullName);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-121")]
    public void MultiStoreComposition_AcceptsAConsumerWithAnExplicitStoreRoute()
    {
        var firstKey = new PlatformMessageBusStoreKey("Tasks");
        var secondKey = new PlatformMessageBusStoreKey("Reporting");
        var setup = CreateComposition(
            [
                CreateApplicationLane(firstKey, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(secondKey, typeof(ApplicationLaneB), "Reporting", ForeignLaneAssembly)
            ],
            [
                CreatePersistenceStore(firstKey, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)),
                CreatePersistenceStore(secondKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB))
            ],
            [
                new PlatformMessageBusStoreBinding(firstKey, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(ApplicationLaneB), typeof(PersistenceOwnerB))
            ],
            registeredConsumerTypes: [typeof(RoutedConsumer)]);

        var act = () => Validate(setup);

        act.Should().NotThrow("a component that declares its logical store key must be allowed in a multi-store host");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-105")]
    public void StrictValidationOff_PreservesSingleStoreLegacyCompatibility()
    {
        // The composition is deliberately INVALID under strict rules (the lane has no explicit binding). A non-strict
        // run passing therefore proves validation is off, not that the composition happens to be valid.
        var key = PlatformMessageBusStoreKey.Default;
        var lanes = new[] { CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks") };
        var stores = new[] { CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)) };

        var nonStrictSetup = CreateComposition(lanes, stores, [], strict: false);
        var strictSetup = CreateComposition(lanes, stores, [], strict: true);

        var nonStrictAct = () => Validate(nonStrictSetup);
        var strictAct = () => Validate(strictSetup);

        strictAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Contain(
                $"Application lane '{typeof(ApplicationLaneA).FullName}' with key 'Default' has no explicit store binding.",
                "the same inputs must fail once strict validation is on");
        nonStrictAct.Should().NotThrow("strict validation is off, so existing single-store hosts start unchanged");
        nonStrictSetup.Registry.GetForApplication(typeof(ApplicationLaneA)).StoreKey.Should().Be(key);
        nonStrictSetup.Registry.ResolveLegacyDefault().GetSingleApplicationLane().ApplicationName.Should().Be("Tasks");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-106")]
    public void CompositionDiagnostics_ContainOnlyLogicalTypeAndKeyInformation()
    {
        var key = new PlatformMessageBusStoreKey("Sensitive-proof");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [],
            [],
            configurationValues: new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = SentinelConnectionString,
                ["Messaging:ApiToken"] = SentinelSecret
            });

        // Seed every place a leak could originate: configuration, a secret-bearing registered instance whose
        // ToString exposes the secret, and the service provider handed to the validator.
        setup.Services.AddSingleton(new SecretBearingService());
        setup.Options = CreateOptions(setup.Services, setup.Registry, serviceProvider: setup.Services.BuildServiceProvider());

        var act = () => Validate(setup);

        var exception = act.Should().Throw<PlatformModuleCompositionException>().Which;

        exception.Diagnostics.Should().BeEquivalentTo(
            [
                $"Application lane '{typeof(ApplicationLaneA).FullName}' with key 'Sensitive-proof' has no explicit store binding.",
                "Strict message-bus composition has no effective application lane."
            ],
            "diagnostics must hold only type names, logical keys, and rule text");
        exception.Message.Should().NotContain(SentinelSecret)
            .And.NotContain("sentinel-db")
            .And.NotContain(SentinelPayload)
            .And.NotContain("Password=");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-107")]
    public void SeederOwnership_RequiresOneOwner_AndAllowsSeveralSeedersDeclaredByOneLane()
    {
        var key = new PlatformMessageBusStoreKey("Seeders");
        var validSetup = CreateComposition(
            [
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks", typeof(OwnedSeeder), typeof(ExternalSeeder)),
                CreateApplicationLane(key, typeof(ApplicationLaneB), "Reporting")
            ],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceOwnerA))
            ],
            registeredSeederTypes: [typeof(OwnedSeeder), typeof(ExternalSeeder)]);

        var validAct = () => Validate(validSetup);
        validAct.Should().NotThrow();

        var zeroOwnerSetup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))],
            registeredSeederTypes: [typeof(UnownedSeeder)]);

        var zeroOwnerAct = () => Validate(zeroOwnerSetup);
        zeroOwnerAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("no application-lane owner")
            .And.Contain(typeof(UnownedSeeder).FullName);

        var multiOwnerSetup = CreateComposition(
            [
                CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks", typeof(SharedSeeder)),
                CreateApplicationLane(key, typeof(ApplicationLaneB), "Reporting", typeof(SharedSeeder))
            ],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceOwnerA))
            ],
            registeredSeederTypes: [typeof(SharedSeeder)]);

        var multiOwnerAct = () => Validate(multiOwnerSetup);
        multiOwnerAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Message.Should().Contain("2 application-lane owners")
            .And.Contain(typeof(SharedSeeder).FullName);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-109")]
    public void InboxStore_RequiresScannerAndInboxWorkers()
    {
        var key = new PlatformMessageBusStoreKey("Inbox");
        var lanes = new[] { CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks") };
        var stores = new[] { CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA), inboxRepositoryType: typeof(InboxRepositoryA)) };
        var bindings = new[] { new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)) };

        var missingSetup = CreateComposition(lanes, stores, bindings);
        var registeredSetup = CreateComposition(lanes, stores, bindings);
        registeredSetup.Options = CreateOptions(registeredSetup.Services, registeredSetup.Registry, infrastructureRegistered: true);

        var missingAct = () => Validate(missingSetup);
        var registeredAct = () => Validate(registeredSetup);

        missingAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().BeEquivalentTo(
                "Required message-bus scanner registration is not present in the final service collection.",
                "Required inbox consumer worker registration is not present in the final service collection.",
                "Required inbox cleaner worker registration is not present in the final service collection.");
        registeredAct.Should().NotThrow("an inbox store with the scanner and both inbox workers registered is complete");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-110")]
    public void OutboxStore_RequiresProducersAndOutboxWorkers()
    {
        var key = new PlatformMessageBusStoreKey("Outbox");
        var lanes = new[] { CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks") };
        var stores = new[] { CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA), outboxRepositoryType: typeof(OutboxRepositoryA)) };
        var bindings = new[] { new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)) };

        var missingSetup = CreateComposition(lanes, stores, bindings);
        var registeredSetup = CreateComposition(lanes, stores, bindings);
        registeredSetup.Options = CreateOptions(registeredSetup.Services, registeredSetup.Registry, infrastructureRegistered: true);

        var missingAct = () => Validate(missingSetup);
        var registeredAct = () => Validate(registeredSetup);

        missingAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().BeEquivalentTo(
                "Required application message-bus producer registration is not present in the final service collection.",
                "Required keyed application message-bus producer registration is not present in the final service collection.",
                "Required outbox sender worker registration is not present in the final service collection.",
                "Required outbox cleaner worker registration is not present in the final service collection.");
        registeredAct.Should().NotThrow("an outbox store with both producers and both outbox workers registered is complete");
    }

    [Theory]
    [InlineData(0, "Strict application composition requires one unqualified IPlatformApplicationSettingContext registration.")]
    [InlineData(2, "Strict application composition has 2 unqualified IPlatformApplicationSettingContext registrations; exactly one is supported.")]
    [Trait("TechnicalSpec", "TC-COMP-111")]
    public void ApplicationLanes_RequireExactlyOneApplicationSettingContext(int settingContextRegistrations, string expectedDiagnostic)
    {
        var key = new PlatformMessageBusStoreKey("Tasks");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))],
            settingContextRegistrations: settingContextRegistrations);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal(expectedDiagnostic);
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-112")]
    public void AliasedStore_RequiresComponentsToSelectAnApplicationLane()
    {
        var key = new PlatformMessageBusStoreKey("Shared");
        var lanes = new[]
        {
            CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks"),
            CreateApplicationLane(key, typeof(ApplicationLaneB), "Reporting", ForeignLaneAssembly)
        };
        var stores = new[] { CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)) };
        var bindings = new[]
        {
            new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
            new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneB), typeof(PersistenceOwnerA))
        };

        var unqualifiedSetup = CreateComposition(lanes, stores, bindings, registeredConsumerTypes: [typeof(UnqualifiedConsumer)]);
        var routedSetup = CreateComposition(lanes, stores, bindings, registeredConsumerTypes: [typeof(ApplicationNameRoutedConsumer)]);

        var unqualifiedAct = () => Validate(unqualifiedSetup);
        var routedAct = () => Validate(routedSetup);

        unqualifiedAct.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal(
                $"Message-bus consumer '{typeof(UnqualifiedConsumer).FullName}' uses an unqualified application lane while a store has multiple application lanes; override MessageBusApplicationName or use an explicit keyed consumer route.");
        routedAct.Should().NotThrow("a component that names its application lane may share an aliased store");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-113")]
    public void StrictComposition_WithoutAnyEffectiveLane_Fails()
    {
        var setup = CreateComposition([], [], []);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal("Strict message-bus composition has no effective application lane.");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-114")]
    public void UnboundRuntimePersistenceStore_Fails()
    {
        var key = new PlatformMessageBusStoreKey("Tasks");
        var orphanKey = new PlatformMessageBusStoreKey("Orphan");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks")],
            [
                CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)),
                CreatePersistenceStore(orphanKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB))
            ],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal(
                $"Runtime persistence store 'Orphan' owned by '{typeof(PersistenceOwnerB).FullName}' is not explicitly bound to an application lane.");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-115")]
    public void Producer_NotCoveredByAnApplicationLane_Fails()
    {
        var key = new PlatformMessageBusStoreKey("Tasks");
        var setup = CreateComposition(
            [CreateApplicationLane(key, typeof(ApplicationLaneA), "Tasks", ForeignLaneAssembly)],
            [CreatePersistenceStore(key, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA))],
            [new PlatformMessageBusStoreBinding(key, typeof(ApplicationLaneA), typeof(PersistenceOwnerA))],
            registeredProducerTypes: [typeof(UnqualifiedProducer)]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal(
                $"Message-bus producer '{typeof(UnqualifiedProducer).FullName}' is not covered by an application lane.");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-116")]
    public void MultiStoreComposition_RejectsAnUnqualifiedProducerRoute()
    {
        var firstKey = new PlatformMessageBusStoreKey("Tasks");
        var secondKey = new PlatformMessageBusStoreKey("Reporting");
        var setup = CreateComposition(
            [
                CreateApplicationLane(firstKey, typeof(ApplicationLaneA), "Tasks"),
                CreateApplicationLane(secondKey, typeof(ApplicationLaneB), "Reporting", ForeignLaneAssembly)
            ],
            [
                CreatePersistenceStore(firstKey, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA)),
                CreatePersistenceStore(secondKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB))
            ],
            [
                new PlatformMessageBusStoreBinding(firstKey, typeof(ApplicationLaneA), typeof(PersistenceOwnerA)),
                new PlatformMessageBusStoreBinding(secondKey, typeof(ApplicationLaneB), typeof(PersistenceOwnerB))
            ],
            registeredProducerTypes: [typeof(UnqualifiedProducer)]);

        var act = () => Validate(setup);

        act.Should().Throw<PlatformModuleCompositionException>()
            .Which.Diagnostics.Should().Equal(
                $"Message-bus producer '{typeof(UnqualifiedProducer).FullName}' uses the unqualified store path while multiple stores are composed; override MessageBusStoreKey or use an explicit keyed producer route.");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-COMP-117")]
    public void Diagnostics_AreIdenticalForShuffledAndDuplicatedInputs()
    {
        var firstKey = new PlatformMessageBusStoreKey("Tasks");
        var secondKey = new PlatformMessageBusStoreKey("Reporting");
        var firstLane = CreateApplicationLane(firstKey, typeof(ApplicationLaneA), "Tasks", typeof(UnownedSeeder));
        var secondLane = CreateApplicationLane(secondKey, typeof(ApplicationLaneB), "Reporting", typeof(UnownedSeeder));
        var firstStore = CreatePersistenceStore(firstKey, typeof(PersistenceOwnerA), typeof(ContextA), typeof(UnitOfWorkManagerA), typeof(UnitOfWorkA));
        var secondStore = CreatePersistenceStore(secondKey, typeof(PersistenceOwnerB), typeof(ContextB), typeof(UnitOfWorkManagerB), typeof(UnitOfWorkB));

        var orderedSetup = CreateComposition(
            [firstLane, secondLane],
            [firstStore, secondStore],
            [],
            registeredSeederTypes: [typeof(UnownedSeeder), typeof(SharedSeeder)],
            registeredConsumerTypes: [typeof(DuplicateConsumer), typeof(DuplicateConsumer), typeof(UnqualifiedConsumer)],
            registeredProducerTypes: [typeof(UnqualifiedProducer)]);
        var shuffledSetup = CreateComposition(
            [secondLane, firstLane],
            [secondStore, firstStore],
            [],
            registeredSeederTypes: [typeof(SharedSeeder), typeof(UnownedSeeder), typeof(SharedSeeder)],
            // Seeder types are a set, so a repeated seeder is a pure duplicate. Consumer/producer registrations keep the
            // same multiset in a different order, because a repeated component registration is itself a diagnostic.
            registeredConsumerTypes: [typeof(UnqualifiedConsumer), typeof(DuplicateConsumer), typeof(DuplicateConsumer)],
            registeredProducerTypes: [typeof(UnqualifiedProducer)]);

        var orderedException = FluentActions.Invoking(() => Validate(orderedSetup)).Should().Throw<PlatformModuleCompositionException>().Which;
        var shuffledException = FluentActions.Invoking(() => Validate(shuffledSetup)).Should().Throw<PlatformModuleCompositionException>().Which;

        orderedException.Diagnostics.Should().HaveCountGreaterThan(3, "the fixture must exercise several rules at once");
        orderedException.Diagnostics.Should().OnlyHaveUniqueItems();
        orderedException.Diagnostics.Should().BeInAscendingOrder(StringComparer.Ordinal);
        shuffledException.Diagnostics.Should().Equal(orderedException.Diagnostics, "input order and duplicates must not change the diagnostics");
        shuffledException.Message.Should().Be(orderedException.Message);
    }

    private (IServiceCollection Services, PlatformMessageBusStoreRegistry Registry, PlatformModuleCompositionOptions Options) CreateComposition(
        IReadOnlyCollection<PlatformMessageBusApplicationLaneRegistration> applicationLanes,
        IReadOnlyCollection<PlatformPersistenceMessageBusStoreRegistration> persistenceStores,
        IReadOnlyCollection<PlatformMessageBusStoreBinding> bindings,
        IReadOnlyCollection<Type> registeredSeederTypes = null!,
        IReadOnlyCollection<Type> registeredConsumerTypes = null!,
        IReadOnlyCollection<Type> registeredProducerTypes = null!,
        bool strict = true,
        int settingContextRegistrations = 1,
        Dictionary<string, string?>? configurationValues = null)
    {
        var (services, _) = NewHost(configurationValues);
        var registry = new PlatformMessageBusStoreRegistry(applicationLanes, persistenceStores, bindings, strict);

        for (var index = 0; index < settingContextRegistrations; index++)
            services.AddSingleton<IPlatformApplicationSettingContext>(new Mock<IPlatformApplicationSettingContext>().Object);

        services.AddSingleton<IPlatformMessageBusStoreRegistry>(registry);

        foreach (var moduleType in applicationLanes.Select(lane => lane.ApplicationModuleType).Concat(persistenceStores.Select(store => store.PersistenceModuleType)).Distinct())
            services.AddSingleton(moduleType, moduleType);

        foreach (var serviceType in persistenceStores
                     .SelectMany(
                         store => new[]
                         {
                             store.UnitOfWorkManagerServiceType,
                             store.UnitOfWorkServiceType,
                             store.InboxRepositoryServiceType,
                             store.OutboxRepositoryServiceType
                         })
                     .Where(type => type != null)
                     .Distinct())
            services.AddSingleton(serviceType, serviceType);

        var options = CreateOptions(services, registry, registeredSeederTypes, registeredConsumerTypes, registeredProducerTypes, strict);

        return (services, registry, options);
    }

    private static PlatformModuleCompositionOptions CreateOptions(
        IServiceCollection services,
        PlatformMessageBusStoreRegistry registry,
        IReadOnlyCollection<Type> registeredSeederTypes = null!,
        IReadOnlyCollection<Type> registeredConsumerTypes = null!,
        IReadOnlyCollection<Type> registeredProducerTypes = null!,
        bool strict = true,
        bool infrastructureRegistered = false,
        IServiceProvider serviceProvider = null!)
    {
        return new PlatformModuleCompositionOptions
        {
            StrictValidationEnabled = strict,
            ServiceCollection = services,
            ServiceProvider = serviceProvider,
            MessageBusStoreRegistry = registry,
            RegisteredSeederTypes = registeredSeederTypes ?? [],
            RegisteredConsumerTypes = registeredConsumerTypes ?? [],
            RegisteredProducerTypes = registeredProducerTypes ?? [],
            ApplicationSettingContextRegistrationCount = services.Count(descriptor =>
                descriptor.ServiceType == typeof(IPlatformApplicationSettingContext)),
            HasMessageBusStoreRegistryRegistration = true,
            HasMessageBusScannerRegistration = infrastructureRegistered,
            HasInboxConsumerWorkerRegistration = infrastructureRegistered,
            HasInboxCleanerWorkerRegistration = infrastructureRegistered,
            HasApplicationProducerRegistration = infrastructureRegistered,
            HasKeyedApplicationProducerRegistration = infrastructureRegistered,
            HasOutboxSenderWorkerRegistration = infrastructureRegistered,
            HasOutboxCleanerWorkerRegistration = infrastructureRegistered
        };
    }

    private static void Validate(
        (IServiceCollection Services, PlatformMessageBusStoreRegistry Registry, PlatformModuleCompositionOptions Options) setup)
    {
        PlatformModuleCompositionValidator.Validate(setup.Options);
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateApplicationLane(
        PlatformMessageBusStoreKey key,
        Type moduleType,
        string applicationName,
        params Type[] seeders)
    {
        return CreateApplicationLane(key, moduleType, applicationName, moduleType.Assembly, seeders);
    }

    private static PlatformMessageBusApplicationLaneRegistration CreateApplicationLane(
        PlatformMessageBusStoreKey key,
        Type moduleType,
        string applicationName,
        Assembly applicationAssembly,
        params Type[] seeders)
    {
        return new PlatformMessageBusApplicationLaneRegistration(
            key,
            moduleType,
            applicationName,
            applicationAssembly,
            serviceProvider => new PlatformInboxConfig(),
            serviceProvider => new PlatformOutboxConfig(),
            seeders);
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePersistenceStore(
        PlatformMessageBusStoreKey key,
        Type ownerType,
        Type contextType,
        Type unitOfWorkManagerType,
        Type unitOfWorkType,
        Type inboxRepositoryType = null!,
        Type outboxRepositoryType = null!)
    {
        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            ownerType,
            contextType,
            inboxRepositoryType,
            outboxRepositoryType,
            unitOfWorkManagerType,
            inboxRepositoryType == null ? null! : _ => null!,
            outboxRepositoryType == null ? null! : _ => null!,
            _ => null!,
            unitOfWorkServiceType: unitOfWorkType,
            unitOfWorkFactory: _ => null!);
    }

    private static PlatformPersistenceMessageBusStoreRegistration CreatePartialPersistenceStore(PlatformMessageBusStoreKey key)
    {
        return new PlatformPersistenceMessageBusStoreRegistration(
            key,
            typeof(PersistenceOwnerA),
            typeof(ContextA),
            typeof(PartialInboxRepository),
            null,
            typeof(UnitOfWorkManagerA),
            null!,
            null!,
            _ => null!,
            unitOfWorkServiceType: typeof(UnitOfWorkA),
            unitOfWorkFactory: _ => null!);
    }

    public sealed class OwnedSeeder : IPlatformApplicationDataSeeder
    {
        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;
        public Task SeedData(bool isReplaceNewSeedData = false) => Task.CompletedTask;
    }

    public sealed class ExternalSeeder : IPlatformApplicationDataSeeder
    {
        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;
        public Task SeedData(bool isReplaceNewSeedData = false) => Task.CompletedTask;
    }

    public sealed class UnownedSeeder : IPlatformApplicationDataSeeder
    {
        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;
        public Task SeedData(bool isReplaceNewSeedData = false) => Task.CompletedTask;
    }

    public sealed class SharedSeeder : IPlatformApplicationDataSeeder
    {
        public int SeedOrder => 0;
        public int DelaySeedingInBackgroundBySeconds => 0;
        public Task SeedData(bool isReplaceNewSeedData = false) => Task.CompletedTask;
    }

    /// <summary>A registered instance whose string form carries a secret, so a leak through ToString would surface.</summary>
    private sealed class SecretBearingService
    {
        public override string ToString() => $"{SentinelConnectionString};{SentinelPayload}";
    }

    private sealed class DuplicateConsumer(ILoggerFactory loggerFactory)
        : PlatformMessageBusConsumer<CompositionMessage>(loggerFactory)
    {
        public override Task HandleLogicAsync(CompositionMessage message, string routingKey) => Task.CompletedTask;
    }

    private sealed class UnqualifiedConsumer(ILoggerFactory loggerFactory)
        : PlatformMessageBusConsumer<CompositionMessage>(loggerFactory)
    {
        public override Task HandleLogicAsync(CompositionMessage message, string routingKey) => Task.CompletedTask;
    }

    private sealed class RoutedConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider)
        : PlatformApplicationMessageBusConsumer<CompositionMessage>(
            loggerFactory,
            unitOfWorkManager,
            serviceProvider,
            rootServiceProvider)
    {
        protected override PlatformMessageBusStoreKey MessageBusStoreKey => new("Tasks");

        public override Task HandleLogicAsync(CompositionMessage message, string routingKey) => Task.CompletedTask;
    }

    private sealed class ApplicationNameRoutedConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider)
        : PlatformApplicationMessageBusConsumer<CompositionMessage>(
            loggerFactory,
            unitOfWorkManager,
            serviceProvider,
            rootServiceProvider)
    {
        protected override string MessageBusApplicationName => "Tasks";

        public override Task HandleLogicAsync(CompositionMessage message, string routingKey) => Task.CompletedTask;
    }

    /// <summary>
    /// The validator inspects component metadata only, so a plain type stands in for a producer that declares no route.
    /// </summary>
    private sealed class UnqualifiedProducer;

    private sealed class CompositionMessage;

    private sealed class PartialInboxRepository;
    private sealed class InboxRepositoryA;
    private sealed class OutboxRepositoryA;

    private sealed class ApplicationLaneA;
    private sealed class ApplicationLaneB;
    private sealed class PersistenceOwnerA;
    private sealed class PersistenceOwnerB;
    private sealed class ContextA;
    private sealed class ContextB;
    private sealed class UnitOfWorkManagerA;
    private sealed class UnitOfWorkManagerB;
    private sealed class UnitOfWorkA;
    private sealed class UnitOfWorkB;
}
