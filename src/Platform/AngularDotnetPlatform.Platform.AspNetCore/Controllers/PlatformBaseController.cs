using AngularDotnetPlatform.Platform.Caching;
using Microsoft.AspNetCore.Mvc;
using AngularDotnetPlatform.Platform.Cqrs;
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
