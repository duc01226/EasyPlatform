using System.Text;
using Easy.Platform.Common.Utils;
using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for the abstract <see cref="PlatformCacheRepository" /> - the class that owns ALL
/// real caching logic (serialization, self-healing reads, global key bookkeeping, tagging, cache-aside).
/// <para>
/// Source under test: <c>src/Platform/Easy.Platform/Infrastructures/Caching/PlatformCacheRepository.cs:181</c>.
/// A concrete subclass over a deterministic in-memory <see cref="Microsoft.Extensions.Caching.Distributed.IDistributedCache" />
/// is used, so the REAL code path runs end to end without any infrastructure or mocked behavior.
/// </para>
/// <para>
/// Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-010..019</c> and <c>TC-PLATREPO-090..099</c>.
/// The second range is NOT optional detail: this docstring previously declared only <c>010..019</c> while the
/// file already carried <c>090..096</c>, and that under-declaration is how <c>TC-PLATREPO-090</c> came to be
/// allocated TWICE — <c>PlatformRepositoryResolverTests</c> took it as well. That collision is RESOLVED: the
/// resolver suite's case moved to <c>TC-PLATREPO-100</c>, and <c>090</c> is this file's alone again.
/// Keep every range this file uses listed here, and check the WHOLE Easy.Platform.Tests.Unit project before
/// allocating a new id.
/// </para>
/// </summary>
public class PlatformCacheRepositoryTests : PlatformUnitTestBase
{
    // TC-PLATREPO-010: Values round-trip through real JSON serialization on both the async and sync API.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-010")]
    public async Task SetAsyncThenGetAsync_RoundTripsTheValueThroughRealSerialization()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("round-trip");
        var value = new TestCachedPayload("alpha", 42, [1, 2, 3]);

        await harness.Repository.SetAsync(cacheKey, value, cacheOptions: null);

        var read = await harness.Repository.GetAsync<TestCachedPayload>(cacheKey);

        read.Should().NotBeNull();
        read.Name.Should().Be("alpha");
        read.Count.Should().Be(42);
        read.Numbers.Should().Equal(1, 2, 3);

        // The sync facade must observe the same entry. The blocking call is the behavior under test here,
        // so the "prefer the async overload" analyzer is deliberately suppressed for this line only.
#pragma warning disable S6966
        harness.Repository.Get<TestCachedPayload>(cacheKey).Name.Should().Be("alpha");
#pragma warning restore S6966

        // A never-written key reads as default, not as an exception.
        (await harness.Repository.GetAsync<TestCachedPayload>(CacheRepositoryHarness.Key("never-written"))).Should().BeNull();
    }

    // TC-PLATREPO-011: RemoveAsync evicts exactly the requested key and leaves siblings intact.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-011")]
    public async Task RemoveAsync_EvictsOnlyTheRequestedKey()
    {
        using var harness = CacheRepositoryHarness.Create();

        var removedKey = CacheRepositoryHarness.Key("to-remove");
        var keptKey = CacheRepositoryHarness.Key("to-keep");

        await harness.Repository.SetAsync(removedKey, "removed-value", cacheOptions: null);
        await harness.Repository.SetAsync(keptKey, "kept-value", cacheOptions: null);

        await harness.Repository.RemoveAsync(removedKey);

        (await harness.Repository.GetAsync<string>(removedKey)).Should().BeNull();
        (await harness.Repository.GetAsync<string>(keptKey)).Should().Be("kept-value");
    }

    // TC-PLATREPO-012: RemoveAsync(predicate) can only work if every Set registered its key globally.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-012")]
    public async Task RemoveAsyncByPredicate_EvictsEveryMatchingKey_ProvingKeysAreRegisteredOnSet()
    {
        using var harness = CacheRepositoryHarness.Create();

        var matchingA = new PlatformCacheKey("ctx", "matching-collection", "a");
        var matchingB = new PlatformCacheKey("ctx", "matching-collection", "b");
        var unrelated = new PlatformCacheKey("ctx", "other-collection", "c");

        await harness.Repository.SetAsync(matchingA, "a-value", cacheOptions: null);
        await harness.Repository.SetAsync(matchingB, "b-value", cacheOptions: null);
        await harness.Repository.SetAsync(unrelated, "c-value", cacheOptions: null);

        // The predicate overload iterates the global registry of cached keys maintained by SetAsync.
        await harness.Repository.RemoveAsync(key => key.Collection == "matching-collection");

        (await harness.Repository.GetAsync<string>(matchingA)).Should().BeNull();
        (await harness.Repository.GetAsync<string>(matchingB)).Should().BeNull();
        (await harness.Repository.GetAsync<string>(unrelated)).Should().Be("c-value", "the predicate did not match this key");
    }

    // TC-PLATREPO-013: A corrupted payload is treated as a miss AND self-heals by evicting the bad entry.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-013")]
    public async Task GetAsync_WhenStoredPayloadCannotBeDeserialized_ReturnsDefaultAndEvictsTheBadEntry()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("corrupted");

        harness.DistributedCache.SetRawBytes(cacheKey.ToString(), Encoding.UTF8.GetBytes("{ this is not valid json"));
        harness.DistributedCache.ContainsKey(cacheKey.ToString()).Should().BeTrue("precondition: the bad entry exists");

        var read = await harness.Repository.GetAsync<TestCachedPayload>(cacheKey);

        read.Should().BeNull("an unreadable cache entry must never surface as an exception to the caller");
        harness.DistributedCache.ContainsKey(cacheKey.ToString())
            .Should()
            .BeFalse("the obsolete entry must be evicted so the next read repopulates it");
    }

    // TC-PLATREPO-014: The 0x03 first-byte guard bails out BEFORE deserialize and does NOT evict.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-014")]
    public async Task GetAsync_WhenPayloadStartsWithEndOfTextByte_ReturnsDefaultWithoutEvicting()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("end-of-text-marker");

        harness.DistributedCache.SetRawBytes(cacheKey.ToString(), [0x03, 0x41, 0x42]);

        var read = await harness.Repository.GetAsync<string>(cacheKey);

        read.Should().BeNull();

        // Distinct from TC-PLATREPO-013: this guard short-circuits before the deserialize try/catch,
        // so the entry is deliberately LEFT in place rather than evicted.
        harness.DistributedCache.ContainsKey(cacheKey.ToString()).Should().BeTrue();
    }

    // TC-PLATREPO-015: A DI-registered PlatformCacheEntryOptions wins over the cache settings default.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-015")]
    public void GetDefaultCacheEntryOptions_PrefersTheDiRegisteredOptionsOverTheSettingsDefault()
    {
        using var withoutOverride = CacheRepositoryHarness.Create();

        withoutOverride.Repository.GetDefaultCacheEntryOptions()
            .Should()
            .BeSameAs(withoutOverride.CacheSettings.DefaultCacheEntryOptions);

        var registeredOptions = new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 7 };

        using var withOverride = CacheRepositoryHarness.Create(services => services.AddSingleton(registeredOptions));

        withOverride.Repository.GetDefaultCacheEntryOptions().Should().BeSameAs(registeredOptions);
        withOverride.Repository.GetDefaultCacheEntryOptions().AbsoluteExpirationInSeconds.Should().Be(7);
    }

    // TC-PLATREPO-016: Tag keys and the global-keys collection key are built from the documented parts.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-016")]
    public void BuildTagKeyAndGlobalKeysCacheKey_UseTheApplicationNameAndTheReservedCollectionNames()
    {
        using var harness = CacheRepositoryHarness.Create();

        IPlatformCacheRepository.GlobalAllRequestCachedKeysCollectionName.Should().Be("___PlatformGlobalCacheKeys___");
        IPlatformCacheRepository.TaggedKeysCacheKeyCollectionPart.Should().Be("___PlatformGlobalCacheTags___");

        var tagKey = harness.Repository.BuildTagKeyForTest("my-tag");

        tagKey.Context.Should().Be(CachingTestFactory.TestApplicationName);
        tagKey.Collection.Should().Be(IPlatformCacheRepository.TaggedKeysCacheKeyCollectionPart);
        tagKey.RequestKey.Should().Be("my-tag");

        var globalKeysCacheKey = harness.Repository.GetGlobalAllRequestCachedKeysCacheKey();

        globalKeysCacheKey.Context.Should().Be(CachingTestFactory.TestApplicationName);
        globalKeysCacheKey.Collection.Should().Be(IPlatformCacheRepository.GlobalAllRequestCachedKeysCollectionName);
    }

    // TC-PLATREPO-017: Cache-aside - the request factory runs EXACTLY once on a miss and ZERO times on a hit.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-017")]
    public async Task CacheRequestAsync_InvokesTheRequestFactoryOnceOnMissAndNeverOnHit()
    {
        using var harness = CacheRepositoryHarness.Create();

        var missKey = CacheRepositoryHarness.Key("cache-aside-miss");
        var missInvocationCount = 0;

        var missResult = await harness.Repository.CacheRequestAsync(
            () =>
            {
                Interlocked.Increment(ref missInvocationCount);

                return Task.FromResult("freshly-requested");
            },
            missKey,
            cacheOptions: null);

        missResult.Should().Be("freshly-requested");
        missInvocationCount.Should().Be(1, "a miss must call the origin exactly once");

        // The miss result is returned immediately; the cache write itself happens in the background
        // (PlatformCacheRepository.cs:463-473). Poll for it - deleting that write-behind entirely would still
        // leave every assertion above green (surviving mutant H1).
        string? writtenValue = null;

        await Util.TaskRunner.WaitUntilAsync(
            async () =>
            {
                writtenValue = await harness.Repository.GetAsync<string>(missKey);

                return writtenValue != null;
            },
            maxWaitSeconds: 5,
            waitIntervalSeconds: 0.05,
            waitForMsg: "cache-aside miss must populate the store via the write-behind background task");

        writtenValue.Should().Be("freshly-requested", "the write-behind background write must actually persist the origin value");

        // Prime a DIFFERENT key deterministically, so the hit path is asserted without depending on
        // the write-behind background population of the miss above.
        var hitKey = CacheRepositoryHarness.Key("cache-aside-hit");

        await harness.Repository.SetAsync(hitKey, "already-cached", cacheOptions: null);

        var hitInvocationCount = 0;

        var hitResult = await harness.Repository.CacheRequestAsync(
            () =>
            {
                Interlocked.Increment(ref hitInvocationCount);

                return Task.FromResult("should-never-be-used");
            },
            hitKey,
            cacheOptions: null);

        hitResult.Should().Be("already-cached");
        hitInvocationCount.Should().Be(0, "a hit must NOT call the origin - that is the entire point of the cache");
    }

    // TC-PLATREPO-018: A FAILING cache read degrades to a miss instead of failing the caller's request.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-018")]
    public async Task CacheRequestAsync_WhenTheCacheReadThrows_TreatsItAsAMissInsteadOfPropagating()
    {
        using var harness = CacheRepositoryHarness.CreateWithThrowingRead();

        var invocationCount = 0;

        var result = await harness.Repository.CacheRequestAsync(
            () =>
            {
                Interlocked.Increment(ref invocationCount);

                return Task.FromResult("origin-value");
            },
            CacheRepositoryHarness.Key("unreadable"),
            cacheOptions: null);

        result.Should().Be("origin-value", "cache unavailability must never break the request it was meant to speed up");
        invocationCount.Should().Be(1);
    }

    // TC-PLATREPO-019: Tagged entries are removable as a group, and untagged siblings are untouched.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-019")]
    public async Task RemoveByTagsAsync_EvictsEveryKeyAssociatedWithTheTagAndNothingElse()
    {
        using var harness = CacheRepositoryHarness.Create();

        var taggedA = CacheRepositoryHarness.Key("tagged-a");
        var taggedB = CacheRepositoryHarness.Key("tagged-b");
        var untagged = CacheRepositoryHarness.Key("untagged");

        await harness.Repository.SetAsync(taggedA, "a-value", cacheOptions: null, tags: ["release-tag"]);
        await harness.Repository.SetAsync(taggedB, "b-value", cacheOptions: null, tags: ["release-tag"]);
        await harness.Repository.SetAsync(untagged, "c-value", cacheOptions: null);

        (await harness.Repository.GetTaggedKeys("release-tag", CancellationToken.None))
            .Should()
            .BeEquivalentTo([taggedA, taggedB], "SetAsync must associate each key with every supplied tag");

        await harness.Repository.RemoveByTagsAsync(["release-tag"]);

        (await harness.Repository.GetAsync<string>(taggedA)).Should().BeNull();
        (await harness.Repository.GetAsync<string>(taggedB)).Should().BeNull();
        (await harness.Repository.GetAsync<string>(untagged)).Should().Be("c-value");
    }

    // TC-PLATREPO-090: A custom absolute expiration reaches the STORE, not just the selected options object.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-090")]
    public async Task SetAsync_WithCustomAbsoluteExpiration_WritesItThroughToTheDistributedCacheEntryOptions()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("absolute-expiration");

        await harness.Repository.SetAsync(
            cacheKey,
            "value",
            cacheOptions: new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 42, UnusedExpirationInSeconds = null });

        var capturedOptions = harness.DistributedCache.GetCapturedOptions(cacheKey.ToString());

        capturedOptions.Should().NotBeNull("the double must capture what SetAsync actually wrote, not just which options object was selected");
        capturedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(TimeSpan.FromSeconds(42), "MapToDistributedCacheEntryOptions must reach the store (H2)");

        // The sliding field was left at a bare null WITHOUT the NeverExpire flag, so it means "no override
        // supplied for this field" and MUST fall back to the settings default (the same by-design fallback
        // TC-PLATREPO-095 pins on the absolute side). Asserting the concrete fallback VALUE - rather than the
        // `null` this once asserted while the harness default happened to be null too - is what distinguishes
        // "fell back to the configured default" from "was explicitly nulled out"; those two were previously
        // indistinguishable here.
        capturedOptions.SlidingExpiration
            .Should()
            .Be(
                TimeSpan.FromSeconds(CachingTestFactory.DefaultUnusedExpirationInSeconds),
                "a bare null sliding field without NeverExpire means 'no override supplied', which falls back to the settings default");
    }

    // TC-PLATREPO-091: A custom sliding expiration maps to SlidingExpiration, never to AbsoluteExpirationRelativeToNow.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-091")]
    public async Task SetAsync_WithCustomSlidingExpiration_WritesItThroughToTheDistributedCacheEntryOptions()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("sliding-expiration");

        // AbsoluteExpirationInSeconds is deliberately left at ITS OWN CONSTRUCTOR DEFAULT (not explicitly
        // nulled), so this test isolates the swap-detection goal from the intentional per-field default
        // fallback covered separately in TC-PLATREPO-095.
        await harness.Repository.SetAsync(
            cacheKey,
            "value",
            cacheOptions: new PlatformCacheEntryOptions { UnusedExpirationInSeconds = 17 });

        var capturedOptions = harness.DistributedCache.GetCapturedOptions(cacheKey.ToString());

        capturedOptions.Should().NotBeNull();
        capturedOptions!.SlidingExpiration.Should().Be(TimeSpan.FromSeconds(17), "AbsoluteExpirationRelativeToNow and SlidingExpiration must not be swapped when mapped (H2)");
        capturedOptions.AbsoluteExpirationRelativeToNow
            .Should()
            .Be(
                TimeSpan.FromSeconds(PlatformCacheEntryOptions.DefaultExpirationInSeconds),
                "AbsoluteExpirationInSeconds was left at its own constructor default (86400s), never explicitly nulled");
    }

    // TC-PLATREPO-095: INTENTIONAL per-field default fallback (general case), NOT a defect. A bare null on
    // AbsoluteExpirationInSeconds by itself only ever means "no override supplied for this field - use the
    // settings default", identical in effect to a fully-null cacheOptions (TC-PLATREPO-092). This is BY DESIGN:
    // a nullable `double?` field cannot represent three distinct caller intents (no override / an explicit value
    // / explicitly no expiration at all), so a bare null field can only ever mean "no override". A caller who
    // genuinely wants NO expiration must say so explicitly via PlatformCacheEntryOptions.NeverExpireOptions()
    // (see TC-PLATREPO-093 for the platform's own "never expire" use on the global-keys registry, and
    // TC-PLATREPO-096 for the general-purpose contract proof). This test previously pinned this SAME numeric
    // outcome under a "pins a defect, does not endorse it" framing; the fix in PlatformCacheRepository.cs
    // (MapToDistributedCacheEntryOptions honouring PlatformCacheEntryOptions.NeverExpire) leaves THIS outcome
    // unchanged by design - only the framing was wrong, never the behavior itself.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-095")]
    public async Task SetAsync_WithExplicitNullAbsoluteExpirationButNoNeverExpireFlag_FallsBackToSettingsDefaultByDesign()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("explicit-null-absolute-expiration");

        await harness.Repository.SetAsync(
            cacheKey,
            "value",
            cacheOptions: new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = null, UnusedExpirationInSeconds = 17 });

        var capturedOptions = harness.DistributedCache.GetCapturedOptions(cacheKey.ToString());

        capturedOptions.Should().NotBeNull();

        // A bare null field with NeverExpire left false means "no override supplied" and MUST keep falling back
        // to the settings default - only PlatformCacheEntryOptions.NeverExpireOptions() (TC-PLATREPO-096) bypasses it.
        capturedOptions!.AbsoluteExpirationRelativeToNow
            .Should()
            .Be(
                harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow(),
                "a bare null field without NeverExpire intentionally means 'no override supplied', which falls back to the settings default - not 'no expiration'");
        capturedOptions.SlidingExpiration.Should().Be(TimeSpan.FromSeconds(17), "the sliding expiration itself IS honoured correctly - only the absolute side falls back to default");
    }

    // TC-PLATREPO-096: PlatformCacheEntryOptions.NeverExpireOptions() is the ONLY supported way to explicitly
    // request no expiration - proven independently of the internal global-keys registry (TC-PLATREPO-093) so any
    // future caller of the public API gets the same guarantee. BOTH halves of the harness's settings default are
    // deliberately non-null (86400s absolute, CachingTestFactory.DefaultUnusedExpirationInSeconds sliding), so a
    // regression that re-applies the fallback on EITHER axis surfaces as a NON-null value here. The sliding half
    // used to be vacuous: the settings sliding default was null too, so the never-expire branch and the fallback
    // branch produced the identical `null` and the assertion could not fail.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-096")]
    public async Task SetAsync_WithNeverExpireOptions_WritesNoExpirationToTheStore()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("never-expire-options");

        await harness.Repository.SetAsync(cacheKey, "value", cacheOptions: PlatformCacheEntryOptions.NeverExpireOptions());

        var capturedOptions = harness.DistributedCache.GetCapturedOptions(cacheKey.ToString());

        // Preconditions that make BOTH assertions below capable of failing: if either settings default were
        // itself null, the never-expire branch and the settings-default fallback would be indistinguishable.
        harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow().Should().NotBeNull();
        harness.CacheSettings.DefaultCacheEntryOptions.SlidingExpiration().Should().NotBeNull();

        capturedOptions.Should().NotBeNull();
        capturedOptions!.AbsoluteExpirationRelativeToNow
            .Should()
            .BeNull("NeverExpireOptions() must bypass the settings-default fallback entirely, not just leave the field unset");
        capturedOptions.SlidingExpiration
            .Should()
            .BeNull("NeverExpireOptions() must bypass the settings-default fallback on the SLIDING axis too - a non-null settings sliding default must not reach the store");
    }

    // TC-PLATREPO-092: A null cacheOptions falls back to the settings default on the WRITE side, not only when selected.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-092")]
    public async Task SetAsync_WithNullCacheOptions_WritesTheSettingsDefaultExpirationToTheStore()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("default-expiration");

        await harness.Repository.SetAsync(cacheKey, "value", cacheOptions: null);

        var capturedOptions = harness.DistributedCache.GetCapturedOptions(cacheKey.ToString());

        capturedOptions.Should().NotBeNull();
        capturedOptions!.AbsoluteExpirationRelativeToNow
            .Should()
            .Be(
                harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow(),
                "a null cacheOptions must fall back to CacheSettings.DefaultCacheEntryOptions on the WRITE side (H2) - every other test in this " +
                "file passes cacheOptions: null, so this is the only assertion that observes the fallback branch's OUTPUT rather than merely executing it");
    }

    // TC-PLATREPO-093: FIXED - the global-keys registry entry is now written via
    // PlatformCacheEntryOptions.NeverExpireOptions() (PlatformCacheRepository.cs:SetGlobalCachedKeysAsync), which
    // MapToDistributedCacheEntryOptions recognises (NeverExpire == true) and maps to BOTH
    // AbsoluteExpirationRelativeToNow == null AND SlidingExpiration == null - i.e. no expiration reaches the store
    // at all, matching the documented "never expire" intent for this registry.
    // <br />
    // Previously this was a DISCOVERED SOURCE DEFECT (found while closing H2, beyond its originally recorded
    // scope): the registry entry was constructed with AbsoluteExpirationInSeconds = null / UnusedExpirationInSeconds
    // = null, but MapToDistributedCacheEntryOptions collapsed that null-valued fallback through the SAME
    // "?? CacheSettings.Default..." branch used for "no override supplied", so the EXPLICIT "no expiration" was
    // indistinguishable from "no override" and silently received the 24h settings default instead. Since absolute
    // expiration is NOT renewed by access, the registry would hard-expire after that window and tag/collection
    // invalidation could no longer find the keys it tracked. See TC-PLATREPO-096 for the general-purpose proof of
    // PlatformCacheEntryOptions.NeverExpireOptions().
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-093")]
    public async Task GlobalKeysRegistryEntry_IntendedToNeverExpire_ReceivesNoExpiration()
    {
        using var harness = CacheRepositoryHarness.Create();

        // Any SetAsync triggers UpdateGlobalCachedKeys, which (re)writes the global-keys registry entry.
        await harness.Repository.SetAsync(CacheRepositoryHarness.Key("triggers-global-keys-write"), "value", cacheOptions: null);

        var globalKeysCacheKey = harness.Repository.GetGlobalAllRequestCachedKeysCacheKey();
        var capturedOptions = harness.DistributedCache.GetCapturedOptions(globalKeysCacheKey.ToString());

        capturedOptions.Should().NotBeNull("precondition: the global-keys registry entry was written");

        // Preconditions that make BOTH assertions below capable of failing: a settings default of null on either
        // axis would make the never-expire branch and the fallback branch produce the identical `null`. The
        // sliding axis was exactly that vacuous until the harness gained a non-null sliding default.
        harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow().Should().NotBeNull();
        harness.CacheSettings.DefaultCacheEntryOptions.SlidingExpiration().Should().NotBeNull();

        // The registry entry must never expire - NeverExpireOptions() must bypass the settings-default fallback
        // for BOTH the absolute side (the specific defect this TC pins) and the sliding side. The sliding side is
        // not incidental: absolute expiration is not renewed by access, but a SLIDING expiration on a low-traffic
        // service expires the registry between reads, which is the same loss of tag/collection invalidation.
        capturedOptions!.AbsoluteExpirationRelativeToNow
            .Should()
            .BeNull("the global-keys registry write must receive no absolute expiration, matching the documented never-expire intent");
        capturedOptions.SlidingExpiration
            .Should()
            .BeNull("the global-keys registry write must receive no sliding expiration either, even when the application configures a non-null sliding default");
    }

    // TC-PLATREPO-094: An empty (zero-length) payload takes a THIRD path, distinct from corrupt (evict, TC-013)
    // and the 0x03 guard (no evict, TC-014).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-094")]
    public async Task GetAsync_WhenPayloadIsZeroLength_ReturnsDefaultWithoutEvicting()
    {
        using var harness = CacheRepositoryHarness.Create();

        var cacheKey = CacheRepositoryHarness.Key("empty-payload");

        harness.DistributedCache.SetRawBytes(cacheKey.ToString(), []);

        var read = await harness.Repository.GetAsync<string>(cacheKey);

        read.Should().BeNull();

        // Distinct from TC-PLATREPO-013: a zero-length payload short-circuits to `default` BEFORE the
        // deserialize try/catch even runs, so nothing throws and the entry is deliberately left in place.
        harness.DistributedCache.ContainsKey(cacheKey.ToString()).Should().BeTrue();
    }

    // TC-PLATREPO-098: MapToHybridCacheEntryOptions honours NeverExpire with an OVERFLOW-SAFE stand-in duration.
    // This is the hybrid twin of TC-PLATREPO-096, and it is asserted through the mapper directly because the only
    // production consumer (PlatformHybridCacheRepository) hands the result straight to a real HybridCache, which
    // swallows it into its own expiry engine - nothing observable comes back.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-098")]
    public void MapToHybridCacheEntryOptions_WithNeverExpireOptions_UsesTheOverflowSafeNeverExpireDuration()
    {
        using var harness = CacheRepositoryHarness.Create();

        var mapped = harness.Repository.MapToHybridCacheEntryOptionsForTest(PlatformCacheEntryOptions.NeverExpireOptions());

        mapped.Should().NotBeNull();

        // The documented stand-in for "no expiration": 100 years. Stated here as an INDEPENDENT literal rather
        // than by reading the source constant, so redefining that constant fails this test instead of silently
        // redefining what "never expire" means for the global-keys registry.
        mapped.Expiration.Should().Be(TimeSpan.FromDays(365 * 100));

        // Deleting the NeverExpire branch would fall through to the settings default (24h) - byte for byte the
        // defect TC-PLATREPO-093 documents as previously shipped. HybridCacheEntryOptions.Expiration is a
        // TimeSpan? with NO infinite sentinel: a null there means "use the library's own configured default",
        // never "no expiration", so the branch cannot be replaced by a null either.
        mapped.Expiration.Should().NotBeNull("a null Expiration means 'use HybridCache's own default', not 'never expire'");
        harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationInSeconds
            .Should()
            .Be(PlatformCacheEntryOptions.DefaultExpirationInSeconds, "precondition: the settings default is the 24h value the deleted branch would fall back to");
        mapped.Expiration
            .Should()
            .NotBe(
                TimeSpan.FromSeconds(PlatformCacheEntryOptions.DefaultExpirationInSeconds),
                "NeverExpire must bypass the settings-default fallback, not collapse into it");

        // Not TimeSpan.Zero - that entry would be expired the instant it was written.
        (mapped.Expiration!.Value > TimeSpan.Zero).Should().BeTrue("a zero duration would expire the registry immediately");

        // Not TimeSpan.MaxValue - the caching library adds this duration to a current-time instant, so it must
        // stay addable to "now" without overflowing.
        (DateTime.MaxValue - DateTime.UtcNow > mapped.Expiration!.Value)
            .Should()
            .BeTrue("the duration must remain addable to the current instant without overflowing, which TimeSpan.MaxValue would not");
    }

    // TC-PLATREPO-099: WITHOUT NeverExpire, the hybrid mapper carries the ABSOLUTE expiration (falling back to the
    // settings default) and never smuggles the sliding value into it - HybridCacheEntryOptions has no sliding concept.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-099")]
    public void MapToHybridCacheEntryOptions_WithoutNeverExpire_MapsTheAbsoluteExpirationAndFallsBackToTheSettingsDefault()
    {
        using var harness = CacheRepositoryHarness.Create();

        harness.Repository.MapToHybridCacheEntryOptionsForTest(new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 42 })
            .Expiration
            .Should()
            .Be(TimeSpan.FromSeconds(42), "a custom absolute expiration must reach the hybrid options");

        harness.Repository.MapToHybridCacheEntryOptionsForTest(null)
            .Expiration
            .Should()
            .Be(
                harness.CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow(),
                "a null options object must fall back to the settings default, not to null");

        harness.Repository
            .MapToHybridCacheEntryOptionsForTest(new PlatformCacheEntryOptions { AbsoluteExpirationInSeconds = 42, UnusedExpirationInSeconds = 17 })
            .Expiration
            .Should()
            .Be(TimeSpan.FromSeconds(42), "the sliding value must never be mapped into the hybrid Expiration - the absolute side governs");

        // Guards the branch CONDITION, not just its body: an ordinary options object must not receive the
        // never-expire stand-in duration.
        harness.Repository.MapToHybridCacheEntryOptionsForTest(new PlatformCacheEntryOptions())
            .Expiration
            .Should()
            .NotBe(TimeSpan.FromDays(365 * 100), "only PlatformCacheEntryOptions.NeverExpire may select the never-expire duration");
    }

    /// <summary>Payload with a collection member so serialization is genuinely exercised.</summary>
    public sealed class TestCachedPayload
    {
        public TestCachedPayload()
        {
        }

        public TestCachedPayload(string name, int count, List<int> numbers)
        {
            Name = name;
            Count = count;
            Numbers = numbers;
        }

        public string Name { get; set; } = string.Empty;

        public int Count { get; set; }

        public List<int> Numbers { get; set; } = [];
    }

    /// <summary>Owns one isolated repository + its backing store, so every test is independent.</summary>
    private sealed class CacheRepositoryHarness : IDisposable
    {
        private readonly ServiceProvider serviceProvider;

        private CacheRepositoryHarness(
            ServiceProvider serviceProvider,
            InMemoryTestDistributedCache distributedCache,
            PlatformCacheSettings cacheSettings,
            TestCacheRepositoryBase repository)
        {
            this.serviceProvider = serviceProvider;
            DistributedCache = distributedCache;
            CacheSettings = cacheSettings;
            Repository = repository;
        }

        public InMemoryTestDistributedCache DistributedCache { get; }

        public PlatformCacheSettings CacheSettings { get; }

        public TestCacheRepositoryBase Repository { get; }

        public void Dispose()
        {
            Repository.Dispose();
            serviceProvider.Dispose();
        }

        public static CacheRepositoryHarness Create(Action<IServiceCollection>? configure = null)
        {
            return Build(
                configure,
                (serviceProvider, cacheSettings, distributedCache) =>
                    CachingTestFactory.CreateDistributedRepository(serviceProvider, cacheSettings, distributedCache));
        }

        public static CacheRepositoryHarness CreateWithThrowingRead()
        {
            return Build(
                null,
                (serviceProvider, cacheSettings, distributedCache) => CachingTestFactory.CreateTestRepository<TestThrowingGetCacheRepository>(
                    serviceProvider,
                    static (sp, lf, cs, ctx, dc) => new TestThrowingGetCacheRepository(sp, lf, cs, ctx, dc),
                    cacheSettings,
                    distributedCache));
        }

        /// <summary>Builds a key inside this suite's own collection so nothing collides with other suites.</summary>
        public static PlatformCacheKey Key(string requestKey)
        {
            return new PlatformCacheKey(CachingTestFactory.TestApplicationName, "unit-test-collection", requestKey);
        }

        private static CacheRepositoryHarness Build(
            Action<IServiceCollection>? configure,
            Func<IServiceProvider, PlatformCacheSettings, InMemoryTestDistributedCache, TestCacheRepositoryBase> repositoryFactory)
        {
            var distributedCache = new InMemoryTestDistributedCache();
            var cacheSettings = CachingTestFactory.BuildCacheSettings();
            var serviceProvider = CachingTestFactory.BuildServiceProvider(configure);

            return new CacheRepositoryHarness(
                serviceProvider,
                distributedCache,
                cacheSettings,
                repositoryFactory(serviceProvider, cacheSettings, distributedCache));
        }
    }
}
