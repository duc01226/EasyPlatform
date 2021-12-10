using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper.Abstract;
using IdentityModel;

namespace AngularDotnetPlatform.Platform.AspNetCore.Context.UserContext.UserContextKeyToClaimTypeMapper
{
    /// <summary>
    /// This will map <see cref="PlatformApplicationCommonUserContextKeys"/> to <see cref="JwtClaimTypes"/>
    /// </summary>
    public class PlatformApplicationUserContextKeyToJwtClaimTypeMapper : IPlatformApplicationUserContextKeyToClaimTypeMapper
    {
        public virtual string ToClaimType(string contextKey)
        {
            return contextKey switch
            {
                PlatformApplicationCommonUserContextKeys.UserId => JwtClaimTypes.Subject,
                PlatformApplicationCommonUserContextKeys.Email => JwtClaimTypes.Email,
                PlatformApplicationCommonUserContextKeys.UserFullName => JwtClaimTypes.Name,
                PlatformApplicationCommonUserContextKeys.UserFirstName => JwtClaimTypes.GivenName,
                PlatformApplicationCommonUserContextKeys.UserMiddleName => JwtClaimTypes.MiddleName,
                PlatformApplicationCommonUserContextKeys.UserLastName => JwtClaimTypes.FamilyName,
                PlatformApplicationCommonUserContextKeys.UserName => JwtClaimTypes.PreferredUserName,
                PlatformApplicationCommonUserContextKeys.UserRoles => JwtClaimTypes.Role,
                _ => contextKey
            };
        }
    }
}
