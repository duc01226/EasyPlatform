using System.Linq.Expressions;

namespace Easy.Platform.Common.Extensions
{
    public static class ListExtension
    {
        public static List<T> RemoveWhere<T>(this IList<T> items, Func<T, bool> predicate)
        {
            var toRemoveItems = new List<T>();

            for (var i = 0; i < items.Count; i++)
            {
                if (predicate(items[i]))
                {
                    toRemoveItems.Add(items[i]);
                    items.RemoveAt(i);
                    i--;
                }
            }

            return toRemoveItems;
        }

        /// <summary>
        /// Remove item in this and return removed items
        /// </summary>
        public static List<T> RemoveMany<T>(this IList<T> items, IList<T> toRemoveItems)
        {
            var toRemoveItemsDic = toRemoveItems.ToDictionary(p => p);

            var removedItems = new List<T>();

            for (var i = 0; i < items.Count; i++)
            {
                if (toRemoveItemsDic.ContainsKey(items[i]))
                {
                    removedItems.Add(items[i]);
                    items.RemoveAt(i);
                    i--;
                }
            }

            return removedItems;
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

        /// <summary>
        /// Remove last item in list and return it
        /// </summary>
        public static T Pop<T>(this IList<T> items)
        {
            var lastItemIndex = items.Count - 1;

            var toRemoveItem = items[lastItemIndex];

            items.RemoveAt(lastItemIndex);

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

        public static void UpsertWhere<T>(this IList<T> items, Func<T, bool> predicate, T item)
        {
            for (var i = 0; i < items.Count; i++)
            {
                if (predicate(items[i]))
                {
                    items[i] = item;
                    return;
                }
            }

            items.Add(item);
        }

        public static IEnumerable<T> ConcatSingle<T>(this IEnumerable<T> items, T item)
        {
            return items.Concat(new List<T>() { item });
        }

        public static bool IsEmpty<T>(this IEnumerable<T> items)
        {
            return !items.Any();
        }

        public static bool NotExist<T>(this IEnumerable<T> items, Func<T, bool> predicate)
        {
            return !items.Any(predicate);
        }

        public static bool NotContains<T>(this IEnumerable<T> items, T item)
        {
            return !items.Contains(item);
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

        public static void ForEach<T>(this IEnumerable<T> items, Action<T> actionOnEachItem)
        {
            foreach (var item in items)
            {
                actionOnEachItem(item);
            }
        }

        public static List<T1> Map<T, T1>(this IList<T> items, Func<T, T1> mapFunc)
        {
            return items.Select(mapFunc).ToList();
        }

        public static IEnumerable<T1> Map<T, T1>(this IEnumerable<T> items, Func<T, T1> mapFunc)
        {
            return items.Select(mapFunc);
        }

        public static IEnumerable<T> Flatten<T>(this IEnumerable<IEnumerable<T>> items)
        {
            return items.SelectMany(p => p);
        }

        /// <summary>
        /// Functional Programming Concept. Bind List[T] => (T => List[T1]) => List[T1]
        /// Ex: [a, b].Bind(t => [t + a1, t + b1]) = [aa1,ab1,ba1,bb1]
        /// </summary>
        public static IEnumerable<TR> Bind<T, TR>(this IEnumerable<T> list, Func<T, IEnumerable<TR>> func)
        {
            return list.SelectMany(func);
        }

        public static ValueTuple<Dictionary<TKey, T>, List<TKey>> ToDictionaryWithKeysList<T, TKey>(this IEnumerable<T> items, Func<T, TKey> selectKey)
        {
            var dict = items.ToList().ToDictionary(selectKey, p => p);
            var keys = dict.Keys.ToList();

            return (dict, keys);
        }
    }
}
