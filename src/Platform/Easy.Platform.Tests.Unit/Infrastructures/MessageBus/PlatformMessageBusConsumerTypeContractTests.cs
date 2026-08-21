using System.Reflection;
using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.Events;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.RabbitMQ;
using Easy.Platform.Tests.Unit.Base;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.MessageBus;

/// <summary>
/// Type-level contract tests for every message bus consumer the platform ships, plus the static helpers the bus
/// infrastructure uses to inspect consumer types at startup.
/// <para>
/// <b>Invariant guarded:</b> at startup the bus reflects over EVERY registered consumer type to derive its message type
/// and its binding routing key. That reflection has no compile-time protection — a consumer whose shape it cannot
/// resolve throws during module initialization and takes the whole service down, or (worse) binds to a routing key
/// nothing publishes to and consumes nothing forever. Driving these assertions off a DISCOVERED type list rather than a
/// hand-written one means a consumer class added tomorrow is covered automatically, which is the only way a contract
/// like this stays true as the platform grows.
/// </para>
/// <para>
/// <b>Why each assembly is anchored by a known type:</b> loading assemblies by string name would silently yield an
/// empty scan after a project rename — the theory would pass with zero meaningful rows. Anchoring on
/// <c>typeof(...)</c> makes a rename a compile error instead, and <see cref="ConsumerDiscovery_FindsTheKnownShippedConsumers" />
/// additionally fails if the discovery itself ever goes empty.
/// </para>
/// </summary>
public class PlatformMessageBusConsumerTypeContractTests : PlatformUnitTestBase
{
    /// <summary>
    /// Platform assemblies scanned for consumers, each anchored by a type that must keep existing.
    /// </summary>
    private static readonly Assembly[] ScannedPlatformAssemblies =
    [
        typeof(PlatformMessageBusConsumer).Assembly,
        typeof(PlatformRabbitMqMessageBusProducer).Assembly
    ];

    public static TheoryData<Type> ConcreteConsumerTypes
    {
        get
        {
            var data = new TheoryData<Type>();

            foreach (var consumerType in DiscoverConcreteConsumerTypes())
                data.Add(consumerType);

            return data;
        }
    }

    // TC-PLATCONS-050: Discovery is anchored and non-empty — the guard on the theory below.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-050")]
    public void ConsumerDiscovery_FindsTheKnownShippedConsumers()
    {
        // A [Theory] driven by an empty MemberData proves nothing while looking green in every report. This fact is the
        // tripwire: if the scan ever returns nothing — a moved namespace, a renamed assembly, a changed base class —
        // it fails here loudly instead of silently hollowing out TC-PLATCONS-051.
        var discovered = DiscoverConcreteConsumerTypes();

        discovered.Should().NotBeEmpty();
        discovered
            .Should()
            .Contain(
                typeof(PlatformCqrsEventInboxBusMessageConsumer),
                "the inbox event consumer is the concrete consumer the framework itself ships — if the scan misses it, the scan is broken");
    }

    // TC-PLATCONS-051: Every concrete consumer satisfies the reflection contract the bus depends on at startup.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-051")]
    [MemberData(nameof(ConcreteConsumerTypes))]
    public void EveryConcreteConsumer_ResolvesItsMessageTypeAndAWellFormedBindingRoutingKey(Type consumerType)
    {
        // (a) The message type must resolve. GetConsumerMessageType throws for a type that does not implement
        // IPlatformMessageBusConsumer<> — at startup that is a service-wide crash, not a single broken consumer.
        var resolveMessageType = () => PlatformMessageBusConsumer.GetConsumerMessageType(consumerType);

        resolveMessageType.Should().NotThrow();
        var messageType = resolveMessageType();

        // (b) It must be the SAME type the consumer's own generic interface declares. Resolving to a different type
        // would make the bus deserialize the payload into something the handler cannot accept.
        var consumerInterface = consumerType.GetInterfaces().First(candidate => candidate.IsGenericType && candidate.GetGenericTypeDefinition() == typeof(IPlatformMessageBusConsumer<>));
        messageType.Should().Be(consumerInterface.GetGenericArguments()[0]);

        // (c) The bus DESERIALIZES incoming payloads into this type, which requires a public parameterless constructor.
        // The generic constraint enforces this for compiled call sites, but the bus reaches the type by reflection —
        // so the runtime-visible fact is asserted, not the compile-time promise.
        messageType.IsClass.Should().BeTrue();
        messageType.GetConstructor(Type.EmptyTypes).Should().NotBeNull("the bus instantiates the message type by reflection when deserializing");

        // (d) The default binding routing key must be well-formed: real levels, no empty level. An empty level produces
        // a binding that silently matches nothing — the failure mode with no error anywhere.
        var defaultBindingRoutingKey = IPlatformMessageBusConsumer.BuildForConsumerDefaultBindingRoutingKey(consumerInterface).CombinedStringKey;

        defaultBindingRoutingKey.Split(PlatformBusMessageRoutingKey.CombinedStringKeySeparator).Should().OnlyContain(part => part.Length > 0);
    }

    // TC-PLATCONS-052: A consumer's own declared routing keys must accept the keys they bind.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-052")]
    [MemberData(nameof(ConcreteConsumerTypes))]
    public void EveryConcreteConsumer_CanProcessEveryRoutingKeyItDeclaresABindingFor(Type consumerType)
    {
        // Binding and matching are two SEPARATE code paths over the same attribute: ConsumerBindingRoutingKey() decides
        // what the broker subscribes to, IsMatchMessageRoutingKey() decides what the dispatcher hands over. A consumer
        // that binds a key it then refuses to match receives messages from the broker and drops every one of them —
        // silently, because a non-match is a legitimate outcome, not an error. This asserts the two paths agree.
        AssertEveryDeclaredRoutingKeyMatchesItsOwnBinding(consumerType);
    }

    // TC-PLATCONS-052: none of the concrete types ScannedPlatformAssemblies discovers today carry
    // [PlatformConsumerRoutingKey], so the theory above only ever takes the undecorated early-return branch inside
    // AssertEveryDeclaredRoutingKeyMatchesItsOwnBinding — the bind<->match loop it exists to guard never actually runs.
    // This fact drives the same assertion helper over a locally-declared decorated type so that loop is exercised by
    // the suite instead of merely being reachable in theory.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-052")]
    public void DecoratedConsumer_BindingRoutingKeyIsAlsoMatchedByIsMatchMessageRoutingKey()
    {
        AssertEveryDeclaredRoutingKeyMatchesItsOwnBinding(typeof(ContractTestDecoratedConsumer));
    }

    private static void AssertEveryDeclaredRoutingKeyMatchesItsOwnBinding(Type consumerType)
    {
        var declaredRoutingKeys = consumerType
            .GetCustomAttributes(typeof(PlatformConsumerRoutingKeyAttribute), true)
            .Cast<PlatformConsumerRoutingKeyAttribute>()
            .ToList();

        // Undecorated consumers bind on the default routing key instead; that path is covered by TC-PLATCONS-051(d).
        // Asserting the count here keeps the test honest about which of the two shapes this type actually took.
        if (declaredRoutingKeys.Count == 0)
        {
            PlatformConsumerRoutingKeyAttribute
                .CanMessageBusConsumerProcess(consumerType, "AnyGroup.AnyProducer.AnyType")
                .Should()
                .BeFalse("an undecorated consumer declares no routing key and must not claim to process arbitrary ones");
            return;
        }

        foreach (var declaredRoutingKey in declaredRoutingKeys)
        {
            var bindingRoutingKey = declaredRoutingKey.ConsumerBindingRoutingKey();

            declaredRoutingKey
                .IsMatchMessageRoutingKey(bindingRoutingKey)
                .Should()
                .BeTrue($"consumer {consumerType.Name} binds '{bindingRoutingKey}' and must therefore also match it");
        }
    }

    // TC-PLATCONS-053: GetConsumerMessageType rejects a non-consumer type with a diagnosable message.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-053")]
    public void GetConsumerMessageType_ForANonConsumerType_ThrowsNamingTheRequiredInterface()
    {
        // The bus calls this while registering types discovered by convention. Returning null instead of throwing would
        // surface far downstream as a NullReferenceException inside routing-key construction, with nothing in the stack
        // naming the offending type. The message must therefore name the contract the type failed to satisfy.
        var act = () => PlatformMessageBusConsumer.GetConsumerMessageType(typeof(NotAConsumer));

        act.Should().Throw<Exception>().WithMessage("*IPlatformMessageBusConsumer<>*");
    }

    // TC-PLATCONS-054: The message type is resolved through the whole inheritance chain, not just the leaf type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-054")]
    public void GetConsumerMessageType_ResolvesThroughAnInheritanceChain()
    {
        // Real consumers are rarely direct subclasses — they sit two or three levels below the platform base (a service
        // base consumer, then the concrete one). GetConsumerMessageType searches GetInterfaces(), which flattens the
        // chain; a regression to "declared interfaces only" would break exactly the consumers that follow the
        // recommended layering while leaving flat test doubles working.
        PlatformMessageBusConsumer.GetConsumerMessageType(typeof(GrandchildConsumer)).Should().Be(typeof(ContractTestMessage));
    }

    // TC-PLATCONS-055: GetMessageTypeOfConsumerGenericType reads the FIRST generic argument.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-055")]
    public void GetMessageTypeOfConsumerGenericType_ReturnsTheFirstGenericArgument()
    {
        // The two-parameter entity-event consumer interface is the case that makes position matter:
        // IPlatformCqrsEntityEventBusMessageConsumer<TMessage, TEntity> puts the MESSAGE first and the ENTITY second,
        // so reading the wrong index yields the entity type and produces a routing key for something that is never
        // published. Asserting with a two-argument interface is what distinguishes "reads index 0" from "reads the only
        // argument there happens to be".
        var entityEventConsumerInterface =
            typeof(IPlatformCqrsEntityEventBusMessageConsumer<PlatformBusMessage<PlatformCqrsEntityEvent<ContractTestEntity>>, ContractTestEntity>);

        IPlatformMessageBusConsumer
            .GetMessageTypeOfConsumerGenericType(entityEventConsumerInterface)
            .Should()
            .Be(typeof(PlatformBusMessage<PlatformCqrsEntityEvent<ContractTestEntity>>));

        // The negative half of the same fact: index 0 is NOT the entity type. Without it, a helper that read the LAST
        // argument would still pass whenever the two happened to coincide.
        IPlatformMessageBusConsumer.GetMessageTypeOfConsumerGenericType(entityEventConsumerInterface).Should().NotBe(typeof(ContractTestEntity));
    }

    // TC-PLATCONS-056: The CQRS consumer families wrap their event in PlatformBusMessage<>.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-056")]
    public void CqrsEventConsumerFamilies_ConsumeTheirEventWrappedInAPlatformBusMessage()
    {
        // The wrapper is not decoration: PlatformBusMessage carries the routing key, the tracking id, and the request
        // context that BeforeHandleAsync restores. A consumer family declared over the bare event type would lose all
        // three — the message would arrive with no correlation and no ambient context, and every downstream log for
        // that work would be untraceable to its origin.
        PlatformMessageBusConsumer
            .GetConsumerMessageType(typeof(ConcreteCommandEventConsumer))
            .Should()
            .Be(typeof(PlatformBusMessage<PlatformCqrsCommandEvent<ContractTestCommand>>));

        PlatformMessageBusConsumer
            .GetConsumerMessageType(typeof(ConcreteDomainEventConsumer))
            .Should()
            .Be(typeof(PlatformBusMessage<ContractTestDomainEvent>));
    }

    // An assembly with an optional dependency that is not present at test time throws ReflectionTypeLoadException
    // from GetTypes() while still exposing every type that DID load. Failing every row of TC-PLATCONS-051 because
    // one unrelated type could not be loaded would be a false negative, so PlatformAssemblyScanTestHelpers'
    // loadable subset is used — and TC-PLATCONS-050 is what stops that degradation from quietly emptying the scan.
    private static List<Type> DiscoverConcreteConsumerTypes()
    {
        return ScannedPlatformAssemblies
            .SelectMany(PlatformAssemblyScanTestHelpers.GetLoadableTypes)
            .Where(type => typeof(PlatformMessageBusConsumer).IsAssignableFrom(type) && !type.IsAbstract && !type.ContainsGenericParameters)
            .Distinct()
            .OrderBy(type => type.FullName, StringComparer.Ordinal)
            .ToList();
    }

    private sealed class NotAConsumer;

    private sealed class ContractTestEntity : Easy.Platform.Domain.Entities.IEntity
    {
        public string Id { get; set; } = "";

        public object GetId() => Id;
    }

    private sealed class ContractTestMessage
    {
        public string Content { get; set; } = "";
    }

    private sealed class ContractTestCommand : PlatformCqrsCommand
    {
    }

    private sealed class ContractTestDomainEvent : PlatformCqrsDomainEvent
    {
    }

    /// <summary>
    /// Exists solely so <see cref="DecoratedConsumer_BindingRoutingKeyIsAlsoMatchedByIsMatchMessageRoutingKey" /> has a
    /// decorated type to run the bind&lt;-&gt;match assertion against — no shipped consumer in ScannedPlatformAssemblies
    /// carries this attribute today.
    /// </summary>
    [PlatformConsumerRoutingKey("ContractTestGroup", "ContractTestProducer", "ContractTestType")]
    private sealed class ContractTestDecoratedConsumer;

    /// <summary>
    /// Deliberately a MIDDLE layer, mirroring the recommended shape where a service declares its own base consumer and
    /// concrete consumers derive from that. TC-PLATCONS-054 resolves the message type through this extra level.
    /// </summary>
    private abstract class IntermediateConsumer : PlatformMessageBusConsumer<ContractTestMessage>
    {
        protected IntermediateConsumer(Microsoft.Extensions.Logging.ILoggerFactory loggerFactory)
            : base(loggerFactory)
        {
        }
    }

    private sealed class GrandchildConsumer : IntermediateConsumer
    {
        public GrandchildConsumer(Microsoft.Extensions.Logging.ILoggerFactory loggerFactory)
            : base(loggerFactory)
        {
        }

        public override Task HandleLogicAsync(ContractTestMessage message, string routingKey) => Task.CompletedTask;
    }

    private sealed class ConcreteCommandEventConsumer : PlatformCqrsCommandEventBusMessageConsumer<ContractTestCommand>
    {
        public ConcreteCommandEventConsumer(
            Microsoft.Extensions.Logging.ILoggerFactory loggerFactory,
            Easy.Platform.Domain.UnitOfWork.IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            Easy.Platform.Common.IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
        {
        }

        public override Task HandleLogicAsync(PlatformBusMessage<PlatformCqrsCommandEvent<ContractTestCommand>> message, string routingKey) =>
            Task.CompletedTask;
    }

    private sealed class ConcreteDomainEventConsumer : PlatformCqrsDomainEventBusMessageConsumer<ContractTestDomainEvent>
    {
        public ConcreteDomainEventConsumer(
            Microsoft.Extensions.Logging.ILoggerFactory loggerFactory,
            Easy.Platform.Domain.UnitOfWork.IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            Easy.Platform.Common.IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
        {
        }

        public override Task HandleLogicAsync(PlatformBusMessage<ContractTestDomainEvent> message, string routingKey) => Task.CompletedTask;
    }
}
