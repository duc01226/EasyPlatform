using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.MongoDB.BulkUpdate;
using FluentAssertions;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Driver;

namespace Easy.Platform.Tests.Unit.MongoDB;

public class MongoBulkUpdateDefinitionBuilderTests
{
    [Fact]
    public void Build_EmitsSetIncAndMulUpdateOperators()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        builder
            .Set(entity => entity.Name, "updated")
            .Inc(entity => entity.Quantity, 2)
            .Mul(entity => entity.Score, 1.5m);

        var update = MongoBulkUpdateDefinitionBuilder.Build<TestEntity>(builder.Ops);

        var document = Render(update);
        document["$set"].AsBsonDocument["Name"].AsString.Should().Be("updated");
        document["$inc"].AsBsonDocument["Quantity"].AsInt32.Should().Be(2);
        document["$mul"].AsBsonDocument["Score"].ToDecimal().Should().Be(1.5m);
    }

    private static BsonDocument Render(UpdateDefinition<TestEntity> update)
    {
        var registry = BsonSerializer.SerializerRegistry;
        var serializer = registry.GetSerializer<TestEntity>();

        return update.Render(new RenderArgs<TestEntity>(serializer, registry)).AsBsonDocument;
    }

    private sealed class TestEntity
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; } = 0;
        public decimal Score { get; set; } = 0m;
    }
}
