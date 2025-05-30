using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Easy.Platform.AspNetCore.Controllers;

public abstract class PlatformBaseController : ControllerBase
{
    public PlatformBaseController(
        IPlatformCqrs cqrs,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        IConfiguration configuration,
        IPlatformApplicationRequestContextAccessor requestContextAccessor)
    {
        Cqrs = cqrs;
        CacheRepositoryProvider = cacheRepositoryProvider;
        Configuration = configuration;
        RequestContextAccessor = requestContextAccessor;
    }

    public IPlatformCqrs Cqrs { get; }
    public IPlatformCacheRepositoryProvider CacheRepositoryProvider { get; }
    public IConfiguration Configuration { get; }
    public IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }
    public IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;
}
