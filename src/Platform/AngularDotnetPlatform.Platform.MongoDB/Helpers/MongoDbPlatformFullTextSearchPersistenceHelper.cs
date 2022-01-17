using System;
using System.Linq;
using System.Linq.Expressions;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB.Helpers
{
    public class MongoDbPlatformFullTextSearchPersistenceHelper : PlatformFullTextSearchPersistenceHelper
    {
        public MongoDbPlatformFullTextSearchPersistenceHelper(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        public override IQueryable<T> Search<T>(IQueryable<T> query, string searchText, Expression<Func<T, object>>[] inFullTextSearchProps, bool exactMatch = false)
        {
            if (!IsSupportQuery(query) &&
                TrySearchByFirstSupportQueryHelper(query, searchText, inFullTextSearchProps, exactMatch, out var newQuery))
            {
                return newQuery;
            }

            return DoMongoSearch(query, searchText, exactMatch);
        }

        public override bool IsSupportQuery<T>(IQueryable<T> query)
        {
            return query is IMongoQueryable;
        }

        private static IQueryable<T> DoMongoSearch<T>(IQueryable<T> query, string searchText, bool exactMatch)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return query;
            }

            var filter = Builders<T>.Filter.Text(
                exactMatch ? $"\"{searchText.Trim()}\"" : searchText.Trim(),
                new TextSearchOptions() { CaseSensitive = false, DiacriticSensitive = false, Language = "none" });
            return ((IMongoQueryable<T>)query).Where(_ => filter.Inject());
        }
    }
}
