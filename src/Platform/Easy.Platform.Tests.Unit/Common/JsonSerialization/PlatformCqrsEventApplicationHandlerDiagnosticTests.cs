using Easy.Platform.Application;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Tests.Unit.TestInfrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Verifies the rendered output of the two application-event failure sinks that previously handed full events to
/// logging. Source-shape coverage separately pins the production call sites to these methods.
/// </summary>
public class PlatformCqrsEventApplicationHandlerDiagnosticTests
{
    /// <summary>TC-DIAG-CQRS-001 — request-context transfer failures keep metadata but omit payload values.</summary>
    [Fact]
    public void RequestContextTransferFailureLog_OmitsPayloadAndRetainsCorrelationMetadata()
    {
        var (handler, logger) = CreateHandler();
        var @event = CreateEvent();

        handler.LogRequestContextTransferFailureForTest(@event, new InvalidOperationException("context-copy-failed"));

        AssertPayloadFreeCorrelatedDiagnostic(logger, @event);
    }

    /// <summary>TC-DIAG-CQRS-002 / TC-DIAG-CQRS-003 — inbox retry logs retain type/correlation only.</summary>
    [Fact]
    public void InboxConsumerRetryLog_OmitsPayloadAndRetainsCorrelationMetadata()
    {
        var (handler, logger) = CreateHandler();
        var @event = CreateEvent();

        handler.LogInboxConsumerRetryForTest(@event, new InvalidOperationException("inbox-retry-failed"));

        AssertPayloadFreeCorrelatedDiagnostic(logger, @event);
    }

    private static DiagnosticTestEvent CreateEvent()
    {
        return new DiagnosticTestEvent { PayloadSentinel = $"sensitive-{Guid.NewGuid():N}" };
    }

    private static void AssertPayloadFreeCorrelatedDiagnostic(RecordingLogger logger, DiagnosticTestEvent @event)
    {
        var formatted = logger.Entries.Should().ContainSingle().Subject.Formatted;

        formatted.Should().Contain(nameof(DiagnosticTestEvent));
        formatted.Should().Contain(nameof(DiagnosticTestEventHandler));
        formatted.Should().Contain(@event.Id);
        formatted.Should().NotContain(@event.PayloadSentinel);
    }

    private static (DiagnosticTestEventHandler Handler, RecordingLogger Logger) CreateHandler()
    {
        var loggerFactory = new RecordingLoggerFactory();
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        requestContextAccessor.SetupGet(accessor => accessor.Current)
            .Returns(new Mock<IPlatformApplicationRequestContext>().Object);

        var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();
        var serviceProvider = new Mock<IServiceProvider>();
        serviceProvider.Setup(provider => provider.GetService(typeof(IPlatformApplicationRequestContextAccessor)))
            .Returns(requestContextAccessor.Object);
        serviceProvider.Setup(provider => provider.GetService(typeof(IPlatformApplicationSettingContext)))
            .Returns(applicationSettingContext.Object);

        var handler = new DiagnosticTestEventHandler(
            loggerFactory,
            new Mock<IPlatformUnitOfWorkManager>().Object,
            serviceProvider.Object,
            new Mock<IPlatformRootServiceProvider>().Object);

        return (handler, loggerFactory.Logger);
    }

    private sealed class DiagnosticTestEvent : PlatformCqrsEvent
    {
        public string PayloadSentinel { get; init; } = string.Empty;

        public override string EventType => "DiagnosticTestEventType";

        public override string EventName => "DiagnosticTestEventName";

        public override string EventAction => "DiagnosticTestEventAction";
    }

    private sealed class DiagnosticTestEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider)
        : PlatformCqrsEventApplicationHandler<DiagnosticTestEvent>(
            loggerFactory,
            unitOfWorkManager,
            serviceProvider,
            rootServiceProvider)
    {
        public void LogRequestContextTransferFailureForTest(DiagnosticTestEvent @event, Exception exception)
        {
            LogRequestContextTransferFailure(@event, exception);
        }

        public void LogInboxConsumerRetryForTest(DiagnosticTestEvent @event, Exception exception)
        {
            LogInboxConsumerRetry(@event, exception);
        }

        public override Task<bool> HandleWhen(DiagnosticTestEvent @event)
        {
            return Task.FromResult(true);
        }

        protected override Task HandleAsync(DiagnosticTestEvent @event, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }
}
