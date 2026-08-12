using System.Text.Json;
using Easy.Platform.Benchmark;
using Easy.Platform.MongoDB.Serializer;
using FluentAssertions;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.Tests.Unit.MongoDB;

public sealed class PlatformDynamicObjectMongoDbSerializerTests
{
    private static readonly PlatformDynamicObjectMongoDbSerializer Serializer = new();

    [Fact]
    public void PrimitiveValues_ShouldWriteCanonicalBsonTypes()
    {
        var utcDate = new DateTime(2026, 8, 7, 5, 30, 0, DateTimeKind.Utc);
        var offsetDate = new DateTimeOffset(2026, 8, 7, 12, 30, 0, TimeSpan.FromHours(7));
        var guid = Guid.Parse("fa66d3c7-46c6-42c0-8f51-1f770eb30b0b");

        var cases = new (object? Value, BsonValue Expected)[]
        {
            (null, BsonNull.Value),
            ("text", new BsonString("text")),
            ('x', new BsonString("x")),
            (true, BsonBoolean.True),
            ((byte)1, new BsonInt32(1)),
            ((sbyte)-2, new BsonInt32(-2)),
            ((short)-3, new BsonInt32(-3)),
            ((ushort)4, new BsonInt32(4)),
            (5, new BsonInt32(5)),
            (6U, new BsonInt64(6)),
            (7L, new BsonInt64(7)),
            (8UL, new BsonInt64(8)),
            (ulong.MaxValue, new BsonDecimal128((decimal)ulong.MaxValue)),
            (9.5F, new BsonDouble(9.5)),
            (10.5D, new BsonDouble(10.5)),
            (11.5M, new BsonDecimal128(11.5M)),
            (utcDate, new BsonDateTime(utcDate)),
            (offsetDate, new BsonString(offsetDate.ToString("O"))),
            (guid, new BsonString(guid.ToString())),
            (new DateOnly(2026, 8, 7), new BsonString("2026-08-07")),
            (new TimeOnly(12, 30, 45), new BsonString("12:30:45.0000000")),
            (TestStatus.Active, new BsonString(nameof(TestStatus.Active)))
        };

        foreach (var (value, expected) in cases)
            Serialize(value).Should().Be(expected, $"{value?.GetType().Name ?? "null"} must have one stable BSON representation");
    }

    [Fact]
    public void NestedDynamicGraph_WriteReadWrite_ShouldRemainRawAndStructurallyStable()
    {
        var value = new Dictionary<string, object?>
        {
            ["name"] = "root",
            ["items"] = new List<object?>
            {
                1,
                true,
                null,
                new Dictionary<string, object?> { ["nested"] = new[] { "a", "b" } }
            }
        };

        var firstWrite = Serialize(value);
        var roundTripped = Deserialize(firstWrite);
        var secondWrite = Serialize(roundTripped);

        firstWrite.Should().Be(secondWrite);
        ContainsMongoTypeWrapper(firstWrite).Should().BeFalse();
    }

    [Fact]
    public void JsonElementAtAnyDepth_ShouldWriteAsRawBsonGraph()
    {
        using var json = JsonDocument.Parse("""{"items":[{"name":"one","count":2}],"enabled":true}""");
        var value = new Dictionary<string, object?> { ["payload"] = json.RootElement.Clone() };

        var stored = Serialize(value).AsBsonDocument;

        stored["payload"].AsBsonDocument["items"].AsBsonArray[0].AsBsonDocument["name"].AsString.Should().Be("one");
        stored["payload"].AsBsonDocument["items"].AsBsonArray[0].AsBsonDocument["count"].AsInt32.Should().Be(2);
        ContainsMongoTypeWrapper(stored).Should().BeFalse();
    }

    [Fact]
    public void BsonValueAtAnyDepth_ShouldWriteWithoutReencoding()
    {
        var rawBson = new BsonDocument
        {
            ["array"] = new BsonArray { 1, "two" },
            ["objectId"] = ObjectId.GenerateNewId()
        };

        var stored = Serialize(new Dictionary<string, object?> { ["raw"] = rawBson }).AsBsonDocument;

        stored["raw"].Should().Be(rawBson);
    }

    [Fact]
    public void Poco_ShouldWriteCamelCaseDynamicGraph()
    {
        var stored = Serialize(new TestPoco { DisplayName = "Platform", Values = [1, 2] }).AsBsonDocument;

        stored.Names.Should().Contain(["displayName", "values"]);
        stored.Names.Should().NotContain(["DisplayName", "Values"]);
        stored["values"].AsBsonArray.Select(item => item.AsInt32).Should().Equal(1, 2);
    }

    [Fact]
    public void BenchmarkFlatPoco_ShouldWriteDeterministicRawCamelCaseBsonGraph()
    {
        var stored = Serialize(
                new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.FlatPoco("Flat candidate", 7, true))
            .AsBsonDocument;

        stored.ToBson().Should().Equal(
            new BsonDocument
            {
                ["displayName"] = "Flat candidate",
                ["sortOrder"] = 7,
                ["isEnabled"] = true
            }.ToBson());
        ContainsMongoTypeWrapper(stored).Should().BeFalse();
    }

    [Fact]
    public void BenchmarkNestedPoco_ShouldWriteDeterministicRawCamelCaseBsonGraph()
    {
        var stored = Serialize(
                new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.NestedPoco(
                    "Nested candidate",
                    new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.NestedDetailsPoco(
                        "Bangkok",
                        new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.FlatPoco("Nested leaf", 13, false))))
            .AsBsonDocument;

        stored.ToBson().Should().Equal(
            new BsonDocument
            {
                ["displayName"] = "Nested candidate",
                ["details"] = new BsonDocument
                {
                    ["region"] = "Bangkok",
                    ["primary"] = new BsonDocument
                    {
                        ["displayName"] = "Nested leaf",
                        ["sortOrder"] = 13,
                        ["isEnabled"] = false
                    }
                }
            }.ToBson());
        ContainsMongoTypeWrapper(stored).Should().BeFalse();
    }

    [Fact]
    public void BenchmarkCollectionHeavyPoco_ShouldWriteDeterministicRawCamelCaseBsonGraph()
    {
        var stored = Serialize(
                new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.CollectionHeavyPoco(
                    "Collection candidate",
                    [
                        new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.CollectionItemPoco("first", 1, ["alpha", "beta"]),
                        new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.CollectionItemPoco("second", 2, ["gamma", "delta"]),
                        new PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor.CollectionItemPoco("third", 3, ["epsilon", "zeta"])
                    ],
                    ["hiring", "priority", "external"]))
            .AsBsonDocument;

        stored.ToBson().Should().Equal(
            new BsonDocument
            {
                ["displayName"] = "Collection candidate",
                ["items"] = new BsonArray
                {
                    new BsonDocument
                    {
                        ["code"] = "first",
                        ["weight"] = 1,
                        ["labels"] = new BsonArray { "alpha", "beta" }
                    },
                    new BsonDocument
                    {
                        ["code"] = "second",
                        ["weight"] = 2,
                        ["labels"] = new BsonArray { "gamma", "delta" }
                    },
                    new BsonDocument
                    {
                        ["code"] = "third",
                        ["weight"] = 3,
                        ["labels"] = new BsonArray { "epsilon", "zeta" }
                    }
                },
                ["tags"] = new BsonArray { "hiring", "priority", "external" }
            }.ToBson());
        ContainsMongoTypeWrapper(stored).Should().BeFalse();
    }

    [Fact]
    public void DateLookingAndPlainStrings_ShouldPreserveLegacyPlatformReadBehavior()
    {
        const string dateValue = "2026-08-07T12:34:56+07:00";

        Deserialize(new BsonString(dateValue)).Should().Be(DateTimeOffset.Parse(dateValue));
        Deserialize(new BsonString("not-a-date")).Should().Be("not-a-date");
    }

    [Fact]
    public void BsonPrimitivesAndArrays_ShouldMapToExpectedDotNetValues()
    {
        var utcDate = new DateTime(2026, 8, 7, 5, 30, 0, DateTimeKind.Utc);

        Deserialize(new BsonInt32(1)).Should().Be(1);
        Deserialize(new BsonInt64(2)).Should().Be(2L);
        Deserialize(new BsonDouble(3.5)).Should().Be(3.5D);
        Deserialize(new BsonDecimal128(4.5M)).Should().Be(4.5M);
        Deserialize(new BsonDateTime(utcDate)).Should().Be(utcDate);
        Deserialize(BsonBoolean.True).Should().Be(true);
        Deserialize(new BsonArray { 1, "two", false })
            .Should().BeEquivalentTo(new object?[] { 1, "two", false }, options => options.WithStrictOrdering());
    }

    [Fact]
    public void BsonNativeValues_ShouldMapWithoutSilentNullFallback()
    {
        var objectId = ObjectId.GenerateNewId();
        var bytes = new byte[] { 1, 2, 3 };

        Deserialize(new BsonBinaryData(bytes)).Should().BeEquivalentTo(bytes);
        Deserialize(new BsonObjectId(objectId)).Should().Be(objectId.ToString());
        Deserialize(new BsonRegularExpression("^value$", "i")).Should().NotBeNull();
        Deserialize(new BsonTimestamp(42)).Should().NotBeNull();
        Deserialize(BsonMinKey.Value).Should().NotBeNull();
        Deserialize(BsonMaxKey.Value).Should().NotBeNull();
        Deserialize(BsonNull.Value).Should().BeNull();
        Deserialize(BsonUndefined.Value).Should().BeNull();
    }

    [Fact]
    public void LegacySingleValueWrappers_ShouldNormalizeRecursively()
    {
        var legacy = new BsonDocument
        {
            ["items"] = new BsonArray
            {
                new BsonDocument("_v", "one"),
                new BsonDocument("_v", new BsonDocument("count", 2))
            }
        };

        var result = Deserialize(legacy).Should().BeAssignableTo<Dictionary<string, object?>>().Subject;
        var items = result["items"].Should().BeAssignableTo<object?[]>().Subject;

        items[0].Should().Be("one");
        items[1].Should().BeAssignableTo<Dictionary<string, object?>>()
            .Which["count"].Should().Be(2);
    }

    [Fact]
    public void LegacySystemCollectionWrappers_ShouldNormalizeRecursively()
    {
        var legacy = new BsonDocument
        {
            ["items"] = new BsonDocument
            {
                ["_t"] = new BsonArray { "System.Object", "System.Collections.Generic.List`1[System.Object]" },
                ["_v"] = new BsonArray
                {
                    new BsonDocument
                    {
                        ["values"] = new BsonDocument
                        {
                            ["_t"] = "System.String[]",
                            ["_v"] = new BsonArray { "a", "b" }
                        }
                    }
                }
            }
        };

        var cleanWrite = Serialize(Deserialize(legacy));

        ContainsMongoTypeWrapper(cleanWrite).Should().BeFalse();
        cleanWrite.AsBsonDocument["items"].AsBsonArray[0].AsBsonDocument["values"]
            .AsBsonArray.Select(item => item.AsString).Should().Equal("a", "b");
    }

    [Fact]
    public void LegacyPrimitiveArrayWrapper_ShouldNormalize()
    {
        var legacy = new BsonDocument
        {
            ["_t"] = "System.Int32[]",
            ["_v"] = new BsonArray { 1, 2 }
        };

        Deserialize(legacy).Should().BeEquivalentTo(new object?[] { 1, 2 }, options => options.WithStrictOrdering());
    }

    [Fact]
    public void NonSystemTypeAndValueDocument_ShouldRemainADocument()
    {
        var businessDocument = new BsonDocument
        {
            ["_t"] = "business-kind",
            ["_v"] = new BsonDocument("value", 42)
        };

        var result = Deserialize(businessDocument).Should().BeAssignableTo<Dictionary<string, object?>>().Subject;

        result.Keys.Should().BeEquivalentTo("_t", "_v");
        Serialize(result).AsBsonDocument.Names.Should().Contain(["_t", "_v"]);
    }

    [Fact]
    public void DictionaryWithNonStringKey_ShouldFailClearly()
    {
        var value = new Dictionary<int, object?> { [1] = "one" };

        FluentActions.Invoking(() => Serialize(value))
            .Should().Throw<BsonSerializationException>()
            .WithMessage("*dictionary keys must be strings*");
    }

    private static BsonValue Serialize(object? value)
    {
        var container = new BsonDocument();
        using var writer = new BsonDocumentWriter(container);
        writer.WriteStartDocument();
        writer.WriteName("value");
        Serializer.Serialize(
            BsonSerializationContext.CreateRoot(writer),
            new BsonSerializationArgs { NominalType = typeof(object) },
            value!);
        writer.WriteEndDocument();
        return container["value"];
    }

    private static object? Deserialize(BsonValue value)
    {
        using var reader = new BsonDocumentReader(new BsonDocument("value", value));
        reader.ReadStartDocument();
        reader.ReadBsonType();
        reader.ReadName();
        var result = Serializer.Deserialize(
            BsonDeserializationContext.CreateRoot(reader),
            new BsonDeserializationArgs { NominalType = typeof(object) });
        reader.ReadEndDocument();
        return result;
    }

    private static bool ContainsMongoTypeWrapper(BsonValue value)
    {
        if (value.IsBsonArray) return value.AsBsonArray.Any(ContainsMongoTypeWrapper);
        if (!value.IsBsonDocument) return false;

        var document = value.AsBsonDocument;
        if (document.Contains("_t") && document.Contains("_v")) return true;

        return document.Elements.Any(element => ContainsMongoTypeWrapper(element.Value));
    }

    private enum TestStatus
    {
        Active
    }

    private sealed class TestPoco
    {
        public string DisplayName { get; init; } = string.Empty;
        public List<int> Values { get; init; } = [];
    }
}
