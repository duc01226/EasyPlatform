using Microsoft.AspNetCore.Mvc;
using AngularDotnetPlatform.Platform.Cqrs;

namespace AngularDotnetPlatform.Platform.AspNetCore.Controllers
{
    public abstract class PlatformBaseController : ControllerBase
    {
        public PlatformBaseController(IPlatformCqrs cqrs)
        {
            Cqrs = cqrs;
        }

        protected IPlatformCqrs Cqrs { get; }
    }
}
