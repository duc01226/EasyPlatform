using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Persistence.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Query.Internal;

namespace Easy.Platform.EfCore.Services
{
    public class EfCoreSqlPlatformFullTextSearchPersistenceService : PlatformFullTextSearchPersistenceService
    {
        public EfCoreSqlPlatformFullTextSearchPersistenceService(IServiceProvider serviceProvider) : base(serviceProvider)
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
                TrySearchByFirstSupportQueryHelper(query, searchText, inFullTextSearchProps, fullTextExactMatch, out var newQuery, includeStartWithProps))
            {
                return newQuery;
            }

            return DoSqlSearch(query, searchText, inFullTextSearchProps, fullTextExactMatch, includeStartWithProps);
        }

        public override bool IsSupportQuery<T>(IQueryable<T> query) where T : class
        {
            var queryType = query.GetType();
            return queryType.IsAssignableTo(typeof(DbSet<T>)) ||
                   queryType.IsAssignableTo(typeof(IInfrastructure<T>)) ||
                   queryType.IsAssignableTo(typeof(EntityQueryable<T>));
        }

        /// <summary>
        /// Build query for all search prop. Example: Search by PropA, PropB for text "hello word" will generate query with predicate:
        /// (propA.Contains("hello") AND propA.Contains("word")) OR (propB.Contains("hello") AND propB.Contains("word")).
        /// </summary>
        public static IQueryable<T> BuildSearchQuery<T>(
            IQueryable<T> query,
            string searchText,
            List<string> searchWords,
            List<string> fullTextSearchPropNames,
            bool exactMatch = false,
            List<string> startWithPropNames = null)
        {
            var fullTextSearchPropsPredicate = BuildFullTextSearchPropsPredicate<T>(searchWords, fullTextSearchPropNames, exactMatch);
            var startWithPropsPredicate = startWithPropNames?.Any() == true
                ? BuildStartWithPropsPredicate<T>(searchText, startWithPropNames)
                : null;

            // Should use union instead of OR because UNION is better at performance
            // https://stackoverflow.com/questions/16438556/combining-free-text-search-with-another-condition-is-slow
            return query.Where(fullTextSearchPropsPredicate)
                .PipeIf(startWithPropsPredicate != null, p => p.Union(query.Where(startWithPropsPredicate!)));
        }

        public static List<string> BuildSearchWords(string searchText)
        {
            // Remove special not supported character for full text search
            var removedSpecialCharactersSearchText = searchText
                .Replace("\"", " ")
                .Replace("~", " ")
                .Replace("[", " ")
                .Replace("]", " ")
                .Replace("(", " ")
                .Replace(")", " ")
                .Replace("!", " ");

            var searchWords = removedSpecialCharactersSearchText.Split(" ").Where(p => !string.IsNullOrWhiteSpace(p)).ToList();

            return searchWords;
        }

        public static IQueryable<T> DoSqlSearch<T>(
            IQueryable<T> query,
            string searchText,
            Expression<Func<T, object>>[] inFullTextSearchProps,
            bool fullTextExactMatch,
            Expression<Func<T, object>>[] includeStartWithProps = null)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return query;
            }

            var searchWords = BuildSearchWords(searchText.Trim());
            var fullTextSearchPropNames =
                inFullTextSearchProps.Where(p => p != null).Select(Util.Expressions.GetPropertyName).ToList();
            var includeStartWithPropNames =
                includeStartWithProps?.Where(p => p != null).Select(Util.Expressions.GetPropertyName).ToList();

            var searchedQuery = BuildSearchQuery(query, searchText, searchWords, fullTextSearchPropNames, fullTextExactMatch, includeStartWithPropNames);

            return searchedQuery;
        }

        private static Expression<Func<T, bool>> BuildStartWithPropsPredicate<T>(string searchText, List<string> startWithPropNames)
        {
            var startWithPropsPredicate = startWithPropNames
                .Select(startWithPropName =>
                {
                    Expression<Func<T, bool>> singlePropPredicate = entity =>
                        EF.Functions.Like(EF.Property<string>(entity, startWithPropName), $"{searchText}%");
                    return singlePropPredicate;
                })
                .Aggregate((resultPredicate, nextPredicate) => resultPredicate.Or(nextPredicate));
            return startWithPropsPredicate;
        }

        private static Expression<Func<T, bool>> BuildFullTextSearchPropsPredicate<T>(
            List<string> searchWords,
            List<string> fullTextSearchPropNames,
            bool exactMatch)
        {
            var fullTextSearchPropsPredicate = fullTextSearchPropNames
                .Select(fullTextSearchPropName =>
                {
                    return searchWords
                        .Select(searchWord =>
                        {
                            Expression<Func<T, bool>> singleWordSinglePropPredicate = entity =>
                                EF.Functions.Contains(EF.Property<string>(entity, fullTextSearchPropName), searchWord);
                            return singleWordSinglePropPredicate;
                        })
                        .Aggregate((resultPredicate, nextPredicate) =>
                            exactMatch ? resultPredicate.AndAlso(nextPredicate) : resultPredicate.Or(nextPredicate));
                })
                .Aggregate((resultPredicate, nextSinglePropPredicate) => resultPredicate.Or(nextSinglePropPredicate));
            return fullTextSearchPropsPredicate;
        }
    }
}
