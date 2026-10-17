using Easy.Platform.Application;
using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Application.MessageBus.Consumers;

/// <summary>
/// Guards the inbox-related defaults and retry-ownership decision of
/// <see cref="PlatformApplicationMessageBusConsumer{TMessage}" />.
/// <para>
/// <b>Invariant guarded:</b> these flags decide whether a consumed message is durably recorded before it is handled
/// (the inbox pattern) and WHO owns the retry budget. Every one of them defaults in the direction of durability —
/// inbox on, sequential per-consumer ordering on, keep-alive ping on, delete-after-processing off. A silent flip of any
/// default changes the at-least-once delivery guarantee of every application consumer in every service at once, and
/// does so invisibly: nothing throws, messages simply stop being recorded, or start being handled out of order, or get
/// deleted before an operator can inspect them.
/// </para>
/// <para>
/// <b>Why a real container instead of mocks for the scope provider:</b> the constructor resolves its dependencies
/// through <c>GetService</c>/<c>GetRequiredService</c>, and the retry-ownership decision hinges on whether the inbox
/// repository resolves to null. A stubbed provider could return whatever the test wanted; a real
/// <see cref="ServiceCollection" /> makes "the repository is not registered" mean exactly what it means in a service
/// that has not wired the inbox.
/// </para>
/// </summary>
public class PlatformApplicationMessageBusConsumerDefaultsTests : PlatformUnitTestBase
{
    // TC-PLATCONS-040: The inbox-behaviour defaults every application consumer inherits.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-040")]
    public void ApplicationConsumerDefaults_FavourDurabilityAndSequentialProcessing()
    {
        // Deliberately NOT CreateConsumer/TestApplicationConsumer: that double overrides AllowUseInboxMessage so
        // TC-PLATCONS-041/043/044 can toggle inbox behaviour, which means an assertion against it would observe the
        // double's own value instead of PlatformApplicationMessageBusConsumer{TMessage}.AllowUseInboxMessage's real
        // default (PlatformApplicationBusMessageConsumer.cs:247). CreateDefaultConsumer's subject overrides nothing but
        // the required handling logic, so every value asserted below is production's, not a test double's invention.
        var consumer = CreateDefaultConsumer();

        // Inbox ON by default: the message is persisted before handling, so a crash mid-handle replays rather than
        // loses it. A service that genuinely wants fire-and-forget must opt OUT explicitly and visibly.
        consumer.AllowUseInboxMessage.Should().BeTrue();

        // Handle in the CURRENT request flow, not on a detached background task: backgrounding by default would let the
        // producing request complete while its consumer work is still unstarted and untracked.
        consumer.AllowHandleNewInboxMessageInBackground.Should().BeFalse();

        // Ordering guard ON: the consumer checks for an earlier unprocessed message from the same consumer before
        // running, which is what keeps per-entity events from being applied out of order.
        consumer.NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage.Should().BeTrue();

        // Keep-alive ping ON: without it a long handle is mistaken for a stalled one and re-popped by the stale
        // recovery sweep, producing a duplicate concurrent execution of the same message.
        consumer.NeedStartIntervalPingInboxMessageProcessing.Should().BeTrue();

        // Retain processed messages by default: immediate deletion would destroy the audit trail and the payload copy
        // that consume-failure logs deliberately point at instead of logging inline.
        consumer.AutoDeleteProcessedInboxEventMessageImmediately.Should().BeFalse();

        // A unit of work is opened around the handling logic, so a partially-applied handler rolls back as one.
        consumer.AutoOpenUow.Should().BeTrue();

        // Fresh-instance state: both are set by the inbox machinery when it re-enters the consumer for a stored
        // message, so a freshly resolved consumer must start on the direct path.
        consumer.HandleExistingInboxMessage.Should().BeNull();
        consumer.IsHandlingLogicForInboxMessage.Should().BeFalse();
        consumer.HasErrorAndShouldNeverRetry.Should().BeFalse();
    }

    // TC-PLATCONS-041: LogErrorOnException is true ONLY on the direct path — the inbox owns its own failure record.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-041")]
    [InlineData(false, false, true)]
    [InlineData(true, false, false)]
    [InlineData(false, true, false)]
    [InlineData(true, true, false)]
    public void LogErrorOnException_IsTrueOnlyWhenNeitherInboxPathIsActive(
        bool hasExistingInboxMessage,
        bool isHandlingLogicForInboxMessage,
        bool expectedLogErrorOnException)
    {
        // The override at PlatformApplicationBusMessageConsumer.cs:221 is what stops a single inbox-driven failure from
        // being reported twice — once by this consumer and once by the inbox failure path that records the same
        // exception against the stored message with its retry count. All four combinations are covered because the
        // condition is a conjunction: testing only the (false,false) and (true,true) corners would pass equally against
        // an OR, which would silence the DIRECT path instead — the one path that has no other failure record at all.
        var consumer = CreateConsumer(withInboxRepository: true);

        if (hasExistingInboxMessage)
            consumer.HandleExistingInboxMessage = new PlatformInboxBusMessage();
        consumer.IsHandlingLogicForInboxMessage = isHandlingLogicForInboxMessage;

        consumer.LogErrorOnException.Should().Be(expectedLogErrorOnException);
    }

    // TC-PLATCONS-042: With no inbox repository registered, the consumer keeps retry ownership itself.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-042")]
    public void ShouldExecuteHandleLogicInRetry_WithoutAnInboxRepository_KeepsRetryOwnership()
    {
        // A service that has not wired the inbox has no other resilience layer, so the consumer's own retry wrapper is
        // the only thing standing between a transient fault and a lost message.
        var consumer = CreateConsumer(withInboxRepository: false);

        consumer.InvokeShouldExecuteHandleLogicInRetry().Should().BeTrue();
    }

    // TC-PLATCONS-043: Retry ownership moves to the inbox exactly when the inbox path will actually run.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATCONS-043")]
    [InlineData(true, false, false)]
    [InlineData(true, true, true)]
    [InlineData(false, false, true)]
    [InlineData(false, true, true)]
    public void ShouldExecuteHandleLogicInRetry_YieldsToTheInboxOnlyWhenTheInboxPathWillRun(
        bool allowUseInboxMessage,
        bool isHandlingLogicForInboxMessage,
        bool expectedShouldRetryHere)
    {
        // Double retry ownership is the failure this guards. The inbox budget is
        // PlatformInboxMessageBusConsumerHelper.DefaultResilientRetiredCount (43,200); nesting the consumer's own
        // budget inside it MULTIPLIES the attempt counts, turning a handler that was meant to run at most a few times
        // into one that can run tens of thousands of times. The false rows are therefore the important ones: they are
        // the states where the inbox will NOT run, so retrying here is correct rather than duplicative.
        var consumer = CreateConsumer(withInboxRepository: true, allowUseInboxMessage: allowUseInboxMessage);
        consumer.IsHandlingLogicForInboxMessage = isHandlingLogicForInboxMessage;

        consumer.InvokeShouldExecuteHandleLogicInRetry().Should().Be(expectedShouldRetryHere);
    }

    // TC-PLATCONS-044: The inbox re-entry flag flips the consumer from the inbox path to the direct path.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-044")]
    public void IsHandlingLogicForInboxMessage_FlipsBothRetryOwnershipAndErrorLoggingTogether()
    {
        // These two decisions must move together. The inbox helper sets this flag when it re-enters the consumer to run
        // the stored message's logic: at that moment the inbox owns BOTH the retry loop and the failure record. If only
        // one of the two flipped, the message would either be retried twice over (retry owned in both places) or fail
        // with no record at all (logging suppressed in both places).
        var consumer = CreateConsumer(withInboxRepository: true);

        consumer.InvokeShouldExecuteHandleLogicInRetry().Should().BeFalse("the inbox path owns the retry loop");
        consumer.LogErrorOnException.Should().BeTrue("nothing else has recorded this failure yet");

        consumer.IsHandlingLogicForInboxMessage = true;

        consumer.InvokeShouldExecuteHandleLogicInRetry()
            .Should()
            .BeTrue("re-entering to run the stored message's logic drops out of the inbox's own dispatch condition, so this layer resumes owning the retry loop wrapped around it");
        consumer.LogErrorOnException.Should().BeFalse("the inbox failure path records this failure against the stored message");
    }

    // TC-PLATCONS-045: The inbox helper's resilience constants are pinned.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-045")]
    public void InboxConsumerHelperConstants_MatchTheDocumentedOneDayRetryBudget()
    {
        // 43,200 attempts at a 1-second base delay is the documented "roughly one day" budget
        // (PlatformInboxMessageBusConsumerHelper.cs:30-40). The three constants are only meaningful together: shrinking
        // the count or growing the max delay silently changes how long a failing message keeps being retried before it
        // is abandoned, and that duration is an operational contract, not a tuning detail.
        PlatformInboxMessageBusConsumerHelper.DefaultResilientRetiredCount.Should().Be(43200);
        PlatformInboxMessageBusConsumerHelper.DefaultResilientRetiredDelaySeconds.Should().Be(1);
        PlatformInboxMessageBusConsumerHelper.DefaultMaxResilientRetiredDelaySeconds.Should().Be(60);

        // The cap must stay above the base delay, otherwise Math.Min collapses every back-off to the base and the
        // progressive back-off silently becomes a fixed one.
        PlatformInboxMessageBusConsumerHelper
            .DefaultMaxResilientRetiredDelaySeconds.Should()
            .BeGreaterThan(PlatformInboxMessageBusConsumerHelper.DefaultResilientRetiredDelaySeconds);
    }

    // TC-PLATCONS-046: The concrete inbox event consumer is a real, resolvable application consumer.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-046")]
    public void PlatformCqrsEventInboxBusMessageConsumer_IsAConcreteApplicationConsumerOverTheEventPayloadMessage()
    {
        // This is the one CONCRETE consumer the framework ships, and every event handler routed through the inbox is
        // executed by it. Its message type is what the bus binds on, so a change there silently unbinds every
        // inbox-routed event handler in the platform.
        var consumerType = typeof(PlatformCqrsEventInboxBusMessageConsumer);

        consumerType.IsAbstract.Should().BeFalse("the bus must be able to instantiate it");
        consumerType.Should().BeAssignableTo<PlatformMessageBusConsumer>();

        PlatformMessageBusConsumer
            .GetConsumerMessageType(consumerType)
            .Should()
            .Be(typeof(PlatformBusMessage<PlatformCqrsEventBusMessagePayload>));

        // It inherits the application defaults rather than opting out of the inbox — which would be a contradiction,
        // since it exists precisely to execute inbox-stored events.
        consumerType.Should().BeAssignableTo<PlatformApplicationMessageBusConsumer<PlatformBusMessage<PlatformCqrsEventBusMessagePayload>>>();
    }

    // TC-PLATCONS-047: An entity-event consumer's own HandleWhen filter IS the one the pipeline gate evaluates.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATCONS-047")]
    public async Task EntityEventConsumer_HandleWhenOverride_IsConsultedByThePipelineGate()
    {
        // REGRESSION GUARD for a fixed defect — the behavioral half of TC-PLATCONS-017 (which guards it structurally).
        // PlatformCqrsEntityEventBusMessageConsumer.cs:29 previously re-declared HandleWhen with `new abstract`, which
        // allocated a SEPARATE vtable slot instead of overriding PlatformMessageBusConsumer<TMessage>.HandleWhen. A
        // concrete consumer's `override` targeted the redeclared slot, while CheckHandleWhen — the method the pipeline
        // actually calls at PlatformMessageBusConsumer.cs:381 — is compiled inside PlatformMessageBusConsumer<TMessage>
        // and bound the ORIGINAL slot, whose body is the unconditional `return true` (:422).
        // Real consequence, now fixed: any consuming service's entity-event consumer that filters (for example one
        // that overrides HandleWhen to accept only CrudAction == Updated) had its filter bypassed and handled Created
        // and Deleted events too. Nothing threw;
        // the filter was simply inert — which is precisely why only a test like this one can catch it.
        // The consumer below declares the filter as emphatically as possible — it ALWAYS says no — so a gate that
        // returned true could not be explained by anything except dispatching through the wrong slot.
        var consumer = CreateEntityEventConsumer();

        (await consumer.HandleWhen(new EntityEventTestMessage(), "AnyGroup.AnyProducer.AnyType")).Should().BeFalse("the consumer's own declared filter rejects everything");

        (await consumer.InvokeCheckHandleWhenAsync(new EntityEventTestMessage(), "AnyGroup.AnyProducer.AnyType"))
            .Should()
            .BeFalse(
                "the pipeline gate must dispatch through the overridden slot and honour the consumer's filter. A `true` "
                + "here means the gate fell back to the base `return true` — the exact silent over-consumption bug.");

        consumer.OwnHandleWhenInvocationCount.Should().Be(2, "both the direct call AND the gate reached the consumer's own filter");
    }

    private static TestEntityEventConsumer CreateEntityEventConsumer()
    {
        var services = new ServiceCollection();

        services.AddSingleton(new PlatformInboxConfig());
        services.AddSingleton(new Mock<IPlatformApplicationRequestContextAccessor>().Object);

        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(p => p.GetService(typeof(IPlatformApplicationSettingContext))).Returns(new Mock<IPlatformApplicationSettingContext>().Object);

        return new TestEntityEventConsumer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            services.BuildServiceProvider(),
            rootServiceProvider.Object);
    }

    /// <summary>
    /// Builds a subject that overrides NOTHING but the required handling logic — used only by the TC-PLATCONS-040
    /// defaults assertion, so the inbox on/off default is read from production rather than from
    /// <see cref="TestApplicationConsumer" />'s deliberate override (needed elsewhere to toggle inbox behaviour).
    /// </summary>
    private static DefaultApplicationConsumer CreateDefaultConsumer()
    {
        var services = new ServiceCollection();

        services.AddSingleton(new PlatformInboxConfig());
        services.AddSingleton(new Mock<IPlatformApplicationRequestContextAccessor>().Object);
        services.AddSingleton(new Mock<IPlatformInboxBusMessageRepository>().Object);

        var scopeServiceProvider = services.BuildServiceProvider();

        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(p => p.GetService(typeof(IPlatformApplicationSettingContext))).Returns(new Mock<IPlatformApplicationSettingContext>().Object);

        return new DefaultApplicationConsumer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            scopeServiceProvider,
            rootServiceProvider.Object);
    }

    private static TestApplicationConsumer CreateConsumer(bool withInboxRepository, bool allowUseInboxMessage = true)
    {
        var services = new ServiceCollection();

        services.AddSingleton(new PlatformInboxConfig());
        services.AddSingleton(new Mock<IPlatformApplicationRequestContextAccessor>().Object);

        // Registered or not registered is the whole point: `InboxBusMessageRepo == null` is how the consumer detects a
        // service that has not wired the inbox pattern at all.
        if (withInboxRepository)
            services.AddSingleton(new Mock<IPlatformInboxBusMessageRepository>().Object);

        var scopeServiceProvider = services.BuildServiceProvider();

        var rootServiceProvider = new Mock<IPlatformRootServiceProvider>();
        rootServiceProvider.Setup(p => p.GetService(typeof(IPlatformApplicationSettingContext))).Returns(new Mock<IPlatformApplicationSettingContext>().Object);

        return new TestApplicationConsumer(
            NullLoggerFactory.Instance,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            scopeServiceProvider,
            rootServiceProvider.Object,
            allowUseInboxMessage);
    }

    private sealed class ApplicationTestMessage
    {
        public string Content { get; set; } = "";
    }

    private sealed class EntityEventTestEntity : Easy.Platform.Domain.Entities.IEntity
    {
        public string Id { get; set; } = "";

        public object GetId() => Id;
    }

    /// <summary>
    /// The entity-event message shape the consumer family requires: a payload-carrying, self-routing, trackable bus
    /// message wrapping a <see cref="Easy.Platform.Domain.Events.PlatformCqrsEntityEvent{TEntity}" />.
    /// </summary>
    private sealed class EntityEventTestMessage : PlatformBusMessage<Easy.Platform.Domain.Events.PlatformCqrsEntityEvent<EntityEventTestEntity>>
    {
    }

    /// <summary>
    /// Declares the strongest possible filter — reject everything — so TC-PLATCONS-047's gate result cannot be
    /// explained by anything except which vtable slot the gate dispatched through.
    /// </summary>
    private sealed class TestEntityEventConsumer : PlatformCqrsEntityEventBusMessageConsumer<EntityEventTestMessage, EntityEventTestEntity>
    {
        public TestEntityEventConsumer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
        {
        }

        public int OwnHandleWhenInvocationCount { get; private set; }

        public override Task<bool> HandleWhen(EntityEventTestMessage message, string routingKey)
        {
            OwnHandleWhenInvocationCount++;
            return Task.FromResult(false);
        }

        public override Task HandleLogicAsync(EntityEventTestMessage message, string routingKey) => Task.CompletedTask;

        /// <summary>Exposes the exact protected method the pipeline gate calls.</summary>
        public Task<bool> InvokeCheckHandleWhenAsync(EntityEventTestMessage message, string routingKey) => CheckHandleWhen(message, routingKey);
    }

    /// <summary>
    /// A minimal concrete application consumer. It overrides nothing but the required handling logic and the inbox
    /// opt-out under test, so every asserted value is the value a real consumer inherits rather than one this double
    /// invented.
    /// </summary>
    private sealed class TestApplicationConsumer : PlatformApplicationMessageBusConsumer<ApplicationTestMessage>
    {
        private readonly bool allowUseInboxMessage;

        public TestApplicationConsumer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider,
            bool allowUseInboxMessage)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
        {
            this.allowUseInboxMessage = allowUseInboxMessage;
        }

        public override bool AllowUseInboxMessage => allowUseInboxMessage;

        public override Task HandleLogicAsync(ApplicationTestMessage message, string routingKey) => Task.CompletedTask;

        /// <summary>Exposes the protected retry-path selector so retry OWNERSHIP can be asserted directly.</summary>
        public bool InvokeShouldExecuteHandleLogicInRetry() => ShouldExecuteHandleLogicInRetry();
    }

    /// <summary>
    /// A subject that overrides NOTHING but the required abstract handling logic. Exists solely so the
    /// TC-PLATCONS-040 defaults assertion observes <see cref="PlatformApplicationMessageBusConsumer{TMessage}" />'s
    /// real virtual-property defaults instead of <see cref="TestApplicationConsumer" />'s deliberate
    /// <c>AllowUseInboxMessage</c> override.
    /// </summary>
    private sealed class DefaultApplicationConsumer : PlatformApplicationMessageBusConsumer<ApplicationTestMessage>
    {
        public DefaultApplicationConsumer(
            ILoggerFactory loggerFactory,
            IPlatformUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider,
            IPlatformRootServiceProvider rootServiceProvider)
            : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
        {
        }

        public override Task HandleLogicAsync(ApplicationTestMessage message, string routingKey) => Task.CompletedTask;
    }
}
