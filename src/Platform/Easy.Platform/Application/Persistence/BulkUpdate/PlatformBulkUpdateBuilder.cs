using System.Linq.Expressions;
using System.Reflection;

namespace Easy.Platform.Application.Persistence.BulkUpdate;

internal sealed class PlatformBulkUpdateBuilder<TEntity> : IPlatformBulkUpdateBuilder<TEntity>
{
    private readonly List<BulkUpdateOp> ops = [];

    internal IReadOnlyList<BulkUpdateOp> Ops => ops;

    public IPlatformBulkUpdateBuilder<TEntity> Set<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value)
    {
        return Add(BulkUpdateOpKind.Set, property, value);
    }

    public IPlatformBulkUpdateBuilder<TEntity> Inc<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value)
    {
        return Add(BulkUpdateOpKind.Inc, property, value);
    }

    public IPlatformBulkUpdateBuilder<TEntity> Mul<TProperty>(
        Expression<Func<TEntity, TProperty>> property,
        TProperty value)
    {
        return Add(BulkUpdateOpKind.Mul, property, value);
    }

    private PlatformBulkUpdateBuilder<TEntity> Add<TProperty>(
        BulkUpdateOpKind kind,
        Expression<Func<TEntity, TProperty>> property,
        TProperty value)
    {
        ops.Add(new BulkUpdateOp(kind, NormalizeDirectPropertyExpression(property), value));
        return this;
    }

    private static LambdaExpression NormalizeDirectPropertyExpression<TProperty>(Expression<Func<TEntity, TProperty>> property)
    {
        var body = UnwrapConvert(property.Body);

        if (body is not MemberExpression memberExpression ||
            memberExpression.Member is not PropertyInfo propertyInfo ||
            UnwrapConvert(memberExpression.Expression) is not ParameterExpression)
            throw new ArgumentException(
                $"Bulk update operations require a direct property expression, for example 'entity => entity.Name'.",
                nameof(property));

        if (ReferenceEquals(body, property.Body) && property.ReturnType == propertyInfo.PropertyType)
            return property;

        var parameter = property.Parameters.Single();
        var normalizedBody = Expression.Property(parameter, propertyInfo);
        var delegateType = typeof(Func<,>).MakeGenericType(typeof(TEntity), propertyInfo.PropertyType);

        return Expression.Lambda(delegateType, normalizedBody, parameter);
    }

    private static Expression? UnwrapConvert(Expression? expression)
    {
        while (expression is UnaryExpression { NodeType: ExpressionType.Convert or ExpressionType.ConvertChecked } unaryExpression)
            expression = unaryExpression.Operand;

        return expression;
    }
}
