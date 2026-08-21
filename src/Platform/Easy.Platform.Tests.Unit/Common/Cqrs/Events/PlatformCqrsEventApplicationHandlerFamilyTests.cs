using System.Reflection;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Events;

/// <summary>
/// Unit tests for the four specialised application event-handler families:
/// <see cref="PlatformCqrsDomainEventApplicationHandler{TEvent}" />,
/// <see cref="PlatformCqrsEntityEventApplicationHandler{TEntity}" />,
/// <see cref="PlatformCqrsBulkEntitiesEventApplicationHandler{TEntity,TPrimaryKey}" /> and both arities of
/// <see cref="PlatformCqrsCommandEventApplicationHandler{TCommand,TCommandResult}" />.
/// <para>
/// The one thing each family actually decides is its DEFAULT <c>HandleWhen</c> gate — whether a subclass that
/// writes no filter processes every event or only some. The families disagree on purpose, and the disagreement
/// is invisible at the call site, so each default is pinned separately.
/// </para>
/// </summary>
public class PlatformCqrsEventApplicationHandlerFamilyTests : PlatformUnitTestBase
{
    public static TheoryData<PlatformCqrsEntityEventCrudAction> AllCrudActions()
    {
        var data = new TheoryData<PlatformCqrsEntityEventCrudAction>();

        foreach (var crudAction in Enum.GetValues<PlatformCqrsEntityEventCrudAction>())
            data.Add(crudAction);

        return data;
    }

    // -- Domain event family --

    // TC-PLATEVT-060: The domain family handles unconditionally (PlatformCqrsDomainEventApplicationHandler.cs:39-42).
    // A domain event is already the specific fact that happened, so there is nothing left to filter on by default.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-060")]
    [InlineData("")]
    [InlineData("some-payload")]
    public async Task DomainEventHandler_HandleWhen_IsUnconditionallyTrue(string payload)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewDomainHandler();

        var @event = new TestDomainEvent { Payload = payload };

        (await handler.HandleWhen(@event)).Should().BeTrue();
        (await handler.HandleWhen((object)@event)).Should().BeTrue("the untyped dispatch path must agree with the typed one");
    }

    // -- Bulk entities family --

    // TC-PLATEVT-061: The bulk family also handles unconditionally
    // (PlatformCqrsBulkEntitiesEventApplicationHandler.cs:45-48), for EVERY CRUD action — a subclass that wants
    // Created-only must say so itself.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-061")]
    [MemberData(nameof(AllCrudActions))]
    public async Task BulkEntitiesEventHandler_HandleWhen_IsUnconditionallyTrueForEveryCrudAction(PlatformCqrsEntityEventCrudAction crudAction)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewBulkHandler();

        var @event = new PlatformCqrsBulkEntitiesEvent<HandlerTestEntity, string>(
            [new HandlerTestEntity { Id = "entity-1", Name = "first" }],
            crudAction);

        (await handler.HandleWhen(@event)).Should().BeTrue();
    }

    // -- Command event family --

    // TC-PLATEVT-062: The command family is the one family that DOES filter: it reacts only to a command that
    // actually executed (PlatformCqrsCommandEventApplicationHandler.cs:43-46).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-062")]
    public async Task CommandEventHandler_HandleWhen_IsTrueOnlyForTheExecutedAction()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewCommandHandler();

        var executedEvent = new PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>(
            new TestCommand { Name = "run-me" },
            new PlatformCqrsCommandResult(),
            PlatformCqrsCommandEventAction.Executed);

        (await handler.HandleWhen(executedEvent)).Should().BeTrue();
        (await handler.HandleWhen((object)executedEvent)).Should().BeTrue();
    }

    // TC-PLATEVT-063: The boundary counter-case. `Action` is NULLABLE and the enum has exactly one member, so
    // "not Executed" can only mean "unset" — a default-constructed or partially-populated event. That event must
    // NOT be handled, otherwise a command that never ran would trigger its side effects.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-063")]
    public async Task CommandEventHandler_HandleWhen_IsFalseWhenTheActionWasNeverSet()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewCommandHandler();

        var unsetActionEvent = new PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>();

        unsetActionEvent.Action.Should().BeNull("this is the only reachable non-Executed state of the action");
        (await handler.HandleWhen(unsetActionEvent)).Should().BeFalse();
    }

    // TC-PLATEVT-064: The single-generic-argument overload is a thin alias and must inherit the identical gate;
    // if it ever declared its own HandleWhen the two arities would diverge silently.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-064")]
    public async Task SingleArgCommandEventHandler_InheritsTheIdenticalExecutedOnlyGate()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewSingleArgCommandHandler();

        var executedEvent = new PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>(
            new TestCommand { Name = "run-me" },
            new PlatformCqrsCommandResult(),
            PlatformCqrsCommandEventAction.Executed);

        (await handler.HandleWhen(executedEvent)).Should().BeTrue();
        (await handler.HandleWhen(new PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>())).Should().BeFalse();

        typeof(PlatformCqrsCommandEventApplicationHandler<TestCommand>)
            .GetMethod(nameof(PlatformCqrsCommandEventApplicationHandler<TestCommand>.HandleWhen), [typeof(PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>)])!
            .DeclaringType
            .Should()
            .Be(
                typeof(PlatformCqrsCommandEventApplicationHandler<TestCommand, PlatformCqrsCommandResult>),
                "the single-argument overload must not shadow the two-argument gate with its own");
    }

    // TC-PLATEVT-065: Pins the premise TC-PLATEVT-063 rests on. If a second action is ever added, this breaks and
    // forces someone to decide what the command family should do with it — instead of silently ignoring it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-065")]
    public void CommandEventAction_HasExactlyOneMember_SoTheOnlyNonExecutedStateIsUnset()
    {
        Enum.GetValues<PlatformCqrsCommandEventAction>().Should().ContainSingle().Which.Should().Be(PlatformCqrsCommandEventAction.Executed);
    }

    // -- Entity event family --

    // TC-PLATEVT-066: The entity family deliberately declares NO default gate
    // (PlatformCqrsEntityEventApplicationHandler.cs:13-30 has no HandleWhen). That is the real contract
    // difference from the other three families: a subclass MUST state which CRUD actions it cares about, and the
    // compiler enforces it because the abstract member from the base handler stays unimplemented.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-066")]
    public void EntityEventHandlerFamily_DeclaresNoDefaultHandleWhen_ForcingSubclassesToStateTheirFilter()
    {
        var handleWhenDeclaringType = typeof(PlatformCqrsEntityEventApplicationHandler<HandlerTestEntity>)
            .GetMethod(
                nameof(PlatformCqrsEntityEventApplicationHandler<HandlerTestEntity>.HandleWhen),
                [typeof(PlatformCqrsEntityEvent<HandlerTestEntity>)])!
            .DeclaringType;

        handleWhenDeclaringType.Should()
            .Be(
                typeof(PlatformCqrsEventHandler<PlatformCqrsEntityEvent<HandlerTestEntity>>),
                "the entity family must inherit the ABSTRACT gate rather than supplying a permissive default");

        typeof(PlatformCqrsEntityEventApplicationHandler<HandlerTestEntity>)
            .GetMethod(
                nameof(PlatformCqrsEntityEventApplicationHandler<HandlerTestEntity>.HandleWhen),
                [typeof(PlatformCqrsEntityEvent<HandlerTestEntity>)])!
            .IsAbstract
            .Should()
            .BeTrue();
    }

    // TC-PLATEVT-067: A concrete entity-event handler's own filter is honoured on both the typed and the untyped
    // dispatch path, across every CRUD action.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-067")]
    [MemberData(nameof(AllCrudActions))]
    public async Task EntityEventHandler_AppliesItsOwnCrudFilterOnBothDispatchPaths(PlatformCqrsEntityEventCrudAction crudAction)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewEntityHandler();

        var @event = new PlatformCqrsEntityEvent<HandlerTestEntity>(new HandlerTestEntity { Id = "entity-1", Name = "first" }, crudAction);
        var expected = crudAction != PlatformCqrsEntityEventCrudAction.Deleted;

        (await handler.HandleWhen(@event)).Should().Be(expected);
        (await handler.HandleWhen((object)@event)).Should().Be(expected);
    }

    // TC-PLATEVT-068: Every family still inherits the application-layer inbox contract — specialising the gate
    // must not accidentally change how the family is routed.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-068")]
    public void EveryHandlerFamily_InheritsTheApplicationLayerInboxContract()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);

        var domainHandler = host.NewDomainHandler();
        var entityHandler = host.NewEntityHandler();
        var bulkHandler = host.NewBulkHandler();
        var commandHandler = host.NewCommandHandler();

        domainHandler.CanExecuteHandlingEventUsingInboxConsumer(new TestDomainEvent()).Should().BeTrue();
        entityHandler.CanExecuteHandlingEventUsingInboxConsumer(
                new PlatformCqrsEntityEvent<HandlerTestEntity>(new HandlerTestEntity { Id = "e", Name = "n" }, PlatformCqrsEntityEventCrudAction.Created))
            .Should()
            .BeTrue();
        bulkHandler.CanExecuteHandlingEventUsingInboxConsumer(
                new PlatformCqrsBulkEntitiesEvent<HandlerTestEntity, string>([new HandlerTestEntity { Id = "e", Name = "n" }], PlatformCqrsEntityEventCrudAction.Created))
            .Should()
            .BeTrue();

        // Uses an EXECUTED command event, not the unset-Action default: TC-PLATEVT-063 proves the unset-Action
        // event is rejected by HandleWhen, so asserting inbox eligibility on it would read as if that event were
        // routable end to end. Inbox eligibility genuinely does not consult HandleWhen, but the Executed event
        // makes that point without the contradiction.
        var executedCommandEvent = new PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>(
            new TestCommand { Name = "run-me" },
            new PlatformCqrsCommandResult(),
            PlatformCqrsCommandEventAction.Executed);

        commandHandler.CanExecuteHandlingEventUsingInboxConsumer(executedCommandEvent).Should().BeTrue();
    }

    // TC-PLATEVT-069: Each family constrains itself to the event shape it exists to serve. A family bound to the
    // wrong closed event type would compile but never receive the events it was written for.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-069")]
    public void EveryHandlerFamily_IsBoundToItsIntendedEventShape()
    {
        HandledEventType(typeof(TestDomainEventHandler)).Should().Be(typeof(TestDomainEvent));
        HandledEventType(typeof(TestEntityEventHandler)).Should().Be(typeof(PlatformCqrsEntityEvent<HandlerTestEntity>));
        HandledEventType(typeof(TestBulkEntitiesEventHandler)).Should().Be(typeof(PlatformCqrsBulkEntitiesEvent<HandlerTestEntity, string>));
        HandledEventType(typeof(TestCommandEventHandler)).Should().Be(typeof(PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>));
        HandledEventType(typeof(TestSingleArgCommandEventHandler)).Should().Be(typeof(PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult>));
    }

    private static Type HandledEventType(Type handlerType)
    {
        return EventHandlerReflectionHelpers.HandledEventTypeArgumentOf(handlerType)
               ?? throw new InvalidOperationException($"{handlerType.FullName} does not derive from PlatformCqrsEventHandler<>.");
    }
}
