using Easy.Platform.Application;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.UnitOfWork;
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
        var (handler, capturedLogs) = CreateHandler();
        var @event = CreateEvent();

        handler.LogRequestContextTransferFailureForTest(@event, new InvalidOperationException("context-copy-failed"));

        AssertPayloadFreeCorrelatedDiagnostic(capturedLogs, @event);
    }

    /// <summary>TC-DIAG-CQRS-002 / TC-DIAG-CQRS-003 — inbox retry logs retain type/correlation only.</summary>
    [Fact]
    public void InboxConsumerRetryLog_OmitsPayloadAndRetainsCorrelationMetadata()
    {
        var (handler, capturedLogs) = CreateHandler();
        var @event = CreateEvent();

        handler.LogInboxConsumerRetryForTest(@event, new InvalidOperationException("inbox-retry-failed"));

        AssertPayloadFreeCorrelatedDiagnostic(capturedLogs, @event);
    }

    private static DiagnosticTestEvent CreateEvent()
    {
        return new DiagnosticTestEvent { PayloadSentinel = $"sensitive-{Guid.NewGuid():N}" };
    }

    private static void AssertPayloadFreeCorrelatedDiagnostic(List<string> capturedLogs, DiagnosticTestEvent @event)
    {
        capturedLogs.Should().ContainSingle();
        capturedLogs[0].Should().Contain(nameof(DiagnosticTestEvent));
        capturedLogs[0].Should().Contain(nameof(DiagnosticTestEventHandler));
        capturedLogs[0].Should().Contain(@event.Id);
        capturedLogs[0].Should().NotContain(@event.PayloadSentinel);
    }

    private static (DiagnosticTestEventHandler Handler, List<string> CapturedLogs) CreateHandler()
    {
        var capturedLogs = new List<string>();
        var loggerFactory = new CaptureLoggerFactory(capturedLogs);
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

        return (handler, capturedLogs);
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

    private sealed class CaptureLoggerFactory(List<string> capturedLogs) : ILoggerFactory
    {
        public ILogger CreateLogger(string categoryName)
        {
            return new CaptureLogger(capturedLogs);
        }

        public void AddProvider(ILoggerProvider provider)
        {
        }

        public void Dispose()
        {
        }
    }

    private sealed class CaptureLogger(List<string> capturedLogs) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(LogLevel logLevel)
        {
            return true;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            capturedLogs.Add(formatter(state, exception));
        }
    }
}
