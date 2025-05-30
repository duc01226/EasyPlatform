using System.Linq.Expressions;
using System.Reflection;

namespace Easy.Platform.Common.Extensions;

public static class QueryableExtension
{
    /// <summary>
    /// Applies pagination to the provided query. If the query is not already ordered,
    /// it orders by the "Id" property automatically.
    /// </summary>
    /// <typeparam name="T">The type of the elements of source.</typeparam>
    /// <param name="query">The IQueryable&lt;T&gt; to apply pagination to.</param>
    /// <param name="skipCount">The number of elements to skip before returning the remaining elements.</param>
    /// <param name="maxResultCount">The maximum number of elements to return.</param>
    /// <returns>A new IQueryable&lt;T&gt; that has pagination applied.</returns>
    public static IQueryable<T> PageBy<T>(this IQueryable<T> query, int? skipCount, int? maxResultCount)
    {
        if (!(skipCount is > 0 || maxResultCount is >= 0)) return query;

        // Check if the query is not already ordered and T has a property named "Id"
        var idProperty = typeof(T).GetProperty("Id", BindingFlags.Public | BindingFlags.Instance);
        if (query is not IOrderedQueryable<T> && idProperty != null)
        {
            var parameter = Expression.Parameter(typeof(T), "x");
            // Use the found Id property
            var property = Expression.Property(parameter, idProperty);
            // Convert the property to object to support different types for Id
            var converted = Expression.Convert(property, typeof(object));
            var orderByExp = Expression.Lambda<Func<T, object>>(converted, parameter);
            query = query.OrderBy(orderByExp);
        }

        return query
            .PipeIf(skipCount is > 0, q => q.Skip(skipCount!.Value))
            .PipeIf(maxResultCount is >= 0, q => q.Take(maxResultCount!.Value));
    }

    /// <summary>
    /// Filters a sequence of values based on a predicate if the condition is true.
    /// </summary>
    /// <typeparam name="T">The type of the elements of source.</typeparam>
    /// <param name="query">An <see cref="IQueryable{T}" /> to filter.</param>
    /// <param name="if">A boolean value representing the condition.</param>
    /// <param name="predicate">A function to test each element for a condition.</param>
    /// <returns>An <see cref="IQueryable{T}" /> that contains elements from the input sequence that satisfy the condition.</returns>
    public static IQueryable<T> WhereIf<T>(this IQueryable<T> query, bool @if, Expression<Func<T, bool>> predicate)
    {
        return @if
            ? query.Where(predicate)
            : query;
    }

    public static IQueryable<T> WhereIf<T>(this IQueryable<T> query, bool @if, Func<Expression<Func<T, bool>>> predicateBuilder)
    {
        return @if
            ? query.Where(predicateBuilder())
            : query;
    }

    /// <summary>
    /// Orders the elements of a sequence in ascending or descending order according to a key.
    /// </summary>
    /// <typeparam name="T">The type of the elements of <paramref name="query" />.</typeparam>
    /// <param name="query">A sequence of values to order.</param>
    /// <param name="keySelector">A function to extract a key from an element.</param>
    /// <param name="orderDirection">The direction of the order (ascending or descending).</param>
    /// <returns>An <see cref="IOrderedQueryable{T}" /> whose elements are sorted according to a key.</returns>
    public static IOrderedQueryable<T> OrderBy<T>(this IQueryable<T> query, Expression<Func<T, object>> keySelector, QueryOrderDirection orderDirection)
    {
        return orderDirection == QueryOrderDirection.Desc
            ? query.OrderByDescending(keySelector)
            : query.OrderBy(keySelector);
    }

    /// <summary>
    /// Orders the elements of a sequence in ascending or descending order according to a property name.
    /// </summary>
    /// <typeparam name="T">The type of the elements of <paramref name="query" />.</typeparam>
    /// <param name="query">A sequence of values to order.</param>
    /// <param name="propertyName">The name of the property to order the elements by.</param>
    /// <param name="orderDirection">The direction of the order (ascending or descending).</param>
    /// <returns>An <see cref="IOrderedQueryable{T}" /> whose elements are sorted according to a property.</returns>
    public static IOrderedQueryable<T> OrderBy<T>(this IQueryable<T> query, string propertyName, QueryOrderDirection orderDirection = QueryOrderDirection.Asc)
    {
        return orderDirection == QueryOrderDirection.Desc
            ? query.OrderByDescending(GetSortExpression<T>(propertyName))
            : query.OrderBy(GetSortExpression<T>(propertyName));
    }

    /// <summary>
    /// Generates a sorting expression based on the property name for the given type.
    /// </summary>
    /// <typeparam name="T">The type of the elements of source.</typeparam>
    /// <param name="propertyName">The name of the property to sort by.</param>
    /// <returns>An expression that represents the sorting operation for the specified property.</returns>
    public static Expression<Func<T, object>> GetSortExpression<T>(string propertyName)
    {
        var item = Expression.Parameter(typeof(T));
        var prop = Expression.Convert(Expression.Property(item, propertyName), typeof(object));
        var selector = Expression.Lambda<Func<T, object>>(prop, item);

        return selector;
    }

    /// <summary>
    /// Performs a left join on two sequences.
    /// </summary>
    /// <typeparam name="TOuter">The type of the elements of the outer sequence.</typeparam>
    /// <typeparam name="TInner">The type of the elements of the inner sequence.</typeparam>
    /// <typeparam name="TKey">The type of the join key.</typeparam>
    /// <typeparam name="TResult">The type of the result elements.</typeparam>
    /// <param name="outer">The outer sequence.</param>
    /// <param name="inner">The inner sequence.</param>
    /// <param name="outerKeySelector">A function to extract the join key from each element of the outer sequence.</param>
    /// <param name="innerKeySelector">A function to extract the join key from each element of the inner sequence.</param>
    /// <param name="resultSelector">
    /// A function to create a result element from an outer element and an inner element.
    /// If no matching inner element is found, <paramref name="resultSelector"/> will receive null for that inner element.
    /// </param>
    /// <returns>An IQueryable of the result type.</returns>
    public static IQueryable<TResult> LeftJoin<TOuter, TInner, TKey, TResult>(
        this IQueryable<TOuter> outer,
        IQueryable<TInner> inner,
        Expression<Func<TOuter, TKey>> outerKeySelector,
        Expression<Func<TInner, TKey>> innerKeySelector,
        Expression<Func<LeftJoinResultSelectorItem<TOuter, TInner>, TResult>> resultSelector)
    {
        return outer.GroupJoin(
                inner,
                outerKeySelector,
                innerKeySelector,
                (outerItem, innerItems) => new { outerItem, innerItems })
            .SelectMany(
                x => x.innerItems.DefaultIfEmpty(),
                (x, innerItem) => new LeftJoinResultSelectorItem<TOuter, TInner> { OuterItem = x.outerItem, InnerItem = innerItem })
            .Select(resultSelector);
    }

    public class LeftJoinResultSelectorItem<TOuter, TInner>
    {
        public TOuter OuterItem { get; set; }
        public TInner InnerItem { get; set; }
    }
}

public enum QueryOrderDirection
{
    Asc,
    Desc
}

internal sealed class ParameterRebinder : ExpressionVisitor
{
    private readonly Dictionary<ParameterExpression, ParameterExpression> targetToSourceParamsMap;

    public ParameterRebinder(Dictionary<ParameterExpression, ParameterExpression> targetToSourceParamsMap)
    {
        this.targetToSourceParamsMap = targetToSourceParamsMap ?? [];
    }

    // replace parameters in the target lambda expression with parameters from the source
    public static Expression ReplaceParameters<T>(Expression<T> targetExpr, Expression<T> sourceExpr)
    {
        var currentTargetToSourceParamsMap = sourceExpr.Parameters
            .Select((sourceParam, firstParamIndex) => new
            {
                sourceParam,
                targetParam = targetExpr.Parameters[firstParamIndex]
            })
            .ToDictionary(p => p.targetParam, p => p.sourceParam);

        return new ParameterRebinder(currentTargetToSourceParamsMap).Visit(targetExpr.Body);
    }

    protected override Expression VisitParameter(ParameterExpression node)
    {
        if (targetToSourceParamsMap.TryGetValue(node, out var replacement))
            node = replacement;

        return base.VisitParameter(node);
    }
}
