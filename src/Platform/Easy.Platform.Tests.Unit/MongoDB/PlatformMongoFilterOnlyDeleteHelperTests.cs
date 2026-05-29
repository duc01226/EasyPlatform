using System.Linq.Expressions;
using Easy.Platform.MongoDB;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.MongoDB;

public class PlatformMongoFilterOnlyDeleteHelperTests
{
    private sealed class TestEntity
    {
        public string Id { get; set; } = string.Empty;
        public int Age { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    private static IQueryable<TestEntity> Source(params TestEntity[] entities) => entities.AsQueryable();

    [Fact]
    public void ReturnsNull_ForEmptyQuery_NoWhereCalls()
    {
        var query = Source();

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void ReturnsPredicate_ForSingleWhere_WithEquivalentSemantics()
    {
        var query = Source().Where(e => e.Age >= 18);

        var predicate = PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query);

        predicate.Should().NotBeNull();
        var compiled = predicate!.Compile();
        compiled(new TestEntity { Age = 18 }).Should().BeTrue();
        compiled(new TestEntity { Age = 17 }).Should().BeFalse();
    }

    [Fact]
    public void ReturnsPredicate_ForChainedWheres_CombinesWithAndAlso()
    {
        var query = Source()
            .Where(e => e.Age >= 18)
            .Where(e => e.Status == "active");

        var predicate = PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query);

        predicate.Should().NotBeNull();
        var compiled = predicate!.Compile();
        compiled(new TestEntity { Age = 20, Status = "active" }).Should().BeTrue();
        compiled(new TestEntity { Age = 20, Status = "inactive" }).Should().BeFalse();
        compiled(new TestEntity { Age = 17, Status = "active" }).Should().BeFalse();
        compiled(new TestEntity { Age = 17, Status = "inactive" }).Should().BeFalse();
    }

    [Fact]
    public void ReturnsPredicate_ForTripleWhereChain()
    {
        var query = Source()
            .Where(e => e.Age >= 18)
            .Where(e => e.Status == "active")
            .Where(e => e.Id.Length > 0);

        var predicate = PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query);

        predicate.Should().NotBeNull();
        var compiled = predicate!.Compile();
        compiled(new TestEntity { Id = "x", Age = 20, Status = "active" }).Should().BeTrue();
        compiled(new TestEntity { Id = "", Age = 20, Status = "active" }).Should().BeFalse();
    }

    [Fact]
    public void ReturnsNull_WhenSelectIsPresent()
    {
        var query = Source().Where(e => e.Age >= 18).Select(e => e);

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void ReturnsNull_WhenTakeIsPresent()
    {
        var query = Source().Where(e => e.Age >= 18).Take(10);

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void ReturnsNull_WhenOrderByWrapsTheChain()
    {
        var query = Source().Where(e => e.Age >= 18).OrderBy(e => e.Id);

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void ReturnsNull_WhenOrderByIsBeforeWhereInChain()
    {
        var query = Source().OrderBy(e => e.Id).Where(e => e.Age >= 18);

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void ReturnsNull_WhenGroupByPresent()
    {
        var query = Source().Where(e => e.Age >= 18).GroupBy(e => e.Status).SelectMany(g => g);

        PlatformMongoFilterOnlyDeleteHelper.TryBuildFilterOnlyDeletePredicate(query).Should().BeNull();
    }

    [Fact]
    public void IsQueryableWhereMethod_TrueForQueryableWhereCallExpression()
    {
        var rootMethodCall = (MethodCallExpression)Source().Where(e => e.Age >= 18).Expression;

        PlatformMongoFilterOnlyDeleteHelper.IsQueryableWhereMethod(rootMethodCall).Should().BeTrue();
    }

    [Fact]
    public void IsQueryableWhereMethod_FalseForSelectCallExpression()
    {
        var rootMethodCall = (MethodCallExpression)Source().Select(e => e).Expression;

        PlatformMongoFilterOnlyDeleteHelper.IsQueryableWhereMethod(rootMethodCall).Should().BeFalse();
    }

    [Fact]
    public void TryGetWherePredicate_ExtractsLambdaFromQuotedExpression()
    {
        var methodCall = (MethodCallExpression)Source().Where(e => e.Age >= 18).Expression;

        var predicate = PlatformMongoFilterOnlyDeleteHelper.TryGetWherePredicate<TestEntity>(methodCall.Arguments[1]);

        predicate.Should().NotBeNull();
        predicate!.Compile()(new TestEntity { Age = 20 }).Should().BeTrue();
        predicate.Compile()(new TestEntity { Age = 5 }).Should().BeFalse();
    }
}
