using System;
using System.Collections.Generic;
using System.Linq;

namespace AngularDotnetPlatform.Platform.Common.Extensions
{
    public static class ListExtension
    {
        public static void RemoveWhere<T>(this IList<T> items, Func<T, bool> predicate)
        {
            for (var i = 0; i < items.Count; i++)
            {
                if (predicate(items[i]))
                {
                    items.RemoveAt(i);
                    i--;
                }
            }
        }

        public static IEnumerable<T> ConcatSingle<T>(this IEnumerable<T> items, T item)
        {
            return items.Concat(new List<T>() { item });
        }
    }
}
