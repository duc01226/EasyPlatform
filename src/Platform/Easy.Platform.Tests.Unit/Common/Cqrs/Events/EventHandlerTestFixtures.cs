using Easy.Platform.Application;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Validations;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace Easy.Platform.Tests.Unit.Common.Cqrs.Events;

/// <summary>
/// Shared test doubles and host wiring for the Platform CQRS event-handler unit test suites.
/// <para>
/// The inbox seam is deliberately built on a REAL <see cref="ServiceCollection" /> rather than a mocked
/// <see cref="IPlatformRootServiceProvider" />: <c>PlatformCqrsEventApplicationHandler.HasInboxMessageSupport()</c>
/// (Application/Cqrs/Events/PlatformCqrsEventApplicationHandler.cs:1712-1715) asks the root provider through
/// <c>CheckHasRegisteredScopedService</c> (Common/Extensions/DependencyInjectionExtension.cs:1652-1666), which
/// opens a real DI scope. Registering — or not registering — <see cref="IPlatformInboxBusMessageRepository" />
/// is therefore the genuine production seam; a mock would only assert what the mock was told to say.
/// </para>
/// </summary>
public sealed class EventHandlerTestHost : IDisposable
{
    private readonly ServiceProvider builtServiceProvider;

    private EventHandlerTestHost(ServiceProvider builtServiceProvider, IPlatformRootServiceProvider rootServiceProvider)
    {
        this.builtServiceProvider = builtServiceProvider;
        RootServiceProvider = rootServiceProvider;
        LoggerFactory = NullLoggerFactory.Instance;
        UnitOfWorkManager = new Mock<IPlatformUnitOfWorkManager>().Object;
    }

    public IServiceProvider ServiceProvider => builtServiceProvider;

    public IPlatformRootServiceProvider RootServiceProvider { get; }

    public ILoggerFactory LoggerFactory { get; }

    public IPlatformUnitOfWorkManager UnitOfWorkManager { get; }

    /// <summary>
    /// Builds a self-contained DI host. Each call creates its own <see cref="ServiceCollection" /> and provider,
    /// so nothing is shared between tests and the suite stays parallel-safe and infinitely repeatable.
    /// </summary>
    /// <param name="registerInboxRepository">
    /// When true, <see cref="IPlatformInboxBusMessageRepository" /> is registered as a scoped service, which is
    /// exactly what makes <c>HasInboxMessageSupport()</c> observe inbox support.
    /// </param>
    public static EventHandlerTestHost Create(bool registerInboxRepository = false)
    {
        var services = new ServiceCollection();

        services.AddSingleton<ILoggerFactory>(NullLoggerFactory.Instance);

        services.AddScoped(_ =>
        {
            var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();

            requestContextAccessor.SetupGet(accessor => accessor.Current).Returns(new Mock<IPlatformApplicationRequestContext>().Object);

            return requestContextAccessor.Object;
        });

        services.AddSingleton(_ =>
        {
            var applicationSettingContext = new Mock<IPlatformApplicationSettingContext>();

            // An unconfigured mock answers 0 here, and 0 is not a harmless default: with a max circular count of 0,
            // PlatformApplicationCommonRequestContextKeys.IsCircularPipeLineExceeded
            // (Application/RequestContext/PlatformApplicationCommonRequestContextKeys.cs:133-139) reports "exceeded"
            // even for an EMPTY pipeline, so ShouldSkipDueToCircularPipeLine would make every application handler
            // skip its own body. Pinning the production default keeps the host faithful to a real application.
            applicationSettingContext
                .SetupGet(context => context.ProcessEventEnsureNoCircularPipeLineMaxCircularCount)
                .Returns(IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue);

            return applicationSettingContext.Object;
        });

        if (registerInboxRepository)
            services.AddScoped(_ => new Mock<IPlatformInboxBusMessageRepository>().Object);

        var provider = services.BuildServiceProvider();

        return new EventHandlerTestHost(provider, new PlatformRootServiceProvider(provider, services));
    }

    public PlainTestEventHandler NewPlainHandler()
    {
        return new PlainTestEventHandler(LoggerFactory, RootServiceProvider, ServiceProvider);
    }

    public SiblingPlainTestEventHandler NewSiblingPlainHandler()
    {
        return new SiblingPlainTestEventHandler(LoggerFactory, RootServiceProvider, ServiceProvider);
    }

    public AppTestEventHandler NewAppHandler()
    {
        return new AppTestEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public SiblingAppTestEventHandler NewSiblingAppHandler()
    {
        return new SiblingAppTestEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public TestDomainEventHandler NewDomainHandler()
    {
        return new TestDomainEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public TestEntityEventHandler NewEntityHandler()
    {
        return new TestEntityEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public TestBulkEntitiesEventHandler NewBulkHandler()
    {
        return new TestBulkEntitiesEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public TestCommandEventHandler NewCommandHandler()
    {
        return new TestCommandEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public TestSingleArgCommandEventHandler NewSingleArgCommandHandler()
    {
        return new TestSingleArgCommandEventHandler(LoggerFactory, UnitOfWorkManager, ServiceProvider, RootServiceProvider);
    }

    public void Dispose()
    {
        builtServiceProvider.Dispose();
    }
}

/// <summary>
/// The base-chain reflection walk shared by every suite in this directory that needs to find the closed
/// <see cref="PlatformCqrsEventHandler{TEvent}" /> a handler type derives from, or check assignability to an
/// open generic base. Written once here instead of three times (one per call site) so a future change to the
/// walk (e.g. interface-based discovery) is a single edit.
/// </summary>
internal static class EventHandlerReflectionHelpers
{
    /// <summary>
    /// Walks <paramref name="handlerType" /> and then its base chain looking for the closed
    /// <see cref="PlatformCqrsEventHandler{TEvent}" /> generic definition, returning the TEvent argument it
    /// closed over, or <see langword="null" /> if the type does not derive from it.
    /// </summary>
    public static Type? HandledEventTypeArgumentOf(Type handlerType)
    {
        for (var current = handlerType; current != null; current = current.BaseType)
        {
            if (current.IsGenericType && current.GetGenericTypeDefinition() == typeof(PlatformCqrsEventHandler<>))
                return current.GetGenericArguments()[0];
        }

        return null;
    }

    /// <summary>
    /// Walks the type ITSELF and then its base chain, returning whether any of them closes over
    /// <paramref name="genericDefinition" />. Including the type itself matters: a layer base class (for example
    /// <c>PlatformCqrsEventApplicationHandler&lt;&gt;</c>) is a member of its own layer and must be held to that
    /// layer's contract, not to the layer below it.
    /// </summary>
    public static bool IsAssignableToGenericDefinition(Type handlerType, Type genericDefinition)
    {
        for (var current = handlerType; current != null; current = current.BaseType)
        {
            if (current.IsGenericType && current.GetGenericTypeDefinition() == genericDefinition)
                return true;
        }

        return false;
    }
}

// -- Base-layer (non application) doubles --

/// <summary>Minimal concrete event for exercising <see cref="PlatformCqrsEventHandler{TEvent}" /> directly.</summary>
public sealed class PlainTestEvent : PlatformCqrsEvent
{
    public override string EventType => nameof(PlainTestEvent);

    public override string EventName => nameof(PlainTestEvent);

    public override string EventAction => "Raised";
}

/// <summary>
/// Concrete subclass of the abstract <see cref="PlatformCqrsEventHandler{TEvent}" /> that counts
/// <c>HandleWhen</c> invocations and exposes the protected decision methods so their branch behavior can be
/// asserted without driving the full dispatch pipeline.
/// </summary>
public class PlainTestEventHandler : PlatformCqrsEventHandler<PlainTestEvent>
{
    public PlainTestEventHandler(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider)
        : base(loggerFactory, rootServiceProvider, serviceProvider)
    {
    }

    /// <summary>Counts how many times the real <c>HandleWhen</c> body ran — the probe for the <c>??=</c> cache.</summary>
    public int HandleWhenInvocationCount { get; private set; }

    /// <summary>
    /// Counts how many times the real <c>HandleAsync</c> body ran — the probe for the <c>ExecuteHandleAsync</c>
    /// gate (PlatformCqrsEventHandler.cs:805-806) and the <c>DoHandle</c> background/foreground routing decision
    /// (PlatformCqrsEventHandler.cs:883-884), both of which are otherwise only exercised through the isolated
    /// decision methods rather than through the actual pipeline call sites that consume them.
    /// </summary>
    public int HandleAsyncInvocationCount { get; private set; }

    public bool HandleWhenReturnValue { get; set; } = true;

    /// <summary>
    /// When set, the real <c>HandleAsync</c> body throws it — the seam for a FAILING handler. Without it the
    /// exception-propagation contract (<c>ThrowExceptionOnHandleFailed</c>, enforced at
    /// PlatformCqrsEventHandler.cs:911-912 and :919-920) can only be asserted as a stored VALUE, never as the
    /// rethrow-vs-swallow BEHAVIOR it exists to control. Settable for the same reason
    /// <see cref="HandleWhenReturnValue" /> is: the branch is otherwise unreachable from a test.
    /// </summary>
    public Exception? HandleAsyncException { get; set; }

    public bool MustWaitHandlerExecutionFinishedImmediatelyValue { get; set; }

    public bool MustRunHandlerInSameCurrentActiveUowValue { get; set; }

    protected override bool MustWaitHandlerExecutionFinishedImmediately => MustWaitHandlerExecutionFinishedImmediatelyValue;

    protected override bool MustRunHandlerInSameCurrentActiveUow => MustRunHandlerInSameCurrentActiveUowValue;

    public override Task Handle(object @event, CancellationToken cancellationToken)
    {
        return Handle((PlainTestEvent)@event, cancellationToken);
    }

    public override Task<bool> HandleWhen(object @event)
    {
        return HandleWhen((PlainTestEvent)@event);
    }

    public override Task<bool> HandleWhen(PlainTestEvent @event)
    {
        HandleWhenInvocationCount++;

        return Task.FromResult(HandleWhenReturnValue);
    }

    public Task<bool> CheckHandleWhenForTest(PlainTestEvent @event)
    {
        return CheckHandleWhen(@event);
    }

    public bool NeedWaitHandlerExecutionFinishedImmediatelyForTest(PlainTestEvent @event)
    {
        return NeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    public bool NotNeedWaitHandlerExecutionFinishedImmediatelyForTest(PlainTestEvent @event)
    {
        return NotNeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    public bool NeedRunHandlerInSameCurrentActiveUowForTest(PlainTestEvent @event)
    {
        return NeedRunHandlerInSameCurrentActiveUow(@event);
    }

    public void CopyPropertiesToNewInstanceBeforeExecutionForTest(
        PlatformCqrsEventHandler<PlainTestEvent> previousInstance,
        PlatformCqrsEventHandler<PlainTestEvent> newInstance)
    {
        CopyPropertiesToNewInstanceBeforeExecution(previousInstance, newInstance);
    }

    protected override Task HandleAsync(PlainTestEvent @event, CancellationToken cancellationToken)
    {
        // Counted BEFORE the throw so a failure-propagation test can prove the handler body actually ran and
        // failed, rather than the pipeline having skipped it and produced the same "no exception" observation.
        HandleAsyncInvocationCount++;

        if (HandleAsyncException != null)
            throw HandleAsyncException;

        return Task.CompletedTask;
    }
}

/// <summary>
/// A DIFFERENT handler type over the same event. Exists so that per-handler-type event configuration
/// (which is keyed on <c>Type.FullName</c>) can be proven to target one handler and not its sibling.
/// </summary>
public sealed class SiblingPlainTestEventHandler : PlainTestEventHandler
{
    public SiblingPlainTestEventHandler(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider)
        : base(loggerFactory, rootServiceProvider, serviceProvider)
    {
    }
}

// -- Application-layer doubles --

/// <summary>Minimal concrete event for exercising <see cref="PlatformCqrsEventApplicationHandler{TEvent}" />.</summary>
public sealed class AppTestEvent : PlatformCqrsEvent
{
    public override string EventType => nameof(AppTestEvent);

    public override string EventName => nameof(AppTestEvent);

    public override string EventAction => "Raised";
}

/// <summary>
/// Concrete subclass of the abstract <see cref="PlatformCqrsEventApplicationHandler{TEvent}" /> exposing the
/// protected inbox / execution-mode decision points and making the virtual execution switches settable.
/// </summary>
public class AppTestEventHandler : PlatformCqrsEventApplicationHandler<AppTestEvent>
{
    public AppTestEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    public bool EnableInboxEventBusMessageValue { get; set; } = true;

    public bool MustWaitHandlerExecutionFinishedImmediatelyValue { get; set; }

    public bool MustRunHandlerInSameCurrentActiveUowValue { get; set; }

    /// <summary>
    /// Mirrors the production default (PlatformCqrsEventApplicationHandler.cs:283) so the existing default-pinning
    /// assertions are unaffected. Settable because <c>AutoOpenUow=false</c> is a real supported production mode
    /// (PlatformApplicationBatchScrollingBackgroundJobExecutor.cs:120) and is the only one that reaches
    /// <c>HandleAsync</c> without routing through <c>IPlatformUnitOfWorkManager</c> — which this host supplies as a
    /// bare mock, so a UoW-opening path would assert against the mock's behavior rather than the handler's.
    /// </summary>
    public bool AutoOpenUowValue { get; set; } = true;

    /// <summary>
    /// Counts how many times the real <c>HandleAsync</c> body ran — the vacuity guard for the failure-propagation
    /// tests, exactly as <c>PlainTestEventHandler.HandleAsyncInvocationCount</c> is at the base layer.
    /// </summary>
    public int HandleAsyncInvocationCount { get; private set; }

    /// <summary>
    /// When set, the real <c>HandleAsync</c> body throws it. The application layer catches and re-decides
    /// separately from the base layer (PlatformCqrsEventApplicationHandler.cs:1412-1413), so that catch needs a
    /// failing handler of its own to be exercised.
    /// </summary>
    public Exception? HandleAsyncException { get; set; }

    public override bool EnableInboxEventBusMessage => EnableInboxEventBusMessageValue;

    protected override bool MustWaitHandlerExecutionFinishedImmediately => MustWaitHandlerExecutionFinishedImmediatelyValue;

    protected override bool MustRunHandlerInSameCurrentActiveUow => MustRunHandlerInSameCurrentActiveUowValue;

    protected override bool AutoOpenUow => AutoOpenUowValue;

    public bool AutoOpenUowForTest => AutoOpenUow;

    public override Task<bool> HandleWhen(AppTestEvent @event)
    {
        return Task.FromResult(true);
    }

    public bool HasInboxMessageSupportForTest()
    {
        return HasInboxMessageSupport();
    }

    public bool NeedWaitHandlerExecutionFinishedImmediatelyForTest(AppTestEvent @event)
    {
        return NeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    public bool NeedRunHandlerInSameCurrentActiveUowForTest(AppTestEvent @event)
    {
        return NeedRunHandlerInSameCurrentActiveUow(@event);
    }

    public void CopyPropertiesToNewInstanceBeforeExecutionForTest(
        PlatformCqrsEventHandler<AppTestEvent> previousInstance,
        PlatformCqrsEventHandler<AppTestEvent> newInstance)
    {
        CopyPropertiesToNewInstanceBeforeExecution(previousInstance, newInstance);
    }

    protected override Task HandleAsync(AppTestEvent @event, CancellationToken cancellationToken)
    {
        // Counted BEFORE the throw — see PlainTestEventHandler.HandleAsync for why.
        HandleAsyncInvocationCount++;

        if (HandleAsyncException != null)
            throw HandleAsyncException;

        return Task.CompletedTask;
    }
}

/// <summary>Sibling application handler type — same role as <see cref="SiblingPlainTestEventHandler" />.</summary>
public sealed class SiblingAppTestEventHandler : AppTestEventHandler
{
    public SiblingAppTestEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }
}

// -- Domain-event family doubles --

public sealed class TestDomainEvent : PlatformCqrsDomainEvent
{
    public string Payload { get; set; } = string.Empty;
}

public sealed class TestDomainEventHandler : PlatformCqrsDomainEventApplicationHandler<TestDomainEvent>
{
    public TestDomainEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    protected override Task HandleAsync(TestDomainEvent @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

// -- Entity / bulk-entity family doubles --

public sealed class HandlerTestEntity : Entity<HandlerTestEntity, string>
{
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<HandlerTestEntity> Validate()
    {
        return PlatformValidationResult.Validate(this, !string.IsNullOrEmpty(Name), (PlatformValidationError)"Name is required");
    }
}

/// <summary>
/// Entity-event handler double. Note it MUST implement <c>HandleWhen(TEvent)</c>: unlike the domain, bulk and
/// command families, <see cref="PlatformCqrsEntityEventApplicationHandler{TEntity}" /> declares no default
/// override, so the abstract member from <see cref="PlatformCqrsEventHandler{TEvent}" /> stays unimplemented.
/// </summary>
public sealed class TestEntityEventHandler : PlatformCqrsEntityEventApplicationHandler<HandlerTestEntity>
{
    public TestEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    /// <summary>Only Created/Updated are interesting for this double — proves the family imposes no default.</summary>
    public override Task<bool> HandleWhen(PlatformCqrsEntityEvent<HandlerTestEntity> @event)
    {
        return Task.FromResult(@event.CrudAction != PlatformCqrsEntityEventCrudAction.Deleted);
    }

    protected override Task HandleAsync(PlatformCqrsEntityEvent<HandlerTestEntity> @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

public sealed class TestBulkEntitiesEventHandler : PlatformCqrsBulkEntitiesEventApplicationHandler<HandlerTestEntity, string>
{
    public TestBulkEntitiesEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    protected override Task HandleAsync(PlatformCqrsBulkEntitiesEvent<HandlerTestEntity, string> @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

// -- Command-event family doubles --

public sealed class TestCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>
{
    public string Name { get; set; } = string.Empty;
}

public sealed class TestCommandEventHandler : PlatformCqrsCommandEventApplicationHandler<TestCommand, PlatformCqrsCommandResult>
{
    public TestCommandEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    protected override Task HandleAsync(PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult> @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

/// <summary>Double for the single-generic-argument overload, which inherits the two-argument gating unchanged.</summary>
public sealed class TestSingleArgCommandEventHandler : PlatformCqrsCommandEventApplicationHandler<TestCommand>
{
    public TestSingleArgCommandEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    protected override Task HandleAsync(PlatformCqrsCommandEvent<TestCommand, PlatformCqrsCommandResult> @event, CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
