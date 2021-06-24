using System;
using System.Collections.Generic;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.Application;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.TextSnippet.Domain;
using NoCeiling.Duc.Interview.Test.TextSnippet.Persistence;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Application
{
    public class TextSnippetApplicationModule : PlatformApplicationModule
    {
        public TextSnippetApplicationModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override List<Type> GetModuleDependencies()
        {
            return new List<Type>()
            {
                typeof(TextSnippetDomainPlatformModule), typeof(TextSnippetPersistencePlatformModule)
            };
        }
    }
}
