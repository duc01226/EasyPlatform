using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper;
using IdentityModel;
using PlatformExampleApp.TextSnippet.Application.Context.UserContext;

namespace PlatformExampleApp.TextSnippet.Api.Context.UserContext
{
    /// <summary>
    /// An example if your application have custom jwt which you want to added into user context
    /// In this example imaging in jwt claim types you have "organization"
    /// </summary>
    public class TextSnippetApplicationUserContextKeyToJwtClaimTypeMapper : PlatformApplicationUserContextKeyToJwtClaimTypeMapper
    {
        public override string ToClaimType(string contextKey)
        {
            return contextKey switch
            {
                TextSnippetApplicationCustomUserContextKeys.Organizations => "organization",
                _ => base.ToClaimType(contextKey)
            };
        }

        // Demo example if one prop key like UserId could come from one of multi claim type value
        public override HashSet<string> ToOneOfClaimTypes(string contextKey)
        {
            return contextKey switch
            {
                PlatformApplicationCommonUserContextKeys.UserId => new HashSet<string>() { ToClaimType(contextKey), ClaimTypes.NameIdentifier },
                _ => base.ToOneOfClaimTypes(contextKey)
            };
        }
    }
}
