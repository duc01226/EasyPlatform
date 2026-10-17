using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Persistence.Services;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace Easy.Platform.MongoDB.Services;

public class MongoDbPlatformFullTextSearchPersistenceService : PlatformFullTextSearchPersistenceService
{
    public MongoDbPlatformFullTextSearchPersistenceService(IServiceProvider serviceProvider) : base(serviceProvider)
    {
    }

    public override bool IsSupportQuery<T>(IQueryable<T> query)
    {
        return query.Provider is IMongoQueryProvider;
    }

    protected override IQueryable<T> DoSearch<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object>>[] inFullTextSearchProps,
        bool fullTextAccurateMatch = true,
        Expression<Func<T, object>>[] includeStartWithProps = null)
    {
        if (string.IsNullOrWhiteSpace(searchText))
            return query;

        var textSearchMongoFilter = BuildTextSearchMongoFilterDefinition<T>(searchText, fullTextAccurateMatch);
        var startsWithFilter = includeStartWithProps?.Any() == true
            ? BuildStartsWithMongoFilterDefinition(searchText, includeStartWithProps)
            : null;

        // Mongo aggregation requires $text in the first match and forbids $text inside $or.
        // Keep the caller's filters in both branches; Union removes rows matching text AND prefix.
        var textQuery = ApplyTextFilter(query, textSearchMongoFilter);
        return startsWithFilter == null ? textQuery : textQuery.Union(query.Where(_ => startsWithFilter.Inject()));
    }

    private static IQueryable<T> ApplyTextFilter<T>(IQueryable<T> query, FilterDefinition<T> filter)
    {
        Expression<Func<T, bool>> predicate = _ => filter.Inject();
        var source = query.Expression;
        var predicates = new List<Expression<Func<T, bool>>>();
        // Fold only adjacent ordinary Where calls. Never move a filter across paging/projection:
        // doing so would change which rows belong to the caller's input sequence.
        while (source is MethodCallExpression call &&
               call.Method.DeclaringType == typeof(Queryable) && call.Method.Name == nameof(Queryable.Where) &&
               call.Arguments[1] is UnaryExpression { Operand: Expression<Func<T, bool>> existing })
        {
            predicates.Add(existing);
            source = call.Arguments[0];
        }

        foreach (var existing in predicates)
            predicate = existing.AndAlso(predicate);

        return query.Provider.CreateQuery<T>(source).Where(predicate);
    }

    public static FilterDefinition<T> BuildTextSearchMongoFilterDefinition<T>(
        string searchText,
        bool fullTextAccurateMatch)
    {
        return Builders<T>.Filter.Text(
            fullTextAccurateMatch ? $"{searchText.Trim().Split(' ').Select(word => $"\"{word}\"").JoinToString(" ")}" : searchText.Trim(),
            new TextSearchOptions
            {
                CaseSensitive = false,
                DiacriticSensitive = false
            });
    }

    public static FilterDefinition<T> BuildStartsWithMongoFilterDefinition<T>(
        string searchText,
        Expression<Func<T, object>>[] includeStartWithProps)
    {
        var filterBuilder = Builders<T>.Filter;
        var startsWithFilters = includeStartWithProps
            .Select(p => filterBuilder.Regex(p, new BsonRegularExpression($"^({searchText})", "i")))
            .ToList();
        return filterBuilder.Or(startsWithFilters);
    }
}
