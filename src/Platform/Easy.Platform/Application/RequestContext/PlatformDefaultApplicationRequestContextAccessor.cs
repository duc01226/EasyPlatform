#region

using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

// ReSharper disable InconsistentlySynchronizedField

#endregion

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Implementation of <see cref="IPlatformApplicationRequestContextAccessor" />
/// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor but support both singleton by thread task and by scoped
/// </summary>
public class PlatformDefaultApplicationRequestContextAccessor : IPlatformApplicationRequestContextAccessor, IDisposable
{
    protected static readonly AsyncLocal<RequestContextHolder> RequestContextCurrentThread = new();
    protected readonly ContextLifeTimeModes ContextLifeTimeMode;
    protected readonly ILoggerFactory LoggerFactory;
    protected readonly IServiceProvider ServiceProvider;
    protected IPlatformApplicationRequestContext? PerScopeInitiatedContext;
    private readonly Lock initAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowModeContextLock = new();

    private readonly Lock initContextLock = new();
    private readonly Lock setPerAsyncLocalTaskFlowContextLock = new();

    public PlatformDefaultApplicationRequestContextAccessor(
        IServiceProvider serviceProvider,
        ContextLifeTimeModes contextLifeTimeMode,
        ILoggerFactory loggerFactory)
    {
        ServiceProvider = serviceProvider;
        ContextLifeTimeMode = contextLifeTimeMode;
        LoggerFactory = loggerFactory;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public bool FirstAccessCurrentInitiated { get; private set; }

    public IPlatformApplicationRequestContextAccessor SetValues(IDictionary<string, object> values)
    {
        Current.SetValues(values, onlySelf: true);

        InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode();

        return this;
    }

    public IPlatformApplicationRequestContextAccessor AddValues(IDictionary<string, object> values)
    {
        Current.AddValues(values, onlySelf: true);

        InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode();

        return this;
    }

    public IPlatformApplicationRequestContext Current
    {
        get
        {
            if (PerScopeInitiatedContext == null || RequestContextCurrentThread.Value?.Context == null)
                InitContext();

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow ||
                ContextLifeTimeMode == ContextLifeTimeModes.PerScope)
                return PerScopeInitiatedContext;

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                return RequestContextCurrentThread.Value!.Context;

            return null;
        }
        set
        {
            if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                SetPerAsyncLocalTaskFlowContext(value);

            if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope ||
                ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                PerScopeInitiatedContext = value;

            if (value == null)
                FirstAccessCurrentInitiated = false;
        }
    }

    private void InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode()
    {
        if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
        {
            lock (initAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowModeContextLock)
            {
                if (RequestContextCurrentThread.Value?.Context == null) SetPerAsyncLocalTaskFlowContext(CreateNewContext());

                if (RequestContextCurrentThread.Value!.Context!.IsEmpty())
                    RequestContextCurrentThread.Value!.Context.SetValues(PerScopeInitiatedContext, onlySelf: true);
            }
        }
    }

    private void SetPerAsyncLocalTaskFlowContext(IPlatformApplicationRequestContext value)
    {
        lock (setPerAsyncLocalTaskFlowContextLock)
        {
            var holder = RequestContextCurrentThread.Value;
            if (holder != null)
                // WHY: Clear current Context trapped in the AsyncLocals, as its done using
                // because we want to set a new current user context.
                holder.Context = null;

            // WHY: Use an object indirection to hold the Context in the AsyncLocal,
            // so it can be cleared in all ExecutionContexts when its cleared.
            if (value != null)
            {
                RequestContextCurrentThread.Value = new RequestContextHolder
                {
                    Context = value
                };
            }
        }
    }

    private void InitContext()
    {
        if (FirstAccessCurrentInitiated &&
            (RequestContextCurrentThread.Value?.Context != null || ContextLifeTimeMode == ContextLifeTimeModes.PerScope)) return;

        lock (initContextLock)
        {
            if (!FirstAccessCurrentInitiated)
            {
                if ((ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow ||
                     ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow) &&
                    RequestContextCurrentThread.Value?.Context == null)
                    SetPerAsyncLocalTaskFlowContext(CreateNewContext());
                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope ||
                    ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    PerScopeInitiatedContext = CreateNewContext();

                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    PerScopeInitiatedContext.AddValues(RequestContextCurrentThread.Value!.Context, onlySelf: true);

                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScope ||
                    ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                {
                    var parentScopeSp = ServiceProvider.ParentScope();

                    if (parentScopeSp != null)
                    {
                        var parentOrRootRequestContextAccessor = parentScopeSp.TryResolveRequiredService<IPlatformApplicationRequestContextAccessor>();

                        if (parentOrRootRequestContextAccessor != null)
                        {
                            PerScopeInitiatedContext.AddValues(parentOrRootRequestContextAccessor.Current, onlySelf: true);
                            RequestContextCurrentThread.Value!.Context.AddValues(parentOrRootRequestContextAccessor.Current, onlySelf: true);
                        }
                    }
                }

                FirstAccessCurrentInitiated = true;
            }
            else if (RequestContextCurrentThread.Value?.Context == null)
            {
                if (ContextLifeTimeMode == ContextLifeTimeModes.PerScopeCombinedWithAsyncLocalTaskFlow)
                    InitAsyncLocalTaskFlowContextIfEmptyOnPerScopeCombinedWithAsyncLocalTaskFlowMode();
                else if (ContextLifeTimeMode == ContextLifeTimeModes.PerAsyncLocalTaskFlow)
                    SetPerAsyncLocalTaskFlowContext(CreateNewContext());
            }
        }
    }

    protected virtual IPlatformApplicationRequestContext CreateNewContext()
    {
        return new PlatformDefaultApplicationRequestContext(
            ServiceProvider,
            new PlatformApplicationSettingContext(ServiceProvider),
            ServiceProvider.GetService<PlatformApplicationLazyLoadRequestContextAccessorRegisters>(),
            this);
    }

    protected virtual void Dispose(bool disposing)
    {
        // ReleaseUnmanagedResources();
        if (disposing)
        {
            // release managed resources here
#pragma warning disable S1066
            if (FirstAccessCurrentInitiated) Current = null;
#pragma warning restore S1066
        }
    }

    ~PlatformDefaultApplicationRequestContextAccessor()
    {
        Dispose(false);
    }

    protected sealed class RequestContextHolder
    {
        public IPlatformApplicationRequestContext Context { get; set; }
    }

    public enum ContextLifeTimeModes
    {
        PerScope,
        PerAsyncLocalTaskFlow,
        PerScopeCombinedWithAsyncLocalTaskFlow
    }
}
