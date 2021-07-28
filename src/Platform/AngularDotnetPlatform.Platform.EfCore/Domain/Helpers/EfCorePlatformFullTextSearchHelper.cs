using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using AngularDotnetPlatform.Platform.Domain.Helpers;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.Utils;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.Helpers
{
    public class EfCoreSqlPlatformFullTextSearchDomainHelper : IPlatformFullTextSearchDomainHelper
    {
        public IQueryable<T> Search<T>(IQueryable<T> query, string searchText, params Expression<Func<T, string>>[] inFullTextSearchProps)
        {
            if (string.IsNullOrWhiteSpace(searchText))
            {
                return query;
            }

            var searchWords = BuildSearchWords(searchText);
            var fullTextSearchPropNames = inFullTextSearchProps.Where(p => p != null).Select(ExpressionUtil.GetPropertyName).ToList();

            var searchedQuery = BuildSearchQuery(query, searchWords, fullTextSearchPropNames);

            return searchedQuery;
        }

        /// <summary>
        /// Build query for all search prop. Example: Search by PropA, PropB for text "hello word" will generate query with predicate:
        /// (propA.Contains("hello") AND propA.Contains("word")) OR (propB.Contains("hello") AND propB.Contains("word")).
        /// </summary>
        private static IQueryable<T> BuildSearchQuery<T>(IQueryable<T> query, List<string> searchWords, IEnumerable<string> fullTextSearchPropNames)
        {
            Expression<Func<T, bool>> totalPropsPredicate = null;

            foreach (var fullTextSearchPropName in fullTextSearchPropNames)
            {
                // Build predicate for a search prop. Example: Search by PropA for text "hello word" will generate predicate: propA.Contains("hello") AND propA.Contains("word")
                Expression<Func<T, bool>> singlePropPredicate = null;
                foreach (var searchWord in searchWords)
                {
                    Expression<Func<T, bool>> singleWordSinglePropPredicate = r => EF.Functions.Contains(EF.Property<string>(r, fullTextSearchPropName), searchWord);

                    singlePropPredicate = singlePropPredicate == null ? singleWordSinglePropPredicate : singlePropPredicate.AndAlso(singleWordSinglePropPredicate);
                }

                totalPropsPredicate = totalPropsPredicate == null ? singlePropPredicate : totalPropsPredicate.Or(singlePropPredicate);
            }

            return query.WhereIf(totalPropsPredicate != null, totalPropsPredicate);
        }

        private static List<string> BuildSearchWords(string searchText)
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
    }
}
