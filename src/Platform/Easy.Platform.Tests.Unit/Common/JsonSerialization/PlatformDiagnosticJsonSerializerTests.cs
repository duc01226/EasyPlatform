using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Easy.Platform.Common.JsonSerialization;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Common.JsonSerialization;

/// <summary>
/// Guards the diagnostic boundary that keeps opt-in sensitive members out of logs and traces
/// without changing normal transport or persistence serialization.
/// </summary>
public class PlatformDiagnosticJsonSerializerTests
{
    /// <summary>
    /// Ten collected inner types plus the truncation marker. Mirrors the serializer's private
    /// <c>MaxInnerExceptionEntries</c> deliberately: a test that read the production constant would pass for any
    /// value of it, including a regression to zero.
    /// </summary>
    private const int MaxInnerEntriesPlusMarker = 11;

    /// <summary>
    /// 256-char type-name budget plus the 12-char truncation marker. Mirrored rather than read from production, so
    /// a change to either constant fails this test instead of silently re-deriving its own expectation.
    /// </summary>
    private const int MaxTypeNameCharsPlusMarker = 256 + 12;

    [Fact]
    public void SerializeForDiagnostics_WhenPayloadContainsMarkedAndUnmarkedData_EmitsTypeOnly()
    {
        var sentinel = CreateSentinel();
        var model = new DiagnosticEnvelope
        {
            DisplayValue = "diagnostic-visible",
            Items = [new DiagnosticItem { SensitiveValue = sentinel, PublicValue = "public-visible" }]
        };

        var diagnosticJson = PlatformJsonSerializer.SerializeForDiagnostics(model, forceUseRuntimeType: true);

        ContainsAnySentinelRepresentation(diagnosticJson, sentinel).Should().BeFalse(
            "diagnostic serialization must not disclose raw, partial, encoded, or reversible forms");
        diagnosticJson.Contains("protectedValue", StringComparison.OrdinalIgnoreCase).Should().BeFalse(
            "omitting the marked property also avoids disclosing its schema name");
        diagnosticJson.Should().NotContain("diagnostic-visible");
        diagnosticJson.Should().NotContain("public-visible");
        diagnosticJson.Should().Contain(nameof(DiagnosticEnvelope));
    }

    [Fact]
    public void SerializeForDiagnostics_WhenDynamicContainerContainsUnclassifiedData_EmitsTypeOnly()
    {
        var sentinel = CreateSentinel();
        object model = new Dictionary<string, object?>
        {
            ["accessToken"] = sentinel,
            ["profile"] = new { Email = sentinel }
        };

        var diagnosticJson = PlatformJsonSerializer.SerializeForDiagnostics(model, forceUseRuntimeType: true);

        ContainsAnySentinelRepresentation(diagnosticJson, sentinel).Should().BeFalse();
        diagnosticJson.Should().NotContain("accessToken");
        diagnosticJson.Should().NotContain("Email");
        diagnosticJson.Should().Contain("Dictionary");
    }

    [Fact]
    public void SerializeForDiagnostics_WhenGetterAndConverterThrow_DoesNotTraversePayloadOrThrow()
    {
        var model = new HostileDiagnosticModel();

        var act = () => PlatformJsonSerializer.SerializeForDiagnostics(model, forceUseRuntimeType: true);

        act.Should().NotThrow(
            "diagnostics must not invoke caller-owned getters, converters, or application serializer configuration");
        act().Should().Contain(nameof(HostileDiagnosticModel));
    }

    [Fact]
    public void Serialize_WhenSensitiveMemberIsMarked_PreservesNormalRoundTripBehavior()
    {
        var sentinel = CreateSentinel();
        var model = new DiagnosticItem { SensitiveValue = sentinel, PublicValue = "public-visible" };

        var normalJson = PlatformJsonSerializer.Serialize(model);
        var roundTripped = PlatformJsonSerializer.Deserialize<DiagnosticItem>(normalJson);

        normalJson.Contains(sentinel, StringComparison.Ordinal).Should().BeTrue(
            "the custom marker must not change transport, model-binding, or persistence serialization");
        (roundTripped.SensitiveValue == sentinel).Should().BeTrue(
            "normal deserialization must still bind the marked member");
    }

    /// <summary>
    /// A diagnostic sink must never be the thing that breaks the operation it is observing. Null is not an edge
    /// case on this path: <c>PlatformBackgroundJobExecutor.Execute()</c> calls <c>Execute(null)</c>, so every
    /// parameterless recurring job serializes a null param -- and every diagnostic caller passes
    /// <c>forceUseRuntimeType: true</c>, which is exactly the branch that resolves the runtime type.
    /// </summary>
    [Fact]
    public void SerializeForDiagnostics_WhenValueIsNullAndRuntimeTypeIsForced_DoesNotThrow()
    {
        var act = () => PlatformJsonSerializer.SerializeForDiagnostics<object?>(
            null,
            forceUseRuntimeType: true,
            writeIndented: true);

        act.Should().NotThrow<NullReferenceException>(
            "resolving a runtime type from a null value must fall back to the declared type");
        act().Should().Contain(typeof(object).FullName!);
    }

    /// <summary>TC-EXCDIAG-001 — the core deliverable: a failure record a developer can actually act on.</summary>
    [Fact]
    public void SerializeException_WhenExceptionIsThrown_EmitsTypeMessageAndStackTrace()
    {
        var messageSentinel = CreateSentinel();
        var exception = Throw(() => new InvalidOperationException(messageSentinel));

        var envelope = ParseException(PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception));

        envelope.Type.Should().Be(typeof(InvalidOperationException).FullName);
        envelope.Message.Should().Be(messageSentinel);
        envelope.StackTrace.Should().NotBeNullOrWhiteSpace(
            "a type name alone is what made the swallowed-failure paths unfixable");
    }

    /// <summary>
    /// TC-EXCDIAG-002 — the inner chain carries TYPE names in order and never inner MESSAGES. The negative half is
    /// the half that can regress silently, because adding messages would look like an improvement.
    /// </summary>
    [Fact]
    public void SerializeException_WhenInnerChainIsThreeDeep_EmitsOrderedTypeNamesWithoutInnerMessages()
    {
        var innerSentinel = CreateSentinel();
        var exception = new InvalidOperationException(
            "outer",
            new ArgumentException(
                innerSentinel,
                new FormatException(innerSentinel, new NotSupportedException(innerSentinel))));

        var envelope = ParseException(PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception));

        envelope.InnerTypes.Should().Equal(
            typeof(ArgumentException).FullName,
            typeof(FormatException).FullName,
            typeof(NotSupportedException).FullName);
        envelope.Raw.Should().NotContain(innerSentinel, "inner exception messages are deliberately never emitted");
    }

    /// <summary>TC-EXCDIAG-003 — an AggregateException fans out WIDE; both siblings must appear, not just the aliased first.</summary>
    [Fact]
    public void SerializeException_WhenAggregateExceptionWrapsTwoInners_EmitsBothTypeNames()
    {
        var exception = new AggregateException(new ArgumentException("a"), new FormatException("b"));

        var envelope = ParseException(PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception));

        envelope.InnerTypes.Should().Equal(
            typeof(ArgumentException).FullName,
            typeof(FormatException).FullName);
    }

    /// <summary>
    /// TC-EXCDIAG-004 — a hostile getter degrades ONE field, never the envelope. This runs inside <c>catch</c>
    /// blocks in production, so an escaping exception here would replace the failure being recorded.
    /// </summary>
    [Fact]
    public void SerializeException_WhenMessageAndStackTraceGettersThrow_DegradesThoseFieldsOnly()
    {
        var exception = new HostileMembersException();

        var act = () => PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception);

        act.Should().NotThrow("a diagnostic must never be the thing that breaks the operation it observes");
        var envelope = ParseException(act());
        envelope.Type.Should().Be(typeof(HostileMembersException).FullName);
        envelope.Message.Should().BeNull("a throwing Message getter degrades to an omitted field");
        envelope.StackTrace.Should().BeNull("a throwing StackTrace getter degrades to an omitted field");
    }

    /// <summary>
    /// TC-EXCDIAG-005 — the byte cap holds AND the result stays parseable. Parseability is the non-obvious half:
    /// a char-boundary truncation that split a UTF-16 surrogate pair would satisfy the cap and still emit
    /// unparseable JSON, turning a size guard into the thing that destroys the diagnostic.
    /// </summary>
    [Fact]
    public void SerializeException_WhenStackTraceIsHuge_StaysUnderByteCapAndRemainsValidJson()
    {
        var exception = new HugeStackTraceException(new string('x', 500 * 1024));

        var json = PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception);

        Encoding.UTF8.GetByteCount(json).Should().BeLessThanOrEqualTo(
            PlatformDiagnosticJsonSerializer.MaxDiagnosticExceptionBytes);
        var parse = () => JsonDocument.Parse(json);
        parse.Should().NotThrow("a truncated envelope that cannot be parsed is worse than no envelope");
        ParseException(json).Type.Should().Be(typeof(HugeStackTraceException).FullName);
    }

    /// <summary>
    /// TC-EXCDIAG-005b — the cap survives a multi-byte message too. A char budget cannot bound BYTES: 1024 chars of
    /// 4-byte emoji is 4 KB, and the same shape in the stack trace is what the degradation ladder exists for.
    /// </summary>
    [Fact]
    public void SerializeException_WhenMessageAndStackAreMultiByte_StillStaysUnderByteCap()
    {
        var exception = new HugeStackTraceException(
            string.Concat(Enumerable.Repeat("🔥", 200 * 1024)),
            string.Concat(Enumerable.Repeat("🔥", 4096)));

        var json = PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception);

        Encoding.UTF8.GetByteCount(json).Should().BeLessThanOrEqualTo(
            PlatformDiagnosticJsonSerializer.MaxDiagnosticExceptionBytes);
        var parse = () => JsonDocument.Parse(json);
        parse.Should().NotThrow();
    }

    /// <summary>TC-EXCDIAG-006 — the pre-enrichment shape for a null exception is unchanged, byte for byte.</summary>
    [Fact]
    public void SerializeException_WhenExceptionIsNull_EmitsUnchangedUnknownEnvelope()
    {
        var json = PlatformDiagnosticJsonSerializer.SerializeException(null);

        json.Should().Be("""{"ExceptionType":"unknown"}""",
            "optional members must be omitted, not emitted as nulls, or every existing log query changes shape");
    }

    /// <summary>
    /// TC-EXCDIAG-007 — a self-referencing chain terminates. Built by reflection because <c>InnerException</c> is
    /// assignable only through a constructor, which cannot express a cycle; the shape still occurs in the wild via
    /// deserialization and custom exception types.
    /// </summary>
    [Fact]
    public void SerializeException_WhenInnerExceptionChainIsCyclic_TerminatesWithinTheEntryBound()
    {
        var outer = new InvalidOperationException("outer");
        var inner = new ArgumentException("inner", outer);
        SetInnerException(outer, inner);

        var act = () => PlatformJsonSerializer.SerializeExceptionForDiagnostics(outer);

        act.Should().NotThrow();
        var envelope = ParseException(act());
        envelope.InnerTypes.Should().NotBeNull().And.HaveCountLessThanOrEqualTo(MaxInnerEntriesPlusMarker);
        envelope.InnerTypes.Should().NotContain(
            name => name == typeof(InvalidOperationException).FullName,
            "the reference-identity visited set must stop the walk re-entering the outer exception");
    }

    /// <summary>
    /// TC-EXCDIAG-007b — the bound counts ENTRIES, not depth, so a WIDE AggregateException cannot flood the
    /// envelope. The first ten inners are a distinct type from the remaining 9,990, which pins breadth-first order:
    /// only the leading siblings may appear.
    /// </summary>
    [Fact]
    public void SerializeException_WhenAggregateExceptionIsTenThousandWide_EmitsAtMostTenTypesPlusMarker()
    {
        var inners = Enumerable.Range(0, 10_000)
            .Select(index => index < 10
                ? new ArgumentException($"leading-{index}")
                : (Exception)new NotSupportedException($"trailing-{index}"))
            .ToArray();

        var envelope = ParseException(
            PlatformJsonSerializer.SerializeExceptionForDiagnostics(new AggregateException(inners)));

        envelope.InnerTypes.Should().HaveCount(MaxInnerEntriesPlusMarker);
        envelope.InnerTypes.Should().NotContain(
            typeof(NotSupportedException).FullName,
            "only the leading siblings may be collected — a trailing type proves the walk did not stop early");
        envelope.InnerTypes![^1].Should().Contain(
            "truncated",
            "the envelope must say it is incomplete, or a reader treats ten of ten thousand as the whole chain");
    }

    /// <summary>
    /// TC-EXCDIAG-017 — de-enrichment guard. If a future change reverts the envelope to a bare type name, this is
    /// the test that fails. It asserts on the throwing method's own name, so it cannot pass on an empty stack.
    /// </summary>
    [Fact]
    public void SerializeException_WhenExceptionWasThrown_StackTraceNamesTheThrowingMethod()
    {
        var exception = Throw(() => new InvalidOperationException("boom"));

        var envelope = ParseException(PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception));

        envelope.StackTrace.Should().Contain(
            nameof(Throw),
            "the frames must locate the failure; a stack trace that does not name the thrower is not a stack trace");
    }

    /// <summary>
    /// TC-EXCDIAG-021 — the OUTER exception type name is bounded, like the inner ones.
    /// <para />
    /// Guards the one field the degradation ladder cannot shrink and the terminal fallback re-emits. The assertion
    /// is on the BOUND rather than on the byte cap deliberately: a type name long enough to breach 8 KB needs
    /// ~12 levels of self-nesting, so a byte-cap assertion here would pass whether or not the bound is applied and
    /// would guard nothing. Asserting the bound itself is what fails when the <c>Truncate</c> is removed.
    /// </summary>
    [Fact]
    public void SerializeException_WhenTypeNameIsPathologicallyLong_BoundsTheOuterTypeNameLikeTheInnerOnes()
    {
        var exception = new LongNamedException<
            LongNamedException<LongNamedException<LongNamedException<LongNamedException<int>>>>>();

        var rawTypeNameLength = exception.GetType().FullName!.Length;
        var envelope = ParseException(PlatformJsonSerializer.SerializeExceptionForDiagnostics(exception));

        rawTypeNameLength.Should().BeGreaterThan(
            MaxTypeNameCharsPlusMarker,
            "the fixture must actually exceed the bound, or this test proves nothing");
        envelope.Type.Should().NotBeNull().And.HaveLength(
            MaxTypeNameCharsPlusMarker,
            "an unbounded outer type name is re-emitted by the terminal fallback, so it is the one field that can breach the byte cap on every rung");
    }

    /// <summary>
    /// TC-EXCDIAG-020 — the never-throw invariant is UNIVERSALLY quantified, so it is proven over a generated
    /// domain rather than the four hand-picked shapes above. Each case is asserted by name: a bare "did not throw"
    /// over a loop cannot say WHICH shape broke.
    /// </summary>
    [Fact]
    public void SerializeException_ForAnyExceptionShape_NeverThrowsAndAlwaysEmitsParseableJson()
    {
        foreach (var (name, factory) in EnumerateHostileExceptionShapes())
        {
            var act = () => PlatformJsonSerializer.SerializeExceptionForDiagnostics(factory());

            act.Should().NotThrow($"shape '{name}' must not break the diagnostic");
            var json = act();
            var parse = () => JsonDocument.Parse(json);
            parse.Should().NotThrow($"shape '{name}' must still emit parseable JSON");
            Encoding.UTF8.GetByteCount(json).Should().BeLessThanOrEqualTo(
                PlatformDiagnosticJsonSerializer.MaxDiagnosticExceptionBytes,
                $"shape '{name}' must respect the byte cap");
            ParseException(json).Type.Should().NotBeNullOrWhiteSpace($"shape '{name}' must still report a type");
        }
    }

    /// <summary>
    /// The generated domain for TC-EXCDIAG-020: every way a caller-owned exception can be hostile to a diagnostic —
    /// throwing members, pathological depth, pathological width, cycles, and null-ish content.
    /// </summary>
    private static IEnumerable<(string Name, Func<Exception> Factory)> EnumerateHostileExceptionShapes()
    {
        yield return ("throwing-message-and-stack", () => new HostileMembersException());
        yield return ("throwing-tostring", () => new ThrowingToStringException());
        yield return ("throwing-inner-exceptions", () => new ThrowingInnerExceptionsAggregateException());
        yield return ("empty-message", () => new InvalidOperationException(string.Empty));
        yield return ("huge-stack", () => new HugeStackTraceException(new string('y', 300 * 1024)));
        yield return ("multi-byte-everything", () => new HugeStackTraceException(
            string.Concat(Enumerable.Repeat("🔥", 100 * 1024)),
            string.Concat(Enumerable.Repeat("🔥", 2048))));

        // The OUTER type name is the one field the degradation ladder cannot shrink and the terminal fallback
        // re-emits, so an unbounded one would breach the byte cap on every rung. A constructed generic's FullName
        // embeds an assembly-qualified name per type argument, so nesting is how a type name gets pathological.
        yield return ("pathological-type-name", () => new LongNamedException<
            LongNamedException<LongNamedException<LongNamedException<LongNamedException<int>>>>>());

        foreach (var depth in new[] { 0, 1, 11, 50 })
        {
            yield return ($"depth-{depth}", () => BuildDeepChain(depth));
        }

        foreach (var width in new[] { 0, 1, 11, 1000 })
        {
            yield return ($"width-{width}", () => new AggregateException(
                Enumerable.Range(0, width).Select(i => (Exception)new ArgumentException($"w{i}"))));
        }

        yield return ("cycle", () =>
        {
            var outer = new InvalidOperationException("outer");
            SetInnerException(outer, new ArgumentException("inner", outer));

            return outer;
        });

        yield return ("aggregate-of-cycles", () =>
        {
            var outer = new InvalidOperationException("outer");
            SetInnerException(outer, new ArgumentException("inner", outer));

            return new AggregateException(outer, outer);
        });
    }

    private static Exception BuildDeepChain(int depth)
    {
        Exception current = new InvalidOperationException("leaf");
        for (var i = 0; i < depth; i++) current = new InvalidOperationException($"level-{i}", current);

        return current;
    }

    /// <summary>Throws and catches so the exception carries real frames — an unthrown one has a null stack trace.</summary>
    private static TException Throw<TException>(Func<TException> factory)
        where TException : Exception
    {
        try
        {
            throw factory();
        }
        catch (TException thrown)
        {
            return thrown;
        }
    }

    /// <summary>
    /// Assigns <c>InnerException</c> through its backing field. There is no public way to build a cycle, and a
    /// cycle is exactly the shape the walk's reference-identity guard exists for.
    /// </summary>
    private static void SetInnerException(Exception target, Exception inner)
    {
        var field = typeof(Exception).GetField("_innerException", BindingFlags.Instance | BindingFlags.NonPublic);

        field.Should().NotBeNull("the cyclic-chain fixture depends on this runtime field; a rename must fail loudly");
        field!.SetValue(target, inner);
    }

    private static ParsedExceptionEnvelope ParseException(string json)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;

        return new ParsedExceptionEnvelope(
            json,
            root.TryGetProperty("ExceptionType", out var type) ? type.GetString() : null,
            root.TryGetProperty("Message", out var message) ? message.GetString() : null,
            root.TryGetProperty("StackTrace", out var stack) ? stack.GetString() : null,
            root.TryGetProperty("InnerExceptionTypes", out var inners)
                ? inners.EnumerateArray().Select(element => element.GetString()).ToList()
                : null);
    }

    private static string CreateSentinel()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    }

    private static bool ContainsAnySentinelRepresentation(string value, string sentinel)
    {
        var suffix = sentinel[^12..];
        var reversed = new string(sentinel.Reverse().ToArray());
        var base64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(sentinel));

        return value.Contains(sentinel, StringComparison.Ordinal)
               || value.Contains(suffix, StringComparison.Ordinal)
               || value.Contains(reversed, StringComparison.Ordinal)
               || value.Contains(base64, StringComparison.Ordinal);
    }

    private sealed class DiagnosticEnvelope
    {
        public string DisplayValue { get; set; } = string.Empty;

        public List<DiagnosticItem> Items { get; set; } = [];
    }

    private sealed class DiagnosticItem
    {
        [JsonPropertyName("protectedValue")]
        [PlatformSensitiveData]
        public string SensitiveValue { get; set; } = string.Empty;

        public string PublicValue { get; set; } = string.Empty;
    }

    [JsonConverter(typeof(ThrowingDiagnosticModelConverter))]
    private sealed class HostileDiagnosticModel
    {
        private readonly bool throwOnRead = true;

        public string Value => throwOnRead
            ? throw new InvalidOperationException("hostile getter must not execute")
            : string.Empty;
    }

    /// <summary>The parsed envelope, so assertions read as contract statements instead of substring searches.</summary>
    private sealed record ParsedExceptionEnvelope(
        string Raw,
        string? Type,
        string? Message,
        string? StackTrace,
        List<string?>? InnerTypes);

    // These fixtures exist to be hostile: they throw from the exact members a diagnostic is tempted to read.
    // S3871 (exceptions must be public) is satisfied rather than suppressed; S3877 (no throw from ToString) is
    // suppressed per-member, because a ToString that throws IS the condition under test — the serializer must
    // never call it. Suppressing the rule here is what lets the rule keep protecting production code.
#pragma warning disable S3877

    /// <summary>Both risky members throw. <c>Message</c> and <c>StackTrace</c> are virtual, so this is reachable in production.</summary>
    public sealed class HostileMembersException : Exception
    {
        public override string Message => throw new InvalidOperationException("hostile Message getter must not escape");

        public override string? StackTrace => throw new InvalidOperationException("hostile StackTrace getter must not escape");
    }

    /// <summary>Proves the diagnostic never falls back to <c>ToString()</c>, which would fold the whole inner tree in unbounded.</summary>
    public sealed class ThrowingToStringException : Exception
    {
        public override string ToString()
        {
            throw new InvalidOperationException("hostile ToString must not be called by the diagnostic");
        }
    }

    /// <summary>Throws from <c>GetBaseException()</c> — the reason the chain collection is guarded as a whole, not per read.</summary>
    public sealed class ThrowingInnerExceptionsAggregateException : Exception
    {
        public override string Message => "aggregate-like";

        public override Exception GetBaseException()
        {
            throw new InvalidOperationException("must not be called");
        }
    }

#pragma warning restore S3877

    /// <summary>Supplies an arbitrarily large stack trace, which cannot be produced by actually throwing.</summary>
    public sealed class HugeStackTraceException(string stackTrace, string? message = null) : Exception
    {
        public override string Message { get; } = message ?? "huge";

        public override string? StackTrace { get; } = stackTrace;
    }

    /// <summary>
    /// Generic so it can be nested into itself, which is the only way to produce a pathologically long
    /// <see cref="Type.FullName" />: a constructed generic's full name embeds an assembly-qualified name per type
    /// argument, so each level of nesting multiplies the length rather than adding a constant.
    /// </summary>
    /// <typeparam name="T">Unused — present solely to make the type constructible with itself.</typeparam>
    public sealed class LongNamedException<T> : Exception;

    private sealed class ThrowingDiagnosticModelConverter : JsonConverter<HostileDiagnosticModel>
    {
        public override HostileDiagnosticModel? Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options)
        {
            throw new InvalidOperationException("hostile converter must not execute");
        }

        public override void Write(
            Utf8JsonWriter writer,
            HostileDiagnosticModel value,
            JsonSerializerOptions options)
        {
            throw new InvalidOperationException("hostile converter must not execute");
        }
    }
}
