using System;
using System.Collections.Generic;

namespace AngularDotnetPlatform.Platform.Extensions
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
    }
}
