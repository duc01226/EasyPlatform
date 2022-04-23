using System;
using System.Linq;
using System.Text.Json;

namespace Easy.Platform.Common.Extensions
{
    public static class JsonSerializerOptionsExtension
    {
        public static JsonSerializerOptions Clone(this JsonSerializerOptions options)
        {
            var cloned = new JsonSerializerOptions();

            typeof(JsonSerializerOptions)
                .GetProperties()
                .Where(p => p.CanWrite)
                .ToList()
                .ForEach(p =>
                {
                    p.SetValue(cloned, p.GetValue(options));
                });

            foreach (var optionsConverter in options.Converters)
            {
                cloned.Converters.Add(optionsConverter);
            }

            return cloned;
        }
    }
}
