using System;
using System.Collections.Generic;
using AngularDotnetPlatform.Platform.Application;
using PlatformExampleApp.TextSnippet.Domain;
using PlatformExampleApp.TextSnippet.Persistence;

namespace PlatformExampleApp.TextSnippet.Application
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
