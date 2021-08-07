using AngularDotnetPlatform.Platform.Caching;
using Microsoft.AspNetCore.Mvc;
using AngularDotnetPlatform.Platform.Cqrs;
using Microsoft.Extensions.Configuration;

namespace AngularDotnetPlatform.Platform.AspNetCore.Controllers
{
    public abstract class PlatformBaseController : ControllerBase
    {
        public PlatformBaseController(IPlatformCqrs cqrs, IPlatformCacheProvider cacheProvider, IConfiguration configuration)
        {
            Cqrs = cqrs;
            CacheProvider = cacheProvider;
            Configuration = configuration;
        }

        protected IPlatformCqrs Cqrs { get; }
        protected IPlatformCacheProvider CacheProvider { get; }
        public IConfiguration Configuration { get; }
    }
}
