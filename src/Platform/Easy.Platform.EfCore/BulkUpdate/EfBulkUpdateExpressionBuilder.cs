using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application.Persistence.BulkUpdate;
using Microsoft.EntityFrameworkCore.Query;

namespace Easy.Platform.EfCore.BulkUpdate;

internal static class EfBulkUpdateExpressionBuilder
{
    private static readonly ConcurrentDictionary<(Type EntityType, Type PropertyType, SetPropertyOverloadKind OverloadKind), MethodInfo> SetPropertyMethodCache = new();

    public static Expression<Func<SetPropertyCalls<TEntity>, SetPropertyCalls<TEntity>>> Build<TEntity>(IReadOnlyList<BulkUpdateOp> ops)
    {
        if (ops.Count == 0)
            throw new ArgumentException("At least one bulk update operation is required.", nameof(ops));

        var setters = Expression.Parameter(typeof(SetPropertyCalls<TEntity>), "setters");
        var body = ops.Aggregate((Expression)setters, BuildSetPropertyCall<TEntity>);

        return Expression.Lambda<Func<SetPropertyCalls<TEntity>, SetPropertyCalls<TEntity>>>(body, setters);
    }

    private static MethodCallExpression BuildSetPropertyCall<TEntity>(Expression setters, BulkUpdateOp op)
    {
        return op.Kind switch
        {
            BulkUpdateOpKind.Set => BuildConstantSetCall<TEntity>(setters, op),
            BulkUpdateOpKind.Inc or BulkUpdateOpKind.Mul => BuildComputedSetCall<TEntity>(setters, op),
            _ => throw new NotSupportedException($"Bulk update operation '{op.Kind}' is not supported.")
        };
    }

    private static MethodCallExpression BuildConstantSetCall<TEntity>(Expression setters, BulkUpdateOp op)
    {
        var method = GetSetPropertyMethod<TEntity>(op.PropertyType, SetPropertyOverloadKind.ConstantValue);

        return Expression.Call(
            setters,
            method,
            op.PropExpr,
            Expression.Constant(op.Value, op.PropertyType));
    }

    private static MethodCallExpression BuildComputedSetCall<TEntity>(Expression setters, BulkUpdateOp op)
    {
        op.EnsureArithmeticPropertyTypeSupported();

        var method = GetSetPropertyMethod<TEntity>(op.PropertyType, SetPropertyOverloadKind.ComputedValue);
        var valueExpression = BuildArithmeticValueExpression<TEntity>(op);

        return Expression.Call(setters, method, op.PropExpr, valueExpression);
    }

    private static LambdaExpression BuildArithmeticValueExpression<TEntity>(BulkUpdateOp op)
    {
        var value = Expression.Constant(op.Value, op.PropertyType);
        var body = op.Kind switch
        {
            BulkUpdateOpKind.Inc => Expression.Add(op.PropExpr.Body, value),
            BulkUpdateOpKind.Mul => Expression.Multiply(op.PropExpr.Body, value),
            _ => throw new NotSupportedException($"Bulk update operation '{op.Kind}' is not an arithmetic operation.")
        };

        var delegateType = typeof(Func<,>).MakeGenericType(typeof(TEntity), op.PropertyType);

        return Expression.Lambda(delegateType, body, op.PropExpr.Parameters);
    }

    private static MethodInfo GetSetPropertyMethod<TEntity>(Type propertyType, SetPropertyOverloadKind overloadKind)
    {
        return SetPropertyMethodCache.GetOrAdd((typeof(TEntity), propertyType, overloadKind), key =>
        {
            var setPropertyCallsType = typeof(SetPropertyCalls<>).MakeGenericType(key.EntityType);

            return setPropertyCallsType
                .GetMethods()
                .Where(method => method is { Name: nameof(SetPropertyCalls<TEntity>.SetProperty), IsGenericMethodDefinition: true })
                .Single(method => IsExpectedOverload(method, key.OverloadKind))
                .MakeGenericMethod(key.PropertyType);
        });
    }

    private static bool IsExpectedOverload(MethodInfo method, SetPropertyOverloadKind overloadKind)
    {
        var parameters = method.GetParameters();
        if (parameters.Length != 2)
            return false;

        var secondParameterType = parameters[1].ParameterType;
        var isComputedValueOverload =
            secondParameterType.IsGenericType &&
            secondParameterType.GetGenericTypeDefinition() == typeof(Func<,>);

        return overloadKind == SetPropertyOverloadKind.ComputedValue
            ? isComputedValueOverload
            : !isComputedValueOverload;
    }

    private enum SetPropertyOverloadKind
    {
        ConstantValue,
        ComputedValue
    }
}
