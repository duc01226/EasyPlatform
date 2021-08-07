using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using AngularDotnetPlatform.Platform.Utils;
using MongoDB.Bson;
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
