using System.Linq.Expressions;
using Easy.Platform.Application.Persistence.BulkUpdate;
using Easy.Platform.EfCore.BulkUpdate;
using FluentAssertions;
using Microsoft.EntityFrameworkCore.Query;

namespace Easy.Platform.Tests.Unit.EfCore;

public class EfBulkUpdateExpressionBuilderTests
{
    [Fact]
    public void Build_LowersSetOperationToSetPropertyValueOverload()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        builder.Set(entity => entity.Name, "updated");

        var expression = EfBulkUpdateExpressionBuilder.Build<TestEntity>(builder.Ops);

        var call = expression.Body.Should().BeAssignableTo<MethodCallExpression>().Subject;
        call.Method.Name.Should().Be(nameof(SetPropertyCalls<TestEntity>.SetProperty));
        call.Method.GetParameters()[1].ParameterType.Should().Be(typeof(string));
        call.Arguments[0].Should().BeAssignableTo<LambdaExpression>();
        call.Arguments[1].Should().BeOfType<ConstantExpression>().Subject.Value.Should().Be("updated");
    }

    [Fact]
    public void Build_LowersIncAndMulOperationsToSetPropertyComputedValueOverload()
    {
        var builder = new PlatformBulkUpdateBuilder<TestEntity>();
        builder
            .Inc(entity => entity.Quantity, 2)
            .Mul(entity => entity.Score, 1.5m);

        var expression = EfBulkUpdateExpressionBuilder.Build<TestEntity>(builder.Ops);

        var multiplyCall = expression.Body.Should().BeAssignableTo<MethodCallExpression>().Subject;
        AssertComputedSetPropertyCall(multiplyCall, ExpressionType.Multiply, typeof(decimal));

        var incrementCall = multiplyCall.Object.Should().BeAssignableTo<MethodCallExpression>().Subject;
        AssertComputedSetPropertyCall(incrementCall, ExpressionType.Add, typeof(int));
    }

    private static void AssertComputedSetPropertyCall(MethodCallExpression call, ExpressionType expectedArithmeticType, Type expectedPropertyType)
    {
        call.Method.Name.Should().Be(nameof(SetPropertyCalls<TestEntity>.SetProperty));
        call.Method.GetParameters()[1].ParameterType.Should().Be(typeof(Func<,>).MakeGenericType(typeof(TestEntity), expectedPropertyType));

        var valueExpression = call.Arguments[1].Should().BeAssignableTo<LambdaExpression>().Subject;
        valueExpression.ReturnType.Should().Be(expectedPropertyType);
        valueExpression.Body.NodeType.Should().Be(expectedArithmeticType);
    }

    private sealed class TestEntity
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; } = 0;
        public decimal Score { get; set; } = 0m;
    }
}
