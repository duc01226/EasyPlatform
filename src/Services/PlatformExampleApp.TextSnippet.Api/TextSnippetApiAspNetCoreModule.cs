using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.AspNetCore;
using PlatformExampleApp.TextSnippet.Application;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace PlatformExampleApp.TextSnippet.Api
{
    public class TextSnippetApiAspNetCoreModule : PlatformAspNetCoreModule
    {
        public TextSnippetApiAspNetCoreModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override List<Func<IConfiguration, Type>> GetModuleDependencies()
        {
            return new List<Func<IConfiguration, Type>>() { p => typeof(TextSnippetApplicationModule) };
        }

        protected override string[] GetAllowCorsOrigins(IConfiguration configuration)
        {
            return Configuration["AllowCorsOrigins"].Split(";");
        }
    }
}
