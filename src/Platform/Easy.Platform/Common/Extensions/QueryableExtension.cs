using System.Linq.Expressions;

namespace Easy.Platform.Common.Extensions;

public static class QueryableExtension
{
    public static IQueryable<T> PageBy<T>(this IQueryable<T> query, int? skipCount, int? maxResultCount)
    {
        return skipCount >= 0 && maxResultCount >= 0
            ? query.Skip(skipCount.Value).Take(maxResultCount.Value)
            : query;
    }

    public static IQueryable<T> WhereCombineOr<T>(this IQueryable<T> query, params Expression<Func<T, bool>>[] predicates)
    {
        var validPredicates = predicates.Where(p => p != null).ToList();

        return validPredicates.Any()
            ? query.Where(validPredicates.Aggregate((result, current) => result.Or(current)))
            : query;
    }

    public static IQueryable<T> WhereCombineAnd<T>(this IQueryable<T> query, params Expression<Func<T, bool>>[] predicates)
    {
        var validPredicates = predicates.Where(p => p != null).ToList();

        return validPredicates.Any()
            ? query.Where(validPredicates.Aggregate((result, current) => result.AndAlso(current)))
            : query;
    }

    public static IQueryable<T> WhereIf<T>(this IQueryable<T> query, bool condition, Expression<Func<T, bool>> predicate)
    {
        return condition
            ? query.Where(predicate)
            : query;
    }

    public static Expression<T> Compose<T>(this Expression<T> firstExpr, Expression<T> secondExpr, Func<Expression, Expression, Expression> merge)
    {
        // replace parameters in the second lambda expression with parameters from the first
        var secondExprBody = ParameterRebinder.ReplaceParameters(secondExpr, firstExpr);

        // apply composition of lambda expression bodies to parameters from the first expression
        return Expression.Lambda<T>(merge(firstExpr.Body, secondExprBody), firstExpr.Parameters);
    }

    public static Expression<Func<T, bool>> AndAlso<T>(this Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        return first.Compose(second, Expression.AndAlso);
    }

    public static Expression<Func<T, bool>> AndAlsoNot<T>(this Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        return first.Compose(second.Not(), Expression.AndAlso);
    }

    public static Expression<Func<T, bool>> Or<T>(this Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        return first.Compose(second, Expression.OrElse);
    }

    public static Expression<Func<T, bool>> OrNot<T>(this Expression<Func<T, bool>> first, Expression<Func<T, bool>> second)
    {
        return first.Compose(second.Not(), Expression.OrElse);
    }

    public static Expression<Func<T, bool>> Not<T>(this Expression<Func<T, bool>> one)
    {
        var candidateExpr = one.Parameters[0];
        var body = Expression.Not(one.Body);

        return Expression.Lambda<Func<T, bool>>(body, candidateExpr);
    }
}

internal class ParameterRebinder : ExpressionVisitor
{
    private readonly Dictionary<ParameterExpression, ParameterExpression> targetToSourceParamsMap;

    public ParameterRebinder(Dictionary<ParameterExpression, ParameterExpression> targetToSourceParamsMap)
    {
        this.targetToSourceParamsMap = targetToSourceParamsMap ?? new Dictionary<ParameterExpression, ParameterExpression>();
    }

    public static Expression ReplaceParameters<T>(Expression<T> targetExpr, Expression<T> sourceExpr)
    {
        var targetToSourceParamsMap = sourceExpr.Parameters
            .Select((sourceParam, firstParamIndex) => new
            {
                sourceParam,
                targetParam = targetExpr.Parameters[firstParamIndex]
            })
            .ToDictionary(p => p.targetParam, p => p.sourceParam);

        return new ParameterRebinder(targetToSourceParamsMap).Visit(targetExpr.Body);
    }

    protected override Expression VisitParameter(ParameterExpression node)
    {
        if (targetToSourceParamsMap.TryGetValue(node, out var replacement))
            node = replacement;

        return base.VisitParameter(node);
    }
}
