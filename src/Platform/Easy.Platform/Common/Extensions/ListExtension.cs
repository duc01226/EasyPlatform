using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

namespace Easy.Platform.Common.Extensions
{
    public static class ListExtension
    {
        public static List<T> RemoveWhere<T>(this IList<T> items, Func<T, bool> predicate)
        {
            var toRemoveItems = items.Where(predicate).ToList();

            toRemoveItems.ForEach(item => items.Remove(item));

            return toRemoveItems;
        }

        public static T RemoveFirst<T>(this IList<T> items, Func<T, bool> predicate)
        {
            var toRemoveItem = items.FirstOrDefault(predicate);

            if (toRemoveItem != null)
            {
                items.Remove(toRemoveItem);
            }

            return toRemoveItem;
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

        public static List<T> AddDistinct<T>(this List<T> items, T item)
        {
            if (!items.Contains(item))
                items.Add(item);

            return items;
        }

        public static List<T> WhereIf<T>(this List<T> items, bool condition, Expression<Func<T, bool>> predicate)
        {
            return condition
                ? items.Where(predicate.Compile()).ToList()
                : items;
        }

        public static bool ContainsAll<T>(this List<T> items, List<T> containAllItems)
        {
            return items.Intersect(containAllItems).Count() >= containAllItems.Count;
        }
    }
}
