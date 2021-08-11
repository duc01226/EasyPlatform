using System;
using System.Linq;
using System.Linq.Expressions;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB.Helpers
{
    public class MongoDbPlatformFullTextSearchPersistenceHelper : IPlatformFullTextSearchPersistenceHelper
    {
        public IQueryable<T> Search<T>(IQueryable<T> query, string searchText, Expression<Func<T, string>>[] inFullTextSearchProps, bool exactMatch = false)
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
