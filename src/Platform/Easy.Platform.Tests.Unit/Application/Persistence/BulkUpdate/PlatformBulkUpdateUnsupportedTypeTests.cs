using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.EfCore.BulkUpdate;
using Easy.Platform.MongoDB.BulkUpdate;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.Persistence.BulkUpdate;

public class PlatformBulkUpdateUnsupportedTypeTests
{
    [Fact]
    public void EfTranslator_RejectsUnsupportedArithmeticPropertyType()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        builder.Inc(entity => entity.Name, "suffix");

        var act = () => EfBulkUpdateExpressionBuilder.Build<TestEntity>(builder.Ops);

        act.Should().Throw<NotSupportedException>().WithMessage("*does not support property type*String*");
    }

    [Fact]
    public void MongoTranslator_RejectsUnsupportedArithmeticPropertyType()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        builder.Mul(entity => entity.Name, "suffix");

        var act = () => MongoBulkUpdateDefinitionBuilder.Build<TestEntity>(builder.Ops);

        act.Should().Throw<NotSupportedException>().WithMessage("*does not support property type*String*");
    }

    private sealed class TestEntity
    {
        public string Name { get; set; } = string.Empty;
    }
}
