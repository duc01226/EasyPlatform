using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.MongoDB;

/// <summary>
/// Detects whether an <see cref="IQueryable{T}"/> is a pure chain of <see cref="Queryable.Where{TSource}(IQueryable{TSource}, Expression{Func{TSource, bool}})"/>
/// calls over the root collection and, if so, builds a single combined predicate that can be passed straight to
/// <c>IMongoCollection.DeleteManyAsync(predicate)</c> — avoiding the count + ID-materialize + delete round-trip
/// path used for non-filter-only shapes.
/// </summary>
/// <remarks>
/// Returns <c>null</c> when the query contains any operator other than <c>Where</c> (e.g. <c>Select</c>, <c>Take</c>,
/// <c>OrderBy</c>, <c>GroupBy</c>) so that the caller can fall back to the safe path. Marked <c>internal</c>
/// to enable behavioral coverage from <c>Easy.Platform.Tests.Unit</c> without breaking encapsulation.
/// </remarks>
internal static class PlatformMongoFilterOnlyDeleteHelper
{
    public static Expression<Func<TEntity, bool>>? TryBuildFilterOnlyDeletePredicate<TEntity>(IQueryable<TEntity> query)
    {
        var wherePredicates = new List<Expression<Func<TEntity, bool>>>();
        var expression = query.Expression;

        while (expression is MethodCallExpression methodCallExpression)
        {
            if (!IsQueryableWhereMethod(methodCallExpression))
                return null;

            var wherePredicate = TryGetWherePredicate<TEntity>(methodCallExpression.Arguments[1]);
            if (wherePredicate == null)
                return null;

            wherePredicates.Add(wherePredicate);
            expression = methodCallExpression.Arguments[0];
        }

        if (expression.NodeType != ExpressionType.Constant || wherePredicates.Count == 0)
            return null;

        // Aggregate in source order (outermost-first by walk → reverse to match LINQ left-to-right reading).
        // AndAlso is commutative for predicate evaluation; .Reverse() is for human-readable debugging only.
        wherePredicates.Reverse();

        return wherePredicates.Aggregate((current, predicate) => current.AndAlso(predicate));
    }

    public static bool IsQueryableWhereMethod(MethodCallExpression methodCallExpression)
    {
        return methodCallExpression.Method.DeclaringType == typeof(Queryable) &&
               methodCallExpression.Method.Name == nameof(Queryable.Where) &&
               methodCallExpression.Arguments.Count == 2;
    }

    public static Expression<Func<TEntity, bool>>? TryGetWherePredicate<TEntity>(Expression wherePredicateExpression)
    {
        if (wherePredicateExpression is UnaryExpression { NodeType: ExpressionType.Quote, Operand: LambdaExpression lambdaExpression })
            return lambdaExpression as Expression<Func<TEntity, bool>>;

        return wherePredicateExpression as Expression<Func<TEntity, bool>>;
    }
}
