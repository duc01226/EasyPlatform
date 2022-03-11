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

        public static void UpdateWhere<T>(this IList<T> items, Func<T, bool> predicate, Action<T> updateAction)
        {
            foreach (var t in items)
            {
                if (predicate(t))
                {
                    updateAction(t);
                }
            }
        }

        public static IEnumerable<T> ConcatSingle<T>(this IEnumerable<T> items, T item)
        {
            return items.Concat(new List<T>() { item });
        }

        public static bool IsEmpty<T>(this IEnumerable<T> items)
        {
            return !items.Any();
        }
    }
}
