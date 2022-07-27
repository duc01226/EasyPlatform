using System.Linq.Expressions;
using System.Reflection;

namespace Easy.Platform.Common.Extensions;

public static class ExpressionExtension
{
    public static Expression<Func<T, bool>> AndAlsoIf<T>(
        this Expression<Func<T, bool>> expression,
        bool andIfTrue,
        Expression<Func<T, bool>> andExpression)
    {
        if (andIfTrue)
            return expression.AndAlso(andExpression);

        return expression;
    }

    public static Expression<Func<T, bool>> OrIf<T>(
        this Expression<Func<T, bool>> expression,
        bool orIfTrue,
        Expression<Func<T, bool>> andExpression)
    {
        if (orIfTrue)
            return expression.Or(andExpression);

        return expression;
    }

    /// <summary>
    ///     Returns the name of the specified property of the specified type.
    /// </summary>
    /// <typeparam name="T">
    ///     The type the property is a member of.
    /// </typeparam>
    /// <typeparam name="TProp">The type of the property.</typeparam>
    /// <param name="property">
    ///     The property.
    /// </param>
    /// <returns>
    ///     The property name.
    /// </returns>
    public static string GetPropertyName<T, TProp>(this Expression<Func<T, TProp>> property)
    {
        LambdaExpression lambda = property;
        MemberExpression memberExpression;

        if (lambda.Body is UnaryExpression unaryExpression)
            memberExpression = (MemberExpression)unaryExpression.Operand;
        else if (lambda.Body is ConstantExpression constantExpression)
            return constantExpression.ToString();
        else
            memberExpression = (MemberExpression)lambda.Body;

        return ((PropertyInfo)memberExpression.Member).Name;
    }
}
