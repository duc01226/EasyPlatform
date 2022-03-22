using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using Microsoft.AspNetCore.Http;

namespace AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper.Abstract
{
    /// <summary>
    /// This service is used to auto map a contextKey from <see cref="PlatformApplicationCommonUserContextKeys"/> to
    /// claimType to get a user context value from <see cref="HttpContext.User"/>
    /// </summary>
    public interface IPlatformApplicationUserContextKeyToClaimTypeMapper
    {
        public string ToClaimType(string contextKey);
        public HashSet<string> ToOneOfClaimTypes(string contextKey);
    }
}
