using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.Utils;
using AngularDotnetPlatform.Platform.Persistence.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Query.Internal;

namespace AngularDotnetPlatform.Platform.EfCore.Helpers
{
    public class EfCoreSqlPlatformFullTextSearchPersistenceHelper : PlatformFullTextSearchPersistenceHelper
    {
        public EfCoreSqlPlatformFullTextSearchPersistenceHelper(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        public override IQueryable<T> Search<T>(IQueryable<T> query, string searchText, Expression<Func<T, object>>[] inFullTextSearchProps, bool exactMatch = false)
        {
            if (!IsSupportQuery(query) &&
                TrySearchByFirstSupportQueryHelper(query, searchText, inFullTextSearchProps, exactMatch, out var newQuery))
            {
                return newQuery;
            }

            return DoSqlSearch(query, searchText, inFullTextSearchProps, exactMatch);
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
        public static IQueryable<T> BuildSearchQuery<T>(IQueryable<T> query, List<string> searchWords, IEnumerable<string> fullTextSearchPropNames, bool exactMatch = false)
        {
            Expression<Func<T, bool>> totalPropsPredicate = null;

            foreach (var fullTextSearchPropName in fullTextSearchPropNames)
            {
                // Build predicate for a search prop. Example: Search by PropA for text "hello word" will generate predicate: propA.Contains("hello") AND propA.Contains("word")
                Expression<Func<T, bool>> singlePropPredicate = null;
                foreach (var searchWord in searchWords)
                {
                    Expression<Func<T, bool>> singleWordSinglePropPredicate = entity => EF.Functions.Contains(EF.Property<string>(entity, fullTextSearchPropName), searchWord);

                    singlePropPredicate = singlePropPredicate == null ? singleWordSinglePropPredicate : (exactMatch ? singlePropPredicate.AndAlso(singleWordSinglePropPredicate) : singlePropPredicate.Or(singleWordSinglePropPredicate));
                }

                totalPropsPredicate = totalPropsPredicate == null ? singlePropPredicate : totalPropsPredicate.Or(singlePropPredicate);
            }

            return query.WhereIf(totalPropsPredicate != null, totalPropsPredicate);
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
            bool exactMatch)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return query;
            }

            var searchWords = BuildSearchWords(searchText.Trim());
            var fullTextSearchPropNames =
                inFullTextSearchProps.Where(p => p != null).Select(Util.Expressions.GetPropertyName).ToList();

            var searchedQuery = BuildSearchQuery(query, searchWords, fullTextSearchPropNames, exactMatch);

            return searchedQuery;
        }
    }
}
