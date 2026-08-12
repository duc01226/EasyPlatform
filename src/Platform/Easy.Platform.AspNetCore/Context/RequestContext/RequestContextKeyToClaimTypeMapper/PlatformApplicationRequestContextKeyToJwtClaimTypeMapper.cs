using System.Security.Claims;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;
using IdentityModel;

namespace Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper;

/// <summary>
/// This will map <see cref="PlatformApplicationCommonRequestContextKeys" /> to <see cref="JwtClaimTypes" />
/// </summary>
public class PlatformApplicationRequestContextKeyToJwtClaimTypeMapper : IPlatformApplicationRequestContextKeyToClaimTypeMapper
{
    /// <summary>
    /// The platform's outbound allowlist: everything that may not be header-supplied, plus the request id.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Deriving from <see cref="NotFromRequestHeaderContextKeys" /> is intentional and keeps the two lists from
    /// drifting: a key the platform established itself (rather than accepting from the caller) is exactly the kind
    /// of key that is safe and useful to carry downstream. Adding an identity key to the inbound list therefore
    /// makes it propagate too, with no second edit to forget.
    /// </para>
    /// <para>
    /// The request id is the one addition, and it is the reverse case — a correlation id a caller MAY supply by
    /// header, because asserting one grants nothing, yet it must survive every boundary or cross-service traces
    /// break at the first hop.
    /// </para>
    /// <para>
    /// A new instance is returned per call (unlike <see cref="NotFromRequestHeaderContextKeys" />, which is a stored
    /// set) because it composes the base set at access time; callers must not treat it as a cached identity.
    /// </para>
    /// </remarks>
    public virtual HashSet<string> TrustedPropagationContextKeys =>
        new(NotFromRequestHeaderContextKeys, StringComparer.OrdinalIgnoreCase)
        {
            PlatformApplicationCommonRequestContextKeys.RequestIdContextKey
        };

    /// <summary>
    /// Every key this mapper translates to a standard identity claim, plus the platform's trusted internal flags —
    /// none of them can be supplied by request header. Applications that add their own authority-bearing keys should
    /// override this and union them with <c>base.NotFromRequestHeaderContextKeys</c>.
    /// </summary>
    public virtual HashSet<string> NotFromRequestHeaderContextKeys { get; } =
        new(StringComparer.OrdinalIgnoreCase)
        {
            // Identity — who the caller is and what roles they hold.
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey,
            PlatformApplicationCommonRequestContextKeys.EmailContextKey,
            PlatformApplicationCommonRequestContextKeys.UserFullNameContextKey,
            PlatformApplicationCommonRequestContextKeys.UserFirstNameContextKey,
            PlatformApplicationCommonRequestContextKeys.UserMiddleNameContextKey,
            PlatformApplicationCommonRequestContextKeys.UserLastNameContextKey,
            PlatformApplicationCommonRequestContextKeys.UserNameContextKey,
            PlatformApplicationCommonRequestContextKeys.UserRolesContextKey,

            // Trusted internal flags — set in-process by seeders or carried on a bus message, never by an HTTP caller.
            // IsSeedingTestingData suppresses notification/email/calendar side-effect handlers, so a caller who could
            // assert it would mutate records while evading the human review path. ConsumerOrEventHandlerPipeLine feeds
            // the circular-pipeline guard, so a forged one makes handlers skip themselves.
            PlatformApplicationCommonRequestContextKeys.IsSeedingTestingDataKey,
            PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey
        };

    public virtual string ToClaimType(string contextKey)
    {
        return contextKey switch
        {
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey => JwtClaimTypes.Subject,
            PlatformApplicationCommonRequestContextKeys.EmailContextKey => JwtClaimTypes.Email,
            PlatformApplicationCommonRequestContextKeys.UserFullNameContextKey => JwtClaimTypes.Name,
            PlatformApplicationCommonRequestContextKeys.UserFirstNameContextKey => JwtClaimTypes.GivenName,
            PlatformApplicationCommonRequestContextKeys.UserMiddleNameContextKey => JwtClaimTypes.MiddleName,
            PlatformApplicationCommonRequestContextKeys.UserLastNameContextKey => JwtClaimTypes.FamilyName,
            PlatformApplicationCommonRequestContextKeys.UserNameContextKey => JwtClaimTypes.PreferredUserName,
            PlatformApplicationCommonRequestContextKeys.UserRolesContextKey => JwtClaimTypes.Role,
            _ => contextKey
        };
    }

    public virtual HashSet<string> ToOneOfClaimTypes(string contextKey)
    {
        return contextKey switch
        {
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.NameIdentifier
            ],
            PlatformApplicationCommonRequestContextKeys.UserRolesContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.Role
            ],
            PlatformApplicationCommonRequestContextKeys.EmailContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.Email
            ],
            PlatformApplicationCommonRequestContextKeys.UserFirstNameContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.GivenName
            ],
            PlatformApplicationCommonRequestContextKeys.UserFullNameContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.Name
            ],
            PlatformApplicationCommonRequestContextKeys.UserLastNameContextKey =>
            [
                ToClaimType(contextKey),
                ClaimTypes.Surname
            ],
            _ => [ToClaimType(contextKey)]
        };
    }
}
