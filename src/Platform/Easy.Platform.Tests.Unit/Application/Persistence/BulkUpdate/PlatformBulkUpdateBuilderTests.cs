using System.Linq.Expressions;
using Easy.Platform.Application.Persistence.BulkUpdate;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Application.Persistence.BulkUpdate;

public class PlatformBulkUpdateBuilderTests
{
    [Fact]
    public void RecordsOrderedSetIncAndMulOps_WithTypedLambdaExpressions()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        Expression<Func<TestEntity, string>> nameExpression = entity => entity.Name;
        Expression<Func<TestEntity, int>> quantityExpression = entity => entity.Quantity;
        Expression<Func<TestEntity, decimal>> scoreExpression = entity => entity.Score;

        var returnedBuilder = builder
            .Set(nameExpression, "updated")
            .Inc(quantityExpression, 2)
            .Mul(scoreExpression, 1.5m);

        returnedBuilder.Should().BeSameAs(builder);
        builder.Ops.Should().HaveCount(3);
        builder.Ops.Select(p => p.Kind).Should().Equal(BulkUpdateOpKind.Set, BulkUpdateOpKind.Inc, BulkUpdateOpKind.Mul);
        builder.Ops[0].PropExpr.Should().BeSameAs(nameExpression);
        builder.Ops[0].Value.Should().Be("updated");
        builder.Ops[1].PropExpr.Should().BeSameAs(quantityExpression);
        builder.Ops[1].Value.Should().Be(2);
        builder.Ops[2].PropExpr.Should().BeSameAs(scoreExpression);
        builder.Ops[2].Value.Should().Be(1.5m);
    }

    [Fact]
    public void RejectsNonPropertyExpressions()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();

        var act = () => builder.Set(entity => entity.Name.ToLower(), "updated");

        act.Should().Throw<ArgumentException>().WithMessage("*direct property expression*");
    }

    [Fact]
    public void RejectsNestedPropertyExpressions()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();

        var act = () => builder.Set(entity => entity.Child.Name, "updated");

        act.Should().Throw<ArgumentException>().WithMessage("*direct property expression*");
    }

    [Fact]
    public void NormalizesConvertedPropertyExpressions()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        Expression<Func<TestEntity, object>> quantityExpression = entity => entity.Quantity;

        builder.Set(quantityExpression, 10);

        builder.Ops.Should().ContainSingle();
        builder.Ops[0].PropertyInfo.Name.Should().Be(nameof(TestEntity.Quantity));
        builder.Ops[0].PropertyType.Should().Be(typeof(int));

        var entity = new TestEntity { Quantity = 1 };
        PlatformBulkUpdateOperationHelper.ApplyToEntity(entity, builder.Ops);
        entity.Quantity.Should().Be(10);
    }

    [Fact]
    public void CoreProject_DoesNotReferenceEfCoreOrMongoProviderPackages()
    {
        var source = ReadRepositoryFile("src/Platform/Easy.Platform/Easy.Platform.csproj");

        source.Should().NotContain("Microsoft.EntityFrameworkCore");
        source.Should().NotContain("MongoDB.Driver");
    }

    [Fact]
    public void CoreProject_ExposesInternalBulkOpsToProviderAssembliesAndTests()
    {
        var source = ReadRepositoryFile("src/Platform/Easy.Platform/Easy.Platform.csproj");

        source.Should().Contain("""<InternalsVisibleTo Include="Easy.Platform.EfCore" />""");
        source.Should().Contain("""<InternalsVisibleTo Include="Easy.Platform.MongoDB" />""");
        source.Should().Contain("""<InternalsVisibleTo Include="Easy.Platform.Tests.Unit" />""");
    }

    [Fact]
    public void ConcurrencyMode_UsesExplicitPreserveAndBypassNames()
    {
        Enum.GetNames<PlatformBulkUpdateConcurrencyMode>()
            .Should()
            .Equal(
                nameof(PlatformBulkUpdateConcurrencyMode.PreserveExistingSemantics),
                nameof(PlatformBulkUpdateConcurrencyMode.BypassOptimisticConcurrencyAndStampToken));
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

    private sealed class TestEntity
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; } = 0;
        public decimal Score { get; set; } = 0m;
        public TestChild Child { get; set; } = new();
    }

    private sealed class TestChild
    {
        public string Name { get; set; } = string.Empty;
    }
}
