using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformCacheEntryOptions" />.
/// <para>Source under test: <c>src/Platform/Easy.Platform/Infrastructures/Caching/PlatformCacheEntryOptions.cs</c>.</para>
/// <para>Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-020..029</c>.</para>
/// </summary>
public class PlatformCacheEntryOptionsTests : PlatformUnitTestBase
{
    // TC-PLATREPO-020: The default expiration is 24 hours and is applied to AbsoluteExpirationInSeconds.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-020")]
    public void Defaults_AreTwentyFourHoursAbsoluteAndNoSlidingExpiration()
    {
        PlatformCacheEntryOptions.DefaultExpirationInSeconds.Should().Be(3600 * 24);

        var options = new PlatformCacheEntryOptions();

        options.AbsoluteExpirationInSeconds.Should().Be(PlatformCacheEntryOptions.DefaultExpirationInSeconds);
        options.UnusedExpirationInSeconds.Should().BeNull("sliding expiration is opt-in, never a default");
    }

    // TC-PLATREPO-021: AbsoluteExpirationRelativeToNow converts seconds to TimeSpan, null-in -> null-out.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-021")]
    [InlineData(null, null)]
    [InlineData(0d, 0d)]
    [InlineData(1.5d, 1.5d)]
    [InlineData(86400d, 86400d)]
    public void AbsoluteExpirationRelativeToNow_ConvertsSecondsToTimeSpanAndPreservesNull(
        double? absoluteExpirationInSeconds,
        double? expectedTotalSeconds)
    {
        var options = new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = absoluteExpirationInSeconds };

        var converted = options.AbsoluteExpirationRelativeToNow();

        if (expectedTotalSeconds == null)
            converted.Should().BeNull();
        else
            converted.Should().Be(TimeSpan.FromSeconds(expectedTotalSeconds.Value));
    }

    // TC-PLATREPO-022: SlidingExpiration converts UnusedExpirationInSeconds, null-in -> null-out.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-022")]
    [InlineData(null, null)]
    [InlineData(0d, 0d)]
    [InlineData(30d, 30d)]
    public void SlidingExpiration_ConvertsUnusedExpirationSecondsToTimeSpanAndPreservesNull(
        double? unusedExpirationInSeconds,
        double? expectedTotalSeconds)
    {
        var options = new PlatformCacheEntryOptions { UnusedExpirationInSeconds = unusedExpirationInSeconds };

        var converted = options.SlidingExpiration();

        if (expectedTotalSeconds == null)
            converted.Should().BeNull();
        else
            converted.Should().Be(TimeSpan.FromSeconds(expectedTotalSeconds.Value));
    }

    // TC-PLATREPO-023: "Optional" means a NULL argument LEAVES the existing value untouched.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-023")]
    public void WithOptionalCustomAbsoluteExpirationInSeconds_WhenNull_LeavesTheExistingValueUntouched()
    {
        // This is the whole point of the "Optional" prefix: callers pass an optional override through
        // without having to branch, and a missing override must NOT wipe the configured default.
        var options = new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 120 };

        var returned = options.WithOptionalCustomAbsoluteExpirationInSeconds(null);

        returned.AbsoluteExpirationInSeconds.Should().Be(120);
        returned.Should().BeSameAs(options, "the fluent method mutates and returns the SAME instance");
    }

    // TC-PLATREPO-024: A non-null argument overrides the existing value.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-024")]
    [InlineData(120d, 300d, 300d)]
    [InlineData(120d, 0d, 0d)]
    [InlineData(null, 45d, 45d)]
    public void WithOptionalCustomAbsoluteExpirationInSeconds_WhenValueProvided_OverridesExistingValue(
        double? initialValue,
        double overrideValue,
        double expectedValue)
    {
        var options = new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = initialValue };

        options.WithOptionalCustomAbsoluteExpirationInSeconds(overrideValue);

        options.AbsoluteExpirationInSeconds.Should().Be(expectedValue);
    }

    // TC-PLATREPO-025: The override flows through into the converted TimeSpan, not only into the raw field.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-025")]
    public void WithOptionalCustomAbsoluteExpirationInSeconds_OverrideFlowsIntoTheConvertedTimeSpan()
    {
        var options = new PlatformCacheEntryOptions().WithOptionalCustomAbsoluteExpirationInSeconds(90);

        options.AbsoluteExpirationRelativeToNow().Should().Be(TimeSpan.FromSeconds(90));

        // ... and a subsequent null override must not undo it.
        options.WithOptionalCustomAbsoluteExpirationInSeconds(null);

        options.AbsoluteExpirationRelativeToNow().Should().Be(TimeSpan.FromSeconds(90));
    }

    // TC-PLATREPO-026: NeverExpire is the ONLY carrier of "explicitly no expiration" - the converted TimeSpan cannot
    // express it, which is precisely why every consumer must read the flag rather than the TimeSpan.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-026")]
    public void NeverExpireOptions_CarriesTheIntentInTheFlagBecauseTheConvertedTimeSpanCannot()
    {
        var neverExpire = PlatformCacheEntryOptions.NeverExpireOptions();

        neverExpire.NeverExpire.Should().BeTrue();

        // THE TRAP THIS GUARDS. A consumer that reads AbsoluteExpirationRelativeToNow() instead of the flag sees the
        // ordinary 24h default here - identical to a plain options object - and silently expires an entry the caller
        // asked to keep forever. Both known consumers must therefore branch on NeverExpire FIRST:
        //   - PlatformCacheRepository.MapToHybridCacheEntryOptions / MapToDistributedCacheEntryOptions (per entry)
        //   - PlatformCachingModule's HybridCacheOptions.DefaultEntryOptions (the global default)
        // Asserting the indistinguishability is the point: it is what makes "just read the TimeSpan" unsafe.
        neverExpire.AbsoluteExpirationRelativeToNow()
            .Should()
            .Be(
                new PlatformCacheEntryOptions().AbsoluteExpirationRelativeToNow(),
                "the converted TimeSpan cannot distinguish 'never expire' from 'use the default', so a consumer reading it alone gets the default"
            );

        // The duration the never-expire intent maps onto must stay far enough out to outlive any deployment, and far
        // enough below DateTime.MaxValue that adding it to "now" cannot overflow inside the caching library.
        PlatformCacheRepository.NeverExpireHybridCacheDuration.Should().BeGreaterThan(TimeSpan.FromDays(365 * 50));
        (DateTime.UtcNow + PlatformCacheRepository.NeverExpireHybridCacheDuration).Should().BeBefore(DateTime.MaxValue);
    }
}
