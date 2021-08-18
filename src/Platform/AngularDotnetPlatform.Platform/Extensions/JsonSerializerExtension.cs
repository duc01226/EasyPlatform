using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Extensions
{
    public static class JsonSerializerExtension
    {
        /// <summary>
        /// Try to Deserialize json string.
        /// If success return true and out the deserialized value of type <see cref="T"/>.
        /// If error return false and out default of type <see cref="T"/>
        /// </summary>
        public static bool TryDeserialize<T>(string json, out T deserializedValue, JsonSerializerOptions options = null)
        {
            var tryDeserializeResult = TryDeserialize(json, typeof(T), out var deserializedObjectValue, options);

            deserializedValue = (T)deserializedObjectValue;

            return tryDeserializeResult;
        }

        public static bool TryDeserialize(string json, Type deserializeType, out object deserializedValue, JsonSerializerOptions options = null)
        {
            try
            {
                deserializedValue = JsonSerializer.Deserialize(json, deserializeType, options);
                return true;
            }
            catch (Exception)
            {
                deserializedValue = default;
                return false;
            }
        }
    }
}
