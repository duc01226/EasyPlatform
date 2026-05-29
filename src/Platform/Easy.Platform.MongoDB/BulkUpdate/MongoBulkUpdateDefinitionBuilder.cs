using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application.Persistence.BulkUpdate;
using MongoDB.Driver;

namespace Easy.Platform.MongoDB.BulkUpdate;

internal static class MongoBulkUpdateDefinitionBuilder
{
    private static readonly ConcurrentDictionary<(Type EntityType, Type PropertyType, BulkUpdateOpKind Kind), MethodInfo> UpdateMethodCache = new();

    public static UpdateDefinition<TEntity> Build<TEntity>(IReadOnlyList<BulkUpdateOp> ops)
    {
        if (ops.Count == 0)
            throw new ArgumentException("At least one bulk update operation is required.", nameof(ops));

        var updateDefinitions = ops.Select(BuildUpdateDefinition<TEntity>).ToList();

        return updateDefinitions.Count == 1
            ? updateDefinitions[0]
            : Builders<TEntity>.Update.Combine(updateDefinitions);
    }

    private static UpdateDefinition<TEntity> BuildUpdateDefinition<TEntity>(BulkUpdateOp op)
    {
        if (op.Kind is BulkUpdateOpKind.Inc or BulkUpdateOpKind.Mul)
            op.EnsureArithmeticPropertyTypeSupported();

        var method = GetUpdateMethod<TEntity>(op);

        return (UpdateDefinition<TEntity>)method.Invoke(Builders<TEntity>.Update, [op.PropExpr, op.Value])!;
    }

    private static MethodInfo GetUpdateMethod<TEntity>(BulkUpdateOp op)
    {
        return UpdateMethodCache.GetOrAdd((typeof(TEntity), op.PropertyType, op.Kind), key =>
        {
            var methodName = key.Kind switch
            {
                BulkUpdateOpKind.Set => nameof(UpdateDefinitionBuilder<TEntity>.Set),
                BulkUpdateOpKind.Inc => nameof(UpdateDefinitionBuilder<TEntity>.Inc),
                BulkUpdateOpKind.Mul => nameof(UpdateDefinitionBuilder<TEntity>.Mul),
                _ => throw new NotSupportedException($"Bulk update operation '{key.Kind}' is not supported.")
            };

            return typeof(UpdateDefinitionBuilder<>)
                .MakeGenericType(key.EntityType)
                .GetMethods()
                .Where(method => method.Name == methodName && method.IsGenericMethodDefinition)
                .Single(IsExpressionFieldOverload)
                .MakeGenericMethod(key.PropertyType);
        });
    }

    private static bool IsExpressionFieldOverload(MethodInfo method)
    {
        var parameters = method.GetParameters();
        if (parameters.Length != 2)
            return false;

        var firstParameterType = parameters[0].ParameterType;

        return firstParameterType.IsGenericType &&
               firstParameterType.GetGenericTypeDefinition() == typeof(Expression<>);
    }
}
