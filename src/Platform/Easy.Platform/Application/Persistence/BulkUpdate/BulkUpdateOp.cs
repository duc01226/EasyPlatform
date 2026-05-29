using System.Linq.Expressions;
using System.Reflection;

namespace Easy.Platform.Application.Persistence.BulkUpdate;

internal enum BulkUpdateOpKind
{
    Set,
    Inc,
    Mul
}

internal sealed record BulkUpdateOp(BulkUpdateOpKind Kind, LambdaExpression PropExpr, object? Value)
{
    private static readonly HashSet<Type> SupportedArithmeticTypes =
    [
        typeof(int),
        typeof(long),
        typeof(float),
        typeof(double),
        typeof(decimal)
    ];

    internal Type PropertyType => PropertyInfo.PropertyType;

    internal PropertyInfo PropertyInfo => ResolvePropertyInfo(PropExpr.Body);

    internal void EnsureArithmeticPropertyTypeSupported()
    {
        var nonNullableType = Nullable.GetUnderlyingType(PropertyType) ?? PropertyType;

        if (!SupportedArithmeticTypes.Contains(nonNullableType))
            throw new NotSupportedException(
                $"Bulk update operation '{Kind}' does not support property type '{PropertyType.Name}'. Supported arithmetic property types: {string.Join(", ", SupportedArithmeticTypes.Select(p => p.Name))}.");
    }

    private static PropertyInfo ResolvePropertyInfo(Expression expression)
    {
        var body = UnwrapConvert(expression);

        return body is MemberExpression { Member: PropertyInfo propertyInfo }
            ? propertyInfo
            : throw new ArgumentException("Bulk update operation property expression must resolve to a property.");
    }

    private static Expression UnwrapConvert(Expression expression)
    {
        while (expression is UnaryExpression { NodeType: ExpressionType.Convert or ExpressionType.ConvertChecked } unaryExpression)
            expression = unaryExpression.Operand;

        return expression;
    }
}
