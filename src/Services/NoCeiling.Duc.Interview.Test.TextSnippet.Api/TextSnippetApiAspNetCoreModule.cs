using System;
using System.Collections.Generic;
using NoCeiling.Duc.Interview.Test.Platform.AspNetCore;
using NoCeiling.Duc.Interview.Test.TextSnippet.Application;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Api
{
    public class TextSnippetApiAspNetCoreModule : PlatformAspNetCoreModule
    {
        public TextSnippetApiAspNetCoreModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override List<Type> GetModuleDependencies()
        {
            return new List<Type>() { typeof(TextSnippetApplicationModule) };
        }
    }
}
