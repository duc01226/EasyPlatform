using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Extensions
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
