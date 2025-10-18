namespace Easy.Platform.Common.Utils;

public static partial class Util
{
    public static class ListBuilder
    {
        public static List<T> New<T>(params T[] values)
        {
            return values.ToList();
        }

        public static List<KeyValuePair<TKey, TValue>> New<TKey, TValue>(params ValueTuple<TKey, TValue>[] items)
        {
            return items.Select(p => new KeyValuePair<TKey, TValue>(p.Item1, p.Item2)).ToList();
        }
    }
}
