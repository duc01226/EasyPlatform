using System.Reflection;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.AzureFileStorage;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore;
using Easy.Platform.FirebasePushNotification;
using Easy.Platform.HangfireBackgroundJob;
using Easy.Platform.MongoDB;
using Easy.Platform.RabbitMQ;
using Easy.Platform.RedisCache;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Events;

/// <summary>
/// Property-style contract suite that DISCOVERS every event-handler type across the shipping platform assemblies
/// by reflection and asserts the invariants that must hold for ALL of them — including handler base classes added
/// after these tests were written.
/// <para>
/// Example-based tests pin the handlers that exist today; this suite pins the RULE. Handlers are constructed by
/// the DI container from their declared constructor, so a base class that drifts away from the expected parameter
/// prefix cannot chain to its base and fails at application startup rather than at build time. Discovery is
/// anchored by a known TYPE per assembly, so an assembly rename breaks the build instead of silently shrinking
/// coverage to zero.
/// </para>
/// </summary>
public class AllPlatformCqrsEventHandlerTypesContractTests : PlatformUnitTestBase
{
    /// <summary>
    /// The parameter prefix every application-layer handler constructor must start with — mirrors
    /// <c>PlatformCqrsEventApplicationHandler</c>'s constructor
    /// (Application/Cqrs/Events/PlatformCqrsEventApplicationHandler.cs:134-140). Extra dependencies may follow.
    /// </summary>
    private static readonly Type[] ApplicationHandlerConstructorPrefix =
    [
        typeof(ILoggerFactory),
        typeof(IPlatformUnitOfWorkManager),
        typeof(IServiceProvider),
        typeof(IPlatformRootServiceProvider)
    ];

    /// <summary>
    /// The parameter prefix every non-application handler constructor must start with — mirrors
    /// <c>PlatformCqrsEventHandler</c>'s constructor (Common/Cqrs/Events/PlatformCqrsEventHandler.cs:504).
    /// </summary>
    private static readonly Type[] BaseHandlerConstructorPrefix =
    [
        typeof(ILoggerFactory),
        typeof(IPlatformRootServiceProvider),
        typeof(IServiceProvider)
    ];

    /// <summary>
    /// Shipping platform assemblies. The benchmark harness and this test assembly are intentionally excluded:
    /// both declare throwaway handlers with bespoke constructors that are never DI-resolved in production.
    /// </summary>
    private static readonly Assembly[] PlatformAssemblies =
    [
        typeof(PlatformCqrsEventHandler<>).Assembly,
        typeof(Easy.Platform.AspNetCore.PlatformAspNetCoreModule).Assembly,
        typeof(PlatformAzureFileStorageModule).Assembly,
        typeof(PlatformEfCorePersistenceModule<>).Assembly,
        typeof(FireBasePushNotificationPlatformModule).Assembly,
        typeof(PlatformHangfireBackgroundJobModule).Assembly,
        typeof(PlatformMongoDbPersistenceModule<>).Assembly,
        typeof(PlatformRabbitMqMessageBusModule).Assembly,
        typeof(PlatformRedisCacheModule).Assembly
    ];

    /// <summary>
    /// The 11 handler base classes known to exist today (TC-PLATEVT-052). Shared with TC-PLATEVT-058 so the
    /// "must stay abstract" claim (J1) is scoped to exactly the types the census already names, rather than to
    /// every type discovery happens to find.
    /// </summary>
    private static readonly Type[] KnownEventHandlerBaseClassTypes =
    [
        typeof(PlatformCqrsEventHandler<>),
        typeof(PlatformCqrsEventApplicationHandler<>),
        typeof(PlatformCqrsDomainEventApplicationHandler<>),
        typeof(PlatformCqrsEntityEventApplicationHandler<>),
        typeof(PlatformCqrsBulkEntitiesEventApplicationHandler<,>),
        typeof(PlatformCqrsCommandEventApplicationHandler<,>),
        typeof(PlatformCqrsCommandEventApplicationHandler<>),
        typeof(PlatformCqrsEventBusMessageProducer<,>),
        typeof(PlatformCqrsCommandEventBusMessageProducer<>),
        typeof(PlatformCqrsDomainEventBusMessageProducer<>),
        typeof(PlatformCqrsEntityEventBusMessageProducer<,,>)
    ];

    public static TheoryData<Type> AllEventHandlerTypes()
    {
        var data = new TheoryData<Type>();

        foreach (var handlerType in DiscoverAllEventHandlerTypes())
            data.Add(handlerType);

        return data;
    }

    public static TheoryData<Type> KnownEventHandlerBaseClasses()
    {
        var data = new TheoryData<Type>();

        foreach (var handlerType in KnownEventHandlerBaseClassTypes)
            data.Add(handlerType);

        return data;
    }

    // TC-PLATEVT-052: A census, not a cap. Renaming or deleting any of these breaks loudly, while ADDING a
    // handler base class is free — every theory below picks it up automatically.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-052")]
    public void Discovery_FindsEveryKnownEventHandlerBaseClass_AcrossTheShippingPlatformAssemblies()
    {
        var discoveredHandlerTypes = DiscoverAllEventHandlerTypes();

        discoveredHandlerTypes.Should().Contain(KnownEventHandlerBaseClassTypes);
    }

    // TC-PLATEVT-053: Host applications subclass these bases; an internal one is unreachable to them.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-053")]
    [MemberData(nameof(AllEventHandlerTypes))]
    public void EveryEventHandlerType_IsPubliclyReachable(Type handlerType)
    {
        handlerType.IsPublic.Should().BeTrue($"{handlerType.Name} must be reachable by applications that derive from it");
    }

    // TC-PLATEVT-054: The constructor prefix is what lets a subclass chain to its base and lets the container
    // build it. A drifted prefix compiles for the type itself but breaks every derived handler at startup.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-054")]
    [MemberData(nameof(AllEventHandlerTypes))]
    public void EveryEventHandlerType_DeclaresAConstructorStartingWithItsLayerParameterPrefix(Type handlerType)
    {
        var expectedPrefix = IsApplicationEventHandler(handlerType) ? ApplicationHandlerConstructorPrefix : BaseHandlerConstructorPrefix;

        var hasExpectedConstructor = handlerType
            .GetConstructors(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance)
            .Any(constructor => StartsWithParameterPrefix(constructor, expectedPrefix));

        hasExpectedConstructor.Should()
            .BeTrue(
                $"{handlerType.Name} must declare a constructor beginning with ({string.Join(", ", expectedPrefix.Select(type => type.Name))}) "
                + "so it can chain to its platform base and be resolved from the container");
    }

    // TC-PLATEVT-055: These are extension points by design; a sealed one cannot be specialised by an application.
    // Scoped to ALL discovered types deliberately: no shipping platform handler TYPE (base class or otherwise)
    // may ever be sealed, because every one of them is meant to be derived from.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-055")]
    [MemberData(nameof(AllEventHandlerTypes))]
    public void EveryEventHandlerType_StaysOpenForExtension(Type handlerType)
    {
        handlerType.IsSealed.Should().BeFalse($"{handlerType.Name} is a handler base class and must stay derivable");
    }

    // TC-PLATEVT-058: Unlike TC-PLATEVT-055's sealed check, abstractness is scoped to the KNOWN base-class list,
    // not to every discovered type. Discovery finds ANY type assignable to PlatformCqrsEventHandler<>, and a
    // future shipping platform assembly may legitimately add a concrete handler (e.g. a built-in inbox/outbox or
    // bus-producer handler) that must not fail this suite on a non-defect.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-058")]
    [MemberData(nameof(KnownEventHandlerBaseClasses))]
    public void EveryKnownEventHandlerBaseClass_DefinesHandlingInfrastructureNotAConcreteHandler(Type handlerType)
    {
        handlerType.IsAbstract.Should().BeTrue($"{handlerType.Name} defines handling infrastructure, not a concrete handler, so it must not be instantiable on its own");
    }

    // TC-PLATEVT-056: Every handler must expose the untyped dispatch pair used by generic event routing, and
    // resolve to exactly one closed event type. A handler that closed over the wrong event would compile and
    // then simply never fire.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-056")]
    [MemberData(nameof(AllEventHandlerTypes))]
    public void EveryEventHandlerType_ExposesTheUntypedDispatchPairAndResolvesExactlyOneEventType(Type handlerType)
    {
        handlerType.GetMethod(nameof(IPlatformCqrsEventHandler.Handle), [typeof(object), typeof(CancellationToken)])
            .Should()
            .NotBeNull($"{handlerType.Name} must accept untyped dispatch from the generic event pipeline");

        handlerType.GetMethod(nameof(IPlatformCqrsEventHandler.HandleWhen), [typeof(object)])
            .Should()
            .NotBeNull($"{handlerType.Name} must answer the untyped conditional-processing check");

        EventHandlerReflectionHelpers.HandledEventTypeArgumentOf(handlerType).Should().NotBeNull($"{handlerType.Name} must close PlatformCqrsEventHandler<> over exactly one event type");
    }

    // TC-PLATEVT-057: Every application-layer handler carries the inbox contract. Losing the interface would
    // silently drop the type out of inbox routing while it still compiles and still handles events.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-057")]
    [MemberData(nameof(AllEventHandlerTypes))]
    public void EveryApplicationLayerHandlerType_ImplementsTheInboxAwareContract(Type handlerType)
    {
        if (!IsApplicationEventHandler(handlerType))
        {
            handlerType.IsAssignableTo(typeof(IPlatformCqrsEventHandler))
                .Should()
                .BeTrue($"{handlerType.Name} is a platform event handler and must satisfy the base handler contract");

            return;
        }

        handlerType.IsAssignableTo(typeof(IPlatformCqrsEventApplicationHandler))
            .Should()
            .BeTrue($"{handlerType.Name} derives from the application handler and must keep the inbox-aware contract");
    }

    private static bool StartsWithParameterPrefix(ConstructorInfo constructor, Type[] expectedPrefix)
    {
        var parameters = constructor.GetParameters();

        return parameters.Length >= expectedPrefix.Length
               && expectedPrefix.Select((expectedType, index) => parameters[index].ParameterType == expectedType).All(matches => matches);
    }

    private static bool IsApplicationEventHandler(Type handlerType)
    {
        return EventHandlerReflectionHelpers.IsAssignableToGenericDefinition(handlerType, typeof(PlatformCqrsEventApplicationHandler<>));
    }

    private static List<Type> DiscoverAllEventHandlerTypes()
    {
        return PlatformAssemblies
            .Distinct()
            .SelectMany(assembly => assembly.GetTypes())
            .Where(type => type.IsClass && EventHandlerReflectionHelpers.IsAssignableToGenericDefinition(type, typeof(PlatformCqrsEventHandler<>)))
            .OrderBy(type => type.FullName, StringComparer.Ordinal)
            .ToList();
    }
}
