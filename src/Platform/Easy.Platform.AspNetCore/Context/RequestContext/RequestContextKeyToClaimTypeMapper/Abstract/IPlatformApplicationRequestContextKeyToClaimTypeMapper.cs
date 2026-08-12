namespace Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper.Abstract;

/// <summary>
/// Translates platform request-context keys to identity claim types AND declares the two trust policies that govern
/// request context: which keys a caller may never supply by header (inbound), and which keys may cross a process or
/// message boundary (outbound).
/// </summary>
/// <remarks>
/// <para>
/// The mapping members and the policy members deliberately live on one interface: an application that introduces its
/// own context key has to answer all three questions in the same place — which claim carries it, whether a caller may
/// assert it, and whether it travels downstream. Splitting them across types is what lets a new key be mapped while
/// its trust policy is silently left at the default.
/// </para>
/// <para>
/// Both policies default to DENY, so forgetting to extend them fails safe: an unlisted key simply cannot be
/// header-supplied or propagated. Implementations are consumed per request and must be side-effect free.
/// </para>
/// </remarks>
public interface IPlatformApplicationRequestContextKeyToClaimTypeMapper
{
    /// <summary>Returns the single canonical claim type carrying <paramref name="contextKey" />.</summary>
    /// <param name="contextKey">A platform or application request-context key.</param>
    /// <returns>The claim type name; conventionally the key itself when no mapping applies.</returns>
    public string ToClaimType(string contextKey);

    /// <summary>
    /// Returns every claim type that may carry <paramref name="contextKey" />, for keys whose claim name varies by
    /// token issuer or format (for example short JWT names versus the expanded <c>ClaimTypes.*</c> URIs).
    /// </summary>
    /// <param name="contextKey">A platform or application request-context key.</param>
    /// <returns>All acceptable claim types; the resolver takes the first that is present on the principal.</returns>
    public HashSet<string> ToOneOfClaimTypes(string contextKey);

    /// <summary>
    /// Context keys a request header may never supply, because they establish WHO the caller is or WHAT they may do.
    /// <para /><b>Why this exists.</b> Resolving a context key falls back to reading a request header when the key is
    /// not present as a claim. That fallback is what lets a caller supply their own preferences (language, time zone,
    /// and other app-specific values) per request. Applied to an authority-bearing key it is something else entirely:
    /// the caller gets to assert the value the system was supposed to establish about them. For a user id or a role
    /// that is straightforward impersonation and privilege escalation.
    /// <para />Keys listed here lose the header fallback. Two kinds belong here:
    /// <list type="bullet">
    /// <item><b>Identity keys</b> — resolution stops after the claim lookup: present as a validated claim, or not
    /// present at all.</item>
    /// <item><b>Trusted internal flags</b> — values only ever set in-process or carried on a bus message, which no
    /// token carries and no caller may assert. Listing them leaves those paths untouched and closes the header one.</item>
    /// </list>
    /// <para /><b>Extending this.</b> Applications carry their own authority-bearing context keys — a selected tenant,
    /// an org-unit role, a subscription or entitlement set. Those are application concepts, so they do not belong in
    /// this generic mapper. Override this in an application-specific mapper and union the base set with them.
    /// Comparison MUST be case-insensitive, because header names are.
    /// </summary>
    public HashSet<string> NotFromRequestHeaderContextKeys { get; }

    /// <summary>
    /// Explicit allowlist of request-context keys that may cross an event, background, or message boundary.
    /// Applications extend this with trusted business-context keys; arbitrary request headers are never inferred
    /// to be trusted merely because they were not denied.
    /// <para /><b>Why an allowlist.</b> Whatever crosses this boundary is re-established as ambient request context
    /// in another process, and is persisted into inbox/outbox rows on the way. A denylist would make that boundary
    /// transitive — every future context key, including any a caller managed to set, would travel by default and
    /// would have to be discovered and denied one at a time. Naming the keys inverts it: a key travels because
    /// someone decided it should.
    /// <para /><b>Relationship to <see cref="NotFromRequestHeaderContextKeys" />.</b> They are orthogonal and a key
    /// commonly appears in both. That list controls where a value may come FROM; this one controls where it may GO.
    /// An identity key is typically claim-only inbound AND propagated outbound.
    /// <para /><b>Extending this.</b> Override in an application-specific mapper and union with the base set. Prefer
    /// small, scalar, stable values: propagated values are budgeted by size and count
    /// (see <c>PlatformAspNetApplicationRequestContext.MaxPropagatedRequestContextTotalSize</c>), and a value that
    /// cannot be measured — an arbitrary object graph — is dropped rather than propagated. Comparison MUST be
    /// case-insensitive, matching the resolver's lookup.
    /// </summary>
    public HashSet<string> TrustedPropagationContextKeys { get; }
}
