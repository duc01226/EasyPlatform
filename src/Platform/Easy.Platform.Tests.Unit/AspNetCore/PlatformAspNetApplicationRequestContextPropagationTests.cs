using System.Security.Claims;
using Easy.Platform.Application;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext;
using Easy.Platform.AspNetCore.Context.RequestContext.RequestContextKeyToClaimTypeMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Easy.Platform.Tests.Unit.AspNetCore;

/// <summary>
/// Guards the OUTBOUND request-context boundary: what <c>GetAllKeyValues</c> hands to events, bus messages, and
/// background jobs. Two invariants, both of which failed open before the allowlist existed.
/// <para />1. <b>Only allowlisted keys travel.</b> The credential headers asserted against here (<c>Cookie</c>,
/// <c>Proxy-Authorization</c>) are the concrete cost of the previous behaviour: request headers were resolvable
/// context, so a session cookie could be copied onto an outgoing message and persisted in the inbox/outbox row it
/// produced. The test also asserts they are never materialized into the cache — being absent from the RESULT is not
/// enough if they were read to get there.
/// <para />2. <b>Allowlisting is not a size exemption.</b> The oversized-value and many-keys cases exist because a
/// bounded allowlist is still unbounded if any single member can be arbitrarily large: this context is copied onto
/// every message in the downstream fan-out, so one oversized value multiplies across all of them.
/// </summary>
public class PlatformAspNetApplicationRequestContextPropagationTests
{
    private const string TrustedBusinessContextKey = "TrustedBusinessContext";
    private const string OversizedTrustedContextKey = "OversizedTrustedContext";

    [Fact]
    public void GetAllKeyValues_WhenHeadersContainCredentialsAndOversizedUntrustedData_PropagatesOnlyBoundedTrustedContext()
    {
        var credentialSentinel = Guid.NewGuid().ToString("N");
        var proxyCredentialSentinel = Guid.NewGuid().ToString("N");
        var oversizedTrustedValue = new string('t', PlatformAspNetApplicationRequestContext.MaxPropagatedRequestContextValueSize + 1);
        var httpContext = new DefaultHttpContext { TraceIdentifier = "trusted-request-id" };
        httpContext.Request.Headers.Cookie = $"session={credentialSentinel}";
        httpContext.Request.Headers.ProxyAuthorization = $"Basic {proxyCredentialSentinel}";

        for (var index = 0; index < 64; index++)
            httpContext.Request.Headers[$"X-Untrusted-{index}"] = new string('u', 4096);

        httpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity(
                [
                    new Claim(ClaimTypes.NameIdentifier, "trusted-user-id"),
                    new Claim(TrustedBusinessContextKey, "trusted-business-value"),
                    new Claim(OversizedTrustedContextKey, oversizedTrustedValue)
                ],
                "unit-test"));

        var requestContext = CreateRequestContext(httpContext, new TestTrustedPropagationMapper());

        var propagatedContext = requestContext.GetAllKeyValues();

        propagatedContext.Should().ContainKey(
            PlatformApplicationCommonRequestContextKeys.RequestIdContextKey,
            "trusted correlation must cross the boundary");
        propagatedContext.Should().ContainKey(
            PlatformApplicationCommonRequestContextKeys.UserIdContextKey,
            "verified identity claims are trusted context");
        propagatedContext.Should().ContainKey(
            TrustedBusinessContextKey,
            "applications can explicitly extend the trusted propagation allowlist");
        propagatedContext.Should().NotContainKey("Cookie");
        propagatedContext.Should().NotContainKey("Proxy-Authorization");
        propagatedContext.Keys.Should().NotContain(key => key.StartsWith("X-Untrusted-", StringComparison.Ordinal));
        propagatedContext.Should().NotContainKey(
            OversizedTrustedContextKey,
            "allowlisting a key must not bypass the per-value propagation bound");
        propagatedContext.Count.Should().BeLessThanOrEqualTo(PlatformAspNetApplicationRequestContext.MaxPropagatedRequestContextKeyCount);

        requestContext.FullCachedRequestContextData.Should().NotContainKey(
            "Cookie",
            "credential headers must not even be materialized while building propagated context");
        requestContext.FullCachedRequestContextData.Should().NotContainKey("Proxy-Authorization");
        requestContext.FullCachedRequestContextData.Keys.Should().NotContain(key => key.StartsWith("X-Untrusted-", StringComparison.Ordinal));
    }

    [Fact]
    public void GetAllKeyValues_WhenTrustedAllowlistExceedsKeyAndTotalBounds_ReturnsABoundedSnapshot()
    {
        var httpContext = new DefaultHttpContext { TraceIdentifier = "trusted-request-id" };
        var mapper = new ManyTrustedKeysMapper();
        httpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity(
                mapper.AdditionalTrustedKeys.Select(key => new Claim(key, new string('v', 2048))),
                "unit-test"));

        var propagatedContext = CreateRequestContext(httpContext, mapper).GetAllKeyValues();
        var measuredSize = propagatedContext.Sum(item => item.Key.Length + (((string?)item.Value)?.Length ?? 0));

        propagatedContext.Count.Should().BeLessThanOrEqualTo(PlatformAspNetApplicationRequestContext.MaxPropagatedRequestContextKeyCount);
        measuredSize.Should().BeLessThanOrEqualTo(PlatformAspNetApplicationRequestContext.MaxPropagatedRequestContextTotalSize);
        propagatedContext.Should().ContainKey(
            PlatformApplicationCommonRequestContextKeys.RequestIdContextKey,
            "correlation keys are prioritized when an application registers more trusted keys than the bound permits");
    }

    private static PlatformAspNetApplicationRequestContext CreateRequestContext(
        HttpContext httpContext,
        PlatformApplicationRequestContextKeyToJwtClaimTypeMapper mapper)
    {
        var services = new ServiceCollection()
            .AddSingleton<IConfiguration>(new ConfigurationBuilder().Build())
            .BuildServiceProvider();
        var requestContextAccessor = new Mock<IPlatformApplicationRequestContextAccessor>();
        var lazyRegisters = new PlatformApplicationLazyLoadRequestContextAccessorRegisters(
            services,
            requestContextAccessor.Object,
            []);

        return new PlatformAspNetApplicationRequestContext(
            new HttpContextAccessor { HttpContext = httpContext },
            mapper,
            new PlatformApplicationSettingContext(services),
            services,
            lazyRegisters,
            requestContextAccessor.Object);
    }

    private sealed class TestTrustedPropagationMapper : PlatformApplicationRequestContextKeyToJwtClaimTypeMapper
    {
        public TestTrustedPropagationMapper()
        {
            TrustedPropagationContextKeys =
                new HashSet<string>(base.TrustedPropagationContextKeys, StringComparer.OrdinalIgnoreCase)
                {
                    TrustedBusinessContextKey,
                    OversizedTrustedContextKey
                };
        }

        public override HashSet<string> TrustedPropagationContextKeys { get; }
    }

    private sealed class ManyTrustedKeysMapper : PlatformApplicationRequestContextKeyToJwtClaimTypeMapper
    {
        public ManyTrustedKeysMapper()
        {
            AdditionalTrustedKeys = Enumerable.Range(0, 64).Select(index => $"Trusted-{index:D2}").ToList();
            TrustedPropagationContextKeys =
                new HashSet<string>(base.TrustedPropagationContextKeys.Concat(AdditionalTrustedKeys), StringComparer.OrdinalIgnoreCase);
        }

        public IReadOnlyList<string> AdditionalTrustedKeys { get; }

        public override HashSet<string> TrustedPropagationContextKeys { get; }
    }
}
