using Microsoft.AspNetCore.Mvc;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;

namespace NoCeiling.Duc.Interview.Test.Platform.AspNetCore.Controllers
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
