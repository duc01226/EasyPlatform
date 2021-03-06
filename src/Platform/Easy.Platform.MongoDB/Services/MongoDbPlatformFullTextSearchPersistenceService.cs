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

    public override IQueryable<T> Search<T>(
        IQueryable<T> query,
        string searchText,
        Expression<Func<T, object>>[] inFullTextSearchProps,
        bool fullTextExactMatch = false,
        Expression<Func<T, object>>[] includeStartWithProps = null)
    {
        if (!IsSupportQuery(query) &&
            TrySearchByFirstSupportQueryHelper(
                query,
                searchText,
                inFullTextSearchProps,
                fullTextExactMatch,
                out var newQuery,
                includeStartWithProps))
            return newQuery;

        return DoMongoSearch(
            query,
            searchText,
            fullTextExactMatch,
            includeStartWithProps);
    }

    public override bool IsSupportQuery<T>(IQueryable<T> query)
    {
        return query is IMongoQueryable;
    }

    public static IQueryable<T> DoMongoSearch<T>(
        IQueryable<T> query,
        string searchText,
        bool fullTextExactMatch,
        Expression<Func<T, object>>[] includeStartWithProps = null)
    {
        if (string.IsNullOrWhiteSpace(searchText))
            return query;

        var textSearchMongoFilter = BuildTextSearchMongoFilterDefinition<T>(searchText, fullTextExactMatch);
        var startsWithFilter = includeStartWithProps?.Any() == true
            ? BuildStartsWithMongoFilterDefinition(searchText, includeStartWithProps)
            : null;

        var finalFilter = textSearchMongoFilter
            .PipeIf(startsWithFilter != null, p => Builders<T>.Filter.Or(p, startsWithFilter));

        return ((IMongoQueryable<T>)query).Where(_ => finalFilter.Inject());
    }

    public static FilterDefinition<T> BuildTextSearchMongoFilterDefinition<T>(
        string searchText,
        bool fullTextExactMatch)
    {
        return Builders<T>.Filter.Text(
            fullTextExactMatch ? $"\"{searchText.Trim()}\"" : searchText.Trim(),
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
