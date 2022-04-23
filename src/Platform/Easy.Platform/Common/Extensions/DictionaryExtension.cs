using System.Collections.Generic;

namespace Easy.Platform.Common.Extensions
{
    public static class DictionaryExtension
    {
        /// <summary>
        /// Insert if item is not existed. Update if item is existed
        /// </summary>
        public static void Upsert<TKey, TValue>(this IDictionary<TKey, TValue> dictionary, TKey key, TValue value)
        {
            dictionary.Remove(key);
            dictionary.Add(key, value);
        }
    }
}
