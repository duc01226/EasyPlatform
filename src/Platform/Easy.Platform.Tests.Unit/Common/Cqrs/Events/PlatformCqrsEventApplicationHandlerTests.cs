using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Events;

/// <summary>
/// Unit tests for <see cref="PlatformCqrsEventApplicationHandler{TEvent}" />
/// (Application/Cqrs/Events/PlatformCqrsEventApplicationHandler.cs:72).
/// <para>
/// This layer adds the decisions with real production consequences: whether an event is deferred into the inbox
/// (which moves it past the parent transaction), how aggressively a failure is retried, and whether a handler
/// failure is swallowed or propagated. Each is derived from several inputs at once, so every branch is pinned
/// individually rather than through one happy-path check.
/// </para>
/// </summary>
public class PlatformCqrsEventApplicationHandlerTests : PlatformUnitTestBase
{
    /// <summary>Base-layer settable properties plus the four the application layer introduces.</summary>
    private static readonly string[] ApplicationSettablePropertyNames =
    [
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.ForceCurrentInstanceHandleInCurrentThreadAndScope),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.IsHandlingInNewScope),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.RetryOnFailedTimes),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.ThrowExceptionOnHandleFailed),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.NoNeedCloneNewEventInstanceForTheHandler),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.RetryOnFailedDelaySeconds),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.MaxRetryOnFailedDelaySeconds),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.IsCalledFromInboxBusMessageConsumer),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.RetryEventInboxBusMessageConsumerOnFailedDelaySeconds),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds),
        nameof(PlatformCqrsEventApplicationHandler<AppTestEvent>.RetryEventInboxBusMessageConsumerMaxCount)
    ];

    // -- Application override of the wait-immediately decision --

    // TC-PLATEVT-009: An inbox consumer is already the deferred execution; running its handler in the background
    // again would detach the work from the inbox message that is tracking it. So the application override forces
    // foreground execution whenever it is driven by the inbox consumer, regardless of the base decision.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-009")]
    [InlineData(false, false, false)]
    [InlineData(true, false, true)]
    [InlineData(false, true, true)]
    [InlineData(true, true, true)]
    public void NeedWaitHandlerExecutionFinishedImmediately_OrsInTheInboxConsumerFlag(
        bool handlerDemandsWait,
        bool isCalledFromInboxBusMessageConsumer,
        bool expected)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = handlerDemandsWait;
        handler.IsCalledFromInboxBusMessageConsumer = isCalledFromInboxBusMessageConsumer;

        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(new AppTestEvent()).Should().Be(expected);
    }

    // -- Inbox support detection --

    // TC-PLATEVT-020: Inbox support requires BOTH a registered inbox repository AND the handler opting in.
    // Driven through a real DI container because that registration IS the production signal.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-020")]
    [InlineData(true, true, true)]
    [InlineData(true, false, false)]
    [InlineData(false, true, false)]
    [InlineData(false, false, false)]
    public void HasInboxMessageSupport_RequiresBothTheRegisteredRepositoryAndTheHandlerOptIn(
        bool registerInboxRepository,
        bool enableInboxEventBusMessage,
        bool expected)
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository);
        var handler = host.NewAppHandler();

        handler.EnableInboxEventBusMessageValue = enableInboxEventBusMessage;

        handler.HasInboxMessageSupportForTest().Should().Be(expected);
    }

    // -- Inbox routing eligibility --

    // TC-PLATEVT-021: The ordinary background-eligible handler with inbox support routes through the inbox.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-021")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WithInboxSupportAndNoWaitRequirement_IsTrue()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);
        var handler = host.NewAppHandler();

        handler.CanExecuteHandlingEventUsingInboxConsumer(new AppTestEvent()).Should().BeTrue();
    }

    // TC-PLATEVT-022: THE high-value branch (PlatformCqrsEventApplicationHandler.cs:1140-1141). A same-UoW
    // handler must never be routed to the inbox: the inbox runs it in a new scope AFTER the parent commits,
    // which silently defeats the whole point of same-UoW execution. The veto is checked FIRST, so it must win
    // even when every other condition says "inbox".
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-022")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WhenHandlerMustRunInSameActiveUow_IsVetoedDespiteFullInboxSupport()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);
        var handler = host.NewAppHandler();

        handler.MustRunHandlerInSameCurrentActiveUowValue = true;

        handler.HasInboxMessageSupportForTest().Should().BeTrue("the veto must be proven to override real inbox support, not the absence of it");
        handler.CanExecuteHandlingEventUsingInboxConsumer(new AppTestEvent()).Should().BeFalse();
    }

    // TC-PLATEVT-023: The same veto applies when the requirement arrives from the EVENT rather than the handler,
    // and it still wins over the inbox-consumer flag that would otherwise force eligibility.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-023")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WhenEventPinsThisHandlerToTheSameActiveUow_IsVetoed()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);
        var handler = host.NewAppHandler();
        var @event = new AppTestEvent();

        @event.SetRunHandlerInSameCurrentActiveUow(typeof(AppTestEventHandler));
        handler.IsCalledFromInboxBusMessageConsumer = true;

        handler.CanExecuteHandlingEventUsingInboxConsumer(@event).Should().BeFalse();
    }

    // TC-PLATEVT-024: No inbox support means no inbox routing, whatever else is true.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-024")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WithoutInboxSupport_IsFalse()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: false);
        var handler = host.NewAppHandler();

        handler.CanExecuteHandlingEventUsingInboxConsumer(new AppTestEvent()).Should().BeFalse();
    }

    // TC-PLATEVT-025: A caller waiting for the handler cannot have the work deferred into the inbox behind its
    // back — that would return control before the work happened.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-025")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WhenCallerMustWaitAndNotDrivenByInbox_IsFalse()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);
        var handler = host.NewAppHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.IsCalledFromInboxBusMessageConsumer = false;

        handler.CanExecuteHandlingEventUsingInboxConsumer(new AppTestEvent()).Should().BeFalse();
    }

    // TC-PLATEVT-026: Once the inbox consumer itself is driving the handler, the wait requirement no longer
    // blocks eligibility — the message is already in the inbox, so re-entry must stay legal.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-026")]
    public void CanExecuteHandlingEventUsingInboxConsumer_WhenDrivenByTheInboxConsumer_StaysTrueDespiteTheWaitRequirement()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: true);
        var handler = host.NewAppHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.IsCalledFromInboxBusMessageConsumer = true;

        handler.CanExecuteHandlingEventUsingInboxConsumer(new AppTestEvent()).Should().BeTrue();
    }

    // TC-PLATEVT-027: The untyped overload used by generic dispatch must agree with the typed one; a divergence
    // would route the same event differently depending on which call site reached it.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-027")]
    [InlineData(true)]
    [InlineData(false)]
    public void CanExecuteHandlingEventUsingInboxConsumer_ObjectOverload_AgreesWithTheTypedOverload(bool registerInboxRepository)
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository);
        var handler = host.NewAppHandler();
        var @event = new AppTestEvent();

        handler.CanExecuteHandlingEventUsingInboxConsumer((object)@event)
            .Should()
            .Be(handler.CanExecuteHandlingEventUsingInboxConsumer(@event));
    }

    // -- Bus message identity --

    // TC-PLATEVT-028: The outgoing bus message inherits WHO acted from the event's request context. Getting the
    // mapping wrong attributes downstream work to the wrong user.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-028")]
    public void BuildCurrentBusMessageIdentity_MapsUserIdRequestIdAndUserNameFromTheRequestContext()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        var identity = handler.BuildCurrentBusMessageIdentity(
            new Dictionary<string, object>
            {
                [PlatformApplicationCommonRequestContextKeys.UserIdContextKey] = "user-42",
                [PlatformApplicationCommonRequestContextKeys.RequestIdContextKey] = "request-99",
                [PlatformApplicationCommonRequestContextKeys.UserNameContextKey] = "ada.lovelace"
            });

        identity.UserId.Should().Be("user-42");
        identity.RequestId.Should().Be("request-99");
        identity.UserName.Should().Be("ada.lovelace");
    }

    // TC-PLATEVT-029: An anonymous/system-originated event has no identity keys; the mapping must yield empty
    // identity rather than throwing, because system events legitimately have no user.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-029")]
    public void BuildCurrentBusMessageIdentity_WithAnEmptyRequestContext_ProducesAnEmptyIdentityWithoutThrowing()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        var identity = handler.BuildCurrentBusMessageIdentity(new Dictionary<string, object>());

        identity.Should().NotBeNull();
        identity.UserId.Should().BeNull();
        identity.RequestId.Should().BeNull();
        identity.UserName.Should().BeNull();
    }

    // -- State transfer at the application layer --

    // TC-PLATEVT-033: The application override must transfer the inbox-consumer flag ON TOP OF the five base
    // properties. Losing it in the hop makes the new instance believe it was NOT driven by the inbox, which
    // flips both the wait decision (TC-PLATEVT-009) and the exception decision (TC-PLATEVT-046).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-033")]
    public void CopyPropertiesToNewInstanceBeforeExecution_TransfersTheInboxConsumerFlagInAdditionToTheBaseProperties()
    {
        using var host = EventHandlerTestHost.Create();
        var previousInstance = host.NewAppHandler();
        var newInstance = host.NewAppHandler();

        previousInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope = true;
        previousInstance.IsHandlingInNewScope = true;
        previousInstance.RetryOnFailedTimes = 23;
        previousInstance.ThrowExceptionOnHandleFailed = true;
        previousInstance.NoNeedCloneNewEventInstanceForTheHandler = true;
        previousInstance.IsCalledFromInboxBusMessageConsumer = true;

        // Pin the pre-copy state so the assertions below cannot pass vacuously.
        newInstance.IsCalledFromInboxBusMessageConsumer.Should().BeFalse();
        newInstance.RetryOnFailedTimes.Should().NotBe(previousInstance.RetryOnFailedTimes);

        previousInstance.CopyPropertiesToNewInstanceBeforeExecutionForTest(previousInstance, newInstance);

        newInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope.Should().BeTrue();
        newInstance.IsHandlingInNewScope.Should().BeTrue();
        newInstance.RetryOnFailedTimes.Should().Be(23);
        newInstance.ThrowExceptionOnHandleFailed.Should().BeTrue();
        newInstance.NoNeedCloneNewEventInstanceForTheHandler.Should().BeTrue();
        newInstance.IsCalledFromInboxBusMessageConsumer.Should().BeTrue();
    }

    // TC-PLATEVT-034: Census of the application handler's publicly settable state — the mutation killer for
    // "someone added a property and forgot to copy it".
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-034")]
    public void PublicSettablePropertyCensus_OfTheApplicationHandler_MatchesTheKnownSet()
    {
        var settablePropertyNames = PlatformCqrsEventHandlerTests.PublicSettableInstancePropertyNames(typeof(PlatformCqrsEventApplicationHandler<AppTestEvent>));

        settablePropertyNames.Should()
            .BeEquivalentTo(
                ApplicationSettablePropertyNames,
                "a new publicly settable property must be explicitly considered for CopyPropertiesToNewInstanceBeforeExecution before it ships");
    }

    // -- Retry delay amplification --

    // TC-PLATEVT-044: Without inbox support a failure has nowhere durable to be retried from, so the handler
    // backs off 10x harder to avoid hammering the system (PlatformCqrsEventApplicationHandler.cs:183-187).
    // With inbox support the raw delay is used, because the inbox owns the retry schedule.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-044")]
    [InlineData(true, true, 3, 3)]
    [InlineData(true, false, 3, 3 * 10)]
    [InlineData(false, true, 3, 3 * 10)]
    [InlineData(false, false, 3, 3 * 10)]
    public void RetryOnFailedDelaySeconds_IsAmplifiedTenfoldOnlyWhenInboxSupportIsAbsent(
        bool registerInboxRepository,
        bool enableInboxEventBusMessage,
        double configuredDelaySeconds,
        double expectedDelaySeconds)
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository);
        var handler = host.NewAppHandler();

        handler.EnableInboxEventBusMessageValue = enableInboxEventBusMessage;
        handler.RetryOnFailedDelaySeconds = configuredDelaySeconds;

        handler.RetryOnFailedDelaySeconds.Should().Be(expectedDelaySeconds);
    }

    // TC-PLATEVT-045: A handler the caller is waiting on must not be slowed by the conservative backoff — the
    // caller is blocked on it, so the amplification is suppressed even with no inbox support.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-045")]
    public void RetryOnFailedDelaySeconds_WhenHandlerMustFinishImmediately_IsNotAmplifiedEvenWithoutInboxSupport()
    {
        using var host = EventHandlerTestHost.Create(registerInboxRepository: false);
        var handler = host.NewAppHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.RetryOnFailedDelaySeconds = 4;

        handler.HasInboxMessageSupportForTest().Should().BeFalse("the suppression must be attributable to the wait requirement, not to inbox support");
        handler.RetryOnFailedDelaySeconds.Should().Be(4);
    }

    // TC-PLATEVT-070: The default retry delay is the platform constant before amplification, and the getter
    // amplifies that default too — pinning both halves keeps the default from drifting silently.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-070")]
    public void RetryOnFailedDelaySeconds_DefaultsToThePlatformConstant_AndIsAmplifiedWithoutInboxSupport()
    {
        using var inboxHost = EventHandlerTestHost.Create(registerInboxRepository: true);
        using var noInboxHost = EventHandlerTestHost.Create(registerInboxRepository: false);

        inboxHost.NewAppHandler().RetryOnFailedDelaySeconds.Should().Be(Util.TaskRunner.DefaultResilientDelaySeconds);
        noInboxHost.NewAppHandler().RetryOnFailedDelaySeconds.Should().Be(Util.TaskRunner.DefaultResilientDelaySeconds * 10);
    }

    // -- Failure propagation --

    // TC-PLATEVT-046: Left unset, the decision is DERIVED: an inbox-driven handler must rethrow so the inbox
    // message is marked failed and retried, while a fire-and-forget handler swallows so it cannot break the
    // originating request (PlatformCqrsEventApplicationHandler.cs:680-684).
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-046")]
    [InlineData(false, false)]
    [InlineData(true, true)]
    public void ThrowExceptionOnHandleFailed_WhenNeverSet_FollowsTheInboxConsumerFlag(bool isCalledFromInboxBusMessageConsumer, bool expected)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.IsCalledFromInboxBusMessageConsumer = isCalledFromInboxBusMessageConsumer;

        handler.ThrowExceptionOnHandleFailed.Should().Be(expected);
    }

    // TC-PLATEVT-047: An explicit `true` must survive an inbox-derived `false` — the backing field is `bool?`
    // precisely so that "not configured" is distinguishable from "configured false".
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-047")]
    public void ThrowExceptionOnHandleFailed_WhenExplicitlySetTrue_OverridesTheInboxDerivedFalse()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.IsCalledFromInboxBusMessageConsumer = false;
        handler.ThrowExceptionOnHandleFailed = true;

        handler.ThrowExceptionOnHandleFailed.Should().BeTrue();
    }

    // TC-PLATEVT-048: The mirror case — an explicit `false` must survive an inbox-derived `true`. If the `??`
    // were reversed, or the field were a plain `bool`, this is the case that would silently regress.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-048")]
    public void ThrowExceptionOnHandleFailed_WhenExplicitlySetFalse_OverridesTheInboxDerivedTrue()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.IsCalledFromInboxBusMessageConsumer = true;
        handler.ThrowExceptionOnHandleFailed = false;

        handler.ThrowExceptionOnHandleFailed.Should().BeFalse();
    }

    // TC-PLATEVT-046..048 pin how the flag is DERIVED. The two tests below pin what it DOES to a handler that
    // actually failed. The application override wraps the base pipeline in a catch of its own
    // (PlatformCqrsEventApplicationHandler.cs:1410-1415) and re-decides rethrow-vs-swallow there; if that
    // re-decision is lost, an inbox-driven handler reports success on failure and the message is never retried.
    //
    // Which test guards which site, stated exactly: only TC-PLATEVT-035 can protect the application catch. When
    // the flag is FALSE the base catch (PlatformCqrsEventHandler.cs:911-912) already swallows, so control never
    // reaches :1412-1413 — TC-PLATEVT-036 documents the end-to-end swallow contract, not that specific line.
    //
    // Deterministic by construction — no polling, sleeping or wall-clock dependence:
    //   - MustWait=true keeps the base pipeline on the AWAITED foreground branch (PlatformCqrsEventHandler.cs:882-887).
    //   - RetryOnFailedTimes=0 runs the body exactly once and bypasses Polly entirely (Util.TaskRunner.cs:757-758),
    //     covering BOTH retry wrappers (the base one and PlatformCqrsEventApplicationHandler.cs:1015-1066).
    //   - AutoOpenUow=false selects the direct HandleAsync call (PlatformCqrsEventApplicationHandler.cs:1063-1064).
    //     The UoW-opening paths would route through the host's bare IPlatformUnitOfWorkManager mock, which would
    //     make the outcome an artifact of the mock rather than of the handler's propagation decision.
    // AppTestEvent is not an IPlatformUowEvent, so TryGetCurrentOrCreatedActiveUow returns null
    // (PlatformCqrsEventApplicationHandler.cs:1841-1842) and DoHandle takes PATH D into base.DoHandle — the path
    // that lets a base-layer rethrow reach the application catch under test.

    // TC-PLATEVT-035: With the flag true, the failure must reach the caller THROUGH the application layer's own
    // catch, not be quietly absorbed by it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-035")]
    public async Task Handle_WhenTheHandlerFails_AndThrowExceptionOnHandleFailedIsTrue_PropagatesThroughTheApplicationLayerCatch()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();
        var handlerFailure = new InvalidOperationException("application handler body failed");

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.AutoOpenUowValue = false;
        handler.RetryOnFailedTimes = 0;
        handler.ThrowExceptionOnHandleFailed = true;
        handler.HandleAsyncException = handlerFailure;

        Func<Task> handling = () => handler.Handle(new AppTestEvent(), CancellationToken.None);

        (await handling.Should().ThrowAsync<InvalidOperationException>())
            .Which.Should()
            .BeSameAs(handlerFailure, "an inbox-driven handler's caller must receive the original failure so the message can be marked failed and retried");

        handler.HandleAsyncInvocationCount.Should()
            .Be(1, "the propagation must be attributable to the handler body running and failing, not to the pipeline skipping it");
    }

    // TC-PLATEVT-036: The mirror case — a fire-and-forget application handler must not break its caller, proven
    // end to end through the application entry point rather than at the base layer alone.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-036")]
    public async Task Handle_WhenTheHandlerFails_AndThrowExceptionOnHandleFailedIsFalse_SwallowsTheFailure()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.AutoOpenUowValue = false;
        handler.RetryOnFailedTimes = 0;
        handler.ThrowExceptionOnHandleFailed = false;
        handler.HandleAsyncException = new InvalidOperationException("application handler body failed");

        Func<Task> handling = () => handler.Handle(new AppTestEvent(), CancellationToken.None);

        await handling.Should().NotThrowAsync();

        handler.HandleAsyncInvocationCount.Should()
            .Be(1, "the silence must mean a real failure was swallowed, not that the handler body never ran");
    }

    // TC-PLATEVT-049: The inbox retry schedule and the handler's opt-in defaults. These values decide how long a
    // poisoned message keeps cycling, so they are pinned rather than left to drift.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-049")]
    public void InboxAndUnitOfWorkDefaults_ArePinnedToTheirDocumentedValues()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();

        handler.RetryEventInboxBusMessageConsumerOnFailedDelaySeconds.Should().Be(1);
        handler.RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds.Should().Be(60);
        handler.RetryEventInboxBusMessageConsumerMaxCount.Should().Be(int.MaxValue);
        handler.AutoDeleteProcessedInboxEventMessage.Should().BeFalse("processed inbox messages are retained for diagnosability by default");
        handler.IsCalledFromInboxBusMessageConsumer.Should().BeFalse();
        handler.AutoOpenUowForTest.Should().BeTrue("application event handlers open their own unit of work by default");
    }

    // TC-PLATEVT-071: The application handler is still a base handler — the inherited execution-mode contract
    // must not be shadowed or reset by the application layer.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-071")]
    public void ApplicationHandler_StillHonoursTheBaseSameUowGatingContract()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewAppHandler();
        var siblingHandler = host.NewSiblingAppHandler();
        var @event = new AppTestEvent();

        handler.NeedRunHandlerInSameCurrentActiveUowForTest(@event).Should().BeFalse();

        @event.SetRunHandlerInSameCurrentActiveUow(typeof(AppTestEventHandler));

        handler.NeedRunHandlerInSameCurrentActiveUowForTest(@event).Should().BeTrue();
        siblingHandler.NeedRunHandlerInSameCurrentActiveUowForTest(@event).Should().BeFalse();
    }
}
