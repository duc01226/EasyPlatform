using Easy.Platform.Infrastructures.Caching;
using Easy.Platform.Tests.Unit.Base;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Infrastructures.Caching;

/// <summary>
/// Behavioral unit tests for <see cref="PlatformCacheKey" />.
/// <para>
/// Source under test: <c>src/Platform/Easy.Platform/Infrastructures/Caching/PlatformCacheKey.cs</c>.
/// This readonly struct is the KEY TYPE every cache repository is parameterised by, so its escaping,
/// equality and round-trip behavior are load-bearing for the whole caching stack.
/// </para>
/// <para>Traceability: TECHNICAL-ONLY ids <c>TC-PLATREPO-060..069</c> (key shape, escaping, equality) and
/// <c>TC-PLATREPO-080..089</c> (key parsing / round-trip).</para>
/// </summary>
public class PlatformCacheKeyTests : PlatformUnitTestBase
{
    /// <summary>
    /// Logically DIFFERENT request-key part arrays that must never collapse into the same cache-key string.
    /// Each row is a pair of part arrays plus the reason the pair is adversarial.
    /// </summary>
    public static TheoryData<string[], string[], string> DistinctRequestKeyPartArrays()
    {
        return new TheoryData<string[], string[], string>
        {
            { ["a", "b"], ["ab"], "part boundary must survive concatenation" },
            { ["a", "b"], ["a-+-b"], "a part containing the parts separator must not merge with a real split" },
            { ["a"], ["a", ""], "an extra empty part is still a different logical key" },
            { ["", "a"], ["a", ""], "part ORDER is significant" },
            { ["a"], [null], "an ordinary part must not equal a null part, which renders as the null sentinel" },
            {
                [PlatformCacheKey.NullValue], [null],
                "a part whose LITERAL value is the null sentinel must not collide with a real null part"
            },
            {
                [PlatformCacheKey.RequestKeyPartEscapedNullValue], [PlatformCacheKey.NullValue],
                "the escape sequence for the null sentinel must not collide with the sentinel it escapes"
            },
            {
                [PlatformCacheKey.RequestKeyPartEscapeMarker], [PlatformCacheKey.RequestKeyPartEscapedEscapeMarker],
                "the escape marker must self-escape, so one marker never renders like two"
            },
            { ["user1", "tenant2"], ["user1-+-tenant2"], "realistic composite key vs a pre-joined string" },
            { ["a", "b", "c"], ["a", "b"], "arity difference must survive" },
            {
                ["a", "b"], ["a)-+-(b"],
                "M1: a part containing the wrapped-and-joined shape )-+-( must not merge with a real two-part split"
            },
            {
                ["", ""], [")-+-("],
                "M1: a part that IS exactly the wrapped-and-joined collision substring must not collide with two empty parts"
            }
        };
    }

    // TC-PLATREPO-060: The escaping/format constants are part of the persisted key shape and must not drift.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-060")]
    public void Constants_HaveTheExactValuesThePersistedKeyShapeDependsOn()
    {
        // A change to any of these silently invalidates every key already stored in a distributed cache.
        PlatformCacheKey.RequestKeySeparator.Should().Be("---:");
        PlatformCacheKey.RequestKeySeparatorAutoValidReplaced.Should().Be("_");
        PlatformCacheKey.SpecialDistributedCacheKeyFolderSeparator.Should().Be(":");
        PlatformCacheKey.SpecialDistributedCacheKeyFolderSeparatorAutoValidReplaced.Should().Be("=");
        PlatformCacheKey.RequestKeyPartsSeparator.Should().Be("-+-");
        PlatformCacheKey.RequestKeyPartsPrefix.Should().Be("(");
        PlatformCacheKey.RequestKeyPartsSuffix.Should().Be(")");
        PlatformCacheKey.NullValue.Should().Be("(NULL)");
        PlatformCacheKey.DefaultContext.Should().Be("__DefaultGlobalCacheContext__");
        PlatformCacheKey.DefaultCollection.Should().Be("All");
        PlatformCacheKey.DefaultRequestKey.Should().Be("All");

        // v2 escaping constants. Changing any of these IS a key-encoding change and REQUIRES a version bump.
        PlatformCacheKey.RequestKeyPartEscapeMarker.Should().Be("~");
        PlatformCacheKey.RequestKeyPartEscapedEscapeMarker.Should().Be("~~");
        PlatformCacheKey.RequestKeyPartEscapedNullValue.Should().Be("~N");
        PlatformCacheKey.RequestKeyPartEscapedPartsSeparator.Should().Be("~S");
        PlatformCacheKey.RequestKeyPartEscapedFolderSeparator.Should().Be("~C");

        // Every escape's second character must be DISTINCT, otherwise DecodeRequestKeyPartValue - which dispatches on
        // exactly that character - would map two different escapes onto one branch and silently decode one as the other.
        new[]
            {
                PlatformCacheKey.RequestKeyPartEscapedEscapeMarker,
                PlatformCacheKey.RequestKeyPartEscapedNullValue,
                PlatformCacheKey.RequestKeyPartEscapedPartsSeparator,
                PlatformCacheKey.RequestKeyPartEscapedFolderSeparator
            }
            .Select(escape => escape[1])
            .Should()
            .OnlyHaveUniqueItems("the decoder dispatches on the escape's second character, so a duplicate silently aliases two escapes");

        // The encoding version itself. It is what makes an encoding change safe to deploy.
        PlatformCacheKey.KeyEncodingVersion.Should().Be("v2");
        PlatformCacheKey.KeyEncodingVersionSeparator.Should().Be("|");
        PlatformCacheKey.KeyEncodingVersionPrefix.Should().Be("v2|");

        // The version separator MUST NOT be the segment separator, otherwise the version would add a fourth
        // segment and FromFullCacheKeyString could no longer recover the triple by position.
        PlatformCacheKey.KeyEncodingVersionSeparator.Should().NotBe(PlatformCacheKey.RequestKeySeparator);
    }

    // TC-PLATREPO-061: Constructors fill the Context/Collection/RequestKey triple with the documented defaults.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-061")]
    public void Constructors_FillTheTripleWithDocumentedDefaults()
    {
        var requestKeyOnly = new PlatformCacheKey("req");

        requestKeyOnly.Context.Should().Be(PlatformCacheKey.DefaultContext);
        requestKeyOnly.Collection.Should().Be(PlatformCacheKey.DefaultCollection);
        requestKeyOnly.RequestKey.Should().Be("req");

        var collectionAndRequestKey = new PlatformCacheKey("coll", "req");

        collectionAndRequestKey.Context.Should().Be(PlatformCacheKey.DefaultContext);
        collectionAndRequestKey.Collection.Should().Be("coll");
        collectionAndRequestKey.RequestKey.Should().Be("req");

        var full = new PlatformCacheKey("ctx", "coll", "req");

        full.Context.Should().Be("ctx");
        full.Collection.Should().Be("coll");
        full.RequestKey.Should().Be("req");

        // An EMPTY parts array falls back to the default request key rather than producing an empty key.
        new PlatformCacheKey([]).RequestKey.Should().Be(PlatformCacheKey.DefaultRequestKey);
    }

    // TC-PLATREPO-062: ToString is the canonical "v2|{Context}---:{Collection}---:{RequestKey}" wire format.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-062")]
    public void ToString_ProducesTheCanonicalThreePartWireFormat()
    {
        var cacheKey = new PlatformCacheKey("ctx", "coll", "req");

        cacheKey.ToString().Should().Be("v2|ctx---:coll---:req");

        // The version stamp is a PREFIX, not a segment: the triple is still recoverable by position.
        cacheKey.ToString().Split(PlatformCacheKey.RequestKeySeparator).Should().HaveCount(3);

        // Implicit string conversion is exactly ToString - repositories rely on this for IDistributedCache keys.
        string implicitlyConverted = cacheKey;

        implicitlyConverted.Should().Be(cacheKey.ToString());
    }

    // TC-PLATREPO-063: Equality is value-based, and GetHashCode is consistent with it.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-063")]
    public void Equality_IsValueBased_AndGetHashCodeIsConsistentWithIt()
    {
        var left = new PlatformCacheKey("ctx", "coll", "req");
        var right = new PlatformCacheKey("ctx", "coll", "req");
        var different = new PlatformCacheKey("ctx", "coll", "other-req");

        left.Equals(right).Should().BeTrue();
        (left == right).Should().BeTrue();
        (left != right).Should().BeFalse();
        left.GetHashCode().Should().Be(right.GetHashCode(), "equal keys MUST share a hash code or dictionary lookups break");

        left.Equals(different).Should().BeFalse();
        (left != different).Should().BeTrue();

        // Boxed equality path.
        left.Equals((object)right).Should().BeTrue();
        left.Equals((object)"not a cache key").Should().BeFalse();
        left.Equals((object)null).Should().BeFalse("a null boxed argument must fail the 'is PlatformCacheKey' pattern match, never throw");

        // Usable as a dictionary key - the actual reason equality exists (see LoadGlobalAllRequestCachedKeys).
        var byKey = new Dictionary<PlatformCacheKey, int> { [left] = 1 };

        byKey.ContainsKey(right).Should().BeTrue();
        byKey.ContainsKey(different).Should().BeFalse();
    }

    // TC-PLATREPO-064: Logically DIFFERENT request-key part arrays never collide into one cache-key string.
    [Theory]
    [Trait("TechnicalSpec", "TC-PLATREPO-064")]
    [MemberData(nameof(DistinctRequestKeyPartArrays))]
    public void DistinctRequestKeyPartArrays_NeverCollideIntoTheSameCacheKeyString(
        string[] leftParts,
        string[] rightParts,
        string because)
    {
        var leftKey = new PlatformCacheKey("ctx", "coll", leftParts);
        var rightKey = new PlatformCacheKey("ctx", "coll", rightParts);

        leftKey.ToString().Should().NotBe(rightKey.ToString(), because);
        leftKey.Should().NotBe(rightKey, because);
    }

    // TC-PLATREPO-065: BOUNDARY COUNTER-CASE - the escaping is REPLACEMENT based, therefore LOSSY.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-065")]
    public void SeparatorEscaping_IsLossyReplacement_SoTwoDistinctLogicalKeysDoCollide()
    {
        // This pins ACTUAL source behavior, it does not endorse it. AutoFixKeyPartValue REPLACES
        // the separators instead of escaping them reversibly, so the mapping is not injective:
        //   "a---:b" -> "a_b"   and   "a_b" -> "a_b"
        //   "a:b"    -> "a=b"   and   "a=b" -> "a=b"
        // Any caller feeding user-controlled text straight into a request key can therefore make two
        // DIFFERENT logical keys share one cache entry. Reported as a source-design finding.
        //
        // SCOPE - this is the AutoFixKeyPartValue path: Context, Collection, and a request key supplied as one
        // pre-built string (the ctor used below). It is NOT the request-key-PARTS path: BuildRequestKey escapes the
        // colon (see TC-PLATREPO-083) and IS injective, so the equivalent parts-based pair does NOT collide. That
        // asymmetry is deliberate and is asserted at the end of this test so the two paths cannot silently converge.
        var fromSeparator = new PlatformCacheKey("a---:b");
        var fromReplacement = new PlatformCacheKey("a_b");

        fromSeparator.RequestKey.Should().Be("a_b");
        fromSeparator.Should().Be(fromReplacement);

        var fromFolderSeparator = new PlatformCacheKey("a:b");
        var fromFolderReplacement = new PlatformCacheKey("a=b");

        fromFolderSeparator.RequestKey.Should().Be("a=b");
        fromFolderSeparator.Should().Be(fromFolderReplacement);

        // The SAME two logical values on the request-key-PARTS path do NOT collide - that path escapes the colon.
        // If this ever starts failing, the two paths have converged and one of them changed encoding silently.
        new PlatformCacheKey("ctx", "coll", ["a:b"]).Should().NotBe(new PlatformCacheKey("ctx", "coll", ["a=b"]));
    }

    // TC-PLATREPO-066: Context and Collection are separator-sanitised so the 3-part split stays unambiguous.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-066")]
    public void ContextAndCollection_AreSanitisedSoTheThreePartSplitStaysUnambiguous()
    {
        var cacheKey = new PlatformCacheKey("ct---:x", "co:ll", "req");

        cacheKey.Context.Should().Be("ct_x");
        cacheKey.Collection.Should().Be("co=ll");

        // Exactly two separators remain, so FromFullCacheKeyString can always recover the triple.
        cacheKey.ToString().Split(PlatformCacheKey.RequestKeySeparator).Should().HaveCount(3);
    }

    // TC-PLATREPO-067: No constructor path can leave a raw RequestKeySeparator inside RequestKey.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-067")]
    public void NoConstructorPath_LeavesARawRequestKeySeparatorInsideTheRequestKey()
    {
        // Probed behavior, not assumption. BuildRequestKey never strips RequestKeySeparator ("---:")
        // explicitly - but it DOES escape the folder separator ":" to "~C", and ":" is the last
        // character of "---:", so "a---:b" is neutralised to "a---~Cb" as a side effect. The neutralisation
        // is what this test protects; that it now happens by ESCAPE rather than by the earlier lossy
        // replacement to "=" changes the rendered bytes, not the invariant - and unlike the replacement,
        // the original "a---:b" is now recoverable, which the round trip below asserts.
        var fromParts = new PlatformCacheKey("ctx", "coll", ["a---:b", "c"]);

        fromParts.RequestKey.Should().Be("(a---~Cb)-+-(c)");
        fromParts.RequestKey.Should().NotContain(PlatformCacheKey.RequestKeySeparator);
        fromParts.RequestKeyParts().Should().Equal("a---:b", "c");

        // The single-string path sanitises it directly via AutoFixKeyPartValue.
        new PlatformCacheKey("ctx", "coll", "a---:b").RequestKey.Should().NotContain(PlatformCacheKey.RequestKeySeparator);

        // Therefore the wire format always splits into EXACTLY three segments.
        fromParts.ToString().Split(PlatformCacheKey.RequestKeySeparator).Should().HaveCount(3);

        var roundTripped = PlatformCacheKey.FromFullCacheKeyString(fromParts.ToString());

        roundTripped.Should().Be(fromParts);
        roundTripped.Context.Should().Be("ctx");
        roundTripped.Collection.Should().Be("coll");
        roundTripped.RequestKey.Should().Be(fromParts.RequestKey);

        // Implicit string -> key conversion uses the very same parser.
        PlatformCacheKey implicitlyParsed = fromParts.ToString();

        implicitlyParsed.Should().Be(fromParts);
    }

    // TC-PLATREPO-080: The parser NORMALISES an over-segmented key instead of preserving it, and is idempotent.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-080")]
    public void FromFullCacheKeyString_NormalisesAnOverSegmentedKeyAndIsIdempotent()
    {
        // RequestKey has an `init` accessor, so an object initializer bypasses sanitisation. This is the
        // ONLY way to produce a key string with more than three segments (see TC-PLATREPO-067).
        var forcedKey = new PlatformCacheKey("ctx", "coll", "placeholder") { RequestKey = "a---:b---:c" };

        forcedKey.ToString().Split(PlatformCacheKey.RequestKeySeparator).Should().HaveCount(5);

        var parsed = PlatformCacheKey.FromFullCacheKeyString(forcedKey.ToString());

        parsed.Context.Should().Be("ctx");
        parsed.Collection.Should().Be("coll");

        // Probed behavior: the parser rejoins the tail with `Skip(2).JoinToString(RequestKeySeparator)`,
        // then hands the result to the 3-arg constructor, which AutoFixes it right back to "_".
        // So the rejoin does NOT preserve the original request key - it normalises it.
        parsed.RequestKey.Should().Be("a_b_c");
        parsed.Should().NotBe(forcedKey, "the parser normalises rather than round-trips an over-segmented key");

        // Normalisation is idempotent: parsing the normalised key again is a fixed point. This is what
        // makes the tag/global-key bookkeeping safe, since it parses stored key strings repeatedly.
        PlatformCacheKey.FromFullCacheKeyString(parsed.ToString()).Should().Be(parsed);
    }

    // TC-PLATREPO-068: BuildRequestKey / SplitRequestKeyParts / RequestKeyParts form a round trip.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-068")]
    public void BuildRequestKey_AndSplitRequestKeyParts_RoundTripTheParts()
    {
        var built = PlatformCacheKey.BuildRequestKey(["alpha", "beta"]);

        built.Should().Be("(alpha)-+-(beta)");
        PlatformCacheKey.SplitRequestKeyParts(built).Should().Equal("alpha", "beta");

        new PlatformCacheKey("ctx", "coll", ["alpha", "beta"]).RequestKeyParts().Should().Equal("alpha", "beta");

        // A null part renders as the documented NullValue token, wrapped by the part prefix/suffix, and comes back
        // OUT of the round trip as null - not as the literal sentinel text, which now only a real "(NULL)" yields.
        PlatformCacheKey.BuildRequestKey([null]).Should().Be("((NULL))");
        PlatformCacheKey.SplitRequestKeyParts("((NULL))").Should().ContainSingle().Which.Should().BeNull();

        // The folder separator is ESCAPED inside parts - not replaced. The rendered key still contains no ":" (a
        // distributed cache reads one as a folder boundary), but the colon survives the round trip as itself, so
        // "a:b" and "a=b" are no longer the same cache entry.
        PlatformCacheKey.BuildRequestKey(["a:b"]).Should().Be("(a~Cb)");
        PlatformCacheKey.BuildRequestKey(["a:b"]).Should().NotContain(PlatformCacheKey.SpecialDistributedCacheKeyFolderSeparator);
        PlatformCacheKey.SplitRequestKeyParts(PlatformCacheKey.BuildRequestKey(["a:b"])).Should().Equal("a:b");
        PlatformCacheKey.BuildRequestKey(["a:b"]).Should().NotBe(PlatformCacheKey.BuildRequestKey(["a=b"]));

        // An empty part survives the prefix/suffix stripping and the unescaping without breaking.
        PlatformCacheKey.BuildRequestKey([""]).Should().Be("()");
        PlatformCacheKey.SplitRequestKeyParts("()").Should().Equal("");

        var emptyPartsAct = () => PlatformCacheKey.BuildRequestKey([]);

        emptyPartsAct.Should().Throw<ArgumentException>().WithParameterName("requestKeyParts");
    }

    // TC-PLATREPO-081: The key encoding version is stamped on EVERY rendered key, so a key written by this encoding
    // can never be mistaken for a key written by the previous one - which is the whole deploy strategy: old entries
    // are not deleted, they simply stop matching and expire by their own TTL.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-081")]
    public void KeyEncodingVersion_IsStampedOnEveryRenderedKey_AndLegacyKeysStillParse()
    {
        var fromRequestKey = new PlatformCacheKey("req");
        var fromParts = new PlatformCacheKey("ctx", "coll", ["alpha", "beta"]);
        var tagKey = new PlatformCacheKey("app", "___PlatformGlobalCacheTags___", "some-tag");

        PlatformCacheKey[] everyRenderingPathSample = [fromRequestKey, fromParts, tagKey];

        // EVERY rendering path goes through ToString, so none of them can skip the version stamp.
        foreach (var cacheKey in everyRenderingPathSample)
        {
            cacheKey.ToString().Should().StartWith(PlatformCacheKey.KeyEncodingVersionPrefix);

            string implicitlyConverted = cacheKey;

            implicitlyConverted.Should().StartWith(PlatformCacheKey.KeyEncodingVersionPrefix);
        }

        // The v1 rendering of the SAME triple. A key stored under it can never be read back by this version.
        var legacyRenderedKey = $"ctx---:coll---:{fromParts.RequestKey}";

        fromParts.ToString().Should().NotBe(legacyRenderedKey, "old and new keys must coexist rather than overwrite");

        // A legacy key still PARSES (tag bookkeeping reads stored key strings), it is just re-rendered versioned.
        var parsedLegacy = PlatformCacheKey.FromFullCacheKeyString(legacyRenderedKey);

        parsedLegacy.Context.Should().Be("ctx");
        parsedLegacy.Collection.Should().Be("coll");
        parsedLegacy.Should().Be(fromParts);
        parsedLegacy.ToString().Should().Be(fromParts.ToString());

        // The version prefix is stripped exactly ONCE, so a Context that itself starts with it round-trips.
        var contextStartingWithThePrefix = new PlatformCacheKey($"{PlatformCacheKey.KeyEncodingVersionPrefix}ctx", "coll", "req");

        PlatformCacheKey.FromFullCacheKeyString(contextStartingWithThePrefix.ToString())
            .Context.Should()
            .Be($"{PlatformCacheKey.KeyEncodingVersionPrefix}ctx");

        // Tags are NOT versioned - they are built from Context/Collection only, so tag-based invalidation is
        // unaffected by a version bump.
        PlatformCacheKey.BuildCacheKeyContextTag(fromParts.Context).Should().NotContain(PlatformCacheKey.KeyEncodingVersionPrefix);
    }

    // TC-PLATREPO-082: THE DEFECT. A null part and a part whose LITERAL value is the null sentinel used to render
    // identically and therefore shared one cache entry. They must now render differently AND round-trip exactly.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-082")]
    public void ANullPart_AndALiteralNullSentinelPart_NoLongerCollide_AndBothRoundTripExactly()
    {
        var fromNullPart = PlatformCacheKey.BuildRequestKey([null]);
        var fromLiteralSentinelPart = PlatformCacheKey.BuildRequestKey([PlatformCacheKey.NullValue]);

        fromNullPart.Should().Be("((NULL))");
        fromLiteralSentinelPart.Should().Be("(~N)");
        fromLiteralSentinelPart.Should().NotBe(fromNullPart, "the two logical keys MUST NOT share a cache entry");

        // ... and the collision is gone at the FULL key level too, not just in the request-key fragment.
        new PlatformCacheKey("ctx", "coll", [null])
            .Should()
            .NotBe(new PlatformCacheKey("ctx", "coll", [PlatformCacheKey.NullValue]));

        // The escaping is reversible, so telling the two apart did not cost the ability to read parts back.
        PlatformCacheKey.SplitRequestKeyParts(fromNullPart).Should().ContainSingle().Which.Should().BeNull();
        PlatformCacheKey.SplitRequestKeyParts(fromLiteralSentinelPart).Should().Equal(PlatformCacheKey.NullValue);

        // Adversarial part values: the escape marker itself, escape sequences that look like output of the encoder,
        // the sentinel embedded mid-part, and the empty string. Every one must survive Build -> Split unchanged.
        string[] adversarialParts =
        [
            "",
            "plain",
            PlatformCacheKey.NullValue,
            PlatformCacheKey.RequestKeyPartEscapeMarker,
            PlatformCacheKey.RequestKeyPartEscapedEscapeMarker,
            PlatformCacheKey.RequestKeyPartEscapedNullValue,
            $"{PlatformCacheKey.RequestKeyPartEscapeMarker}{PlatformCacheKey.NullValue}",
            $"{PlatformCacheKey.NullValue}{PlatformCacheKey.RequestKeyPartEscapeMarker}",
            $"{PlatformCacheKey.NullValue}{PlatformCacheKey.NullValue}",
            $"x{PlatformCacheKey.NullValue}y",
            null
        ];

        PlatformCacheKey.SplitRequestKeyParts(PlatformCacheKey.BuildRequestKey(adversarialParts))
            .Should()
            .Equal(adversarialParts);

        // Encode is INJECTIVE over those parts: no two of them render the same, so no two can collide in the cache.
        adversarialParts.Select(PlatformCacheKey.EncodeRequestKeyPartValue)
            .Should()
            .OnlyHaveUniqueItems("a collision here is a shared cache entry between two different logical keys");

        // A part carrying the literal parts separator now ALSO round-trips exactly (M1 fix) - it stays distinct
        // from a real two-part split AND recovers as the single original part it was built from, not a lossy
        // pin of a stray "-+-" left un-escaped inside the wrapping parens.
        var fromPartContainingTheSeparator = PlatformCacheKey.BuildRequestKey(["a-+-b"]);

        fromPartContainingTheSeparator.Should().Be($"(a{PlatformCacheKey.RequestKeyPartEscapedPartsSeparator}b)");
        fromPartContainingTheSeparator.Should().NotBe(PlatformCacheKey.BuildRequestKey(["a", "b"]));
        PlatformCacheKey.SplitRequestKeyParts(fromPartContainingTheSeparator).Should().Equal("a-+-b");
    }

    // TC-PLATREPO-083: FIXED (M1). The parts separator "-+-" is now escaped inside a part's own content, so
    // BuildRequestKey is injective across a part boundary vs a part that merely LOOKS like one, even when the
    // literal text also contains the wrapper characters "(" / ")".
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-083")]
    public void PartsSeparatorInsideAPart_IsEscaped_SoAPartThatLooksLikeAJoinedPairNoLongerCollidesWithTheRealPair()
    {
        // Probed behavior, not assumption. EncodeRequestKeyPartValue (v2) now escapes every literal occurrence of
        // RequestKeyPartsSeparator ("-+-") BEFORE BuildRequestKey wraps/joins the parts, so the separator can only
        // ever appear, unescaped, at a genuine join point. A single part whose literal text contains the
        // wrapped-and-joined shape ")-+-(" - the exact defect this test used to pin (M1, TC-PLATREPO-083 before
        // this fix) - therefore no longer renders like the real two-part pair.
        var fromTwoRealParts = PlatformCacheKey.BuildRequestKey(["a", "b"]);
        var fromOnePartThatLooksLikeTwo = PlatformCacheKey.BuildRequestKey(["a)-+-(b"]);

        fromTwoRealParts.Should().Be("(a)-+-(b)");
        fromOnePartThatLooksLikeTwo.Should().Be($"(a){PlatformCacheKey.RequestKeyPartEscapedPartsSeparator}(b)");
        fromOnePartThatLooksLikeTwo.Should()
            .NotBe(fromTwoRealParts, "the parts separator inside a part's own content is now escaped, so it can never be confused with a genuine part boundary");

        // The round trip is now exact for this input: splitting the merged string recovers exactly ONE part -
        // the original ")-+-(" -carrying text - instead of the two real parts it used to be indistinguishable from.
        PlatformCacheKey.SplitRequestKeyParts(fromOnePartThatLooksLikeTwo).Should().ContainSingle().Which.Should().Be("a)-+-(b");

        // A part that literally IS the wrapped-and-joined collision substring, standalone, also round-trips and
        // stays distinct from the real two-part split it would otherwise be confused with.
        var fromCollisionSubstringAlone = PlatformCacheKey.BuildRequestKey([")-+-("]);

        PlatformCacheKey.SplitRequestKeyParts(fromCollisionSubstringAlone).Should().ContainSingle().Which.Should().Be(")-+-(");
        fromCollisionSubstringAlone.Should().NotBe(PlatformCacheKey.BuildRequestKey(["", ""]));
    }

    // TC-PLATREPO-083: Empirical injectivity/round-trip proof over an exhaustive short-string alphabet plus the
    // specific adversarial cases the M1 fix must close, mirroring how the null-sentinel escape (TC-PLATREPO-082)
    // was proven. Every case must Build -> Split back to the exact original, and no two distinct part values may
    // render to the same encoded string (that would be a shared cache entry between two different logical keys).
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-083")]
    public void EncodeRequestKeyPartValue_IsInjectiveAndExactlyRoundTrips_OverAnExhaustiveAdversarialAlphabet()
    {
        // The alphabet covers: the escape marker "~", the wrapper "(" / ")", both characters of the separator
        // "-+-", an ordinary letter "a", "N" (the second character of the null-escape "~N" and of NullValue
        // itself), the folder separator ":" and its FORMER replacement "=" (the pair that used to collide), and "C"
        // (the second character of the folder-separator escape "~C"). The escape-suffix letters "N" and "C" are in
        // here on purpose: they make the product generate inputs that already LOOK like an escape sequence - "~N",
        // "~C", "~~C" - which is the case that breaks an encoder whose self-escape does not run first.
        var alphabet = new[] { '~', '(', ')', '-', '+', 'a', 'N', ':', '=', 'C' };

        var exhaustiveShortStrings = Enumerable.Range(0, 4)
            .SelectMany(length => CartesianProduct(alphabet, length))
            .Select(chars => new string(chars))
            .ToArray();

        var targetedAdversarialParts = new[]
        {
            ")-+-(", // the exact M1 collision substring
            "a)-+-(b", // the collision substring embedded mid-part
            "-+-", // a part that IS exactly the separator
            "-+--+-", // doubled separator, back-to-back
            "-+-+-", // overlapping-looking separator repetition
            "a:b", // the folder-separator collision pair: this...
            "a=b", // ...and this rendered identically before the ":" escape existed
            "{\"UserId\":\"u1\",\"CompanyIds\":[\"c1\"]}", // serialized JSON - the real production shape that carries colons
            "", // empty string
            null // a real null part
        };

        var allParts = exhaustiveShortStrings.Concat(targetedAdversarialParts).Distinct().ToArray();

        // Round trip: every part, encoded alone then split back out, must recover byte-for-byte / null-for-null.
        foreach (var part in allParts)
        {
            var built = PlatformCacheKey.BuildRequestKey([part]);
            var recovered = PlatformCacheKey.SplitRequestKeyParts(built).Single();

            recovered.Should().Be(part, $"BuildRequestKey -> SplitRequestKeyParts must be an exact inverse for part {part ?? "<null>"}");
        }

        // Injectivity: no two DISTINCT part values may render to the same encoded string.
        var groupedByEncoding = allParts
            .Select(part => PlatformCacheKey.EncodeRequestKeyPartValue(part))
            .GroupBy(encoded => encoded)
            .Where(group => group.Count() > 1)
            .ToList();

        groupedByEncoding.Should().BeEmpty("a collision here means two different logical request-key parts would share one cache entry");

        // Multi-part injectivity for the headline defect: a single part that spells out a real two-part join must
        // never render like the actual two-part array it merely looks like.
        PlatformCacheKey.BuildRequestKey(["a)-+-(b"]).Should().NotBe(PlatformCacheKey.BuildRequestKey(["a", "b"]));
        PlatformCacheKey.BuildRequestKey([")-+-("]).Should().NotBe(PlatformCacheKey.BuildRequestKey(["", ""]));
        PlatformCacheKey.BuildRequestKey(["a", ")-+-(", "b"]).Should().NotBe(PlatformCacheKey.BuildRequestKey(["a", "", "", "b"]));
    }

    /// <summary>
    /// All strings of the given exact length drawn from <paramref name="alphabet" />, as an exhaustive Cartesian
    /// product. Length 0 yields a single empty combination.
    /// </summary>
    private static IEnumerable<char[]> CartesianProduct(char[] alphabet, int length)
    {
        if (length == 0)
        {
            yield return [];

            yield break;
        }

        foreach (var rest in CartesianProduct(alphabet, length - 1))
        {
            foreach (var c in alphabet)
                yield return rest.Append(c).ToArray();
        }
    }

    // TC-PLATREPO-084: RequestKeyParts() has no way to know whether its RequestKey was ever built from parts.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-084")]
    public void RequestKeyParts_OnAKeyNeverBuiltFromParts_SilentlyCorruptsOrThrows()
    {
        // Reported as a source-design finding (M2). SplitRequestKeyParts assumes every input was wrapped by
        // BuildRequestKey; a plain (non-parts) request key was never wrapped, so the unguarded
        // prefix/suffix-stripping Substring just chops real characters off instead of failing loudly - "req"
        // silently becomes a single part "e" (the middle character), not an error.
        new PlatformCacheKey("req").RequestKeyParts().Should().Equal("e");

        // A RequestKey too short for the prefix+suffix stripping to produce a non-negative length throws
        // instead of silently corrupting - a second, differently-shaped failure mode on the same boundary.
        var tooShortAct = () => new PlatformCacheKey("x").RequestKeyParts();

        tooShortAct.Should().Throw<ArgumentOutOfRangeException>("a 1-character key is too short for prefix+suffix stripping to produce a valid substring");
    }

    // TC-PLATREPO-069: Tag combination always appends the context tag AND the context+collection tag.
    [Fact]
    [Trait("TechnicalSpec", "TC-PLATREPO-069")]
    public void CombineWithCacheKeyContextAndCollectionTag_AlwaysAppendsContextAndContextCollectionTags()
    {
        var cacheKey = new PlatformCacheKey("ctx", "coll", "req");

        var withNullTags = PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, null);

        withNullTags.Should().Equal("Context=ctx", "Context=ctx;Collection=coll");

        var withCustomTags = PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, ["custom-tag"]);

        withCustomTags.Should().Equal("custom-tag", "Context=ctx", "Context=ctx;Collection=coll");

        PlatformCacheKey.BuildCacheKeyContextTag("ctx").Should().Be("Context=ctx");
        PlatformCacheKey.BuildCacheKeyContextAndCollectionTag("ctx", "coll").Should().Be("Context=ctx;Collection=coll");
    }
}
