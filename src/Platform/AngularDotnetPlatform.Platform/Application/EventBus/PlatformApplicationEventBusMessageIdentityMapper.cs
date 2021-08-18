using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.EventBus;

namespace AngularDotnetPlatform.Platform.Application.EventBus
{
    public static class PlatformApplicationEventBusMessageIdentityMapper
    {
        public static PlatformEventBusMessageIdentity ByUserContext(IPlatformApplicationUserContext userContext)
        {
            return new PlatformEventBusMessageIdentity()
            {
                UserId = userContext.GetUserId(),
                RequestId = userContext.GetRequestId(),
                UserName = userContext.GetUserName()
            };
        }
    }
}
