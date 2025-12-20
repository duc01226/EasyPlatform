#region

using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;
using Easy.Platform.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.AspNetCore.Context.RequestContext;

/// <summary>
/// Implementation of <see cref="IPlatformApplicationRequestContextAccessor" />
/// Inspired by Microsoft.AspNetCore.Http.HttpContextAccessor
/// </summary>
public class PlatformAspNetApplicationRequestContextAccessor : PlatformDefaultApplicationRequestContextAccessor
{
    public PlatformAspNetApplicationRequestContextAccessor(
        IServiceProvider serviceProvider,
        ContextLifeTimeModes contextLifeTimeMode,
        ILoggerFactory loggerFactory) : base(serviceProvider, contextLifeTimeMode, loggerFactory)
    {
    }

    protected override IPlatformApplicationRequestContext CreateNewContext(bool useRootScopeSpForAsyncLocalInstance)
    {
        var contextSp = useRootScopeSpForAsyncLocalInstance
            ? ServiceProvider.GetRequiredService<IPlatformRootServiceProvider>().GetScopedRootServiceProvider()
            : ServiceProvider;

        var httpContextAccessor = contextSp.GetService<IHttpContextAccessor>();
        var claimTypeMapper = contextSp.GetService<IPlatformApplicationRequestContextKeyToClaimTypeMapper>();
        var applicationSettingContext = contextSp.GetService<IPlatformApplicationSettingContext>();
        var lazyLoadRequestContextAccessorRegisters = contextSp.GetService<PlatformApplicationLazyLoadRequestContextAccessorRegisters>();

        if (httpContextAccessor == null || claimTypeMapper == null)
        {
            throw new Exception(
                "[Developer] Missing registered IHttpContextAccessor or IPlatformApplicationRequestContextKeyToClaimTypeMapper");
        }

        return new PlatformAspNetApplicationRequestContext(
            httpContextAccessor,
            claimTypeMapper,
            applicationSettingContext,
            contextSp,
            lazyLoadRequestContextAccessorRegisters,
            this);
    }
}
