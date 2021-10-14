using System;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Persistence.Helpers
{
    public abstract class PlatformFullTextSearchPersistenceHelper : IPlatformFullTextSearchPersistenceHelper
    {
        protected readonly IServiceProvider ServiceProvider;

        public PlatformFullTextSearchPersistenceHelper(IServiceProvider serviceProvider)
        {
            ServiceProvider = serviceProvider;
        }

        public abstract IQueryable<T> Search<T>(
            IQueryable<T> query,
            string searchText,
            Expression<Func<T, string>>[] inFullTextSearchProps,
            bool exactMatch = false) where T : class;

        public abstract bool IsSupportQuery<T>(IQueryable<T> query) where T : class;

        protected bool TrySearchByFirstSupportQueryHelper<T>(
            IQueryable<T> query,
            string searchText,
            Expression<Func<T, string>>[] inFullTextSearchProps,
            bool exactMatch,
            out IQueryable<T> newQuery) where T : class
        {
            var otherSupportHelpers = ServiceProvider
                .GetServices<IPlatformFullTextSearchPersistenceHelper>()
                .FirstOrDefault(p => p.IsSupportQuery(query));

            if (otherSupportHelpers != null)
            {
                newQuery = otherSupportHelpers.Search(query, searchText, inFullTextSearchProps, exactMatch);
                return true;
            }
            else
            {
                newQuery = query;
                return false;
            }
        }
    }
}
