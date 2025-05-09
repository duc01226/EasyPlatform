using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Application.RequestContext;

/// <summary>
/// Implementation of <see cref="IPlatformApplicationRequestContextAccessor" />
/// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor
/// </summary>
public class PlatformDefaultApplicationRequestContextAccessor : IPlatformApplicationRequestContextAccessor
{
    private static readonly AsyncLocal<RequestContextHolder> RequestContextCurrentThread = new();

    protected readonly IServiceProvider ServiceProvider;

    public PlatformDefaultApplicationRequestContextAccessor(IServiceProvider serviceProvider)
    {
        ServiceProvider = serviceProvider;
    }

    public IPlatformApplicationRequestContext Current
    {
        get
        {
            if (RequestContextCurrentThread.Value == null)
                Current = CreateNewContext();

            return RequestContextCurrentThread.Value?.Context;
        }
        set
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

    protected virtual IPlatformApplicationRequestContext CreateNewContext()
    {
        return new PlatformDefaultApplicationRequestContext(
            ServiceProvider,
            new PlatformApplicationSettingContext(ServiceProvider),
            ServiceProvider.GetService<PlatformApplicationLazyLoadRequestContextAccessorRegisters>());
    }

    protected sealed class RequestContextHolder
    {
        public IPlatformApplicationRequestContext Context { get; set; }
    }
}
