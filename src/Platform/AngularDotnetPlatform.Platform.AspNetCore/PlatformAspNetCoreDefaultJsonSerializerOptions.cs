using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.AspNetCore
{
    public static class PlatformAspNetCoreDefaultJsonSerializerOptions
    {
        public static readonly JsonSerializerOptions Value = new JsonSerializerOptions()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
}
