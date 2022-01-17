using System;
using System.Linq;
using System.Linq.Expressions;
using AngularDotnetPlatform.Platform.Persistence.Helpers.Abstract;

namespace AngularDotnetPlatform.Platform.Persistence.Helpers
{
    public interface IPlatformFullTextSearchPersistenceHelper : IPersistenceHelper
    {
        /// <summary>
        /// Filter by search text, support multiple string prop. inFullTextSearchProps must be a list of one level string prop.
        /// Ex: Input searchText: "abc def", inFullTextSearchProps: [p => p.PropA, p => p.PropB] will return query which is (p.PropA contains ("abc" AND "def") OR p.PropB contains ("abc" AND "def")).
        /// </summary>
        /// <typeparam name="T">Query item Type.</typeparam>
        /// <param name="query">Query to search on.</param>
        /// <param name="searchText">Search text.</param>
        /// <param name="inFullTextSearchProps">List of property expression to search on.</param>
        /// <param name="exactMatch">Whether search matching exact phrase or not</param>
        /// <returns>Filtered by search text query.</returns>
        public IQueryable<T> Search<T>(IQueryable<T> query, string searchText, Expression<Func<T, object>>[] inFullTextSearchProps, bool exactMatch = false) where T : class;

        public bool IsSupportQuery<T>(IQueryable<T> query) where T : class;
    }
}
