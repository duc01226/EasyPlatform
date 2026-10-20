using System.Reflection;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Utils;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Events;

/// <summary>
/// Unit tests for <see cref="PlatformCqrsEventHandler{TEvent}" /> — the base handler every platform event handler
/// derives from (Common/Cqrs/Events/PlatformCqrsEventHandler.cs:435).
/// <para>
/// The subject here is the handler's DECISION surface, not its dispatch plumbing: which execution path an event
/// takes (wait-immediately vs background, same-UoW vs new scope), whether the conditional-processing check is
/// evaluated once or repeatedly, and which state survives the hop to a new handler instance. Each of those is a
/// silent-failure class — a wrong answer changes transaction boundaries or drops handler configuration without
/// throwing anything.
/// </para>
/// </summary>
public class PlatformCqrsEventHandlerTests : PlatformUnitTestBase
{
    /// <summary>
    /// The exact property set <c>CopyPropertiesToNewInstanceBeforeExecution</c> transfers at the base layer
    /// (PlatformCqrsEventHandler.cs:1359-1366).
    /// </summary>
    private static readonly string[] BaseCopiedPropertyNames =
    [
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.ForceCurrentInstanceHandleInCurrentThreadAndScope),
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.IsHandlingInNewScope),
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.RetryOnFailedTimes),
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.ThrowExceptionOnHandleFailed),
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.NoNeedCloneNewEventInstanceForTheHandler)
    ];

    /// <summary>
    /// Properties that are publicly settable but deliberately NOT copied. Listed explicitly so that a future
    /// addition to either list is a conscious decision rather than an omission.
    /// </summary>
    private static readonly string[] BaseNotCopiedPropertyNames =
    [
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.RetryOnFailedDelaySeconds),
        nameof(PlatformCqrsEventHandler<PlainTestEvent>.MaxRetryOnFailedDelaySeconds)
    ];

    /// <summary>
    /// <see cref="PlatformCqrsEventHandler{TEvent}.MaxRetryOnFailedDelaySeconds" />'s default (PlatformCqrsEventHandler.cs:585)
    /// is a plain literal in source, not derived from a named platform constant, so there is nothing to pin
    /// against except the value itself. Named here once so both pinning sites move together on a deliberate retune.
    /// </summary>
    private const double ExpectedMaxRetryOnFailedDelaySeconds = 60;

    // -- Execution-mode gating: wait immediately --

    // TC-PLATEVT-001: A handler with no wait requirement and an event naming nobody defers to background.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-001")]
    public void NeedWaitHandlerExecutionFinishedImmediately_WhenNeitherHandlerNorEventDemandsIt_IsFalse()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(new PlainTestEvent()).Should().BeFalse();
    }

    // TC-PLATEVT-002: The handler-level switch alone forces foreground execution.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-002")]
    public void NeedWaitHandlerExecutionFinishedImmediately_WhenHandlerDemandsIt_IsTrue()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;

        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(new PlainTestEvent()).Should().BeTrue();
    }

    // TC-PLATEVT-003: The event can force foreground execution for one named handler type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-003")]
    public void NeedWaitHandlerExecutionFinishedImmediately_WhenEventNamesThisHandlerType_IsTrue()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();

        @event.SetWaitHandlerExecutionFinishedImmediately(typeof(PlainTestEventHandler));

        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(@event).Should().BeTrue();
    }

    // TC-PLATEVT-004: The event-level opt-in is keyed on handler FULL NAME, so a sibling handler is NOT swept in.
    // Without this, naming one handler would silently serialize every handler of the same event.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-004")]
    public void NeedWaitHandlerExecutionFinishedImmediately_WhenEventNamesOnlyASiblingHandlerType_IsFalseForThisHandler()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var siblingHandler = host.NewSiblingPlainHandler();
        var @event = new PlainTestEvent();

        @event.SetWaitHandlerExecutionFinishedImmediately(typeof(SiblingPlainTestEventHandler));

        @event.WaitHandlerExecutionFinishedImmediatelyFullNames.Should().BeEquivalentTo([typeof(SiblingPlainTestEventHandler).FullName]);
        siblingHandler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(@event).Should().BeTrue("the sibling is the handler the event named");
        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(@event).Should().BeFalse("this handler type was not named by the event");
    }

    // TC-PLATEVT-005: NotNeedWait is the exact negation of NeedWait in both directions.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-005")]
    [InlineData(false)]
    [InlineData(true)]
    public void NotNeedWaitHandlerExecutionFinishedImmediately_IsTheExactNegationOfNeedWait(bool handlerDemandsWait)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = handlerDemandsWait;

        handler.NotNeedWaitHandlerExecutionFinishedImmediatelyForTest(@event)
            .Should()
            .Be(!handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(@event));
    }

    // -- Execution-mode gating: same active unit of work --

    // TC-PLATEVT-006: Nothing runs in the parent's UoW unless it is explicitly asked for.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-006")]
    public void NeedRunHandlerInSameCurrentActiveUow_WhenNeitherHandlerNorEventDemandsIt_IsFalse()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.NeedRunHandlerInSameCurrentActiveUowForTest(new PlainTestEvent()).Should().BeFalse();
    }

    // TC-PLATEVT-007: The handler-level switch alone pins the handler into the parent's transaction.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-007")]
    public void NeedRunHandlerInSameCurrentActiveUow_WhenHandlerDemandsIt_IsTrue()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.MustRunHandlerInSameCurrentActiveUowValue = true;

        handler.NeedRunHandlerInSameCurrentActiveUowForTest(new PlainTestEvent()).Should().BeTrue();
    }

    // TC-PLATEVT-008: Event-level same-UoW opt-in targets exactly the named handler type and not a sibling.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-008")]
    public void NeedRunHandlerInSameCurrentActiveUow_WhenEventNamesAHandlerType_TargetsOnlyThatType()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var siblingHandler = host.NewSiblingPlainHandler();
        var @event = new PlainTestEvent();

        @event.SetRunHandlerInSameCurrentActiveUow(typeof(PlainTestEventHandler));

        @event.RunHandlerInSameCurrentActiveUowFullNames.Should().BeEquivalentTo([typeof(PlainTestEventHandler).FullName]);
        handler.NeedRunHandlerInSameCurrentActiveUowForTest(@event).Should().BeTrue();
        siblingHandler.NeedRunHandlerInSameCurrentActiveUowForTest(@event).Should().BeFalse();
    }

    // Local cloning must preserve execution policy without making it part of the serialized event contract.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-019")]
    [InlineData(false)]
    [InlineData(true)]
    public void BuildHandlerInstanceEvent_PreservesTargetedExecutionPolicyAndIsolation(bool targetSibling)
    {
        using var host = EventHandlerTestHost.Create(registerPlainEventHandlers: true);
        var handler = host.NewPlainHandler();
        var sibling = host.NewSiblingPlainHandler();
        var waitType = targetSibling ? typeof(SiblingPlainTestEventHandler) : typeof(PlainTestEventHandler);
        var sameUowType = targetSibling ? typeof(PlainTestEventHandler) : typeof(SiblingPlainTestEventHandler);
        var @event = new PlainTestEvent
        {
            WaitHandlerExecutionFinishedImmediatelyFullNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { waitType.FullName!.ToLowerInvariant() },
            RunHandlerInSameCurrentActiveUowFullNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { sameUowType.FullName!.ToLowerInvariant() },
            RequestContext = new Dictionary<string, object> { ["correlation"] = "original" }
        };

        var clone = handler.BuildHandlerInstanceEventForTest(@event);

        clone.Should().NotBeSameAs(@event, "two real handler registrations require an isolated local event");
        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(clone).Should().Be(!targetSibling);
        sibling.NeedWaitHandlerExecutionFinishedImmediatelyForTest(clone).Should().Be(targetSibling);
        handler.NeedRunHandlerInSameCurrentActiveUowForTest(clone).Should().Be(targetSibling);
        sibling.NeedRunHandlerInSameCurrentActiveUowForTest(clone).Should().Be(!targetSibling);
        clone.WaitHandlerExecutionFinishedImmediatelyFullNames.Should().NotBeSameAs(@event.WaitHandlerExecutionFinishedImmediatelyFullNames);
        clone.RunHandlerInSameCurrentActiveUowFullNames.Should().NotBeSameAs(@event.RunHandlerInSameCurrentActiveUowFullNames);
        clone.WaitHandlerExecutionFinishedImmediatelyFullNames.Clear();
        clone.RunHandlerInSameCurrentActiveUowFullNames.Clear();
        clone.RequestContext["correlation"] = "clone";
        @event.MustWaitHandlerExecutionFinishedImmediately(waitType).Should().BeTrue();
        @event.MustRunHandlerInSameCurrentActiveUow(sameUowType).Should().BeTrue();
        @event.RequestContext["correlation"].Should().Be("original");
        handler.BuildHandlerInstanceEventForTest(clone).Should().BeSameAs(clone, "re-entry must reuse this handler's isolated event");
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-020")]
    public void BuildHandlerInstanceEvent_WithoutLocalPolicy_PreservesBackgroundDefaults()
    {
        using var host = EventHandlerTestHost.Create(registerPlainEventHandlers: true);
        var handler = host.NewPlainHandler();

        var clone = handler.BuildHandlerInstanceEventForTest(new PlainTestEvent());

        clone.WaitHandlerExecutionFinishedImmediatelyFullNames.Should().BeNull();
        clone.RunHandlerInSameCurrentActiveUowFullNames.Should().BeNull();
        handler.NeedWaitHandlerExecutionFinishedImmediatelyForTest(clone).Should().BeFalse();
        handler.NeedRunHandlerInSameCurrentActiveUowForTest(clone).Should().BeFalse();
    }

    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-021")]
    public void BuildHandlerInstanceEvent_LocalPolicyRemainsExcludedFromWirePayload()
    {
        using var host = EventHandlerTestHost.Create(registerPlainEventHandlers: true);
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();
        @event.SetWaitHandlerExecutionFinishedImmediately(typeof(PlainTestEventHandler));
        @event.SetRunHandlerInSameCurrentActiveUow(typeof(PlainTestEventHandler));

        var clone = handler.BuildHandlerInstanceEventForTest(@event);
        var json = Easy.Platform.Common.JsonSerialization.PlatformJsonSerializer.Serialize(clone);

        json.Should().NotContain(nameof(PlatformCqrsEvent.WaitHandlerExecutionFinishedImmediatelyFullNames));
        json.Should().NotContain(nameof(PlatformCqrsEvent.RunHandlerInSameCurrentActiveUowFullNames));
    }

    // -- Conditional processing check and its cache --

    // TC-PLATEVT-010: CheckHandleWhen surfaces whatever HandleWhen decided.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-010")]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CheckHandleWhen_ReturnsTheValueProducedByHandleWhen(bool handleWhenResult)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.HandleWhenReturnValue = handleWhenResult;

        (await handler.CheckHandleWhenForTest(new PlainTestEvent())).Should().Be(handleWhenResult);
    }

    // TC-PLATEVT-011: The `??=` cache (PlatformCqrsEventHandler.cs:1478-1481) must evaluate HandleWhen ONCE.
    // HandleWhen implementations routinely hit the database, so a lost cache turns one query into N.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-011")]
    public async Task CheckHandleWhen_WhenCalledRepeatedly_EvaluatesHandleWhenExactlyOnce()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();

        handler.HandleWhenReturnValue = true;

        await handler.CheckHandleWhenForTest(@event);
        await handler.CheckHandleWhenForTest(@event);
        await handler.CheckHandleWhenForTest(@event);

        handler.HandleWhenInvocationCount.Should().Be(1);
    }

    // TC-PLATEVT-012: The cache field is `bool?`, so a cached FALSE also short-circuits. A `bool` field would
    // silently re-evaluate on every negative answer — the more common answer in practice.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-012")]
    public async Task CheckHandleWhen_WhenFirstAnswerIsFalse_StillCachesAndDoesNotReEvaluate()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();

        handler.HandleWhenReturnValue = false;

        var firstResult = await handler.CheckHandleWhenForTest(@event);
        var secondResult = await handler.CheckHandleWhenForTest(@event);

        firstResult.Should().BeFalse();
        secondResult.Should().BeFalse();
        handler.HandleWhenInvocationCount.Should().Be(1);
    }

    // TC-PLATEVT-013: The cached answer is authoritative for the instance's lifetime — a later change of mind by
    // HandleWhen must not flip the decision mid-pipeline, which would make the handler run twice or not at all.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-013")]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task CheckHandleWhen_AfterTheUnderlyingAnswerChanges_KeepsTheFirstDecision(bool firstAnswer, bool changedAnswer)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var @event = new PlainTestEvent();

        handler.HandleWhenReturnValue = firstAnswer;
        var cachedResult = await handler.CheckHandleWhenForTest(@event);

        handler.HandleWhenReturnValue = changedAnswer;
        var afterChangeResult = await handler.CheckHandleWhenForTest(@event);

        cachedResult.Should().Be(firstAnswer);
        afterChangeResult.Should().Be(firstAnswer);
        handler.HandleWhenInvocationCount.Should().Be(1);
    }

    // TC-PLATEVT-014: The cache is instance state, never shared. Handlers are resolved per scope, so a leaked
    // cache across instances would apply one event's verdict to a different event.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-014")]
    public async Task CheckHandleWhen_CacheIsScopedToTheHandlerInstance()
    {
        using var host = EventHandlerTestHost.Create();
        var firstHandler = host.NewPlainHandler();
        var secondHandler = host.NewPlainHandler();

        firstHandler.HandleWhenReturnValue = false;
        secondHandler.HandleWhenReturnValue = true;

        (await firstHandler.CheckHandleWhenForTest(new PlainTestEvent())).Should().BeFalse();
        (await secondHandler.CheckHandleWhenForTest(new PlainTestEvent())).Should().BeTrue();
        firstHandler.HandleWhenInvocationCount.Should().Be(1);
        secondHandler.HandleWhenInvocationCount.Should().Be(1);
    }

    // -- Pipeline entry-point wiring --
    // TC-PLATEVT-010..014 above prove the isolated decision methods. The two tests below prove the actual
    // pipeline call sites still CONSULT those decisions — a call site that stopped checking its gate would
    // leave every decision test green while the gate itself silently disappeared.

    // TC-PLATEVT-015: ExecuteHandleAsync's own gate (PlatformCqrsEventHandler.cs:805-806) — HandleAsync must run
    // only when CheckHandleWhen allows it, proven through the real pipeline entry point rather than through
    // CheckHandleWhenForTest alone.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATEVT-015")]
    [InlineData(false, 0)]
    [InlineData(true, 1)]
    public async Task ExecuteHandleAsync_RunsHandleAsyncOnlyWhenCheckHandleWhenAllowsIt(bool handleWhenResult, int expectedHandleAsyncInvocationCount)
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.HandleWhenReturnValue = handleWhenResult;

        await handler.ExecuteHandleAsync(new PlainTestEvent(), CancellationToken.None);

        handler.HandleAsyncInvocationCount.Should().Be(expectedHandleAsyncInvocationCount);
    }

    // TC-PLATEVT-016: DoHandle's background-vs-foreground routing gate (PlatformCqrsEventHandler.cs:883-884).
    // When the handler demands to wait, NotNeedWaitHandlerExecutionFinishedImmediately must be false, which must
    // route DoHandle into the foreground branch — proven by HandleAsync having run SYNCHRONOUSLY by the time the
    // public Handle() entry point returns, not merely by the isolated NotNeedWait helper answering correctly.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-016")]
    public async Task Handle_WhenTheHandlerMustWaitImmediately_RunsHandleAsyncSynchronouslyBeforeReturning()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;

        await handler.Handle(new PlainTestEvent(), CancellationToken.None);

        handler.HandleAsyncInvocationCount.Should()
            .Be(1, "MustWait=true forces NotNeedWait=false, which must keep DoHandle out of the fire-and-forget background branch");
    }

    // -- State transfer to a new handler instance --

    // TC-PLATEVT-030: Every one of the five documented properties must survive the hop to the background
    // instance (PlatformCqrsEventHandler.cs:1359-1366). Non-default values are used on ALL five so a dropped
    // line cannot hide behind a coincidental default.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-030")]
    public void CopyPropertiesToNewInstanceBeforeExecution_TransfersEveryDocumentedProperty()
    {
        using var host = EventHandlerTestHost.Create();
        var previousInstance = host.NewPlainHandler();
        var newInstance = host.NewPlainHandler();

        previousInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope = true;
        previousInstance.IsHandlingInNewScope = true;
        previousInstance.RetryOnFailedTimes = 17;
        previousInstance.ThrowExceptionOnHandleFailed = true;
        previousInstance.NoNeedCloneNewEventInstanceForTheHandler = true;

        // Pin the pre-copy state so the assertions below cannot pass vacuously on a target that already held
        // the expected values.
        newInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope.Should().BeFalse();
        newInstance.IsHandlingInNewScope.Should().BeFalse();
        newInstance.RetryOnFailedTimes.Should().NotBe(previousInstance.RetryOnFailedTimes);
        newInstance.ThrowExceptionOnHandleFailed.Should().BeFalse();
        newInstance.NoNeedCloneNewEventInstanceForTheHandler.Should().BeFalse();

        previousInstance.CopyPropertiesToNewInstanceBeforeExecutionForTest(previousInstance, newInstance);

        newInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope.Should().BeTrue();
        newInstance.IsHandlingInNewScope.Should().BeTrue();
        newInstance.RetryOnFailedTimes.Should().Be(17);
        newInstance.ThrowExceptionOnHandleFailed.Should().BeTrue();
        newInstance.NoNeedCloneNewEventInstanceForTheHandler.Should().BeTrue();
    }

    // TC-PLATEVT-031: The retry DELAY settings are deliberately not copied — the new instance recomputes them
    // from its own context. Pinning the exclusion keeps the omission intentional instead of accidental.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-031")]
    public void CopyPropertiesToNewInstanceBeforeExecution_DoesNotTransferTheRetryDelaySettings()
    {
        using var host = EventHandlerTestHost.Create();
        var previousInstance = host.NewPlainHandler();
        var newInstance = host.NewPlainHandler();

        previousInstance.RetryOnFailedDelaySeconds = 123;
        previousInstance.MaxRetryOnFailedDelaySeconds = 456;

        previousInstance.CopyPropertiesToNewInstanceBeforeExecutionForTest(previousInstance, newInstance);

        newInstance.RetryOnFailedDelaySeconds.Should().Be(Util.TaskRunner.DefaultResilientDelaySeconds);
        newInstance.MaxRetryOnFailedDelaySeconds.Should().Be(ExpectedMaxRetryOnFailedDelaySeconds);
    }

    // TC-PLATEVT-032: Census of the base handler's publicly settable state. Adding a property without deciding
    // whether it must be copied is exactly the failure this catches — the census breaks, forcing the decision.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-032")]
    public void PublicSettablePropertyCensus_OfTheBaseHandler_IsExactlyTheCopiedAndDeliberatelyNotCopiedSets()
    {
        var settablePropertyNames = PublicSettableInstancePropertyNames(typeof(PlatformCqrsEventHandler<PlainTestEvent>));

        settablePropertyNames.Should()
            .BeEquivalentTo(
                BaseCopiedPropertyNames.Concat(BaseNotCopiedPropertyNames),
                "a new publicly settable handler property must be explicitly classified as copied or not-copied before it ships");
    }

    // -- Resilience and failure-propagation defaults --

    // TC-PLATEVT-040: Retry count default comes from the platform-wide resilience constant, not a local literal.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-040")]
    public void RetryOnFailedTimes_DefaultsToThePlatformResilientRetryCount()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.RetryOnFailedTimes.Should().Be(Util.TaskRunner.DefaultResilientRetryCount);
    }

    // TC-PLATEVT-041: At the BASE layer the retry delay is the raw platform default — the 10x amplification is
    // an application-layer concern only (see TC-PLATEVT-044).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-041")]
    public void RetryOnFailedDelaySeconds_AtTheBaseLayer_IsTheRawPlatformDefaultWithNoAmplification()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.RetryOnFailedDelaySeconds.Should().Be(Util.TaskRunner.DefaultResilientDelaySeconds);
    }

    // TC-PLATEVT-042: The backoff cap keeps exponential retry from parking a handler for minutes.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-042")]
    public void MaxRetryOnFailedDelaySeconds_DefaultsToSixtySeconds()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.MaxRetryOnFailedDelaySeconds.Should().Be(ExpectedMaxRetryOnFailedDelaySeconds);
    }

    // TC-PLATEVT-043: Base-layer execution flags start off, and ThrowExceptionOnHandleFailed is a plain
    // settable auto-property here — unlike the application layer, which derives it (see TC-PLATEVT-046).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-043")]
    public void ExecutionFlags_DefaultToFalse_AndThrowExceptionOnHandleFailedRoundTrips()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.ForceCurrentInstanceHandleInCurrentThreadAndScope.Should().BeFalse();
        handler.IsHandlingInNewScope.Should().BeFalse();
        handler.NoNeedCloneNewEventInstanceForTheHandler.Should().BeFalse();
        handler.ThrowExceptionOnHandleFailed.Should().BeFalse();

        handler.ThrowExceptionOnHandleFailed = true;

        handler.ThrowExceptionOnHandleFailed.Should().BeTrue();
    }

    // TC-PLATEVT-043 above pins the FLAG. The two tests below pin the BEHAVIOR the flag exists to select —
    // rethrow vs swallow-and-log for a handler that actually failed. Without them, deleting the rethrow at
    // PlatformCqrsEventHandler.cs:911-912 or :919-920 leaves the whole suite green while every inbox-driven
    // handler silently reports success on failure, so the inbox message is never marked failed and never retried:
    // permanent event loss with no signal.
    //
    // Both are deterministic by construction, with no polling, sleeping or wall-clock dependence:
    //   - MustWait=true forces NotNeedWait=false, keeping DoHandle on the AWAITED foreground branch
    //     (PlatformCqrsEventHandler.cs:882-887) rather than the fire-and-forget one — the same arrangement
    //     TC-PLATEVT-016 already proves works.
    //   - RetryOnFailedTimes=0 makes Util.TaskRunner.WaitRetryThrowFinalExceptionAsync run the body exactly once
    //     and skip Polly entirely (Util.TaskRunner.cs:757-758), so no backoff delay is ever scheduled.

    // TC-PLATEVT-017: ThrowExceptionOnHandleFailed=true must PROPAGATE the handler's failure to the caller,
    // which is what lets an inbox consumer mark the message failed and retry it. Driven through the real Handle()
    // entry point, so both base rethrow sites are on the path being proven.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-017")]
    public async Task Handle_WhenTheHandlerFails_AndThrowExceptionOnHandleFailedIsTrue_PropagatesTheFailureToTheCaller()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();
        var handlerFailure = new InvalidOperationException("handler body failed");

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.RetryOnFailedTimes = 0;
        handler.ThrowExceptionOnHandleFailed = true;
        handler.HandleAsyncException = handlerFailure;

        Func<Task> handling = () => handler.Handle(new PlainTestEvent(), CancellationToken.None);

        (await handling.Should().ThrowAsync<InvalidOperationException>())
            .Which.Should()
            .BeSameAs(handlerFailure, "the caller must receive the handler's own failure, not a substituted or wrapped one");

        handler.HandleAsyncInvocationCount.Should()
            .Be(1, "the propagation must be attributable to the handler body running and failing, not to the pipeline skipping it");
    }

    // TC-PLATEVT-018: The mirror case. ThrowExceptionOnHandleFailed=false must SWALLOW the failure so a
    // fire-and-forget handler cannot break the originating request. The invocation count is what separates
    // "swallowed a real failure" from "never ran at all" — both of which otherwise look like "did not throw".
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATEVT-018")]
    public async Task Handle_WhenTheHandlerFails_AndThrowExceptionOnHandleFailedIsFalse_SwallowsTheFailure()
    {
        using var host = EventHandlerTestHost.Create();
        var handler = host.NewPlainHandler();

        handler.MustWaitHandlerExecutionFinishedImmediatelyValue = true;
        handler.RetryOnFailedTimes = 0;
        handler.ThrowExceptionOnHandleFailed = false;
        handler.HandleAsyncException = new InvalidOperationException("handler body failed");

        Func<Task> handling = () => handler.Handle(new PlainTestEvent(), CancellationToken.None);

        await handling.Should().NotThrowAsync();

        handler.HandleAsyncInvocationCount.Should()
            .Be(1, "the silence must mean a real failure was swallowed, not that the handler body never ran");
    }

    internal static List<string> PublicSettableInstancePropertyNames(Type handlerType)
    {
        return handlerType
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(property => property.GetSetMethod(nonPublic: false) != null)
            .Select(property => property.Name)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();
    }
}
