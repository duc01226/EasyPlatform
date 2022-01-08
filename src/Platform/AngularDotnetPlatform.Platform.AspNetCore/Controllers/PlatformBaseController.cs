using AngularDotnetPlatform.Platform.Infrastructures.Caching;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace AngularDotnetPlatform.Platform.AspNetCore.Controllers
{
    public abstract class PlatformBaseController : ControllerBase
    {
        public PlatformBaseController(IPlatformCqrs cqrs, IPlatformCacheRepositoryProvider cacheRepositoryProvider, IConfiguration configuration)
        {
            Cqrs = cqrs;
            CacheRepositoryProvider = cacheRepositoryProvider;
            Configuration = configuration;
        }

        protected IPlatformCqrs Cqrs { get; }
        protected IPlatformCacheRepositoryProvider CacheRepositoryProvider { get; }
        public IConfiguration Configuration { get; }
    }
}
