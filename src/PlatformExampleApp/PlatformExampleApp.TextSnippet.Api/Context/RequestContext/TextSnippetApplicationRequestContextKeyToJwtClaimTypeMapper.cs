using System.Security.Claims;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper;
using PlatformExampleApp.TextSnippet.Application.Context.RequestContext;

namespace PlatformExampleApp.TextSnippet.Api.Context.RequestContext;

/// <summary>
/// An example if your application have custom jwt which you want to added into user context
/// In this example imaging in jwt claim types you have "organization"
/// </summary>
public class TextSnippetApplicationRequestContextKeyToJwtClaimTypeMapper : PlatformApplicationRequestContextKeyToJwtClaimTypeMapper
{
    public override string ToClaimType(string contextKey)
    {
        return contextKey switch
        {
            TextSnippetApplicationCustomRequestContextKeys.Organizations => "organization",
            _ => base.ToClaimType(contextKey)
        };
    }

    // Demo example if one prop key like UserId could come from one of multi claim type value
    public override HashSet<string> ToOneOfClaimTypes(string contextKey)
    {
        return contextKey switch
        {
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.NameIdentifier
            ],
            _ => base.ToOneOfClaimTypes(contextKey)
        };
    }
}
