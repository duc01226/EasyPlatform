using System.Globalization;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Application.Persistence.BulkUpdate;

internal static class PlatformBulkUpdateOperationHelper
{
    public static List<BulkUpdateOp> BuildOps<TEntity>(Action<IPlatformBulkUpdateBuilder<TEntity>> setBuilder)
    {
        ArgumentNullException.ThrowIfNull(setBuilder);

        var builder = new PlatformBulkUpdateBuilder<TEntity>();
        setBuilder(builder);

        if (builder.Ops.Count == 0)
            throw new ArgumentException("At least one bulk update operation is required.", nameof(setBuilder));

        return builder.Ops.ToList();
    }

    public static void ApplyToEntity<TEntity>(TEntity entity, IReadOnlyList<BulkUpdateOp> ops)
    {
        foreach (var op in ops)
        {
            var propertyInfo = op.PropertyInfo;
            var value = op.Kind switch
            {
                BulkUpdateOpKind.Set => op.Value,
                BulkUpdateOpKind.Inc or BulkUpdateOpKind.Mul => CalculateArithmeticValue(op, propertyInfo.GetValue(entity)),
                _ => throw new NotSupportedException($"Bulk update operation '{op.Kind}' is not supported.")
            };

            propertyInfo.SetValue(entity, value);
        }
    }

    public static List<BulkUpdateOp> WithPlatformInvariants<TEntity>(
        IReadOnlyList<BulkUpdateOp> ops,
        IPlatformApplicationRequestContext requestContext,
        PlatformBulkUpdateConcurrencyMode concurrencyMode)
        where TEntity : class, IEntity, new()
    {
        var result = ops.ToList();
        var entity = new TEntity();

        if (entity is IDateAuditedEntity)
            UpsertSetOp<TEntity>(result, nameof(IDateAuditedEntity.LastUpdatedDate), DateTime.UtcNow);

        if (entity.IsAuditedUserEntity())
            UpsertSetOp<TEntity>(
                result,
                nameof(IUserAuditedEntity<object>.LastUpdatedBy),
                requestContext.UserId(entity.GetAuditedUserIdType()));

        if (entity is IRowVersionEntity && concurrencyMode == PlatformBulkUpdateConcurrencyMode.BypassOptimisticConcurrencyAndStampToken)
            UpsertSetOp<TEntity>(result, nameof(IRowVersionEntity.ConcurrencyUpdateToken), Ulid.NewUlid().ToString());

        return result;
    }

    private static object? CalculateArithmeticValue(BulkUpdateOp op, object? currentValue)
    {
        op.EnsureArithmeticPropertyTypeSupported();

        if (currentValue == null || op.Value == null)
            return currentValue;

        var nonNullableType = Nullable.GetUnderlyingType(op.PropertyType) ?? op.PropertyType;
        var left = Convert.ChangeType(currentValue, nonNullableType, CultureInfo.InvariantCulture);
        var right = Convert.ChangeType(op.Value, nonNullableType, CultureInfo.InvariantCulture);

        if (nonNullableType == typeof(int))
            return op.Kind == BulkUpdateOpKind.Inc ? (int)left + (int)right : (int)left * (int)right;

        if (nonNullableType == typeof(long))
            return op.Kind == BulkUpdateOpKind.Inc ? (long)left + (long)right : (long)left * (long)right;

        if (nonNullableType == typeof(float))
            return op.Kind == BulkUpdateOpKind.Inc ? (float)left + (float)right : (float)left * (float)right;

        if (nonNullableType == typeof(double))
            return op.Kind == BulkUpdateOpKind.Inc ? (double)left + (double)right : (double)left * (double)right;

        if (nonNullableType == typeof(decimal))
            return op.Kind == BulkUpdateOpKind.Inc ? (decimal)left + (decimal)right : (decimal)left * (decimal)right;

        throw new NotSupportedException($"Bulk update operation '{op.Kind}' does not support property type '{op.PropertyType.Name}'.");
    }

    private static void UpsertSetOp<TEntity>(List<BulkUpdateOp> ops, string propertyName, object? value)
    {
        var propertyInfo = typeof(TEntity).GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance)
                           ?? throw new NotSupportedException($"Bulk update invariant property '{typeof(TEntity).Name}.{propertyName}' was not found.");

        ops.RemoveAll(op => op.PropertyInfo.Name == propertyName);
        ops.Add(new BulkUpdateOp(BulkUpdateOpKind.Set, BuildPropertyExpression<TEntity>(propertyInfo), NormalizeValue(value, propertyInfo.PropertyType)));
    }

    private static LambdaExpression BuildPropertyExpression<TEntity>(PropertyInfo propertyInfo)
    {
        var parameter = Expression.Parameter(typeof(TEntity), "entity");
        var body = Expression.Property(parameter, propertyInfo);
        var delegateType = typeof(Func<,>).MakeGenericType(typeof(TEntity), propertyInfo.PropertyType);

        return Expression.Lambda(delegateType, body, parameter);
    }

    private static object? NormalizeValue(object? value, Type propertyType)
    {
        if (value == null)
            return null;

        var nonNullableType = Nullable.GetUnderlyingType(propertyType) ?? propertyType;

        return nonNullableType.IsInstanceOfType(value)
            ? value
            : Convert.ChangeType(value, nonNullableType, CultureInfo.InvariantCulture);
    }
}
