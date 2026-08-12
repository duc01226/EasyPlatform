using System.Text.RegularExpressions;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.AspNetCore;

/// <summary>
/// Guards the rule that authority-bearing request-context keys can never be supplied by a request header.
/// <para /><b>What regressed before.</b> Resolving a context key fell through to reading a request header whenever the
/// key was not present as a claim, for every key without exception. A caller whose token omitted a claim could
/// therefore supply that claim's value themselves by header — impersonation for a user id, privilege escalation for a
/// role. The same fallback was the ONLY source for the trusted internal flags, which have no claim at all: sending
/// <c>IsSeedingTestingData: true</c> suppressed the notification and email side-effect handlers outright.
/// <para />These are source-shape assertions (see <c>PlatformSubQueueGuardSourceShapeTests</c> for the same technique).
/// The resolution path is a private static over a live <c>HttpContext</c>, so the ordering of its guards is not
/// reachable from a unit test; asserting the shape is what makes the ordering regression-proof.
/// </summary>
public class RequestContextNotFromHeaderKeysSourceShapeTests
{
    private const string RequestContextPath =
        "src/Platform/Easy.Platform.AspNetCore/Context/RequestContext/PlatformAspNetApplicationRequestContext.cs";

    private const string MapperPath =
        "src/Platform/Easy.Platform.AspNetCore/Context/RequestContext/RequestContextKeyToClaimTypeMapper/PlatformApplicationRequestContextKeyToJwtClaimTypeMapper.cs";

    private const string CommonKeysPath =
        "src/Platform/Easy.Platform/Application/RequestContext/PlatformApplicationCommonRequestContextKeys.cs";

    /// <summary>
    /// Resolved ahead of the fallback by its own branch (<c>TryGetRequestId</c>), so it never reaches the header
    /// lookup and does not need listing. Named here so the closure test below still forces a decision on it.
    /// </summary>
    private const string HandledBeforeTheFallback = "RequestIdContextKey";

    [Fact]
    public void NotFromHeaderKeys_AreRefusedTheHeaderFallback_AndTheGuardSitsBetweenClaimsAndHeaders()
    {
        var methodSource = ExtractSource(
            ReadRepositoryFile(RequestContextPath),
            "private static bool TryGetValueFromHttpContext<T>(",
            "private static bool TryGetValueFromRequestHeaders<T>(");

        methodSource.Should().Contain(
            "NotFromRequestHeaderContextKeys.Contains(contextKey)",
            "this set is what withholds the header fallback from authority-bearing keys");

        var claimsLookupIndex = methodSource.IndexOf("TryGetValueFromUserClaims(", StringComparison.Ordinal);
        var guardIndex = methodSource.IndexOf("NotFromRequestHeaderContextKeys.Contains(contextKey)", StringComparison.Ordinal);
        var headerLookupIndex = methodSource.IndexOf("TryGetValueFromRequestHeaders(", StringComparison.Ordinal);

        claimsLookupIndex.Should().BeGreaterThanOrEqualTo(0);
        guardIndex.Should().BeGreaterThan(
            claimsLookupIndex,
            "a legitimate claim must still resolve — the guard withholds only the header fallback, never the claim lookup");
        headerLookupIndex.Should().BeGreaterThan(
            guardIndex,
            "the guard is worthless after the header has already been read");
    }

    [Fact]
    public void TheGuardCannotFailOpen_TheMapperIsRequiredAndTheCheckIsNotNullConditional()
    {
        // The guard's POLICY SOURCE must be present for the guard to mean anything. Both entry points previously
        // accepted a nullable mapper and read the set through `?.`, so a null mapper made the whole condition evaluate
        // false — restoring the header fallback for EVERY key, silently, with no error anywhere. That is a security
        // control defaulting to "allow" when its policy is absent, which is the inverse of what a deny-list must do.
        //
        // Note this is NOT covered by the ordering test above: `claimTypeMapper?.NotFromRequestHeaderContextKeys
        // .Contains(contextKey)` contains that test's expected substring and sits in the same position, so the
        // fail-open shape passes it. Only the two assertions here distinguish the shapes.
        var requestContextSource = ReadRepositoryFile(RequestContextPath);

        var guardMethodSource = ExtractSource(
            requestContextSource,
            "private static bool TryGetValueFromHttpContext<T>(",
            "private static bool TryGetValueFromRequestHeaders<T>(");

        guardMethodSource.Should().NotContain(
            "claimTypeMapper?.NotFromRequestHeaderContextKeys",
            "a null-conditional read makes the guard evaluate false when the mapper is absent, which re-opens the "
            + "header fallback for every authority-bearing key instead of refusing it");
        guardMethodSource.Should().Contain(
            "IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper",
            "the guard method must take the mapper as non-nullable — the policy source is required, not optional");

        var publicEntryPointSignature = ExtractSource(
            requestContextSource,
            "out bool hasFoundValue,",
            "hasFoundValue = TryGetValueFromHttpContext(");

        publicEntryPointSignature.Should().Contain(
            "IPlatformApplicationRequestContextKeyToClaimTypeMapper claimTypeMapper",
            "the public overload must not let a caller omit the mapper or pass null — an optional policy source is "
            + "how the fallback would come back for every key without anyone editing the guard itself");
        publicEntryPointSignature.Should().NotContain(
            "claimTypeMapper = null",
            "a default of null makes omitting the mapper the path of least resistance at every call site");
    }

    [Fact]
    public void EveryIdentityKeyTheMapperTranslates_IsRefusedTheHeader()
    {
        // The coverage invariant. Adding a new identity-claim mapping without adding the key to the set would silently
        // reopen the header fallback for it, so this derives the expected keys from the mapping itself rather than
        // restating a hand-maintained list.
        var mapperSource = ReadRepositoryFile(MapperPath);

        var mappedIdentityKeys = ContextKeyNamesIn(
            ExtractSource(
                mapperSource,
                "public virtual string ToClaimType(string contextKey)",
                "public virtual HashSet<string> ToOneOfClaimTypes(string contextKey)"));

        mappedIdentityKeys.Should().NotBeEmpty("the mapper must translate at least one identity key");
        mappedIdentityKeys.Should().BeSubsetOf(
            NotFromRequestHeaderKeys(mapperSource),
            "a key worth reading from a verified token is never safe to accept from a request header");
    }

    [Fact]
    public void TrustedInternalFlags_WhichNoTokenCarries_AreRefusedTheHeader()
    {
        // These have no claim mapping, so before the guard the header was their ONLY HTTP source — an unconditional
        // exploit rather than one waiting on a token that omits a claim. Their legitimate sources (in-process seeder,
        // bus-message context) do not pass through the HttpContext lookup and are unaffected.
        NotFromRequestHeaderKeys(ReadRepositoryFile(MapperPath))
            .Should()
            .Contain(
                ["IsSeedingTestingDataKey", "ConsumerOrEventHandlerPipeLineKey"],
                "asserting either flag lets a caller suppress side-effect handlers: the notification and email path "
                + "for the seeding flag, any consumer or event handler for a forged circular pipeline");
    }

    [Fact]
    public void EveryPlatformContextKey_IsEitherRefusedTheHeader_OrExplicitlyAccountedFor()
    {
        // Closure. A new platform context key must be classified rather than defaulting into header-readable, which is
        // how the trusted internal flags stayed exploitable: nothing forced anyone to decide about them.
        var declaredKeys = Regex
            .Matches(ReadRepositoryFile(CommonKeysPath), @"public const string (\w+) =")
            .Select(match => match.Groups[1].Value)
            .ToHashSet(StringComparer.Ordinal);

        declaredKeys.Should().NotBeEmpty("the platform must declare at least one common context key");
        declaredKeys.Should().BeEquivalentTo(
            NotFromRequestHeaderKeys(ReadRepositoryFile(MapperPath)).Append(HandledBeforeTheFallback),
            "every platform context key is either refused the header or knowingly reachable from one — a key in "
            + "neither list was never decided about. If a new key is a genuine caller preference, exempt it here "
            + "with the reason; otherwise add it to NotFromRequestHeaderContextKeys");
    }

    private static HashSet<string> NotFromRequestHeaderKeys(string mapperSource)
    {
        return ContextKeyNamesIn(
            ExtractSource(
                mapperSource,
                "public virtual HashSet<string> NotFromRequestHeaderContextKeys",
                "public virtual string ToClaimType(string contextKey)"));
    }

    private static HashSet<string> ContextKeyNamesIn(string source)
    {
        return Regex
            .Matches(source, @"PlatformApplicationCommonRequestContextKeys\.(\w+)")
            .Select(match => match.Groups[1].Value)
            .ToHashSet(StringComparer.Ordinal);
    }

    private static string ExtractSource(string source, string startMarker, string endMarker)
    {
        var start = source.IndexOf(startMarker, StringComparison.Ordinal);
        start.Should().BeGreaterThanOrEqualTo(0, $"marker '{startMarker}' must exist");

        var end = source.IndexOf(endMarker, start, StringComparison.Ordinal);
        end.Should().BeGreaterThan(start, $"marker '{endMarker}' must follow '{startMarker}'");

        return source[start..end];
    }

    private static string ReadRepositoryFile(string relativePath)
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory != null)
        {
            var candidatePath = Path.Combine(directory.FullName, relativePath);
            if (File.Exists(candidatePath))
                return File.ReadAllText(candidatePath);

            directory = directory.Parent;
        }

        throw new FileNotFoundException($"Could not find repository file '{relativePath}'.");
    }
}
