using System.Reflection;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Tests.Unit.Base;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Tests.Unit.Infrastructures.MessageBus;

/// <summary>
/// Guards the <see cref="PlatformMessageBusConsumer{TMessage}" /> handling pipeline — the ORDER of its steps, the
/// <c>HandleWhen</c> gate that decides whether a message is processed at all, and the retry policy wrapped around the
/// handling logic.
/// <para>
/// <b>Invariant guarded:</b> the pipeline at <c>PlatformMessageBusConsumer.cs:375-411</c> is
/// <c>BeforeHandleAsync → HandleWhen gate → BeforeExecuteHandleLogicAsync → retry-wrapped ExecuteHandleLogicAsync</c>.
/// That order is a contract, not an implementation detail: <c>BeforeHandleAsync</c> is where derived consumers restore
/// the ambient request context from the message, so a gate evaluated BEFORE it would decide on an unpopulated context;
/// and <c>BeforeExecuteHandleLogicAsync</c> is where the circular-pipeline guard runs, so running it for messages the
/// gate rejected would pollute the pipeline trace with work that never happened. Both failures are invisible at
/// runtime — nothing throws, the message is simply handled against the wrong state — which is why the order is pinned
/// here with an explicit call recorder rather than inferred from a single end-to-end assertion.
/// </para>
/// <para>
/// <b>Why the tests are fast:</b> the retry back-off is <c>Math.Min(retryAttempt + RetryOnFailedDelaySeconds,
/// MaxRetryOnFailedDelaySeconds)</c>, so every retry test sets <c>MaxRetryOnFailedDelaySeconds = 0</c> to collapse the
/// wait to zero. The retry COUNT stays real — only the sleep is neutralized, so what is under test is unchanged.
/// </para>
/// </summary>
public class PlatformMessageBusConsumerPipelineTests : PlatformUnitTestBase
{
    private const string TestRoutingKey = "TestGroup.TestProducer.TestMessage";

    // TC-PLATCONS-010: A false HandleWhen short-circuits the pipeline AFTER BeforeHandleAsync and BEFORE any handling.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-010")]
    public async Task HandleAsync_WhenHandleWhenReturnsFalse_RunsBeforeHandleButNeitherPreExecuteNorHandleLogic()
    {
        // This is the highest-value branch in the whole pipeline: it is the ONLY place a message is legitimately
        // dropped without an error. If the gate stopped short-circuiting, every consumer that filters by message
        // content would start processing messages it explicitly declined — silently, with no exception and no log.
        var consumer = new RecordingConsumer { HandleWhenResult = false };

        await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer
            .Calls.Should()
            .Equal(
                nameof(RecordingConsumer.BeforeHandleAsync),
                nameof(RecordingConsumer.HandleWhen));

        // Asserted as explicit absences, not merely by the sequence above: a regression that appends the handling steps
        // AFTER the gate would still start with these two entries.
        consumer.Calls.Should().NotContain(nameof(RecordingConsumer.BeforeExecuteHandleLogicAsync));
        consumer.Calls.Should().NotContain(nameof(RecordingConsumer.HandleLogicAsync));
    }

    // TC-PLATCONS-011: A true HandleWhen lets the pipeline through — the counter-test to TC-PLATCONS-010.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-011")]
    public async Task HandleAsync_WhenHandleWhenReturnsTrue_ExecutesEveryPipelineStepInOrder()
    {
        // Without this counter-test, "never handle anything" would satisfy TC-PLATCONS-010 perfectly.
        var consumer = new RecordingConsumer { HandleWhenResult = true };

        await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer
            .Calls.Should()
            .Equal(
                nameof(RecordingConsumer.BeforeHandleAsync),
                nameof(RecordingConsumer.HandleWhen),
                nameof(RecordingConsumer.BeforeExecuteHandleLogicAsync),
                nameof(RecordingConsumer.ExecuteHandleLogicAsync),
                nameof(RecordingConsumer.HandleLogicAsync));
    }

    // TC-PLATCONS-012: NoNeedCheckHandleWhen bypasses the gate entirely — HandleWhen is not even consulted.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-012")]
    public async Task HandleAsync_WithNoNeedCheckHandleWhen_SkipsTheGateWithoutInvokingHandleWhen()
    {
        // The flag is set by callers that have ALREADY evaluated the gate (notably the inbox path, which decided to
        // enqueue this message precisely because HandleWhen said yes). Re-evaluating it there is not merely wasteful:
        // HandleWhen implementations routinely query the database, so a second evaluation against state that has since
        // changed can drop a message the system already committed to handling.
        // The consumer below would say NO if asked — so "logic ran" proves the gate was bypassed, and an invocation
        // count of zero proves it was bypassed by NOT ASKING rather than by ignoring the answer.
        var consumer = new RecordingConsumer { HandleWhenResult = false, NoNeedCheckHandleWhen = true };

        await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer.HandleWhenInvocationCount.Should().Be(0, "the gate must be skipped, not merely overridden");
        consumer.Calls.Should().Contain(nameof(RecordingConsumer.HandleLogicAsync));
    }

    // TC-PLATCONS-013: CheckHandleWhen caches a TRUE decision and never re-asks.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-013")]
    public async Task CheckHandleWhen_AfterATrueDecision_IsCachedAndDoesNotReInvokeHandleWhen()
    {
        var consumer = new RecordingConsumer { HandleWhenResult = true };

        var firstDecision = await consumer.InvokeCheckHandleWhenAsync(new PipelineTestMessage(), TestRoutingKey);

        // Flip the underlying answer. A cached decision must ignore the flip; an uncached one would pick it up.
        consumer.HandleWhenResult = false;
        var secondDecision = await consumer.InvokeCheckHandleWhenAsync(new PipelineTestMessage(), TestRoutingKey);

        firstDecision.Should().BeTrue();
        secondDecision.Should().BeTrue("the decision is cached with ??= at PlatformMessageBusConsumer.cs:444");
        consumer.HandleWhenInvocationCount.Should().Be(1, "HandleWhen commonly hits the database — it must be asked once per consumer instance");
    }

    // TC-PLATCONS-014: CheckHandleWhen caches a FALSE decision too — the nullable-bool trap.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-014")]
    public async Task CheckHandleWhen_AfterAFalseDecision_IsAlsoCachedAndDoesNotReInvokeHandleWhen()
    {
        // The false case is the one a naive cache gets wrong. Backing the cache with a plain `bool` instead of `bool?`
        // makes `??=` (or a `if (!cached)` guard) treat "cached false" as "not yet evaluated", silently re-running a
        // database-hitting HandleWhen on every call. The cache field is `bool?` precisely to distinguish
        // "decided: no" from "not decided" — this test is what keeps it that way.
        var consumer = new RecordingConsumer { HandleWhenResult = false };

        var firstDecision = await consumer.InvokeCheckHandleWhenAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer.HandleWhenResult = true;
        var secondDecision = await consumer.InvokeCheckHandleWhenAsync(new PipelineTestMessage(), TestRoutingKey);

        firstDecision.Should().BeFalse();
        secondDecision.Should().BeFalse("a cached NO must stay NO — 'decided: no' is not 'not yet decided'");
        consumer.HandleWhenInvocationCount.Should().Be(1);
    }

    // TC-PLATCONS-015: The unoverridden HandleWhen returns true, so a plain consumer consumes everything routed to it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-015")]
    public async Task HandleWhen_WhenNotOverridden_DefaultsToTrue()
    {
        // Most consumers never override HandleWhen and rely on routing-key binding alone. If the default flipped to
        // false, every one of them would stop consuming while every test that DOES override the gate kept passing.
        var consumer = new DefaultGateConsumer();

        (await consumer.HandleWhen(new PipelineTestMessage(), TestRoutingKey)).Should().BeTrue();

        await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer.HandleLogicInvocationCount.Should().Be(1);
    }

    // TC-PLATCONS-016: The non-generic HandleWhen(object, ...) casts to TMessage and fails loudly on the wrong type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-016")]
    public async Task HandleWhenObjectOverload_DelegatesToTypedOverloadAndThrowsOnWrongMessageType()
    {
        var consumer = new RecordingConsumer { HandleWhenResult = false };

        // The object overload must reach the SAME typed implementation, otherwise the bus infrastructure (which only
        // holds IPlatformMessageBusConsumer) would evaluate a different gate than the consumer author wrote.
        (await ((IPlatformMessageBusConsumer)consumer).HandleWhen(new PipelineTestMessage(), TestRoutingKey)).Should().BeFalse();
        consumer.HandleWhenInvocationCount.Should().Be(1);

        // A wrong-typed message must throw rather than silently no-op. A misrouted message that quietly returns is the
        // worst outcome available: the bus acks it, the payload is gone, and nothing anywhere records that it was
        // dropped. `Cast<T>` is a hard `(T)obj` (ObjectGeneralExtension.cs:278-281) exactly so this fails loudly.
        var wrongType = async () => await consumer.HandleWhen(new UnrelatedMessage(), TestRoutingKey);

        await wrongType.Should().ThrowAsync<InvalidCastException>();
    }

    // TC-PLATCONS-017: PlatformCqrsEntityEventBusMessageConsumer OVERRIDES HandleWhen into the slot the gate reads.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-017")]
    public void EntityEventConsumer_OverridesHandleWhenIntoTheSlotThePipelineGateDispatchesThrough()
    {
        // REGRESSION GUARD for a fixed defect. PlatformCqrsEntityEventBusMessageConsumer.cs:29 previously declared
        // `public new abstract Task<bool> HandleWhen(...)`. `new` HIDES rather than overrides, allocating a SEPARATE
        // vtable slot: the gate calls CheckHandleWhen (PlatformMessageBusConsumer.cs:442), which is compiled inside
        // PlatformMessageBusConsumer<TMessage> and so binds the BASE slot — an unconditional `return true` (:422).
        // Every derived consumer's filter therefore compiled, read as correct, and was never consulted, silently
        // over-consuming every entity event. It is now `abstract override`, which reuses the base slot.
        // This test is structural on purpose: it fails the moment `new` is reintroduced, which is the exact edit that
        // would silently re-break 8 production consumers without any test that exercises them going red.
        var declared = typeof(PlatformCqrsEntityEventBusMessageConsumer<,>)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Single(method => method.Name == nameof(IPlatformMessageBusConsumer.HandleWhen));

        declared
            .Attributes.HasFlag(MethodAttributes.NewSlot)
            .Should()
            .BeFalse("`abstract override` must REUSE the base gate's vtable slot — NewSlot means `new` crept back in");

        declared
            .GetBaseDefinition()
            .DeclaringType!.GetGenericTypeDefinition()
            .Should()
            .Be(
                typeof(PlatformMessageBusConsumer<>),
                "the override's base definition must be PlatformMessageBusConsumer<TMessage>.HandleWhen — the slot "
                + "CheckHandleWhen dispatches through. If it were its own base definition, the gate could not reach it.");

        declared.IsAbstract.Should().BeTrue("subclasses must still be forced to state their own CRUD filter explicitly");

        // The counter-half: it really is the SAME slot, not merely a same-named method on a different type.
        var baseGate = typeof(PlatformMessageBusConsumer<>)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Single(method => method.Name == nameof(IPlatformMessageBusConsumer.HandleWhen) && method.GetParameters()[0].ParameterType.IsGenericParameter);

        baseGate.IsVirtual.Should().BeTrue();
        baseGate.GetBaseDefinition().DeclaringType.Should().Be(baseGate.DeclaringType, "the base gate is the slot's own root definition");
    }

    // TC-PLATCONS-020: The non-generic HandleAsync(object, ...) casts to TMessage and fails loudly on the wrong type.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-020")]
    public async Task HandleAsyncObjectOverload_RunsTheTypedPipelineAndThrowsOnWrongMessageType()
    {
        var consumer = new RecordingConsumer();

        await ((IPlatformMessageBusConsumer)consumer).HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer.Calls.Should().Contain(nameof(RecordingConsumer.HandleLogicAsync));

        var wrongType = async () => await consumer.HandleAsync(new UnrelatedMessage(), TestRoutingKey);

        await wrongType.Should().ThrowAsync<InvalidCastException>("a misrouted message must fail loudly, never be silently dropped");
    }

    // TC-PLATCONS-021: ExecuteHandleLogicAsync delegates to HandleLogicAsync when not overridden.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-021")]
    public async Task ExecuteHandleLogicAsync_WhenNotOverridden_DelegatesToHandleLogicAsync()
    {
        // The seam matters: PlatformApplicationMessageBusConsumer OVERRIDES ExecuteHandleLogicAsync to insert the inbox
        // pattern, and relies on the base delegating straight through for consumers that do not. If the base stopped
        // delegating, every non-application consumer in the platform would run its pipeline and handle nothing.
        var consumer = new RecordingConsumer();

        await consumer.ExecuteHandleLogicAsync(new PipelineTestMessage(), TestRoutingKey);

        consumer
            .Calls.Should()
            .Equal(
                nameof(RecordingConsumer.ExecuteHandleLogicAsync),
                nameof(RecordingConsumer.HandleLogicAsync));
    }

    // TC-PLATCONS-022: A handling failure is logged once and RETHROWN, never swallowed.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-022")]
    public async Task HandleAsync_WhenHandleLogicThrows_LogsTheErrorAndRethrows()
    {
        // Rethrow is what makes the message NACK and reach the inbox failure path / dead letter. Swallowing the
        // exception after logging would turn every consume failure into permanent silent data loss that only a log
        // search could discover.
        var loggerFactory = new RecordingLoggerFactory();
        var consumer = new RecordingConsumer(loggerFactory)
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("handle logic blew up"),
            RetryOnFailedTimes = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        (await act.Should().ThrowAsync<InvalidOperationException>()).WithMessage("handle logic blew up");
        loggerFactory.Logger.ErrorCount.Should().Be(1, "LogErrorOnException defaults to true");
    }

    // TC-PLATCONS-023: LogErrorOnException=false suppresses the log but must NOT suppress the throw.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-023")]
    public async Task HandleAsync_WithLogErrorOnExceptionDisabled_StillRethrowsWithoutLogging()
    {
        // The opt-out exists so the inbox path can own the failure record instead of double-reporting it
        // (PlatformApplicationBusMessageConsumer.cs:221). It must remain a LOGGING opt-out only: if suppressing the log
        // also suppressed the throw, an inbox-driven consumer would mark every failed message as processed.
        var loggerFactory = new RecordingLoggerFactory();
        var consumer = new RecordingConsumer(loggerFactory)
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("quiet failure"),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<InvalidOperationException>();
        loggerFactory.Logger.ErrorCount.Should().Be(0);
    }

    // TC-PLATCONS-024: InvokeConsumerAsync wraps ANY consumer failure in PlatformInvokeConsumerException.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-024")]
    public async Task InvokeConsumerAsync_WhenConsumerThrows_WrapsInPlatformInvokeConsumerExceptionPreservingContext()
    {
        // The wrapper is what tells the bus WHICH consumer failed when many consumers share one message. Losing the
        // inner exception would erase the actual cause; losing the consumer name would make a multi-consumer routing
        // key undiagnosable.
        var consumer = new RecordingConsumer
        {
            ThrowOnHandleLogic = () => new TimeoutException("downstream timed out"),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 0
        };
        var message = new PipelineTestMessage();

        var act = async () => await PlatformMessageBusConsumer.InvokeConsumerAsync(
            consumer,
            message,
            TestRoutingKey,
            new PlatformMessageBusConfig { EnableLogConsumerProcessTime = false });

        var thrown = (await act.Should().ThrowAsync<PlatformInvokeConsumerException>()).Which;

        thrown.InnerException.Should().BeOfType<TimeoutException>().Which.Message.Should().Be("downstream timed out");
        thrown.ConsumerName.Should().Be(typeof(RecordingConsumer).FullName);
        thrown.BusMessage.Should().BeSameAs(message, "the failed message must stay attached for the failure record");
        thrown.Message.Should().Contain(typeof(RecordingConsumer).FullName!);
    }

    // TC-PLATCONS-025: A slow consume logs a warning once the elapsed time reaches the threshold.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-025")]
    public async Task InvokeConsumerAsync_WhenElapsedReachesTheThreshold_LogsASlowProcessWarning()
    {
        // The threshold is set to 0 rather than sleeping: the comparison is `elapsedMilliseconds >= threshold`, so a
        // zero threshold exercises the exact same branch as a genuinely slow consume without spending wall-clock time.
        var logger = new RecordingLogger();
        var consumer = new RecordingConsumer { SlowProcessWarningTimeMillisecondsOverride = 0 };

        await PlatformMessageBusConsumer.InvokeConsumerAsync(
            consumer,
            new PipelineTestMessage(),
            TestRoutingKey,
            new PlatformMessageBusConfig { EnableLogConsumerProcessTime = true },
            logger);

        logger.WarningCount.Should().Be(1);
        logger.LastWarningFormatted.Should().Contain(typeof(RecordingConsumer).FullName!, "an operator must know WHICH consumer is slow");
    }

    // TC-PLATCONS-026: A fast consume, an opted-out consumer, and a disabled config each produce NO warning.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-026")]
    public async Task InvokeConsumerAsync_BelowThresholdOrOptedOut_LogsNoSlowProcessWarning()
    {
        // Three separate suppression paths, all asserted together because each one alone is satisfiable by "never warn"
        // — TC-PLATCONS-025 is the counter-test that keeps that cheat honest.
        var busConfig = new PlatformMessageBusConfig { EnableLogConsumerProcessTime = true };

        // (a) Under threshold: an hour-long threshold cannot be reached by an in-memory no-op consume.
        var underThresholdLogger = new RecordingLogger();
        await PlatformMessageBusConsumer.InvokeConsumerAsync(
            new RecordingConsumer { SlowProcessWarningTimeMillisecondsOverride = 3_600_000 },
            new PipelineTestMessage(),
            TestRoutingKey,
            busConfig,
            underThresholdLogger);
        underThresholdLogger.WarningCount.Should().Be(0);

        // (b) DisableSlowProcessWarning() opts the consumer out even at a zero threshold — the opt-out is checked
        // BEFORE profiling, so a consumer known to be long-running never floods the log.
        var optedOutLogger = new RecordingLogger();
        await PlatformMessageBusConsumer.InvokeConsumerAsync(
            new RecordingConsumer { SlowProcessWarningTimeMillisecondsOverride = 0, DisableSlowProcessWarningOverride = true },
            new PipelineTestMessage(),
            TestRoutingKey,
            busConfig,
            optedOutLogger);
        optedOutLogger.WarningCount.Should().Be(0);

        // (c) The global config switch wins regardless of the consumer's own threshold.
        var disabledConfigLogger = new RecordingLogger();
        await PlatformMessageBusConsumer.InvokeConsumerAsync(
            new RecordingConsumer { SlowProcessWarningTimeMillisecondsOverride = 0 },
            new PipelineTestMessage(),
            TestRoutingKey,
            new PlatformMessageBusConfig { EnableLogConsumerProcessTime = false },
            disabledConfigLogger);
        disabledConfigLogger.WarningCount.Should().Be(0);
    }

    // TC-PLATCONS-027: A consumer returning null for its threshold falls back to the bus config's threshold.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-027")]
    public async Task InvokeConsumerAsync_WhenConsumerThresholdIsNull_FallsBackToTheBusConfigThreshold()
    {
        // `consumer.SlowProcessWarningTimeMilliseconds() ?? messageBusConfig.LogSlowProcessWarningTimeMilliseconds`
        // is the only way an operator can tune slow-consume alerting globally. A regression that ignored the fallback
        // would leave the config knob inert while every per-consumer override kept working.
        var logger = new RecordingLogger();
        var consumer = new RecordingConsumer { SlowProcessWarningTimeMillisecondsOverride = null, UseNullSlowProcessWarningTime = true };

        await PlatformMessageBusConsumer.InvokeConsumerAsync(
            consumer,
            new PipelineTestMessage(),
            TestRoutingKey,
            new PlatformMessageBusConfig { EnableLogConsumerProcessTime = true, LogSlowProcessWarningTimeMilliseconds = 0 },
            logger);

        logger.WarningCount.Should().Be(1, "a null consumer threshold must defer to the configured global threshold");
    }

    // TC-PLATCONS-030: The retry defaults are pinned — they set the resilience budget for every consumer.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-030")]
    public void RetryDefaults_MatchThePlatformResilienceBudget()
    {
        // These four values are inherited by EVERY consumer in every service, so a silent change here changes the
        // failure behavior of the whole platform at once. MaxRetryOnFailedDelaySeconds is the cap that stops the
        // `retryAttempt + delay` growth from turning a long retry budget into a multi-hour stall per attempt.
        var consumer = new RecordingConsumer();

        consumer.RetryOnFailedTimes.Should().Be(Util.TaskRunner.DefaultResilientRetryCount);
        consumer.RetryOnFailedDelaySeconds.Should().Be(Util.TaskRunner.DefaultResilientDelaySeconds);
        consumer.MaxRetryOnFailedDelaySeconds.Should().Be(60);
        consumer.LogErrorOnException.Should().BeTrue();
        consumer.InvokeShouldExecuteHandleLogicInRetry().Should().BeTrue("the plain consumer always takes the retry-wrapped path");
    }

    // TC-PLATCONS-031: A transient failure is retried; the total attempt count is 1 + RetryOnFailedTimes.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-031")]
    public async Task HandleAsync_WhenHandleLogicThrowsATransientException_RetriesTheConfiguredNumberOfTimes()
    {
        var consumer = new RecordingConsumer
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("transient"),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 3,
            RetryOnFailedDelaySeconds = 0,
            MaxRetryOnFailedDelaySeconds = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<InvalidOperationException>("the final failure must still surface after the budget is spent");
        consumer.HandleLogicInvocationCount.Should().Be(4, "one initial attempt plus RetryOnFailedTimes retries");
    }

    // TC-PLATCONS-032: A validation failure is NOT retried — it is deterministic, so retrying only wastes the budget.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-032")]
    public async Task HandleAsync_WhenHandleLogicThrowsAValidationException_IsAttemptedExactlyOnce()
    {
        // `ignoreExceptionTypes: [typeof(IPlatformValidationException)]` at PlatformMessageBusConsumer.cs:399 is a real
        // behavioral invariant, not a micro-optimization: a rejected payload will be rejected identically on every
        // retry, so retrying it burns the resilience budget, delays the failure record by the full back-off, and — on
        // the inbox path with its 43,200-attempt budget — would keep a permanently-invalid message in flight for hours.
        // Contrast with TC-PLATCONS-031, which shares this exact setup apart from the exception type.
        var consumer = new RecordingConsumer
        {
            ThrowOnHandleLogic = () => new PlatformValidationException(InvalidPayloadValidationResult()),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 3,
            RetryOnFailedDelaySeconds = 0,
            MaxRetryOnFailedDelaySeconds = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<PlatformValidationException>();
        consumer.HandleLogicInvocationCount.Should().Be(1, "a deterministic validation failure must not consume the retry budget");
    }

    // TC-PLATCONS-033: RetryOnFailedTimes = 0 bypasses the retry policy entirely.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-033")]
    public async Task HandleAsync_WithZeroRetryOnFailedTimes_ExecutesTheLogicExactlyOnce()
    {
        // Util.TaskRunner short-circuits `retryCount == 0` to a direct call. Consumers whose handling is not idempotent
        // set this to zero deliberately; if zero still went through the policy, they would silently get a duplicate
        // execution on any transient fault.
        var consumer = new RecordingConsumer
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("no retries wanted"),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<InvalidOperationException>();
        consumer.HandleLogicInvocationCount.Should().Be(1);
    }

    // TC-PLATCONS-034: ShouldExecuteHandleLogicInRetry=false takes the un-retried path even with a retry budget set.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-034")]
    public async Task HandleAsync_WhenShouldExecuteHandleLogicInRetryIsFalse_SkipsTheRetryWrapperEntirely()
    {
        // This is the hook PlatformApplicationMessageBusConsumer uses to hand retry ownership to the inbox
        // (PlatformApplicationBusMessageConsumer.cs:337). Both layers retrying the same message would multiply the
        // attempt counts together — an inbox budget of 43,200 wrapped in a consumer budget of 3 is 172,800 executions
        // of a side effect that was never meant to run more than once.
        var consumer = new RecordingConsumer
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("retry owned elsewhere"),
            LogErrorOnExceptionOverride = false,
            ShouldExecuteHandleLogicInRetryOverride = false,
            RetryOnFailedTimes = 5,
            RetryOnFailedDelaySeconds = 0,
            MaxRetryOnFailedDelaySeconds = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<InvalidOperationException>();
        consumer.HandleLogicInvocationCount.Should().Be(1, "the retry budget belongs to the outer owner, not to this pipeline");
    }

    // TC-PLATCONS-035: The retry error log stays silent until 75% of the retry budget is spent.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-035")]
    public async Task HandleAsync_WhenRetrying_SuppressesTheRetryErrorLogUntilTheBudgetIsMostlySpent()
    {
        // Util.TaskRunner.LogErrorRetryThreshold(4) == 3, so attempts 1-3 stay quiet and only attempt 4 logs. Without
        // the threshold, transient faults (broker reconnects, lock contention) would emit an ERROR per attempt — on the
        // inbox path's 43,200-attempt budget that is an unbounded log flood for a failure that recovers by itself.
        var loggerFactory = new RecordingLoggerFactory();
        var consumer = new RecordingConsumer(loggerFactory)
        {
            ThrowOnHandleLogic = () => new InvalidOperationException("still failing"),
            LogErrorOnExceptionOverride = false,
            RetryOnFailedTimes = 4,
            RetryOnFailedDelaySeconds = 0,
            MaxRetryOnFailedDelaySeconds = 0
        };

        var act = async () => await consumer.HandleAsync(new PipelineTestMessage(), TestRoutingKey);

        await act.Should().ThrowAsync<InvalidOperationException>();
        consumer.HandleLogicInvocationCount.Should().Be(5);
        loggerFactory
            .Logger.ErrorCount.Should()
            .Be(1, "only the retry attempt above LogErrorRetryThreshold(4) == 3 may log, and LogErrorOnException is off for the final rethrow");
    }

    /// <summary>
    /// Builds an invalid validation result through the documented implicit string conversion on
    /// <see cref="PlatformValidationResult" />, so TC-PLATCONS-032 throws the REAL platform validation exception rather
    /// than a stand-in that merely implements the marker interface — the retry policy matches on the concrete
    /// exception's assignability, so a stand-in would prove nothing about production behavior.
    /// </summary>
    private static PlatformValidationResult InvalidPayloadValidationResult() => "payload is invalid";

    private sealed class PipelineTestMessage
    {
        public string Content { get; set; } = "";
    }

    private sealed class UnrelatedMessage
    {
        public string Content { get; set; } = "";
    }

    /// <summary>
    /// Records the pipeline hooks in invocation order. Every behavioral switch is a settable property rather than a
    /// separate subclass so each test states its own preconditions inline instead of relying on a hierarchy of
    /// near-identical doubles.
    /// </summary>
    private sealed class RecordingConsumer : PlatformMessageBusConsumer<PipelineTestMessage>
    {
        /// <summary>
        /// Most tests never look at what the consumer logged, so they take this overload and the logger factory
        /// stops being ceremony at the call site. The explicit overload stays for the few that DO assert on it.
        /// </summary>
        public RecordingConsumer()
            : this(new RecordingLoggerFactory())
        {
        }

        public RecordingConsumer(ILoggerFactory loggerFactory)
            : base(loggerFactory)
        {
        }

        public List<string> Calls { get; } = [];

        public bool HandleWhenResult { get; set; } = true;

        public int HandleWhenInvocationCount { get; private set; }

        public int HandleLogicInvocationCount { get; private set; }

        public Func<Exception>? ThrowOnHandleLogic { get; set; }

        public bool? LogErrorOnExceptionOverride { get; set; }

        public bool? ShouldExecuteHandleLogicInRetryOverride { get; set; }

        public long? SlowProcessWarningTimeMillisecondsOverride { get; set; }

        public bool UseNullSlowProcessWarningTime { get; set; }

        public bool DisableSlowProcessWarningOverride { get; set; }

        public override bool LogErrorOnException => LogErrorOnExceptionOverride ?? base.LogErrorOnException;

        public override long? SlowProcessWarningTimeMilliseconds()
        {
            if (UseNullSlowProcessWarningTime)
                return null;

            return SlowProcessWarningTimeMillisecondsOverride ?? base.SlowProcessWarningTimeMilliseconds();
        }

        public override bool DisableSlowProcessWarning() => DisableSlowProcessWarningOverride;

        public override Task BeforeHandleAsync(PipelineTestMessage message, string routingKey)
        {
            Calls.Add(nameof(BeforeHandleAsync));
            return Task.CompletedTask;
        }

        public override Task<bool> HandleWhen(PipelineTestMessage message, string routingKey)
        {
            Calls.Add(nameof(HandleWhen));
            HandleWhenInvocationCount++;
            return Task.FromResult(HandleWhenResult);
        }

        public override Task BeforeExecuteHandleLogicAsync(PipelineTestMessage message, string routingKey)
        {
            Calls.Add(nameof(BeforeExecuteHandleLogicAsync));
            return Task.CompletedTask;
        }

        public override Task ExecuteHandleLogicAsync(PipelineTestMessage message, string routingKey)
        {
            Calls.Add(nameof(ExecuteHandleLogicAsync));
            return base.ExecuteHandleLogicAsync(message, routingKey);
        }

        public override Task HandleLogicAsync(PipelineTestMessage message, string routingKey)
        {
            Calls.Add(nameof(HandleLogicAsync));
            HandleLogicInvocationCount++;

            if (ThrowOnHandleLogic != null)
                throw ThrowOnHandleLogic();

            return Task.CompletedTask;
        }

        /// <summary>Exposes the protected caching gate so the cache itself can be asserted directly.</summary>
        public Task<bool> InvokeCheckHandleWhenAsync(PipelineTestMessage message, string routingKey) => CheckHandleWhen(message, routingKey);

        /// <summary>Exposes the protected retry-path selector.</summary>
        public bool InvokeShouldExecuteHandleLogicInRetry() => ShouldExecuteHandleLogicInRetry();

        protected override bool ShouldExecuteHandleLogicInRetry() =>
            ShouldExecuteHandleLogicInRetryOverride ?? base.ShouldExecuteHandleLogicInRetry();
    }

    /// <summary>A consumer that overrides nothing but the required handling logic — the shape most consumers have.</summary>
    private sealed class DefaultGateConsumer : PlatformMessageBusConsumer<PipelineTestMessage>
    {
        /// <summary>
        /// Most tests never look at what the consumer logged, so they take this overload and the logger factory
        /// stops being ceremony at the call site. The explicit overload stays for the few that DO assert on it.
        /// </summary>
        public DefaultGateConsumer()
            : this(new RecordingLoggerFactory())
        {
        }

        public DefaultGateConsumer(ILoggerFactory loggerFactory)
            : base(loggerFactory)
        {
        }

        public int HandleLogicInvocationCount { get; private set; }

        public override Task HandleLogicAsync(PipelineTestMessage message, string routingKey)
        {
            HandleLogicInvocationCount++;
            return Task.CompletedTask;
        }
    }
}
