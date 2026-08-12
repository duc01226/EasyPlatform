using BenchmarkDotNet.Attributes;
using Easy.Platform.MongoDB.Serializer;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.Benchmark;

/// <summary>
/// Measures the POCO fallback path of <see cref="PlatformDynamicObjectMongoDbSerializer" />.
/// The unit tests reuse these public representative shapes to prove the benchmarked inputs retain
/// the expected raw, camel-case BSON representation.
/// </summary>
[MemoryDiagnoser]
public class PlatformDynamicObjectMongoDbSerializerBenchmarkExecutor
{
    private static readonly PlatformDynamicObjectMongoDbSerializer Serializer = new();

    private static readonly FlatPoco FlatPocoInput = new("Flat candidate", 7, true);

    private static readonly NestedPoco NestedPocoInput = new(
        "Nested candidate",
        new NestedDetailsPoco("Bangkok", new FlatPoco("Nested leaf", 13, false)));

    private static readonly CollectionHeavyPoco CollectionHeavyPocoInput = new(
        "Collection candidate",
        [
            new CollectionItemPoco("first", 1, ["alpha", "beta"]),
            new CollectionItemPoco("second", 2, ["gamma", "delta"]),
            new CollectionItemPoco("third", 3, ["epsilon", "zeta"])
        ],
        ["hiring", "priority", "external"]);

    [Benchmark(Baseline = true)]
    public BsonValue SerializeFlatPoco()
    {
        return Serialize(FlatPocoInput);
    }

    [Benchmark]
    public BsonValue SerializeNestedPoco()
    {
        return Serialize(NestedPocoInput);
    }

    [Benchmark]
    public BsonValue SerializeCollectionHeavyPoco()
    {
        return Serialize(CollectionHeavyPocoInput);
    }

    private static BsonValue Serialize(object value)
    {
        var container = new BsonDocument();
        using var writer = new BsonDocumentWriter(container);
        writer.WriteStartDocument();
        writer.WriteName("value");
        Serializer.Serialize(
            BsonSerializationContext.CreateRoot(writer),
            new BsonSerializationArgs { NominalType = typeof(object) },
            value);
        writer.WriteEndDocument();

        // Returning the BSON value makes the fully materialized output observable to BenchmarkDotNet.
        return container["value"];
    }

    public sealed record FlatPoco(string DisplayName, int SortOrder, bool IsEnabled);

    public sealed record NestedPoco(string DisplayName, NestedDetailsPoco Details);

    public sealed record NestedDetailsPoco(string Region, FlatPoco Primary);

    public sealed record CollectionHeavyPoco(
        string DisplayName,
        IReadOnlyList<CollectionItemPoco> Items,
        IReadOnlyList<string> Tags);

    public sealed record CollectionItemPoco(string Code, int Weight, IReadOnlyList<string> Labels);
}
